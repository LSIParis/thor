import { NextResponse } from 'next/server'

const REPO = 'LSIParis/thor'
const BRANCH = 'master'

export const revalidate = 300 // cache 5 minutes

export async function GET() {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/commits/${BRANCH}`,
      {
        headers: { Accept: 'application/vnd.github.v3+json' },
        next: { revalidate: 300 },
      }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'GitHub API error' }, { status: res.status })
    }

    const data = await res.json()
    const latestSha: string = data.sha
    const shortSha = latestSha.slice(0, 7)
    const currentSha = process.env.NEXT_PUBLIC_BUILD_SHA ?? 'dev'

    const upToDate = currentSha === 'dev' || latestSha.startsWith(currentSha) || shortSha === currentSha

    return NextResponse.json({
      current: currentSha,
      latest: shortSha,
      upToDate,
      committedAt: data.commit?.committer?.date ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 })
  }
}
