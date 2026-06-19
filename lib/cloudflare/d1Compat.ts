import 'server-only'
import { getD1Database, type D1DatabaseLike } from '@/lib/cloudflare/env'

type Primitive = string | number | boolean | Date | null
type RecordData = Record<string, unknown>
type LoosePrismaValue = ReturnType<typeof JSON.parse>

type ModelConfig = {
  table: string
  fields: Record<string, string>
  jsonFields?: Set<string>
  booleanFields?: Set<string>
  dateFields?: Set<string>
  updatedAtField?: string
}

type FindArgs = {
  where?: RecordData
  select?: Record<string, boolean>
  orderBy?: RecordData
  take?: number
}

type WriteArgs = {
  where?: RecordData
  data?: RecordData | RecordData[]
  create?: RecordData
  update?: RecordData
  select?: Record<string, boolean>
}

type D1CompatDelegate = {
  findUnique(args: LoosePrismaValue): Promise<LoosePrismaValue | null>
  findMany(args?: LoosePrismaValue): Promise<LoosePrismaValue[]>
  create(args: LoosePrismaValue): Promise<LoosePrismaValue>
  createMany(args: LoosePrismaValue): Promise<{ count: number }>
  update(args: LoosePrismaValue): Promise<LoosePrismaValue>
  updateMany(args: LoosePrismaValue): Promise<{ count: number }>
  upsert(args: LoosePrismaValue): Promise<LoosePrismaValue>
  delete(args: LoosePrismaValue): Promise<LoosePrismaValue>
  groupBy(args: LoosePrismaValue): Promise<LoosePrismaValue[]>
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/

const COMMON_DATE_FIELDS = new Set(['createdAt', 'updatedAt', 'publishedAt', 'currentPeriodEnd'])

const models = {
  user: {
    table: 'users',
    fields: {
      id: 'id',
      email: 'email',
      name: 'name',
      avatarUrl: 'avatar_url',
      role: 'role',
      accountStatus: 'account_status',
      affiliateCode: 'affiliateCode',
      whitelabelPdfPasses: 'whitelabelPdfPasses',
      referralSource: 'referral_source',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    dateFields: COMMON_DATE_FIELDS,
    updatedAtField: 'updatedAt',
  },
  blogPost: {
    table: 'blog_posts',
    fields: {
      id: 'id',
      slug: 'slug',
      title: 'title',
      excerpt: 'excerpt',
      content: 'content',
      coverImage: 'cover_image',
      category: 'category',
      tags: 'tags',
      authorName: 'author_name',
      authorImage: 'author_image',
      status: 'status',
      seoTitle: 'seo_title',
      seoDesc: 'seo_desc',
      viewCount: 'view_count',
      publishedAt: 'published_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    jsonFields: new Set(['tags']),
    dateFields: COMMON_DATE_FIELDS,
    updatedAtField: 'updatedAt',
  },
  paymentConfig: {
    table: 'payment_configs',
    fields: {
      id: 'id',
      provider: 'provider',
      mode: 'mode',
      secretKey: 'secret_key',
      publicKey: 'public_key',
      webhookSecret: 'webhook_secret',
      clientId: 'client_id',
      extraConfig: 'extra_config',
      isEnabled: 'is_enabled',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    jsonFields: new Set(['extraConfig']),
    booleanFields: new Set(['isEnabled']),
    dateFields: COMMON_DATE_FIELDS,
    updatedAtField: 'updatedAt',
  },
  spamRule: {
    table: 'spam_rules',
    fields: {
      id: 'id',
      name: 'name',
      description: 'description',
      ruleType: 'rule_type',
      config: 'config',
      autoAction: 'auto_action',
      isEnabled: 'is_enabled',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    jsonFields: new Set(['config']),
    booleanFields: new Set(['isEnabled']),
    dateFields: COMMON_DATE_FIELDS,
    updatedAtField: 'updatedAt',
  },
  badgeLog: {
    table: 'badge_logs',
    fields: {
      id: 'id',
      userId: 'user_id',
      badgeType: 'badge_type',
      createdAt: 'created_at',
    },
    dateFields: COMMON_DATE_FIELDS,
  },
  affiliateLink: {
    table: 'affiliate_links',
    fields: {
      id: 'id',
      userId: 'user_id',
      code: 'code',
      destination: 'destination',
      clicks: 'clicks',
      conversions: 'conversions',
      revenue: 'revenue',
      isActive: 'is_active',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    booleanFields: new Set(['isActive']),
    dateFields: COMMON_DATE_FIELDS,
    updatedAtField: 'updatedAt',
  },
} satisfies Record<string, ModelConfig>

function quote(identifier: string) {
  if (!IDENTIFIER.test(identifier)) throw new Error(`Unsupported SQL identifier: ${identifier}`)
  return `"${identifier}"`
}

function randomId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function parseJson(value: unknown) {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) return value
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

function toDbValue(config: ModelConfig, field: string, value: unknown): unknown {
  if (value === undefined) return undefined
  if (value === null) return null
  if (value instanceof Date) return value.toISOString()
  if (config.booleanFields?.has(field)) return value ? 1 : 0
  if (config.jsonFields?.has(field)) return JSON.stringify(value)
  if (typeof value === 'object') return JSON.stringify(value)
  return value as Primitive
}

function fromDbValue(config: ModelConfig, field: string, value: unknown): unknown {
  if (value == null) return value
  if (config.booleanFields?.has(field)) return Boolean(value)
  if (config.jsonFields?.has(field)) return parseJson(value)
  if (config.dateFields?.has(field)) return new Date(String(value))
  return value
}

function fieldToColumn(config: ModelConfig, field: string) {
  const column = config.fields[field] ?? field
  return quote(column)
}

function modelToDb(config: ModelConfig, data: RecordData, mode: 'create' | 'update') {
  const values: RecordData = {}
  if (mode === 'create' && !('id' in data)) values.id = randomId()

  for (const [field, rawValue] of Object.entries(data)) {
    if (rawValue === undefined) continue
    if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue) && !(rawValue instanceof Date)) {
      const op = rawValue as RecordData
      if ('increment' in op || 'decrement' in op) continue
    }
    const column = config.fields[field] ?? field
    values[column] = toDbValue(config, field, rawValue)
  }

  if (mode === 'update' && config.updatedAtField && !(config.fields[config.updatedAtField] in values)) {
    values[config.fields[config.updatedAtField]] = new Date().toISOString()
  }

  if (mode === 'create') {
    const createdColumn = config.fields.createdAt
    const updatedColumn = config.fields.updatedAt
    if (createdColumn && !(createdColumn in values)) values[createdColumn] = new Date().toISOString()
    if (updatedColumn && !(updatedColumn in values)) values[updatedColumn] = new Date().toISOString()
  }

  return values
}

function dbToModel(config: ModelConfig, row: RecordData | null, select?: Record<string, boolean>) {
  if (!row) return null
  const reverse = new Map(Object.entries(config.fields).map(([field, column]) => [column, field]))
  const model: RecordData = {}
  for (const [column, value] of Object.entries(row)) {
    const field = reverse.get(column) ?? column
    if (select && !select[field]) continue
    model[field] = fromDbValue(config, field, value)
  }
  return model
}

function buildSelect(config: ModelConfig, select?: Record<string, boolean>) {
  if (!select) return '*'
  const columns = Object.entries(select)
    .filter(([, enabled]) => enabled)
    .map(([field]) => fieldToColumn(config, field))
  return columns.length ? columns.join(', ') : '*'
}

function buildWhere(config: ModelConfig, where?: RecordData) {
  if (!where || Object.keys(where).length === 0) return { sql: '', values: [] as unknown[] }
  const clauses: string[] = []
  const values: unknown[] = []

  for (const [field, rawValue] of Object.entries(where)) {
    const column = fieldToColumn(config, field)
    if (rawValue === null) {
      clauses.push(`${column} IS NULL`)
      continue
    }
    if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue) && !(rawValue instanceof Date)) {
      const op = rawValue as RecordData
      if ('in' in op && Array.isArray(op.in)) {
        const list = op.in as unknown[]
        clauses.push(list.length ? `${column} IN (${list.map(() => '?').join(', ')})` : '1 = 0')
        values.push(...list.map(value => toDbValue(config, field, value)))
        continue
      }
      if ('not' in op) {
        if (op.not === null) clauses.push(`${column} IS NOT NULL`)
        else {
          clauses.push(`${column} != ?`)
          values.push(toDbValue(config, field, op.not))
        }
        continue
      }
    }
    clauses.push(`${column} = ?`)
    values.push(toDbValue(config, field, rawValue))
  }

  return { sql: ` WHERE ${clauses.join(' AND ')}`, values }
}

function buildOrder(config: ModelConfig, orderBy?: RecordData) {
  if (!orderBy) return ''
  const parts: string[] = []
  for (const [field, direction] of Object.entries(orderBy)) {
    if (field === '_count' && direction && typeof direction === 'object') {
      const countOrder = direction as Record<string, string>
      const dir = Object.values(countOrder)[0] === 'asc' ? 'ASC' : 'DESC'
      parts.push(`COUNT(*) ${dir}`)
      continue
    }
    parts.push(`${fieldToColumn(config, field)} ${direction === 'asc' ? 'ASC' : 'DESC'}`)
  }
  return parts.length ? ` ORDER BY ${parts.join(', ')}` : ''
}

async function getDb() {
  const db = await getD1Database()
  if (!db) {
    throw new Error('Cloudflare D1 binding DB is unavailable.')
  }
  return db
}

async function all<T = RecordData>(db: D1DatabaseLike, sql: string, values: unknown[] = []) {
  const statement = values.length ? db.prepare(sql).bind(...values) : db.prepare(sql)
  const result = await statement.all<T>()
  return result.results ?? []
}

async function first<T = RecordData>(db: D1DatabaseLike, sql: string, values: unknown[] = []) {
  const statement = values.length ? db.prepare(sql).bind(...values) : db.prepare(sql)
  return await statement.first<T>()
}

async function run(db: D1DatabaseLike, sql: string, values: unknown[] = []) {
  const statement = values.length ? db.prepare(sql).bind(...values) : db.prepare(sql)
  await statement.run()
}

function updateAssignments(config: ModelConfig, data: RecordData) {
  const assignments: string[] = []
  const values: unknown[] = []

  for (const [field, rawValue] of Object.entries(data)) {
    if (rawValue === undefined) continue
    const column = fieldToColumn(config, field)
    if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue) && !(rawValue instanceof Date)) {
      const op = rawValue as RecordData
      if ('increment' in op) {
        assignments.push(`${column} = COALESCE(${column}, 0) + ?`)
        values.push(op.increment)
        continue
      }
      if ('decrement' in op) {
        assignments.push(`${column} = COALESCE(${column}, 0) - ?`)
        values.push(op.decrement)
        continue
      }
    }
    assignments.push(`${column} = ?`)
    values.push(toDbValue(config, field, rawValue))
  }

  if (config.updatedAtField && !(config.updatedAtField in data)) {
    assignments.push(`${fieldToColumn(config, config.updatedAtField)} = ?`)
    values.push(new Date().toISOString())
  }

  return { sql: assignments.join(', '), values }
}

