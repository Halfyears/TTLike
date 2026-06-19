import 'server-only'
import { getD1Database } from './env'

function bindD1(query: string, values: unknown[]) {
  const dbPromise = getD1Database()
  return dbPromise.then(db => {
    if (!db) return null
    const statement = db.prepare(query)
    return values.length > 0 ? statement.bind(...values) : statement
  })
}

export async function queryD1Rows<T = Record<string, unknown>>(
  query: string,
  values: unknown[] = [],
): Promise<T[] | null> {
  try {
    const statement = await bindD1(query, values)
    if (!statement) return null
    const { results } = await statement.all<T>()
    return results ?? []
  } catch (error) {
    console.warn('[d1] query failed:', error)
    return null
  }
}

export async function queryD1First<T = Record<string, unknown>>(
  query: string,
  values: unknown[] = [],
): Promise<T | null> {
  try {
    const statement = await bindD1(query, values)
    if (!statement) return null
    return await statement.first<T>()
  } catch (error) {
    console.warn('[d1] first query failed:', error)
    return null
  }
}

export async function runD1(
  query: string,
  values: unknown[] = [],
): Promise<boolean> {
  try {
    const statement = await bindD1(query, values)
    if (!statement) return false
    await statement.run()
    return true
  } catch (error) {
    console.warn('[d1] write failed:', error)
    return false
  }
}

export function parseD1Json<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback
  if (typeof value !== 'string') return value as T
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

