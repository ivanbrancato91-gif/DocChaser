'use client'
import {useEffect} from 'react'
import {useRouter} from 'next/navigation'
export default function Upload(){const router=useRouter();useEffect(()=>{router.replace('/cases')},[router]);return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:20}}><div className="card">Apertura pratiche...</div></main>}
