import { useEffect, useMemo, useState } from 'react'
import { db, deleteAuditLocal, queueSyncTask } from './lib/db'
import { CHECKLIST, auditProgress, emptyResponse, exportAuditCsv, uid } from './lib/utils'
import type { AuditRecord, AuditResponse, EvidenceRecord } from './types'

const MAX_FILES = 5
const MAX_FILE_SIZE = 8 * 1024 * 1024

function newAudit(title: string, scope: AuditRecord['scope']): AuditRecord {
  const now = new Date().toISOString()
  return {
    id: uid('audit'), title, company: 'PT Batu Karang Saham Investasi', site: '', auditDate: now.slice(0,10),
    auditor: '', auditee: '', auditNumber: '', samplePeriod: '', scope, responses: {}, createdAt: now, updatedAt: now
  }
}

export default function App() {
  const [audits,setAudits]=useState<AuditRecord[]>([])
  const [selected,setSelected]=useState<string>('')
  const [expanded,setExpanded]=useState<Record<string,boolean>>({})
  const [evidence,setEvidence]=useState<EvidenceRecord[]>([])
  const [showNew,setShowNew]=useState(false)
  const [title,setTitle]=useState('')
  const [scope,setScope]=useState<AuditRecord['scope']>('All')
  const [query,setQuery]=useState('')

  const audit=audits.find(a=>a.id===selected)
  const load=async()=>{
    const list=await db.audits.orderBy('updatedAt').reverse().toArray()
    setAudits(list)
    if(!selected && list[0]) setSelected(list[0].id)
  }
  useEffect(()=>{load()},[])
  useEffect(()=>{ if(selected) db.evidence.where('auditId').equals(selected).toArray().then(setEvidence); else setEvidence([])},[selected])

  const save=async(next:AuditRecord)=>{
    next={...next,updatedAt:new Date().toISOString()}
    await db.audits.put(next)
    setAudits(v=>v.map(x=>x.id===next.id?next:x).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)))
  }
  const create=async()=>{
    if(!title.trim()) return alert('Judul audit wajib diisi.')
    const a=newAudit(title.trim(),scope)
    await db.audits.add(a); setAudits(v=>[a,...v]); setSelected(a.id); setTitle(''); setShowNew(false)
  }
  const remove=async(a:AuditRecord)=>{
    if(!confirm(`Hapus audit "${a.title}"?`)) return
    await queueSyncTask({type:'delete-audit',entityId:a.id})
    await deleteAuditLocal(a.id)
    const rest=audits.filter(x=>x.id!==a.id); setAudits(rest); setSelected(rest[0]?.id||'')
  }
  const setField=(key:keyof AuditRecord,value:string)=>audit&&save({...audit,[key]:value})
  const setResponse=(id:string,patch:Partial<AuditResponse>)=>{
    if(!audit)return
    const current=audit.responses[id]??emptyResponse()
    save({...audit,responses:{...audit.responses,[id]:{...current,...patch}}})
  }
  const addEvidence=async(criterionId:string,files:FileList|null)=>{
    if(!audit||!files)return
    const existing=evidence.filter(x=>x.criterionId===criterionId)
    const chosen=Array.from(files).slice(0,Math.max(0,MAX_FILES-existing.length))
    for(const file of chosen){
      if(file.size>MAX_FILE_SIZE){alert(`${file.name} lebih dari 8 MB`);continue}
      const row:EvidenceRecord={id:uid('ev'),auditId:audit.id,criterionId,name:file.name,type:file.type,size:file.size,blob:file,createdAt:new Date().toISOString()}
      await db.evidence.add(row); setEvidence(v=>[...v,row])
    }
  }
  const removeEvidence=async(item:EvidenceRecord)=>{
    await queueSyncTask({type:'delete-evidence',entityId:item.id,remotePath:item.remotePath})
    await db.evidence.delete(item.id); setEvidence(v=>v.filter(x=>x.id!==item.id))
  }
  const openEvidence=async(item:EvidenceRecord)=>{
    if(!item.blob)return alert('File hanya tersedia di cloud. Sinkronkan untuk membukanya.')
    const url=URL.createObjectURL(item.blob); window.open(url,'_blank'); setTimeout(()=>URL.revokeObjectURL(url),30000)
  }

  const sops=useMemo(()=>CHECKLIST.filter(s=>(!audit||audit.scope==='All'||s.department===audit.scope)&&(!query||(`${s.code} ${s.name}`).toLowerCase().includes(query.toLowerCase()))),[audit,query])
  const stats=audit?auditProgress(audit):null

  return <div className="app">
    <header>
      <div className="brand"><img src={`${import.meta.env.BASE_URL}logo-bksi.svg`}/><div><b>BKSI AUDIT</b><small>Engineering & HSE Compliance</small></div></div>
      <button className="primary" onClick={()=>setShowNew(true)}>+ Audit Baru</button>
    </header>

    <main>
      <aside>
        <h3>Daftar Audit</h3>
        {audits.length===0&&<p className="muted">Belum ada audit. Buat audit baru untuk mulai.</p>}
        {audits.map(a=><div key={a.id} className={`audit-card ${a.id===selected?'active':''}`} onClick={()=>setSelected(a.id)}>
          <b>{a.title}</b><small>{a.auditDate} · {a.scope}</small>
          <div className="card-actions"><span>{auditProgress(a).percent}%</span><button onClick={e=>{e.stopPropagation();remove(a)}}>Hapus</button></div>
        </div>)}
      </aside>

      <section className="content">
        {!audit?<div className="empty"><h1>Checklist Audit BKSI</h1><p>Pilih audit atau buat audit baru.</p><button className="primary" onClick={()=>setShowNew(true)}>Buat Audit</button></div>:<>
          <div className="hero">
            <div><span className="badge">{audit.scope}</span><input className="title-input" value={audit.title} onChange={e=>setField('title',e.target.value)}/></div>
            <button onClick={()=>exportAuditCsv(audit)}>Export CSV</button>
          </div>
          <div className="meta">
            <label>Site / Project<input value={audit.site} onChange={e=>setField('site',e.target.value)}/></label>
            <label>Tanggal Audit<input type="date" value={audit.auditDate} onChange={e=>setField('auditDate',e.target.value)}/></label>
            <label>Auditor<input value={audit.auditor} onChange={e=>setField('auditor',e.target.value)}/></label>
            <label>Auditee<input value={audit.auditee} onChange={e=>setField('auditee',e.target.value)}/></label>
          </div>
          {stats&&<div className="stats">
            <div><b>{stats.percent}%</b><span>Progress</span></div><div><b>{stats.answered}/{stats.total}</b><span>Terisi</span></div>
            <div><b>{stats.compliant}</b><span>Sesuai</span></div><div><b>{stats.nonconformity}</b><span>Tidak Sesuai</span></div>
          </div>}
          <input className="search" placeholder="Cari SOP..." value={query} onChange={e=>setQuery(e.target.value)}/>
          {sops.map(sop=><article className="sop" key={sop.code}>
            <div className="sop-head"><div><span>{sop.department}</span><b>{sop.code}</b></div><h3>{sop.name}</h3></div>
            {sop.criteria.map(c=>{
              const r=audit.responses[c.id]??emptyResponse(), open=!!expanded[c.id], ev=evidence.filter(x=>x.criterionId===c.id)
              return <div className="criterion" key={c.id}>
                <button className="criterion-head" onClick={()=>setExpanded(x=>({...x,[c.id]:!open}))}>
                  <span className="letter">{c.letter}</span><span><b>{c.title}</b><small>{r.result==='compliant'?'✓ Ada / Sesuai':r.result==='nonconformity'?'✕ Tidak Sesuai':r.result==='na'?'N/A':'Belum diisi'}</small></span><strong>{open?'⌃':'⌄'}</strong>
                </button>
                {open&&<div className="criterion-body">
                  <div className="info"><b>Kriteria Audit</b><p>{c.criteria}</p></div>
                  <div className="info docs"><b>Dokumen yang diperiksa</b><p>{c.documents||'-'}</p></div>
                  <div className="status-row">
                    {([['compliant','Ada / Sesuai'],['nonconformity','Tidak Ada / Tidak Sesuai'],['na','N/A']] as const).map(([v,l])=><button className={r.result===v?'selected':''} onClick={()=>setResponse(c.id,{result:v})}>{l}</button>)}
                  </div>
                  <label>Temuan / Keterangan<textarea value={r.finding} onChange={e=>setResponse(c.id,{finding:e.target.value})}/></label>
                  <div className="two"><label>PIC<input value={r.pic} onChange={e=>setResponse(c.id,{pic:e.target.value})}/></label><label>Catatan<input value={r.notes} onChange={e=>setResponse(c.id,{notes:e.target.value})}/></label></div>
                  <div className="evidence"><b>Evidence Foto ({ev.length}/{MAX_FILES})</b>
                    <label className="upload">+ Tambah Foto<input hidden type="file" accept="image/*" multiple onChange={e=>addEvidence(c.id,e.target.files)}/></label>
                    <div className="evidence-list">{ev.map(x=><div key={x.id}><button onClick={()=>openEvidence(x)}>{x.name}</button><button className="danger" onClick={()=>removeEvidence(x)}>×</button></div>)}</div>
                  </div>
                </div>}
              </div>
            })}
          </article>)}
        </>}
      </section>
    </main>

    {showNew&&<div className="modal"><div className="dialog"><h2>Audit Baru</h2><label>Judul Audit<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Contoh: Audit Kepatuhan SOP ASKON September 2026"/></label><label>Scope<select value={scope} onChange={e=>setScope(e.target.value as AuditRecord['scope'])}><option value="All">Engineering + HSE</option><option>Engineering</option><option>HSE</option></select></label><div><button onClick={()=>setShowNew(false)}>Batal</button><button className="primary" onClick={create}>Buat Audit</button></div></div></div>}
  </div>
}
