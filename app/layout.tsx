import type { Metadata, Viewport } from 'next'
import './globals.css'
import AppShell from '@/components/AppShell'

export const metadata: Metadata = {
  title: { default: 'DocChaser', template: '%s · DocChaser' },
  description: 'Raccogli, verifica e automatizza la gestione dei documenti dei clienti.',
  applicationName: 'DocChaser',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b1b3a',
}

export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="it"><body><AppShell>{children}</AppShell></body></html>}
