'use client'

import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
} from 'lucide-react'

type DocumentItem = {
  id: string
  original_name: string
  status?: string
}

type Item = {
  id: string
  name: string
  required?: boolean
  status?: string
  documents?: DocumentItem[]
}

type Message = {
  id: string
  body: string
  sender: 'client' | 'studio'
  created_at: string
}

type Props = {
  token: string
  caseId: string
  title: string
  clientName: string
  status: string
  dueDate?: string | null
  items: Item[]
}

export default function PortalClient({
  token,
  caseId,
  title,
  clientName,
  status,
  dueDate,
  items,
}: Props) {
  const [consent, setConsent] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [message, setMessage] = useState('')
  const [messageBusy, setMessageBusy] = useState(false)
  const [messageError, setMessageError] = useState('')

  const [state, setState] = useState<
    Record<
      string,
      {
        busy?: boolean
        done?: boolean
        error?: string
      }
    >
  >({})

  const completed = items.filter(
    (i) => state[i.id]?.done || (i.documents?.length ?? 0) > 0
  ).length

  async function loadMessages() {
    try {
      const r = await fetch(`/api/portal/${token}/messages`, {
        cache: 'no-store',
      })

      const d = await r.json()

      if (r.ok) setMessages(d.messages || [])
    } catch {}
  }

  useEffect(() => {
    loadMessages()
  }, [])

  async function upload(item: Item, file: File) {
    if (!consent) {
      setState((s) => ({
        ...s,
        [item.id]: {
          busy: false,
          done: false,
          error:
            "Conferma di aver letto l'informativa privacy prima di caricare.",
        },
      }))
      return
    }

    setState((s) => ({
      ...s,
      [item.id]: { busy: true, done: false },
    }))

    const fd = new FormData()
    fd.append('file', file)
    fd.append('caseId', caseId)
    fd.append('itemId', item.id)
    fd.append('portalToken', token)
    fd.append('consent', 'true')

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: fd,
      })

      const data = await res.json()

      if (!res.ok)
        throw new Error(data.error || 'Upload non riuscito.')

      setState((s) => ({
        ...s,
        [item.id]: { busy: false, done: true },
      }))

      loadMessages()
    } catch (e) {
      setState((s) => ({
        ...s,
        [item.id]: {
          busy: false,
          done: false,
          error:
            e instanceof Error
              ? e.message
              : 'Errore upload.',
        },
      }))
    }
  }

  async function sendMessage() {
    if (!message.trim()) return

    setMessageBusy(true)
    setMessageError('')

    try {
      const r = await fetch(`/api/portal/${token}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: message.trim(),
        }),
      })

      const d = await r.json()

      if (!r.ok)
        throw new Error(d.error || 'Invio non riuscito.')

      setMessage('')
      loadMessages()
    } catch (e) {
      setMessageError(
        e instanceof Error
          ? e.message
          : 'Invio non riuscito.'
      )
    } finally {
      setMessageBusy(false)
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#fff',
        padding: '32px 18px',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div className="brand" style={{ marginBottom: 30 }}>
          Doc<span>Chaser</span>
        </div>

        <div className="card">
          <h1>La tua pratica</h1>

          <p className="muted">
            Ciao <strong>{clientName}</strong>, qui puoi seguire la pratica{' '}
            <strong>{title}</strong>, caricare documenti e comunicare con lo studio.
          </p>

          <div
            style={{
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
              marginTop: 16,
              marginBottom: 18,
            }}
          >
            <span
              className={`badge ${
                status === 'completed' ? 'green' : 'blue'
              }`}
            >
              {status === 'completed'
                ? 'Completata'
                : 'In lavorazione'}
            </span>

            {dueDate && (
              <span className="badge amber">
                Scadenza{' '}
                {new Date(dueDate).toLocaleDateString('it-IT')}
              </span>
            )}

            <span className="badge blue">
              {completed}/{items.length} documenti
            </span>
          </div>

          <div
            className="progress"
            style={{ marginBottom: 24 }}
          >
            <span
              style={{
                width: `${
                  items.length
                    ? (completed / items.length) * 100
                    : 0
                }%`,
              }}
            />
          </div>

          {items.map((item) => {
            const current = state[item.id]
            const existing = item.documents?.[0]

            const done =
              current?.done || !!existing

            const correction =
              existing?.status === 'revision_requested' ||
              item.status === 'needs_correction'

            return (
              <div
                key={item.id}
                style={{
                  borderBottom:
                    '1px solid #e5e7eb',
                  padding: '18px 0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center',
                    }}
                  >
                    {done && !correction ? (
                      <CheckCircle2 color="#16a34a" />
                    ) : (
                      <FileText color="#64748b" />
                    )}

                    <div>
                      <strong>{item.name}</strong>

                      <div className="muted">
                        PDF · JPG · PNG{' '}
                        {item.required
                          ? '• obbligatorio'
                          : ''}
                      </div>

                      {existing && (
                        <div
                          className="muted"
                          style={{
                            fontSize: 12,
                            marginTop: 4,
                          }}
                        >
                          {existing.original_name}
                        </div>
                      )}

                      {correction && (
                        <div
                          style={{
                            color: '#b45309',
                            fontSize: 12,
                            marginTop: 5,
                          }}
                        >
                          È richiesta una nuova versione del documento.
                        </div>
                      )}
                    </div>
                  </div>

                  <label
                    className="btn primary"
                    style={{
                      cursor: current?.busy
                        ? 'wait'
                        : 'pointer',
                    }}
                  >
                    {current?.busy ? (
                      <>
                        <Loader2
                          size={15}
                          className="spin"
                        />{' '}
                        Invio...
                      </>
                    ) : done ? (
                      'Sostituisci'
                    ) : (
                      <>
                        <Upload size={15} /> Carica
                      </>
                    )}

                    <input
                      hidden
                      type="file"
                      accept="application/pdf,image/jpeg,image/png"
                      disabled={current?.busy}
                      onChange={(e) => {
                        const file =
                          e.target.files?.[0]
                        if (file)
                          upload(item, file)
                        e.currentTarget.value = ''
                      }}
                    />
                  </label>
                </div>

                {current?.error && (
                  <div
                    style={{
                      color: '#dc2626',
                      fontSize: 12,
                      marginTop: 8,
                    }}
                  >
                    {current.error}
                  </div>
                )}
              </div>
            )
          })}

          {items.length > 0 &&
            completed === items.length && (
              <div
                style={{
                  marginTop: 20,
                  padding: 16,
                  borderRadius: 12,
                  background: '#ECFDF5',
                  color: '#047857',
                  fontWeight: 600,
                }}
              >
                Tutti i documenti richiesti sono stati caricati.
              </div>
            )}

          <label
            style={{
              display: 'flex',
              gap: 10,
              marginTop: 24,
              alignItems: 'flex-start',
            }}
          >
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) =>
                setConsent(e.target.checked)
              }
            />

            <span style={{ fontSize: 13 }}>
              Confermo di aver letto
              l'informativa privacy e autorizzo il caricamento dei documenti.
            </span>
          </label>
        </div>

        <div className="card" style={{ marginTop: 28 }}>
          <h2>Messaggi con lo studio</h2>

          <div
            style={{
              display: 'grid',
              gap: 10,
              marginTop: 16,
              marginBottom: 18,
            }}
          >
            {messages.length === 0 ? (
              <p className="muted">
                Nessun messaggio.
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    background:
                      m.sender === 'client'
                        ? '#EFF6FF'
                        : '#F9FAFB',
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    {m.sender === 'client'
                      ? 'Tu'
                      : 'Studio'}
                  </div>

                  <div>{m.body}</div>

                  <div
                    className="muted"
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                    }}
                  >
                    {new Date(
                      m.created_at
                    ).toLocaleString('it-IT')}
                  </div>
                </div>
              ))
            )}
          </div>

          <textarea
            value={message}
            onChange={(e) =>
              setMessage(e.target.value)
            }
            placeholder="Scrivi un messaggio allo studio..."
            rows={4}
            style={{
              width: '100%',
              padding: 12,
            }}
          />

          {messageError && (
            <p
              style={{
                color: '#dc2626',
                marginTop: 10,
              }}
            >
              {messageError}
            </p>
          )}

          <button
            className="btn primary"
            disabled={messageBusy}
            style={{ marginTop: 12 }}
            onClick={sendMessage}
          >
            {messageBusy
              ? 'Invio...'
              : 'Invia messaggio'}
          </button>
        </div>
      </div>
    </main>
  )
}