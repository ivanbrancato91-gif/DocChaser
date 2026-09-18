export type BillingPlan = 'starter' | 'studio' | 'team'

export const BILLING_PLANS: Record<BillingPlan, { name:string; price:number; description:string; features:string[] }> = {
  starter: { name:'Starter', price:19, description:'Per piccoli studi che vogliono centralizzare pratiche e documenti.', features:['Clienti e pratiche','Portale cliente','Upload e revisione documenti','Dashboard operativa'] },
  studio: { name:'Studio', price:39, description:'Automazioni e AI per ridurre il lavoro manuale.', features:['Tutto Starter','Analisi AI','Workflow automatici','Reminder e comunicazioni'] },
  team: { name:'Team', price:79, description:'Gestione completa per studi con più operatori.', features:['Tutto Studio','Gestione team e ruoli','Analytics e report','Ricerca globale'] },
}

export function isBillingPlan(value: unknown): value is BillingPlan {
  return value === 'starter' || value === 'studio' || value === 'team'
}

export function planRank(plan: BillingPlan) { return plan === 'starter' ? 1 : plan === 'studio' ? 2 : 3 }

export function hasFeature(plan: BillingPlan, feature: 'ai'|'workflows'|'team'|'analytics'|'global-search') {
  if (feature === 'ai' || feature === 'workflows') return planRank(plan) >= 2
  if (feature === 'team' || feature === 'analytics' || feature === 'global-search') return planRank(plan) >= 3
  return true
}
