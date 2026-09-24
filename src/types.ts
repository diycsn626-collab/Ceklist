export type ResultStatus = '' | 'compliant' | 'nonconformity' | 'na'

export interface ChecklistCriterion {
  id: string
  letter: string
  title: string
  criteria: string
  documents: string
}

export interface ChecklistSop {
  number: number
  code: string
  name: string
  department: 'Engineering' | 'HSE'
  criteria: ChecklistCriterion[]
}

export interface AuditResponse {
  result: ResultStatus
  finding: string
  pic: string
  notes: string
}

export interface AuditRecord {
  id: string
  title: string
  company: string
  site: string
  auditDate: string
  auditor: string
  auditee: string
  auditNumber: string
  samplePeriod: string
  scope: 'All' | 'Engineering' | 'HSE'
  responses: Record<string, AuditResponse>
  createdAt: string
  updatedAt: string
  syncedAt?: string
}

export interface EvidenceRecord {
  id: string
  auditId: string
  criterionId: string
  name: string
  type: string
  size: number
  blob?: Blob
  remotePath?: string
  createdAt: string
}

export interface SyncTask {
  id: string
  type: 'delete-audit' | 'delete-evidence'
  entityId: string
  remotePath?: string
  createdAt: string
}
