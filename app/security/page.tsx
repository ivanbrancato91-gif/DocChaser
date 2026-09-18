'use client'

import Page from '@/components/Page'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const labels: Record<string, string> = {
  'document.approved': 'Documento approvato',
  'document.revision_requested': 'Correzione richiesta',
  'case.created': 'Pratica creata',
  'case.portal_sent': 'Portale inviato',
  'reminder.sent': 'Reminder inviato',
  'team.member_added': 'Membro aggiunto',
  'team.member_role_changed': 'Ruolo modificato',
  'stripe_billing_portal_opened': 'Portale billing aperto',
  'billing.plan_changed': 'Piano modificato',
}

function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}

type AuditEvent = {
  id: string
  event_type: string
  actor_user_id?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
}

export default function Security() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [filter, setFilter] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function load() {
    const r = await fetch(
      '/api/audit?limit=200' +
        (filter
          ? '&type=' + encodeURIComponent(filter)
          : ''),
      { cache: 'no-store' }
    )

    const d = await r.json()

    if (!r.ok) {
      throw new Error(d.error || 'Errore caricamento audit')
    }

    setEvents(d.events || [])
  }

  useEffect(() => {
    load().catch((e) => setErr(e.message))

    fetch('/api/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setEmail(d.profile?.email || '')
        setRole(d.role || '')
      })
      .catch(() => {})
  }, [filter])

  async function changePassword() {
    setBusy(true)
    setErr('')
    setMsg('')

    try {
      const password =
        window.prompt(
          'Nuova password (almeno 12 caratteri):'
        ) || ''

      if (!password) return

      if (password.length < 12) {
        throw new Error(
          'La password deve contenere almeno 12 caratteri.'
        )
      }

      const supabase = createClient()

      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) throw error

      setMsg('Password aggiornata.')
    } catch (e) {
      setErr(
        e instanceof Error
          ? e.message
          : 'Errore'
      )
    } finally {
      setBusy(false)
    }
  }

  async function cleanup() {
    if (role !== 'owner' && role !== 'admin') return

    if (
      !window.confirm(
        'Eliminare gli eventi di audit più vecchi del periodo di conservazione?'
      )
    ) {
      return
    }

    setBusy(true)
    setErr('')
    setMsg('')

    try {
      const r = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          days: 365,
        }),
      })

      const d = await r.json()

      if (!r.ok) {
        throw new Error(
          d.error || 'Errore durante la pulizia'
        )
      }

      setMsg('Pulizia completata.')
      await load()
    } catch (e) {
      setErr(
        e instanceof Error
          ? e.message
          : 'Errore'
      )
    } finally {
      setBusy(false)
    }
  }

  function exportCsv() {
    const rows = [
      ['Evento', 'Attore', 'Dettagli', 'Data'],
      ...events.map((e) => [
        labels[e.event_type] || e.event_type,
        e.actor_user_id || '',
        JSON.stringify(e.metadata || {}),
        new Date(e.created_at).toLocaleString(
          'it-IT'
        ),
      ]),
    ]

    const csv = rows
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value).replaceAll(
                '"',
                '""'
              )}"`
          )
          .join(',')
      )
      .join('\n')

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8',
    })

    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = 'docchaser-audit.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()

    URL.revokeObjectURL(url)
  }

  return (
    <Page
      title="Security & Compliance"
      description="Controlla accesso, audit e conservazione delle attività dello studio."
    >
      <div className="card">
        <h3>Account</h3>

        <p>{email || 'Account autenticato'}</p>

        <button
          className="btn primary"
          disabled={busy}
          onClick={changePassword}
        >
          Cambia password
        </button>
      </div>

      <div className="card">
        <h3>Audit log</h3>

        <input
          placeholder="Filtra eventi..."
          value={filter}
          onChange={(e) =>
            setFilter(e.target.value)
          }
        />

        <div
          style={{
            display: 'flex',
            gap: 10,
            marginTop: 12,
            flexWrap: 'wrap',
          }}
        >
          <button
            className="btn"
            onClick={exportCsv}
          >
            Esporta CSV
          </button>

          {(role === 'owner' ||
            role === 'admin') && (
            <button
              className="btn danger"
              disabled={busy}
              onClick={cleanup}
            >
              Pulisci audit
            </button>
          )}
        </div>

        {msg && (
          <p style={{ color: '#16a34a' }}>
            {msg}
          </p>
        )}

        {err && (
          <p style={{ color: '#dc2626' }}>
            {err}
          </p>
        )}

        <div style={{ marginTop: 20 }}>
          {events.length === 0 ? (
            <p className="muted">
              Nessun evento di audit.
            </p>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                style={{
                  borderBottom:
                    '1px solid #e5e7eb',
                  padding: '12px 0',
                }}
              >
                <strong>
                  {labels[event.event_type] ||
                    event.event_type}
                </strong>

                <div
                  style={{
                    fontSize: 13,
                  }}
                >
                  {new Date(
                    event.created_at
                  ).toLocaleString('it-IT')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Page>
  )
}