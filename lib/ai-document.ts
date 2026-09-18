import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const AI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-luna'

export const aiResultSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    category: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    summary: { type: 'string' },
    fields: { type: 'object', additionalProperties: { type: 'string' } },
    warnings: { type: 'array', items: { type: 'string' } },
  },
  required: ['category', 'confidence', 'summary', 'fields', 'warnings'],
} as const

export async function analyzeStoredDocument(admin: ReturnType<typeof getSupabaseAdmin>, document: any) {
  if (!admin) throw new Error('Supabase server non configurato')
  if (!process.env.OPENAI_API_KEY) throw new Error('AI non configurata')
  if (document.size_bytes > 10 * 1024 * 1024) throw new Error('Documento troppo grande per l’analisi AI')

  const { data: file, error: downloadError } = await admin.storage.from('documents').download(document.storage_path)
  if (downloadError || !file) throw new Error('Documento non disponibile')
  const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')
  const dataUrl = `data:${document.mime_type};base64,${base64}`
  const media = document.mime_type === 'application/pdf'
    ? { type: 'input_file', filename: document.original_name, file_data: dataUrl }
    : { type: 'input_image', image_url: dataUrl, detail: 'high' }

  const { data: job, error: jobError } = await admin.from('ai_jobs').insert({
    organization_id: document.organization_id,
    document_id: document.id,
    job_type: 'document_analysis',
    status: 'running',
    input: { model: AI_MODEL, document_name: document.original_name },
  }).select('id').single()
  if (jobError || !job) throw new Error('Impossibile creare il job AI')

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI_MODEL,
        input: [{ role: 'user', content: [
          { type: 'input_text', text: 'Analizza questo documento in modo prudente. Classificalo, riassumilo e segnala possibili dati mancanti o incongruenze. Estrai solo informazioni chiaramente leggibili. Non decidere mai se il documento è accettato o rifiutato: il risultato è solo un supporto per un operatore umano.' },
          media,
        ] }],
        text: { format: { type: 'json_schema', name: 'document_analysis', strict: true, schema: aiResultSchema } },
      }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload?.error?.message || 'OpenAI request failed')
    const output = JSON.parse(payload.output_text)
    await admin.from('documents').update({ status: 'ai_review', ai_category: output.category, ai_confidence: output.confidence, ai_metadata: output, updated_at: new Date().toISOString() }).eq('id', document.id)
    await admin.from('ai_jobs').update({ status: 'completed', output, completed_at: new Date().toISOString() }).eq('id', job.id)
    return output
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI analysis failed'
    await admin.from('ai_jobs').update({ status: 'failed', output: { error: message }, completed_at: new Date().toISOString() }).eq('id', job.id)
    throw error
  }
}
