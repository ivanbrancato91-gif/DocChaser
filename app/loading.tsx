export default function Loading() {
  return (
    <main className="page-shell" aria-busy="true" aria-label="Caricamento">
      <section className="page-header">
        <div className="skeleton-line skeleton-title" />
        <div className="skeleton-line skeleton-subtitle" />
      </section>
      <section className="card-grid" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="card skeleton-card" key={i}>
            <div className="skeleton-line skeleton-small" />
            <div className="skeleton-line skeleton-number" />
          </div>
        ))}
      </section>
    </main>
  )
}
