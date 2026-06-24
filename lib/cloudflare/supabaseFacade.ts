import 'server-only'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'
import { getD1Database, type D1DatabaseLike } from './env'

type QueryResult<T = unknown> = {
  data: T | null
  error: { message: string; code?: string } | null
  count?: number | null
}

type Filter =
  | {
      column: string
      op: '=' | '!=' | 'IS' | 'IS NOT' | 'IN' | 'NOT IN' | '>=' | '<=' | '>' | '<' | 'LIKE'
      value: unknown
    }
  | {
      raw: string
      values: unknown[]
    }

type OrderBy = {
  column: string
  ascending: boolean
  nullsFirst?: boolean
}

type SelectOptions = {
  count?: 'exact' | null
  head?: boolean
}

type MutationKind = 'insert' | 'update' | 'upsert' | 'delete'

const SESSION_COOKIE_NAMES = ['ttlike_session', 'ttlike-session', 'session']
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/

function isSupabaseConfigured() {
  // AUTH_PROVIDER is the explicit toggle (set in wrangler.jsonc for the
  // Cloudflare deployment) — always honor it over inferring from env presence.
  // Without this, the committed .env placeholder values for
  // NEXT_PUBLIC_SUPABASE_URL/ANON_KEY (non-empty strings, just fake) make
  // this check true even on Cloudflare/D1, silently routing every query back
  // to a nonexistent "placeholder.supabase.co" project.
  if (process.env.AUTH_PROVIDER === 'cloudflare-d1') return false
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export function shouldUseSupabase() {
  return isSupabaseConfigured()
}

function quoteIdentifier(identifier: string) {
  if (!IDENTIFIER.test(identifier)) throw new Error(`Unsupported SQL identifier: ${identifier}`)
  return `"${identifier}"`
}

function serializeValue(value: unknown) {
  if (value === undefined) return null
  if (value === null) return null
  if (typeof value === 'object') return JSON.stringify(value)
  return value
}

function parseStoredValue(value: unknown) {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) return value
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

function hydrateRow(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, parseStoredValue(value)]),
  )
}

function normalizeRows(rows: Array<Record<string, unknown>>) {
  return rows.map(hydrateRow)
}

function columnsFromSelect(select?: string) {
  if (!select || select.trim() === '*' || select.trim() === '') return '*'
  const columns = select
    .split(',')
    .map(column => column.trim())
    .filter(Boolean)

  if (columns.some(column => column.includes('(') || column.includes('!') || column.includes('->'))) {
    throw new Error(`Relational or JSON-path selects are not supported by the D1 Supabase facade: ${select}`)
  }

  return columns.map(column => {
    const aliasMatch = /^([A-Za-z_][A-Za-z0-9_]*)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)$/i.exec(column)
    if (aliasMatch) return `${quoteIdentifier(aliasMatch[1])} AS ${quoteIdentifier(aliasMatch[2])}`
    return quoteIdentifier(column)
  }).join(', ')
}

function buildWhere(filters: Filter[]) {
  const clauses: string[] = []
  const values: unknown[] = []

  for (const filter of filters) {
    if ('raw' in filter) {
      clauses.push(filter.raw)
      values.push(...filter.values.map(serializeValue))
      continue
    }

    const column = quoteIdentifier(filter.column)
    if (filter.op === 'IN' || filter.op === 'NOT IN') {
      const list = Array.isArray(filter.value) ? filter.value : []
      if (list.length === 0) {
        clauses.push(filter.op === 'IN' ? '1 = 0' : '1 = 1')
      } else {
        clauses.push(`${column} ${filter.op} (${list.map(() => '?').join(', ')})`)
        values.push(...list.map(serializeValue))
      }
      continue
    }

    if (filter.op === 'IS' || filter.op === 'IS NOT') {
      clauses.push(`${column} ${filter.op} ${filter.value === null ? 'NULL' : '?'}`)
      if (filter.value !== null) values.push(serializeValue(filter.value))
      continue
    }

    clauses.push(`${column} ${filter.op} ?`)
    values.push(serializeValue(filter.value))
  }

  return {
    sql: clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : '',
    values,
  }
}

