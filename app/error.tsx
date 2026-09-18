'use client'

import { useEffect } from 'react'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Never render error internals to the user; Next.js may still report diagnostics server-side.
  }, [])

  return (
    <main className="page-shell error-state">
      <section className="card error-card" role="alert">
        <span className="badge red">Errore</span>
        <h1>Qualcosa non ha funzionato</h1>
        <p>Si è verificato un problema inatteso. Puoi riprovare senza perdere i dati già salvati.</p>
        <button className="btn primary" onClick={() => reset()}>Riprova</button>
      </section>
    </main>
  )
}
