'use client'
import {useEffect,useState} from 'react'
import {useSearchParams} from 'next/navigation'
import Page from '@/components/Page'
const plans=[['starter','Starter',19,['Clienti e pratiche','Portale cliente','Upload e revisione','Dashboard operativa']],['studio','Studio',39,['Tutto Starter','Analisi AI','Workflow automatici','Reminder e comunicazioni']],['team','Team',79,['Tutto Studio','Gestione team','Analytics e report','Ricerca globale']]] as const
type Data={organization:{id:string;name:string};subscription:{plan:string|null;status:string;current_period_end:string|null;stripe_customer_id:string|null;stripe_subscription_id:string|null}|null;role:string}
export default function Billing(){const params=useSearchParams();const[data,setData]=useState<Data|null>(null);const[busy,setBusy]=useState('');const[error,setError]=useState('');const[message,setMessage]=useState('')
 const load=()=>fetch('/api/billing').then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);setData(d)}).catch(e=>setError(e.message))
 useEffect(()=>{
  void load()
  if(params.get('checkout')==='success'){
    setMessage('Pagamento completato. Verifico la sincronizzazione dell’abbonamento…')
    let cancelled=false
    let attempts=0
    const tick=async()=>{
      attempts+=1
      try{
        const r=await fetch('/api/billing',{cache:'no-store'}); const d=await r.json()
        if(!cancelled && r.ok){setData(d); if(d.subscription?.status && ['active','trialing','past_due'].includes(d.subscription.status)){setMessage('Abbonamento attivato correttamente.')} else if(attempts<8){setTimeout(tick,1500)}}
      }catch{if(!cancelled && attempts<8)setTimeout(tick,1500)}
    }
    setTimeout(tick,900)
    return()=>{cancelled=true}
  }
  if(params.get('checkout')==='cancelled')setMessage('Checkout annullato: nessun addebito effettuato.')
},[params])
 async function action(body:object){setBusy(JSON.stringify(body));setError('');setMessage('');try{const r=await fetch('/api/stripe/subscription',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error);setMessage(body&&'action'in body&&body.action==='cancel'?'Annullamento programmato a fine periodo.':'Piano aggiornato.');await load()}catch(e){setError(e instanceof Error?e.message:'Errore')}finally{setBusy('')}}
 async function checkout(plan:string){setBusy(plan);setError('');try{const r=await fetch('/api/stripe/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan})});const d=await r.json();if(!r.ok)throw Error(d.error);location.href=d.url}catch(e){setError(e instanceof Error?e.message:'Errore')}finally{setBusy('')}}
 const requested=params.get('plan'); const current=data?.subscription?.plan;const active=data?.subscription&&['active','trialing','past_due'].includes(data.subscription.status);const canManage=data?.role==='owner'||data?.role==='admin'
 return <Page title="Fatturazione" description="Piani, pagamenti e abbonamento DocChaser."><div className="card" style={{marginBottom:18}}><div className="muted">Stato abbonamento</div><h3 style={{margin:'5px 0'}}>{current?current.toUpperCase():'Nessun piano'} {data?.subscription&&<span className="badge green">{data.subscription.status}</span>}</h3>{data?.subscription?.current_period_end&&<div className="muted" style={{fontSize:12}}>Periodo fino al {new Date(data.subscription.current_period_end).toLocaleDateString('it-IT')}</div>}<div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:14}}>{active&&<button className="btn secondary" onClick={()=>{fetch('/api/billing/portal',{method:'POST'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);location.href=d.url}).catch(e=>setError(e.message))}}>Customer Portal</button>}{active&&canManage&&<button className="btn secondary" onClick={()=>action({action:'cancel'})} disabled={!!busy}>Annulla a fine periodo</button>}</div></div>{requested&&['starter','studio','team'].includes(requested)&&!current&&<div className="card" style={{marginBottom:18}}><b>Piano selezionato: {requested.charAt(0).toUpperCase()+requested.slice(1)}</b><p className="muted" style={{marginBottom:0}}>Scegli il piano qui sotto per aprire il checkout Stripe.</p></div>}<div className="grid3">{plans.map(([id,name,price,features])=><div className="card" key={id} style={{display:'flex',flexDirection:'column',gap:14}}><div><div className="muted">{name}</div><div style={{fontSize:28,fontWeight:800,margin:'4px 0'}}>{price} €/mese</div><ul style={{paddingLeft:18,lineHeight:1.8,fontSize:13}}>{features.map(f=><li key={f}>{f}</li>)}</ul></div>{current===id?<button className="btn secondary" disabled>Piano attuale</button>:current&&active&&canManage?<button className="btn primary" onClick={()=>action({action:'change_plan',plan:id})} disabled={!!busy}>{busy? 'Aggiornamento…':id==='starter'?'Passa a Starter':'Passa a '+name}</button>:<button className="btn primary" onClick={()=>checkout(id)} disabled={!!busy}>{busy===id?'Apertura…':'Scegli piano'}</button>}</div>)}</div><div className="card" style={{marginTop:18}}><b>Gestione sicura</b><p className="muted" style={{marginBottom:0}}>Stripe gestisce pagamenti, fatture e metodo di pagamento. I cambi piano usano proratazione Stripe; l'annullamento avviene a fine periodo.</p></div>{error&&<p className="badge red" style={{marginTop:16}}>{error}</p>}{message&&<p className="badge green" style={{marginTop:16}}>{message}</p>}</Page>}