function buildOrder(orders: OrderBy[]) {
  if (orders.length === 0) return ''
  return ` ORDER BY ${orders.map(order => {
    const nulls = order.nullsFirst == null ? '' : order.nullsFirst ? ' NULLS FIRST' : ' NULLS LAST'
    return `${quoteIdentifier(order.column)} ${order.ascending ? 'ASC' : 'DESC'}${nulls}`
  }).join(', ')}`
}

function mutationRows(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>
  if (value && typeof value === 'object') return [value as Record<string, unknown>]
  return []
}

function parsePostgrestList(value: unknown) {
  return String(value)
    .replace(/^\(|\)$/g, '')
    .split(',')
    .map(item => item.trim().replace(/^"|"$/g, ''))
    .filter(Boolean)
}

function parseOrExpression(expression: string) {
  const clauses: string[] = []
  const values: unknown[] = []

  for (const part of expression.split(',').map(item => item.trim()).filter(Boolean)) {
    const [column, operator, ...rest] = part.split('.')
    const value = rest.join('.')
    if (!column || !operator) continue

    if (operator === 'is') {
      clauses.push(`${quoteIdentifier(column)} IS ${value === 'null' ? 'NULL' : '?'}`)
      if (value !== 'null') values.push(value)
    } else if (operator === 'eq') {
      clauses.push(`${quoteIdentifier(column)} = ?`)
      values.push(value)
    } else if (operator === 'ilike' || operator === 'like') {
      clauses.push(`${quoteIdentifier(column)} LIKE ?`)
      values.push(value)
    }
  }

  return clauses.length > 0 ? { raw: `(${clauses.join(' OR ')})`, values } : null
}

async function bind(db: D1DatabaseLike, sql: string, values: unknown[]) {
  const statement = db.prepare(sql)
  return values.length > 0 ? statement.bind(...values) : statement
}

class D1PostgrestBuilder<T = unknown> implements PromiseLike<QueryResult<T>> {
  private selectClause = '*'
  private selectOptions: SelectOptions = {}
  private filters: Filter[] = []
  private orders: OrderBy[] = []
  private limitCount: number | null = null
  private offsetCount: number | null = null
  private wantsSingle: 'single' | 'maybeSingle' | null = null
  private mutation: { kind: MutationKind; value?: unknown; onConflict?: string; ignoreDuplicates?: boolean } | null = null
  private returning = false

  constructor(private table: string) {}

  select(columns = '*', options: SelectOptions = {}) {
    this.selectClause = columns
    this.selectOptions = options
    if (this.mutation) this.returning = true
    return this
  }

  insert(value: unknown) {
    this.mutation = { kind: 'insert', value }
    return this
  }

  update(value: unknown) {
    this.mutation = { kind: 'update', value }
    return this
  }

  upsert(value: unknown, options: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
    this.mutation = {
      kind: 'upsert',
      value,
      onConflict: options.onConflict,
      ignoreDuplicates: options.ignoreDuplicates,
    }
    return this
  }

