'use client'

import Page from '@/components/Page'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

type Doc = { id: string; original_name: string; status: string; size_bytes: number; ai_category?: string | null; ai_confidence?: number | null }
type Item = { id: string; name: string; description?: string | null; required: boolean; status: string; documents?: Doc[] }

export default function CaseDetail() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [uploadBusy, setUploadBusy] = useState<string | null>(null)
  const [replaceBusy, setReplaceBusy] = useState<string | null>(null)
  const [workflowBusy, setWorkflowBusy] = useState(false)
  const [workflowResult, setWorkflowResult] = useState<any>(null)
  const [portalBusy, setPortalBusy] = useState(false)
  const [portalUrl, setPortalUrl] = useState('')
  const [messages, setMessages] = useState<any[]>([])
  const [message, setMessage] = useState('')
  const [messageBusy, setMessageBusy] = useState(false)
  const [messageError, setMessageError] = useState('')
  const [commBusy, setCommBusy] = useState<string | null>(null)
  const [commResult, setCommResult] = useState('')
  const [aiBusy, setAiBusy] = useState<string | null>(null)
  const [reviewBusy, setReviewBusy] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const load = async () => {
    const response = await fetch(`/api/cases/${params.id}`, { cache: 'no-store' })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Pratica non disponibile')
    setData(payload.case)
  }

  const loadMessages = async () => {
    const response = await fetch(`/api/cases/${params.id}/messages`, { cache: 'no-store' })
    if (!response.ok) return
    const payload = await response.json()
    setMessages(payload.messages || [])
  }

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : 'Pratica non disponibile'))
    void loadMessages()
  }, [params.id])

  const upload = async (itemId: string, file: File) => {
    setUploadBusy(itemId); setError('')
    try {
      const form = new FormData(); form.set('caseId', params.id); form.set('itemId', itemId); form.set('file', file)
      const response = await fetch('/api/upload', { method: 'POST', body: form })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Upload non riuscito')
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Upload non riuscito') } finally { setUploadBusy(null) }
  }

  const replace = async (documentId: string, file: File) => {
    setReplaceBusy(documentId); setError('')
    try {
      const form = new FormData(); form.set('file', file)
      const response = await fetch(`/api/documents/${documentId}/replace`, { method: 'POST', body: form })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Sostituzione non riuscita')
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Sostituzione non riuscita') } finally { setReplaceBusy(null) }
  }

  const openDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/download`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Documento non disponibile')
      window.open(payload.url, '_blank', 'noopener,noreferrer')
    } catch (err) { setError(err instanceof Error ? err.message : 'Documento non disponibile') }
  }

  const analyze = async (documentId: string) => {
    setAiBusy(documentId); setError('')
    try {
      const response = await fetch('/api/ai/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Analisi AI non riuscita')
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Analisi AI non riuscita') } finally { setAiBusy(null) }
  }

  const review = async (documentId: string, decision: 'approved' | 'revision_requested') => {
    setReviewBusy(documentId); setError('')
    try {
      const response = await fetch('/api/documents/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId, decision, note: notes[documentId] || '' }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Revisione non riuscita')
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Revisione non riuscita') } finally { setReviewBusy(null) }
  }

  const workflow = async (dryRun: boolean) => {
    setWorkflowBusy(true); setWorkflowResult(null); setError('')
    try {
      const response = await fetch(`/api/cases/${params.id}/workflow`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dryRun }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Workflow non riuscito')
      setWorkflowResult(payload)
      if (!dryRun) await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Workflow non riuscito') } finally { setWorkflowBusy(false) }
  }

  const regenerate = async () => {
    setPortalBusy(true); setError('')
    try {
      const response = await fetch(`/api/cases/${params.id}`, { method: 'POST' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Link non disponibile')
      setPortalUrl(payload.portalUrl)
    } catch (err) { setError(err instanceof Error ? err.message : 'Link non disponibile') } finally { setPortalBusy(false) }
  }

  const communicate = async (action: string) => {
    setCommBusy(action); setCommResult(''); setError('')
    try {
      const response = await fetch(`/api/cases/${params.id}/communications`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Invio non riuscito')
      setCommResult(`Email inviata a ${payload.to}`)
      if (payload.portalUrl) setPortalUrl(payload.portalUrl)
    } catch (err) { setError(err instanceof Error ? err.message : 'Invio non riuscito') } finally { setCommBusy(null) }
  }

  const sendMessage = async () => {
    setMessageBusy(true); setMessageError('')
    try {
      const response = await fetch(`/api/cases/${params.id}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: message }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Invio non riuscito')
      setMessage(''); await loadMessages()
    } catch (err) { setMessageError(err instanceof Error ? err.message : 'Invio non riuscito') } finally { setMessageBusy(false) }
  }

  if (error && !data) return <Page title="Pratica"><div className="card" style={{ color: '#b42318' }}>{error}</div></Page>
  if (!data) return <Page title="Pratica"><div className="card">Caricamento...</div></Page>

  const items = (data.case_items || []) as Item[]
  const received = items.filter((item) => (item.documents || []).length > 0).length

  return (
    <Page title={data.title} description={`${data.clients?.name || 'Cliente'} · ${received} di ${items.length} documenti ricevuti`}>
      {error && <div className="card" style={{ marginBottom: 14, color: '#b42318' }}>{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div><h3 style={{ margin: '0 0 4px' }}>Documenti richiesti</h3><div className="muted">Scadenza: {data.due_date ? new Date(data.due_date).toLocaleDateString('it-IT') : 'non impostata'}</div></div>
          <span className={'badge ' + (data.status === 'completed' ? 'green' : 'amber')}>{data.status === 'completed' ? 'Completa' : 'Aperta'}</span>
        </div>

        {items.map((item) => {
          const doc = item.documents?.[0]
          return (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: '16px 0', borderBottom: '1px solid #e4eaf2', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 220, flex: '1 1 320px' }}>
                <b>{item.name}</b>{item.required && <span className="muted" style={{ fontSize: 11 }}> · obbligatorio</span>}
                <div className="muted" style={{ fontSize: 12 }}>{doc ? `${doc.original_name} · ${doc.status}` : 'Documento mancante'}</div>
                {doc?.ai_category && <div style={{ fontSize: 12, marginTop: 5 }}><b>AI:</b> {doc.ai_category}{typeof doc.ai_confidence === 'number' ? ` · ${Math.round(doc.ai_confidence * 100)}%` : ''}</div>}
                {doc && <textarea value={notes[doc.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [doc.id]: event.target.value }))} placeholder="Nota per la revisione (facoltativa)" style={{ marginTop: 8, width: '100%', maxWidth: 520, minHeight: 54, padding: 8, border: '1px solid #e4eaf2', borderRadius: 8, fontSize: 12 }} />}
              </div>

              {doc ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className={'badge ' + (doc.status === 'verified' ? 'green' : doc.status === 'revision_requested' ? 'amber' : 'blue')}>{doc.status === 'verified' ? 'Approvato' : doc.status === 'revision_requested' ? 'Da correggere' : 'Da verificare'}</span>
                  <button className="btn secondary" onClick={() => openDocument(doc.id)}>Apri</button>
                  <input ref={(element) => { inputRefs.current[`replace-${doc.id}`] = element }} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void replace(doc.id, file); event.currentTarget.value = '' }} />
                  <button className="btn secondary" disabled={replaceBusy === doc.id} onClick={() => inputRefs.current[`replace-${doc.id}`]?.click()}>{replaceBusy === doc.id ? 'Sostituzione...' : 'Sostituisci'}</button>
                  {doc.status !== 'verified' && <><button className="btn secondary" disabled={aiBusy === doc.id} onClick={() => void analyze(doc.id)}>{aiBusy === doc.id ? 'Analisi...' : 'Analizza AI'}</button><button className="btn secondary" disabled={reviewBusy === doc.id} onClick={() => void review(doc.id, 'approved')}>{reviewBusy === doc.id ? '...' : 'Approva'}</button><button className="btn secondary" disabled={reviewBusy === doc.id} onClick={() => void review(doc.id, 'revision_requested')}>Richiedi correzione</button></>}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge amber">Mancante</span>
                  <input ref={(element) => { inputRefs.current[item.id] = element }} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(item.id, file); event.currentTarget.value = '' }} />
                  <button className="btn primary" disabled={uploadBusy === item.id} onClick={() => inputRefs.current[item.id]?.click()}>{uploadBusy === item.id ? 'Caricamento...' : 'Carica documento'}</button>
                </div>
              )}
            </div>
          )
        })}

        <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn secondary" href="/cases">Torna alle pratiche</Link>
          <button className="btn secondary" onClick={() => void workflow(true)} disabled={workflowBusy}>{workflowBusy ? 'Calcolo...' : 'Anteprima workflow'}</button>
          <button className="btn secondary" onClick={() => void workflow(false)} disabled={workflowBusy}>{workflowBusy ? 'Workflow...' : 'Esegui workflow'}</button>
          <button className="btn primary" onClick={() => void regenerate()} disabled={portalBusy}>{portalBusy ? 'Generazione...' : 'Genera link portale'}</button>
        </div>
      </div>

      {workflowResult && <div className="card" style={{ marginTop: 14 }}><b>Workflow</b>{workflowResult.actions?.map((action: any) => <div key={action.type} style={{ marginTop: 5 }}>• {action.label}</div>)}{workflowResult.results && <div style={{ marginTop: 8 }}>{workflowResult.results.filter((item: any) => item.ok).length} azioni completate.</div>}</div>}
      {portalUrl && <div className="card" style={{ marginTop: 14 }}><b>Link portale</b><br /><a href={portalUrl} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>{portalUrl}</a></div>}

      <div className="card" style={{ marginTop: 14 }}>
        <h3 style={{ marginTop: 0 }}>Messaggi portale</h3>
        <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>Messaggi visibili al cliente nel suo portale sicuro.</div>
        <div style={{ display: 'grid', gap: 8, maxHeight: 280, overflowY: 'auto', marginBottom: 10 }}>
          {messages.length ? messages.map((item: any) => <div key={item.id} style={{ padding: 10, borderRadius: 10, background: item.sender_type === 'staff' ? '#eef6ff' : '#f8fafc' }}><div style={{ fontSize: 11, fontWeight: 700 }}>{item.sender_type === 'staff' ? 'Studio' : 'Cliente'} · {new Date(item.created_at).toLocaleString('it-IT')}</div><div style={{ fontSize: 13, marginTop: 4, whiteSpace: 'pre-wrap' }}>{item.body}</div></div>) : <div className="muted" style={{ fontSize: 12 }}>Nessun messaggio.</div>}
        </div>
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} placeholder="Scrivi un messaggio visibile al cliente…" style={{ width: '100%', minHeight: 75, padding: 9, border: '1px solid #e4eaf2', borderRadius: 8 }} />
        {messageError && <div style={{ color: '#b42318', fontSize: 12, marginTop: 6 }}>{messageError}</div>}
        <button className="btn primary" style={{ marginTop: 8 }} disabled={messageBusy || !message.trim()} onClick={() => void sendMessage()}>{messageBusy ? 'Invio...' : 'Invia al cliente'}</button>

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #e4eaf2' }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>Comunicazioni preimpostate.</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{[['portal', 'Invia portale'], ['missing', 'Sollecita documenti'], ['correction', 'Richiedi correzione'], ['complete', 'Comunica completamento']].map(([action, label]) => <button key={action} className="btn secondary" disabled={!!commBusy} onClick={() => void communicate(action)}>{commBusy === action ? 'Invio...' : label}</button>)}</div>
          {commResult && <div style={{ marginTop: 9, fontSize: 12 }}>{commResult}</div>}
        </div>
      </div>

      <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>Upload staff: PDF, JPG, JPEG o PNG · massimo 20 MB. I token del portale non vengono memorizzati in chiaro.</p>
    </Page>
  )
}
