import { S3Client, ListBucketsCommand, ListObjectsV2Command, GetBucketLocationCommand, type ListObjectsV2CommandOutput } from '@aws-sdk/client-s3'
import { unstable_cache } from 'next/cache'

export type WasabiStats = {
  bucketCount: number
  totalObjects: number
  totalBytes: number
}

export function wasabiConfigured(): boolean {
  return !!(process.env.WASABI_ACCESS_KEY && process.env.WASABI_SECRET_KEY)
}

const CREDS = () => ({
  accessKeyId:     process.env.WASABI_ACCESS_KEY!,
  secretAccessKey: process.env.WASABI_SECRET_KEY!,
})

function regionEndpoint(region: string): string {
  return region === 'us-east-1'
    ? 'https://s3.wasabisys.com'
    : `https://s3.${region}.wasabisys.com`
}

function clientForRegion(region: string): S3Client {
  return new S3Client({
    region,
    endpoint:       regionEndpoint(region),
    credentials:    CREDS(),
    forcePathStyle: true,
  })
}

// Région en cache 24h — elle ne change jamais pour un bucket donné
const getBucketRegion = unstable_cache(
  async (bucketName: string): Promise<string> => {
    const client = clientForRegion('us-east-1')
    try {
      const res = await client.send(new GetBucketLocationCommand({ Bucket: bucketName }))
      return res.LocationConstraint ?? 'us-east-1'
    } catch {
      return 'us-east-1'
    }
  },
  ['wasabi-bucket-region'],
  { revalidate: 86400 },
)

export function fmtBytes(bytes: number): string {
  if (bytes < 1024 * 1024)           return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024)   return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes < 1024 ** 4)             return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
  return `${(bytes / 1024 ** 4).toFixed(2)} TB`
}

async function getBucketStats(name: string): Promise<{ objects: number; bytes: number }> {
  const region = await getBucketRegion(name)
  const client = clientForRegion(region)

  let objects = 0
  let bytes   = 0
  let token: string | undefined = undefined

  do {
    const page: ListObjectsV2CommandOutput = await client.send(new ListObjectsV2Command({
      Bucket:            name,
      MaxKeys:           1000,
      ContinuationToken: token,
    }))
    for (const obj of page.Contents ?? []) {
      objects++
      bytes += obj.Size ?? 0
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined
  } while (token)

  return { objects, bytes }
}

// Stats en cache 1h — recalcul en arrière-plan à expiration (stale-while-revalidate)
export const fetchWasabiStats = unstable_cache(
  async (): Promise<WasabiStats | null> => {
    if (!wasabiConfigured()) return null

    try {
      const globalClient = clientForRegion('us-east-1')
      const listResult   = await globalClient.send(new ListBucketsCommand({}))
      const buckets      = listResult.Buckets ?? []

      const results = await Promise.all(
        buckets.map(({ Name }) => {
          if (!Name) return Promise.resolve({ objects: 0, bytes: 0 })
          return getBucketStats(Name).catch(err => {
            console.error(`[wasabi] bucket ${Name}:`, err instanceof Error ? err.message : err)
            return { objects: 0, bytes: 0 }
          })
        })
      )

      const totalObjects = results.reduce((s, r) => s + r.objects, 0)
      const totalBytes   = results.reduce((s, r) => s + r.bytes,   0)

      return { bucketCount: buckets.length, totalObjects, totalBytes }
    } catch (err) {
      console.error('[wasabi] fetchWasabiStats error:', err)
      return null
    }
  },
  ['wasabi-stats'],
  { revalidate: 3600 },
)