  delete() {
    this.mutation = { kind: 'delete' }
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, op: '=', value })
    return this
  }

  neq(column: string, value: unknown) {
    this.filters.push({ column, op: '!=', value })
    return this
  }

  is(column: string, value: unknown) {
    this.filters.push({ column, op: 'IS', value })
    return this
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ column, op: 'IN', value: values })
    return this
  }

  gte(column: string, value: unknown) {
    this.filters.push({ column, op: '>=', value })
    return this
  }

  lte(column: string, value: unknown) {
    this.filters.push({ column, op: '<=', value })
    return this
  }

  gt(column: string, value: unknown) {
    this.filters.push({ column, op: '>', value })
    return this
  }

  lt(column: string, value: unknown) {
    this.filters.push({ column, op: '<', value })
    return this
  }

  ilike(column: string, value: string) {
    this.filters.push({ column, op: 'LIKE', value })
    return this
  }

  like(column: string, value: string) {
    this.filters.push({ column, op: 'LIKE', value })
    return this
  }

  not(column: string, operator: string, value: unknown) {
    if (operator === 'is') this.filters.push({ column, op: 'IS NOT', value })
    else if (operator === 'in') {
      this.filters.push({ column, op: 'NOT IN', value: parsePostgrestList(value) })
    } else {
      this.filters.push({ column, op: '!=', value })
    }
    return this
  }

  or(expression: string) {
    const filter = parseOrExpression(expression)
    if (filter) this.filters.push(filter)
    return this
  }

  order(column: string, options: { ascending?: boolean; nullsFirst?: boolean } = {}) {
    this.orders.push({
      column,
      ascending: options.ascending ?? true,
      nullsFirst: options.nullsFirst,
    })
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  range(from: number, to: number) {
    this.offsetCount = from
    this.limitCount = Math.max(0, to - from + 1)
    return this
  }

  single() {
    this.wantsSingle = 'single'
    this.limitCount ??= 1
    return this
  }

  maybeSingle() {
    this.wantsSingle = 'maybeSingle'
    this.limitCount ??= 1
    return this
  }

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected)
  }

  private async execute(): Promise<QueryResult<T>> {
    try {
      const db = await getD1Database()
      if (!db) return { data: null, error: { message: 'Cloudflare D1 binding DB is unavailable' }, count: null }
      if (this.mutation) return await this.executeMutation(db)
      return await this.executeSelect(db)
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'D1 query failed',
        },
        count: null,
      }
    }
  }

  private async executeSelect(db: D1DatabaseLike): Promise<QueryResult<T>> {
    const table = quoteIdentifier(this.table)
    const columns = columnsFromSelect(this.selectClause)
    const where = buildWhere(this.filters)
    const order = buildOrder(this.orders)
    const limit = this.limitCount == null ? '' : ` LIMIT ${Math.max(0, this.limitCount)}`
    const offset = this.offsetCount == null ? '' : ` OFFSET ${Math.max(0, this.offsetCount)}`

    let count: number | null = null
    if (this.selectOptions.count === 'exact') {
      const countStatement = await bind(db, `SELECT COUNT(*) AS total FROM ${table}${where.sql}`, where.values)
      const countRow = await countStatement.first<{ total: number }>()
      count = Number(countRow?.total ?? 0)
    }

    if (this.selectOptions.head) return { data: null, error: null, count }

    const sql = `SELECT ${columns} FROM ${table}${where.sql}${order}${limit}${offset}`
    const statement = await bind(db, sql, where.values)
    const { results } = await statement.all<Record<string, unknown>>()
    const rows = normalizeRows(results ?? [])

    if (this.wantsSingle) {
      if (rows.length === 0) {
        return {
          data: null,
          error: this.wantsSingle === 'single' ? { message: 'No rows found', code: 'PGRST116' } : null,
          count,
        }
      }
      return { data: rows[0] as T, error: null, count }
    }

    return { data: rows as T, error: null, count }
  }

  private async executeMutation(db: D1DatabaseLike): Promise<QueryResult<T>> {
    const mutation = this.mutation!
    if (mutation.kind === 'delete') return await this.executeDelete(db)
    if (mutation.kind === 'update') return await this.executeUpdate(db, mutation.value)
    if (mutation.kind === 'upsert') {
      return await this.executeInsert(db, mutation.value, mutation.onConflict, mutation.ignoreDuplicates)
    }
    return await this.executeInsert(db, mutation.value)
  }

  private returningClause() {
    if (!this.returning) return ''
    const columns = columnsFromSelect(this.selectClause)
    return ` RETURNING ${columns}`
  }

  private async executeInsert(
    db: D1DatabaseLike,
    value: unknown,
    onConflict?: string,
    ignoreDuplicates?: boolean,
  ): Promise<QueryResult<T>> {
    const rows = mutationRows(value)
    if (rows.length === 0) return { data: null, error: { message: 'Insert requires an object or array' }, count: null }

    const output: Record<string, unknown>[] = []
    for (const row of rows) {
      const columns = Object.keys(row)
      const placeholders = columns.map(() => '?').join(', ')
      const quotedColumns = columns.map(quoteIdentifier).join(', ')
      const values = columns.map(column => serializeValue(row[column]))
      const conflictColumns = onConflict?.split(',').map(column => column.trim()).filter(Boolean)
      const conflictSql = conflictColumns?.length
        ? ignoreDuplicates
          ? ` ON CONFLICT(${conflictColumns.map(quoteIdentifier).join(', ')}) DO NOTHING`
          : columns.filter(column => !conflictColumns.includes(column)).length > 0
            ? ` ON CONFLICT(${conflictColumns.map(quoteIdentifier).join(', ')}) DO UPDATE SET ${
              columns
                .filter(column => !conflictColumns.includes(column))
                .map(column => `${quoteIdentifier(column)} = excluded.${quoteIdentifier(column)}`)
                .join(', ')
            }`
            : ` ON CONFLICT(${conflictColumns.map(quoteIdentifier).join(', ')}) DO NOTHING`
        : ''
      const sql = `INSERT INTO ${quoteIdentifier(this.table)} (${quotedColumns}) VALUES (${placeholders})${conflictSql}${this.returningClause()}`
      const statement = await bind(db, sql, values)
      if (this.returning) {
        const { results } = await statement.all<Record<string, unknown>>()
        output.push(...normalizeRows(results ?? []))
      } else {
        await statement.run()
      }
    }

    if (!this.returning) return { data: null, error: null, count: rows.length }
    if (this.wantsSingle) return { data: (output[0] ?? null) as T, error: output[0] ? null : { message: 'No rows returned' }, count: output.length }
    return { data: output as T, error: null, count: output.length }
  }

  private async executeUpdate(db: D1DatabaseLike, value: unknown): Promise<QueryResult<T>> {
    const row = mutationRows(value)[0]
    if (!row) return { data: null, error: { message: 'Update requires an object' }, count: null }

    const columns = Object.keys(row)
    const assignments = columns.map(column => `${quoteIdentifier(column)} = ?`).join(', ')
    const values = columns.map(column => serializeValue(row[column]))
    const where = buildWhere(this.filters)
    const sql = `UPDATE ${quoteIdentifier(this.table)} SET ${assignments}${where.sql}${this.returningClause()}`
    const statement = await bind(db, sql, [...values, ...where.values])

    if (this.returning) {
      const { results } = await statement.all<Record<string, unknown>>()
      const rows = normalizeRows(results ?? [])
      if (this.wantsSingle) return { data: (rows[0] ?? null) as T, error: rows[0] ? null : { message: 'No rows returned' }, count: rows.length }
      return { data: rows as T, error: null, count: rows.length }
    }

    await statement.run()
    return { data: null, error: null, count: null }
  }

  private async executeDelete(db: D1DatabaseLike): Promise<QueryResult<T>> {
    const where = buildWhere(this.filters)
    const sql = `DELETE FROM ${quoteIdentifier(this.table)}${where.sql}${this.returningClause()}`
    const statement = await bind(db, sql, where.values)

    if (this.returning) {
      const { results } = await statement.all<Record<string, unknown>>()
      const rows = normalizeRows(results ?? [])
      return { data: rows as T, error: null, count: rows.length }
    }

    await statement.run()
    return { data: null, error: null, count: null }
  }
}

