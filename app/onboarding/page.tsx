'use client'

import { useEffect, useState } from 'react'
import Page from '@/components/Page'

type Form = {
  name: string
  profileName: string
  phone: string
  address: string
  website: string
  contactEmail: string
  defaultDueDays: number
  retentionDays: number
  remindersEnabled: boolean
  aiEnabled: boolean
}

const initialForm: Form = {
  name: '',
  profileName: '',
  phone: '',
  address: '',
  website: '',
  contactEmail: '',
  defaultDueDays: 30,
  retentionDays: 365,
  remindersEnabled: true,
  aiEnabled: true,
}

export default function Onboarding() {
  const [form, setForm] = useState<Form>(initialForm)
  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then(async (r) => {
        if (!r.ok) return
        const data = await r.json()
        setForm((prev) => ({ ...prev, ...data }))
      })
      .catch(() => {})
  }, [])

  async function save(finish = false) {
    setBusy(true)
    setMsg('')
    setError('')

    try {
      const r = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      if (!r.ok) throw new Error('Errore durante il salvataggio.')

      setMsg('Impostazioni salvate.')

      if (finish) {
        window.location.href = '/dashboard'
      }
    } catch {
      setError('Salvataggio non riuscito.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page
      title="Configura il tuo studio"
      description="Completa la configurazione iniziale di DocChaser in tre passaggi."
    >
      <div className="card">
        <h3>Passaggio {step} di 3</h3>
      </div>

      {step === 1 && (
        <div className="card">
          <h3>Dati dello studio</h3>

          <label>Nome studio</label>
          <input
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />

          <label>Il tuo nome</label>
          <input
            value={form.profileName}
            onChange={(e) =>
              setForm({ ...form, profileName: e.target.value })
            }
          />

          <label>Email di contatto</label>
          <input
            type="email"
            value={form.contactEmail}
            onChange={(e) =>
              setForm({ ...form, contactEmail: e.target.value })
            }
          />

          <label>Telefono</label>
          <input
            value={form.phone}
            onChange={(e) =>
              setForm({ ...form, phone: e.target.value })
            }
          />

          <label>Indirizzo</label>
          <input
            value={form.address}
            onChange={(e) =>
              setForm({ ...form, address: e.target.value })
            }
          />

          <label>Sito web</label>
          <input
            type="url"
            placeholder="https://..."
            value={form.website}
            onChange={(e) =>
              setForm({ ...form, website: e.target.value })
            }
          />
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h3>Preferenze operative</h3>

          <label>Scadenza predefinita pratiche (giorni)</label>
          <input
            type="number"
            min={1}
            max={365}
            value={form.defaultDueDays}
            onChange={(e) =>
              setForm({
                ...form,
                defaultDueDays: Number(e.target.value),
              })
            }
          />

          <label>Conservazione documenti (giorni)</label>
          <input
            type="number"
            min={30}
            max={3650}
            value={form.retentionDays}
            onChange={(e) =>
              setForm({
                ...form,
                retentionDays: Number(e.target.value),
              })
            }
          />

          <label
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 20,
              alignItems: 'center',
            }}
          >
            <span>Promemoria automatici</span>

            <input
              type="checkbox"
              checked={form.remindersEnabled}
              onChange={(e) =>
                setForm({
                  ...form,
                  remindersEnabled: e.target.checked,
                })
              }
            />
          </label>

          <label
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 20,
              alignItems: 'center',
            }}
          >
            <span>Analisi AI</span>

            <input
              type="checkbox"
              checked={form.aiEnabled}
              onChange={(e) =>
                setForm({
                  ...form,
                  aiEnabled: e.target.checked,
                })
              }
            />
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <h3>Quasi fatto</h3>

          <p className="muted">
            Controlla le impostazioni prima di completare la configurazione.
          </p>

          <ul>
            <li>
              <strong>Studio:</strong> {form.name || '—'}
            </li>
            <li>
              <strong>Referente:</strong> {form.profileName || '—'}
            </li>
            <li>
              <strong>Email:</strong> {form.contactEmail || '—'}
            </li>
            <li>
              <strong>Scadenza predefinita:</strong>{' '}
              {form.defaultDueDays} giorni
            </li>
            <li>
              <strong>Promemoria:</strong>{' '}
              {form.remindersEnabled ? 'Attivi' : 'Disattivati'}
            </li>
            <li>
              <strong>AI:</strong>{' '}
              {form.aiEnabled ? 'Attiva' : 'Disattivata'}
            </li>
          </ul>
        </div>
      )}

      {msg && (
        <div className="card" style={{ borderColor: '#16a34a' }}>
          <p>{msg}</p>
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: '#dc2626' }}>
          <p>{error}</p>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 24,
        }}
      >
        <button
          className="btn"
          disabled={step === 1}
          onClick={() => setStep(step - 1)}
        >
          Indietro
        </button>

        {step < 3 ? (
          <button className="btn btn-primary" onClick={() => setStep(step + 1)}>
            Avanti
          </button>
        ) : (
          <button
            className="btn btn-primary"
            disabled={busy}
            onClick={() => save(true)}
          >
            {busy ? 'Salvataggio...' : 'Completa configurazione'}
          </button>
        )}
      </div>
    </Page>
  )
}