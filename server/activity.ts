import { getDb, nowIso } from './db'

export function logActivity(
  userId: number,
  type: string,
  label: string,
  entityType?: string,
  entityId?: number,
): void {
  getDb()
    .prepare('INSERT INTO activities (user_id, type, label, entity_type, entity_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(userId, type, label, entityType ?? null, entityId ?? null, nowIso())
}

export function recentActivities(userId: number, limit = 8) {
  return getDb()
    .prepare('SELECT id, type, label, entity_type, entity_id, created_at FROM activities WHERE user_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(userId, limit)
    .map((row) => {
      const r = row as Record<string, unknown>
      return {
        id: Number(r.id),
        type: String(r.type),
        label: String(r.label),
        entityType: r.entity_type ? String(r.entity_type) : null,
        entityId: r.entity_id ? Number(r.entity_id) : null,
        createdAt: String(r.created_at),
      }
    })
}
