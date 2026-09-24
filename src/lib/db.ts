import Dexie, { type EntityTable } from 'dexie'
import type { AuditRecord, EvidenceRecord, SyncTask } from '../types'

class AuditDatabase extends Dexie {
  audits!: EntityTable<AuditRecord, 'id'>
  evidence!: EntityTable<EvidenceRecord, 'id'>
  syncQueue!: EntityTable<SyncTask, 'id'>

  constructor() {
    super('bksi-audit-db')
    this.version(1).stores({
      audits: 'id, updatedAt, auditDate, title',
      evidence: 'id, auditId, criterionId, [auditId+criterionId], createdAt'
    })
    this.version(2).stores({
      audits: 'id, updatedAt, auditDate, title',
      evidence: 'id, auditId, criterionId, [auditId+criterionId], createdAt',
      syncQueue: 'id, type, entityId, createdAt'
    })
  }
}

export const db = new AuditDatabase()

export async function queueSyncTask(task: Omit<SyncTask, 'id' | 'createdAt'>) {
  await db.syncQueue.put({
    id: `sync_${crypto.randomUUID()}`,
    ...task,
    createdAt: new Date().toISOString()
  })
}

export async function deleteAuditLocal(id: string) {
  await db.transaction('rw', db.audits, db.evidence, async () => {
    await db.evidence.where('auditId').equals(id).delete()
    await db.audits.delete(id)
  })
}
