import 'server-only'
import { getCloudflareContext } from '@opennextjs/cloudflare'

type R2ObjectLike = {
  body: ReadableStream | null
  httpMetadata?: { contentType?: string; cacheControl?: string }
  customMetadata?: Record<string, string>
  writeHttpMetadata(headers: Headers): void
}

type R2BucketLike = {
  get(key: string): Promise<R2ObjectLike | null>
  put(
    key: string,
    value: ArrayBuffer | ReadableStream | string,
    options?: {
      httpMetadata?: { contentType?: string; cacheControl?: string }
      customMetadata?: Record<string, string>
    },
  ): Promise<unknown>
}

type D1PreparedStatementLike = {
  bind(...values: unknown[]): D1PreparedStatementLike
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>
  first<T = Record<string, unknown>>(): Promise<T | null>
  run(): Promise<unknown>
}

export type D1DatabaseLike = {
  prepare(query: string): D1PreparedStatementLike
}

type CloudflareBindings = {
  DB?: D1DatabaseLike
  COVERS_BUCKET?: R2BucketLike
  TTLIKE_KV?: unknown
  TTLIKE_SESSIONS?: unknown
  TTLIKE_JOBS?: unknown
}

export async function getCloudflareEnv(): Promise<CloudflareBindings | null> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    return env as CloudflareBindings
  } catch {
    return null
  }
}

export async function getCoversBucket(): Promise<R2BucketLike | null> {
  const env = await getCloudflareEnv()
  return env?.COVERS_BUCKET ?? null
}

export async function getD1Database(): Promise<D1DatabaseLike | null> {
  const env = await getCloudflareEnv()
  return env?.DB ?? null
}

export function buildPublicCoverUrl(storagePath: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:8787'
  const publicPath = process.env.R2_PUBLIC_COVERS_PATH ?? '/api/assets/covers'
  return `${siteUrl.replace(/\/$/, '')}${publicPath}/${encodeURIComponent(storagePath)}`
}
