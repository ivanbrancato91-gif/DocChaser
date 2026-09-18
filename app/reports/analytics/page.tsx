'use client'

import Link from 'next/link'
import { ArrowLeft, BarChart3, Download, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'

type Data = {
  overview: { cases: number; completed: number; open: number; avgCompletionDays: number; documents: number; aiAnalyzed: number }
  status: { status: string; count: number }[]
  byMonth: { month: string; count: number }[]
  topMissing: { name: string; count: number }[]
  topCorrections: { name: string; count: number }[]
  exportRows: { title: string; client: string; status: string; due_date: string; created_at: string; updated_at: string; required: number; verified: number }[]
}

const labels: Record<string, string> = { open: 'Aperte', review: 'In verifica', completed: 'Complete', closed: 'Chiuse' }
const csv = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`

export default function Analytics() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/reports/analytics', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Report non disponibile')
      setData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Report non disponibile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const exportCsv = () => {
    if (!data) return
    const headers = ['Pratica', 'Cliente', 'Stato', 'Scadenza', 'Creata', 'Aggiornata', 'Documenti obbligatori', 'Verificati']
    const rows = data.exportRows.map((row) => [row.title, row.client, row.status, row.due_date, row.created_at, row.updated_at, row.required, row.verified])
    const content = [headers, ...rows].map((row) => row.map(csv).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `docchaser-report-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="content"><div className="card">Caricamento report...</div></div>
  if (error) return <div className="content"><div className="card" style={{ color: '#b42318' }}>{error}<div style={{ marginTop: 12 }}><button className="btn secondary" onClick={load}>Riprova</button></div></div></div>
  if (!data) return null

  const maxMonth = Math.max(1, ...data.byMonth.map((item) => item.count))
  const maxMissing = Math.max(1, ...data.topMissing.map((item) => item.count))
  const maxCorrections = Math.max(1, ...data.topCorrections.map((item) => item.count))

  return (
    <div className="content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <Link href="/dashboard" className="muted" style={{ fontSize: 13 }}><ArrowLeft size={14} style={{ verticalAlign: '-2px' }} /> Dashboard</Link>
          <div className="h1" style={{ marginTop: 8 }}>Analytics & Report</div>
          <div className="muted" style={{ marginTop: 6 }}>Andamento dello studio, tempi di completamento e colli di bottiglia documentali.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary" onClick={load}><RefreshCw size={15} /> Aggiorna</button>
          <button className="btn primary" onClick={exportCsv}><Download size={15} /> Esporta CSV</button>
        </div>
      </div>

      <div className="grid4" style={{ marginBottom: 18 }}>
        {[['Pratiche', data.overview.cases], ['Complete', data.overview.completed], ['Aperte', data.overview.open], ['Tempo medio', `${data.overview.avgCompletionDays} gg`]].map(([label, value]) => (
          <div className="card stat" key={String(label)}><div className="muted">{label}</div><div className="num">{value}</div></div>
        ))}
      </div>

      <div className="grid2" style={{ marginBottom: 18 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Pratiche nel tempo</h3>
          {data.byMonth.length ? <div style={{ display: 'flex', alignItems: 'end', gap: 10, height: 210, paddingTop: 20 }}>
            {data.byMonth.map((item) => <div key={item.month} style={{ flex: 1, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'end', gap: 5 }}><b style={{ fontSize: 11 }}>{item.count}</b><div style={{ height: `${Math.max(8, item.count / maxMonth * 150)}px`, background: 'linear-gradient(180deg,var(--blue),var(--cyan))', borderRadius: '7px 7px 2px 2px' }} /><span className="muted" style={{ fontSize: 10 }}>{item.month.slice(5)}</span></div>)}
          </div> : <p className="muted">Nessun dato.</p>}
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Stato pratiche</h3>
          {data.status.map((item) => <div key={item.status} style={{ margin: '14px 0' }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>{labels[item.status] || item.status}</span><b>{item.count}</b></div><div className="progress" style={{ marginTop: 6 }}><span style={{ width: `${data.overview.cases ? item.count / data.overview.cases * 100 : 0}%` }} /></div></div>)}
        </div>
      </div>

      <div className="grid2">
        <MetricCard title="Documenti più frequentemente mancanti" items={data.topMissing} max={maxMissing} empty="Nessun documento mancante rilevato." />
        <MetricCard title="Richieste di correzione" items={data.topCorrections} max={maxCorrections} empty="Nessuna correzione registrata." />
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><BarChart3 size={17} /><h3 style={{ margin: 0 }}>Copertura AI</h3></div>
        <p className="muted">{data.overview.aiAnalyzed} documenti analizzati su {data.overview.documents} totali.</p>
      </div>
    </div>
  )
}

function MetricCard({ title, items, max, empty }: { title: string; items: { name: string; count: number }[]; max: number; empty: string }) {
  return <div className="card"><h3 style={{ marginTop: 0 }}>{title}</h3>{items.length ? items.map((item) => <div key={item.name} style={{ margin: '14px 0' }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>{item.name}</span><b>{item.count}</b></div><div className="progress" style={{ marginTop: 6 }}><span style={{ width: `${item.count / max * 100}%` }} /></div></div>) : <p className="muted">{empty}</p>}</div>
}
