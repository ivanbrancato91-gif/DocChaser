'use client'
import Link from 'next/link'
import {useState} from 'react'
import {Menu, X} from 'lucide-react'

export default function PublicShell({children}:{children:React.ReactNode}){
 const [open,setOpen]=useState(false)
 return <div className="public-shell">
  <header className="public-nav">
   <Link href="/" className="brand public-brand" aria-label="DocChaser home">Doc<span>Chaser</span></Link>
   <nav className="public-links">
    <Link href="/features">Funzionalità</Link><Link href="/pricing">Prezzi</Link><Link href="/faq">FAQ</Link>
   </nav>
   <div className="public-actions"><Link href="/login" className="public-login">Accedi</Link><Link href="/register" className="btn primary">Inizia ora</Link></div>
   <button className="public-menu" aria-label="Apri menu" onClick={()=>setOpen(true)}><Menu size={22}/></button>
  </header>
  {open&&<div className="public-mobile-backdrop" onClick={()=>setOpen(false)}/>} 
  <aside className={'public-mobile '+(open?'open':'')}>
   <div className="public-mobile-head"><div className="brand public-brand">Doc<span>Chaser</span></div><button className="icon-btn" onClick={()=>setOpen(false)} aria-label="Chiudi menu"><X size={21}/></button></div>
   <Link href="/features" onClick={()=>setOpen(false)}>Funzionalità</Link><Link href="/pricing" onClick={()=>setOpen(false)}>Prezzi</Link><Link href="/faq" onClick={()=>setOpen(false)}>FAQ</Link><Link href="/login" onClick={()=>setOpen(false)}>Accedi</Link><Link href="/register" className="btn primary" onClick={()=>setOpen(false)}>Inizia ora</Link>
  </aside>
  {children}
  <footer className="public-footer"><div><div className="brand public-brand">Doc<span>Chaser</span></div><p>Gestione professionale delle richieste documentali.</p></div><div className="public-footer-links"><Link href="/privacy">Privacy</Link><Link href="/terms">Termini</Link><Link href="/cookies">Cookie</Link><Link href="/faq">FAQ</Link></div><div className="public-footer-copy">© {new Date().getFullYear()} DocChaser</div></footer>
 </div>
}
