import { notFound } from 'next/navigation'
import { createHash } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import PortalClient from './PortalClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Portal({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = getSupabaseAdmin(); if (!admin) notFound()
  const hash = createHash('sha256').update(token).digest('hex')
  const { data: caseRow } = await admin.from('cases').select('id,title,status,due_date,public_token_expires_at,public_token_revoked_at,clients(name),case_items(id,name,description,required,status,sort_order,documents(id,original_name,status,created_at))').eq('public_token_hash', hash).maybeSingle()
  if (!caseRow || caseRow.public_token_revoked_at || (caseRow.public_token_expires_at && new Date(caseRow.public_token_expires_at) <= new Date())) notFound()
  const items = [...(caseRow.case_items || [])].sort((a:any,b:any)=>(a.sort_order ?? 0)-(b.sort_order ?? 0))
  return <PortalClient token={token} caseId={caseRow.id} title={caseRow.title} status={caseRow.status} dueDate={caseRow.due_date} clientName={(caseRow.clients as any)?.name || 'Cliente'} items={items as any} />
}
