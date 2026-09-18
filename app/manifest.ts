import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DocChaser',
    short_name: 'DocChaser',
    description: 'Gestione professionale delle richieste documentali.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#f7faff',
    theme_color: '#0b1b3a',
    lang: 'it-IT',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }
}
