import { createClient, type User } from '@supabase/supabase-js'
import { db } from './db'
import type { AuditRecord, EvidenceRecord } from '../types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined

export const cloudEnabled = Boolean(url && key)
export const supabase = cloudEnabled ? createClient(url!, key!, {
  auth: { persistSession: true, autoRefreshToken: true }
}) : null

export async function currentUser(): Promise<User | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user
}
export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.user
}
export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}
function safeFileName(name: string) { return name.replace(/[^a-zA-Z0-9._-]+/g, '_') }

export async function syncAuditToCloud(audit: AuditRecord) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.')
  const user = await currentUser()
  if (!user) throw new Error('Silakan login sebelum sinkronisasi.')
  await processSyncQueue()
  const payload: AuditRecord = { ...audit, syncedAt: new Date().toISOString() }
  const { error: auditError } = await supabase.from('audits').upsert({ id: audit.id, user_id: user.id, payload, updated_at: audit.updatedAt })
  if (auditError) throw auditError
  const localEvidence = await db.evidence.where('auditId').equals(audit.id).toArray()
  for (const item of localEvidence) {
    let remotePath = item.remotePath
    if (!remotePath && item.blob) {
      remotePath = `${user.id}/${audit.id}/${item.criterionId}/${item.id}-${safeFileName(item.name)}`
      const { error: uploadError } = await supabase.storage.from('audit-evidence').upload(remotePath, item.blob, { contentType: item.type, upsert: true })
      if (uploadError) throw uploadError
      await db.evidence.update(item.id, { remotePath })
    }
    if (remotePath) {
      const { error: metaError } = await supabase.from('audit_evidence').upsert({
        id: item.id, audit_id: audit.id, user_id: user.id, criterion_id: item.criterionId,
        file_name: item.name, file_type: item.type, file_size: item.size, storage_path: remotePath, created_at: item.createdAt
      })
      if (metaError) throw metaError
    }
  }
  await db.audits.put(payload)
  return payload
}

export async function deleteEvidenceCloud(item: EvidenceRecord) {
  if (!supabase) return
  const user = await currentUser()
  if (!user) throw new Error('Silakan login sebelum menghapus evidence cloud.')
  if (item.remotePath) {
    const { error: storageError } = await supabase.storage.from('audit-evidence').remove([item.remotePath])
    if (storageError) throw storageError
  }
  const { error } = await supabase.from('audit_evidence').delete().eq('id', item.id).eq('user_id', user.id)
  if (error) throw error
}

export async function processSyncQueue() {
  if (!supabase) return
  const user = await currentUser()
  if (!user) return
  const tasks = await db.syncQueue.orderBy('createdAt').toArray()
  for (const task of tasks) {
    try {
      if (task.type === 'delete-audit') {
        await deleteAuditCloud(task.entityId)
      } else if (task.type === 'delete-evidence') {
        if (task.remotePath) {
          const { error: storageError } = await supabase.storage.from('audit-evidence').remove([task.remotePath])
          if (storageError) throw storageError
        }
        const { error } = await supabase.from('audit_evidence').delete().eq('id', task.entityId).eq('user_id', user.id)
        if (error) throw error
      }
      await db.syncQueue.delete(task.id)
    } catch {}
  }
}

export async function pullCloudData() {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.')
  const user = await currentUser()
  if (!user) throw new Error('Silakan login sebelum sinkronisasi.')
  await processSyncQueue()
  const { data: audits, error: auditError } = await supabase.from('audits').select('id,payload,updated_at').eq('user_id', user.id)
  if (auditError) throw auditError
  for (const row of audits ?? []) {
    const remote = row.payload as AuditRecord
    const local = await db.audits.get(row.id)
    if (!local || new Date(remote.updatedAt).getTime() >= new Date(local.updatedAt).getTime()) await db.audits.put(remote)
  }
  const { data: evidenceRows, error: evidenceError } = await supabase.from('audit_evidence').select('*').eq('user_id', user.id)
  if (evidenceError) throw evidenceError
  for (const row of evidenceRows ?? []) {
    const local = await db.evidence.get(row.id)
    await db.evidence.put({
      id: row.id, auditId: row.audit_id, criterionId: row.criterion_id, name: row.file_name,
      type: row.file_type, size: Number(row.file_size ?? 0), remotePath: row.storage_path,
      blob: local?.blob, createdAt: row.created_at
    })
  }
}

export async function getRemoteEvidenceUrl(path: string) {
  if (!supabase) return null
  const { data, error } = await supabase.storage.from('audit-evidence').createSignedUrl(path, 3600)
  if (error) return null
  return data.signedUrl
}

export async function deleteAuditCloud(auditId: string) {
  if (!supabase) return
  const user = await currentUser()
  if (!user) return
  const { data: files } = await supabase.from('audit_evidence').select('storage_path').eq('audit_id', auditId).eq('user_id', user.id)
  const paths = (files ?? []).map(x => x.storage_path).filter(Boolean)
  if (paths.length) await supabase.storage.from('audit-evidence').remove(paths)
  await supabase.from('audits').delete().eq('id', auditId).eq('user_id', user.id)
}
