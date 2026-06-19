import { NextResponse } from 'next/server'
import { getCoversBucket } from '@/lib/cloudflare/env'

function decodeAssetSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment)
  } catch {
    return null
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params
  const decodedPath = path.map(decodeAssetSegment)
  if (decodedPath.some((segment) => segment === null)) {
    return NextResponse.json({ error: 'Invalid asset path' }, { status: 400 })
  }

  const segments = decodedPath as string[]
  if (segments.some((segment) => (
    !segment ||
    segment === '.' ||
    segment === '..' ||
    segment.includes('/') ||
    segment.includes('\\')
  ))) {
    return NextResponse.json({ error: 'Invalid asset path' }, { status: 400 })
  }

  const key = segments.join('/')

  const bucket = await getCoversBucket()
  if (!bucket) {
    return NextResponse.json({ error: 'COVERS_BUCKET binding is not configured' }, { status: 503 })
  }

  const object = await bucket.get(key)
  if (!object?.body) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/octet-stream')
  headers.set('Cache-Control', object.httpMetadata?.cacheControl ?? 'public, max-age=31536000, immutable')

  return new Response(object.body, { headers })
}
