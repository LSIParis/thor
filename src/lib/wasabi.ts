import { S3Client, ListBucketsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'

export type WasabiStats = {
  bucketCount: number
  totalObjects: number
  totalBytes: number
}

export function wasabiConfigured(): boolean {
  return !!(process.env.WASABI_ACCESS_KEY && process.env.WASABI_SECRET_KEY)
}

function createClient(): S3Client {
  return new S3Client({
    region: process.env.WASABI_REGION ?? 'us-east-1',
    endpoint: process.env.WASABI_ENDPOINT ?? 'https://s3.wasabisys.com',
    credentials: {
      accessKeyId:     process.env.WASABI_ACCESS_KEY!,
      secretAccessKey: process.env.WASABI_SECRET_KEY!,
    },
    forcePathStyle: true,
  })
}

export function fmtBytes(bytes: number): string {
  if (bytes < 1024 * 1024)           return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024)   return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export async function fetchWasabiStats(): Promise<WasabiStats | null> {
  if (!wasabiConfigured()) return null

  try {
    const client = createClient()

    const listResult = await client.send(new ListBucketsCommand({}))
    const buckets = listResult.Buckets ?? []

    let totalObjects = 0
    let totalBytes   = 0

    // First page of each bucket (max 1000 objects) for a fast approximation
    await Promise.all(
      buckets.map(async ({ Name }) => {
        if (!Name) return
        try {
          const res = await client.send(new ListObjectsV2Command({ Bucket: Name, MaxKeys: 1000 }))
          for (const obj of res.Contents ?? []) {
            totalObjects++
            totalBytes += obj.Size ?? 0
          }
        } catch {
          // Accès refusé ou bucket inaccessible — on ignore
        }
      })
    )

    return { bucketCount: buckets.length, totalObjects, totalBytes }
  } catch (err) {
    console.error('[wasabi] fetchWasabiStats error:', err)
    return null
  }
}
