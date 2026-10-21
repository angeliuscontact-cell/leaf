import { DatabaseSync } from 'node:sqlite'
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from './env'

const here = dirname(fileURLToPath(import.meta.url))
let db: DatabaseSync | null = null

function ensureDir(path: string) {
  const dir = dirname(resolve(path))
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function migrate(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `)
  const applied = new Set(
    database.prepare('SELECT name FROM schema_migrations').all().map((row) => String((row as { name: string }).name)),
  )
  const migrationsDir = join(here, 'migrations')
  const files = existsSync(migrationsDir) ? readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort() : []
  for (const file of files) {
    if (applied.has(file)) continue
    const sql = readFileSync(join(migrationsDir, file), 'utf8')
    database.exec('BEGIN')
    try {
      database.exec(sql)
      database.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)').run(file, new Date().toISOString())
      database.exec('COMMIT')
      console.log(`[db] applied ${file}`)
    } catch (error) {
      database.exec('ROLLBACK')
      throw error
    }
  }
}

export function getDb(): DatabaseSync {
  if (db) return db
  if (env.dbPath !== ':memory:') ensureDir(env.dbPath)
  db = new DatabaseSync(env.dbPath)
  db.exec('PRAGMA foreign_keys = ON;')
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA busy_timeout = 5000;')
  migrate(db)
  return db
}

export function closeDb() {
  if (db) {
    db.close()
    db = null
  }
}

export function nowIso() {
  return new Date().toISOString()
}

export function addDaysIso(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

export function transaction<T>(fn: () => T): T {
  const database = getDb()
  database.exec('BEGIN')
  try {
    const result = fn()
    database.exec('COMMIT')
    return result
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}