class D1SupabaseFacade {
  constructor(private cookieStore?: ReadonlyRequestCookies) {}

  auth = {
    getUser: async () => {
      try {
        const sessionId = SESSION_COOKIE_NAMES
          .map(name => this.cookieStore?.get(name)?.value)
          .find(Boolean)

        if (!sessionId) return { data: { user: null }, error: null }

        const db = await getD1Database()
        if (!db) return { data: { user: null }, error: { message: 'Cloudflare D1 binding DB is unavailable' } }

        const statement = db.prepare(
          `SELECT au.id, au.email, au.raw_user_meta_data, au.created_at, au.updated_at,
                  au.last_sign_in_at, u.name, u.avatar_url, u.role
             FROM auth_sessions s
             JOIN auth_users au ON au.id = s.user_id
             LEFT JOIN users u ON u.id = au.id
            WHERE s.id = ? AND s.expires_at > CURRENT_TIMESTAMP
            LIMIT 1`,
        ).bind(sessionId)
        const row = await statement.first<Record<string, unknown>>()
        if (!row) return { data: { user: null }, error: null }

        const metadata = parseStoredValue(row.raw_user_meta_data) as Record<string, unknown> | string | null
        const userMetadata = metadata && typeof metadata === 'object' ? metadata : {}

        return {
          data: {
            user: {
              id: row.id,
              email: row.email,
              user_metadata: {
                ...userMetadata,
                name: row.name ?? userMetadata.name,
                avatar_url: row.avatar_url ?? userMetadata.avatar_url,
                role: row.role,
              },
              app_metadata: {},
              created_at: row.created_at,
              updated_at: row.updated_at,
              last_sign_in_at: row.last_sign_in_at,
            },
          },
          error: null,
        }
      } catch (error) {
        return {
          data: { user: null },
          error: { message: error instanceof Error ? error.message : 'Failed to read D1 session' },
        }
      }
    },
    signOut: async () => {
      try {
        for (const name of SESSION_COOKIE_NAMES) this.cookieStore?.delete(name)
      } catch {
        // Read-only cookie stores in Server Components cannot mutate; route handlers can.
      }
      return { error: null }
    },
    exchangeCodeForSession: async () => ({
      data: { session: null },
      error: { message: 'Supabase OAuth code exchange is unavailable in Cloudflare D1 auth mode' },
    }),
  }

