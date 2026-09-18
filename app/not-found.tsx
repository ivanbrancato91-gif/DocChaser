import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="page-shell error-state">
      <section className="card error-card" role="status">
        <span className="status-badge">404</span>
        <h1>Pagina non trovata</h1>
        <p>La risorsa richiesta non esiste oppure non è più disponibile.</p>
        <Link className="btn primary" href="/">Torna alla dashboard</Link>
      </section>
    </main>
  )
}