function createModelDelegate(config: ModelConfig): D1CompatDelegate {
  return {
    async findUnique(args: FindArgs) {
      const db = await getDb()
      const where = buildWhere(config, args.where)
      const sql = `SELECT ${buildSelect(config, args.select)} FROM ${quote(config.table)}${where.sql} LIMIT 1`
      return dbToModel(config, await first(db, sql, where.values), args.select)
    },

    async findMany(args: FindArgs = {}) {
      const db = await getDb()
      const where = buildWhere(config, args.where)
      const limit = args.take ? ` LIMIT ${Math.max(0, args.take)}` : ''
      const sql = `SELECT ${buildSelect(config, args.select)} FROM ${quote(config.table)}${where.sql}${buildOrder(config, args.orderBy)}${limit}`
      const rows = await all(db, sql, where.values)
      return rows.map(row => dbToModel(config, row, args.select))
    },

    async create(args: WriteArgs) {
      const db = await getDb()
      const data = modelToDb(config, (args.data ?? {}) as RecordData, 'create')
      const columns = Object.keys(data)
      const values = Object.values(data)
      await run(
        db,
        `INSERT INTO ${quote(config.table)} (${columns.map(quote).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
        values,
      )
      return this.findUnique({ where: { id: data.id }, select: args.select })
    },

    async createMany(args: WriteArgs) {
      const db = await getDb()
      const rows = Array.isArray(args.data) ? args.data : []
      for (const row of rows) {
        const data = modelToDb(config, row, 'create')
        const columns = Object.keys(data)
        await run(
          db,
          `INSERT OR IGNORE INTO ${quote(config.table)} (${columns.map(quote).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
          Object.values(data),
        )
      }
      return { count: rows.length }
    },

    async update(args: WriteArgs) {
      const db = await getDb()
      const where = buildWhere(config, args.where)
      const updates = updateAssignments(config, (args.data ?? {}) as RecordData)
      if (!updates.sql) throw new Error('No update data supplied')
      await run(db, `UPDATE ${quote(config.table)} SET ${updates.sql}${where.sql}`, [...updates.values, ...where.values])
      return this.findUnique({ where: args.where, select: args.select })
    },

    async updateMany(args: WriteArgs) {
      const db = await getDb()
      const where = buildWhere(config, args.where)
      const updates = updateAssignments(config, (args.data ?? {}) as RecordData)
      if (!updates.sql) return { count: 0 }
      const before = await all(db, `SELECT 1 FROM ${quote(config.table)}${where.sql}`, where.values)
      await run(db, `UPDATE ${quote(config.table)} SET ${updates.sql}${where.sql}`, [...updates.values, ...where.values])
      return { count: before.length }
    },

    async upsert(args: WriteArgs) {
      const existing = await this.findUnique({ where: args.where })
      if (existing) {
      return this.update({ where: args.where, data: (args.update ?? {}) as RecordData, select: args.select })
      }
      return this.create({ data: args.create, select: args.select })
    },

    async delete(args: WriteArgs) {
      const db = await getDb()
      const existing = await this.findUnique({ where: args.where, select: args.select })
      const where = buildWhere(config, args.where)
      await run(db, `DELETE FROM ${quote(config.table)}${where.sql}`, where.values)
      return existing
    },

    async groupBy(args: { by: string[]; orderBy?: RecordData }) {
      const db = await getDb()
      const by = args.by.map(field => ({ field, column: fieldToColumn(config, field) }))
      const select = by.map(item => item.column).join(', ')
      const order = buildOrder(config, args.orderBy)
      const rows = await all(db, `SELECT ${select}, COUNT(*) AS "_count_id" FROM ${quote(config.table)} GROUP BY ${select}${order}`)
      return rows.map(row => {
        const model = dbToModel(config, row) ?? {}
        model._count = { id: row._count_id }
        delete model._count_id
        return model
      })
    },
  }
}

export const d1Db: Record<string, D1CompatDelegate> = {
  user: createModelDelegate(models.user),
  blogPost: createModelDelegate(models.blogPost),
  paymentConfig: createModelDelegate(models.paymentConfig),
  spamRule: createModelDelegate(models.spamRule),
  badgeLog: createModelDelegate(models.badgeLog),
  affiliateLink: createModelDelegate(models.affiliateLink),
}