  from(table: string) {
    return new D1PostgrestBuilder(table)
  }

  rpc(name: string, params: Record<string, unknown> = {}) {
    return new D1RpcBuilder(name, params)
  }

  storage = {
    from: () => ({
      upload: async () => ({ data: null, error: { message: 'Supabase Storage is unavailable in Cloudflare mode; use R2 bindings instead.' } }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: path } }),
    }),
  }
}

class D1RpcBuilder<T = unknown> implements PromiseLike<QueryResult<T>> {
  constructor(private name: string, private params: Record<string, unknown>) {}

  select() {
    return this
  }

  single() {
    return this
  }

  maybeSingle() {
    return this
  }

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected)
  }

  private async execute(): Promise<QueryResult<T>> {
    try {
      const db = await getD1Database()
      if (!db) return { data: null, error: { message: 'Cloudflare D1 binding DB is unavailable' }, count: null }

      if (this.name === 'ensure_billing_tier') {
        const uid = String(this.params.uid ?? '')
        if (!uid) return { data: null, error: { message: 'ensure_billing_tier requires uid' }, count: null }
        // Free-tier limit must match the canonical value (Postgres column DEFAULT
        // and lib/constants.ts TIER_LIMITS.free.video_analysis) — was 3 here, 5 there.
        await db.prepare(
          `INSERT OR IGNORE INTO user_billing_tiers(id, user_id, tier, video_analysis_used, video_analysis_limit)
           VALUES (?, ?, 'free', 0, 5)`,
        ).bind(uid, uid).run()
        return { data: null, error: null, count: null }
      }

      if (this.name === 'increment_analysis_credit') {
        const uid = String(this.params.uid ?? '')
        // Conditional on the limit so concurrent requests can't push usage past
        // the plan cap (mirrors the Postgres increment_analysis_credit fix).
        await db.prepare(
          'UPDATE user_billing_tiers SET video_analysis_used = video_analysis_used + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND video_analysis_used < video_analysis_limit',
        ).bind(uid).run()
        return { data: null, error: null, count: null }
      }

      if (this.name === 'set_user_tier') {
        const uid = String(this.params.uid ?? '')
        const tier = String(this.params.new_tier ?? 'free')
        // Limits must match the canonical values in supabase/migrations/20260523_billing_tiers.sql
        // and lib/constants.ts TIER_LIMITS (creator=50, scale=500) — this previously
        // granted 100/300, double/under-charging paid tiers on the D1 deployment.
        await db.prepare(
          `INSERT INTO user_billing_tiers(id, user_id, tier, video_analysis_used, video_analysis_limit)
           VALUES (?, ?, ?, 0, CASE WHEN ? = 'scale' THEN 500 WHEN ? = 'creator' THEN 50 ELSE 5 END)
           ON CONFLICT(user_id) DO UPDATE SET
             tier = excluded.tier,
             video_analysis_limit = excluded.video_analysis_limit,
             updated_at = CURRENT_TIMESTAMP`,
        ).bind(uid, uid, tier, tier, tier).run()
        return { data: null, error: null, count: null }
      }

      if (this.name === 'increment_script_cache_hits') {
        const cacheId = String(this.params.cache_id ?? '')
        await db.prepare(
          'UPDATE script_cache SET hit_count = hit_count + 1, updated_at = CURRENT_TIMESTAMP WHERE cache_key = ?',
        ).bind(cacheId).run()
        return { data: null, error: null, count: null }
      }

      return { data: null, error: { message: `Unsupported D1 RPC: ${this.name}` }, count: null }
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : `D1 RPC failed: ${this.name}` },
        count: null,
      }
    }
  }
}

export function createD1SupabaseFacade(cookieStore?: ReadonlyRequestCookies) {
  return new D1SupabaseFacade(cookieStore)
}
