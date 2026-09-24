import checklist1 from '../data/checklist-1.json'
import checklist2 from '../data/checklist-2.json'
import checklist3 from '../data/checklist-3.json'
import type { AuditRecord, AuditResponse, ChecklistSop } from '../types'

export const CHECKLIST = [...checklist1, ...checklist2, ...checklist3] as ChecklistSop[]
export const ALL_CRITERIA = CHECKLIST.flatMap(s => s.criteria)

export const emptyResponse = (): AuditResponse => ({ result: '', finding: '', pic: '', notes: '' })

export function getCriterionTitle(criteria: string, fallback: string) {
  const parts = criteria.split('. ')
  if (parts.length > 1) {
    const sentence = parts[1].split('.')[0]?.trim()
    if (sentence) return sentence
  }
  return fallback
}

export function auditProgress(audit: AuditRecord) {
  const included = CHECKLIST.filter(s => audit.scope === 'All' || s.department === audit.scope)
  const ids = included.flatMap(s => s.criteria.map(c => c.id))
  const answered = ids.filter(id => audit.responses[id]?.result).length
  const compliant = ids.filter(id => audit.responses[id]?.result === 'compliant').length
  const nonconformity = ids.filter(id => audit.responses[id]?.result === 'nonconformity').length
  const na = ids.filter(id => audit.responses[id]?.result === 'na').length
  return {
    total: ids.length,
    answered,
    compliant,
    nonconformity,
    na,
    percent: ids.length ? Math.round(answered / ids.length * 100) : 0,
    conformity: (compliant + nonconformity) ? Math.round(compliant / (compliant + nonconformity) * 100) : 0
  }
}

export function formatDate(value: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

export function uid(prefix = 'id') {
  return `${prefix}_${crypto.randomUUID()}`
}

export function downloadText(filename: string, content: string, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportAuditCsv(audit: AuditRecord) {
  const rows: string[][] = [[
    'Judul Audit', 'Tanggal', 'Perusahaan', 'Project/Site', 'Departemen', 'Kode SOP', 'Nama SOP', 'Butir',
    'Kriteria Audit', 'Dokumen yang Diperiksa', 'Hasil', 'Temuan/Keterangan', 'PIC', 'Catatan'
  ]]

  for (const sop of CHECKLIST) {
    if (audit.scope !== 'All' && sop.department !== audit.scope) continue
    for (const criterion of sop.criteria) {
      const r = audit.responses[criterion.id] ?? emptyResponse()
      const result = r.result === 'compliant' ? 'Ada/Sesuai' : r.result === 'nonconformity' ? 'Tidak Ada/Tidak Sesuai' : r.result === 'na' ? 'N/A' : ''
      rows.push([
        audit.title, audit.auditDate, audit.company, audit.site, sop.department, sop.code, sop.name, criterion.letter,
        criterion.criteria, criterion.documents, result, r.finding, r.pic, r.notes
      ])
    }
  }
  const csv = '\uFEFF' + rows.map(row => row.map(v => `"${String(v ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
  downloadText(`${audit.title.replace(/[^a-z0-9]+/gi, '_') || 'audit'}.csv`, csv, 'text/csv;charset=utf-8')
}
