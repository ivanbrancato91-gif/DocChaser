import type {MetadataRoute} from 'next'

export default function sitemap():MetadataRoute.Sitemap{
 const base=(process.env.NEXT_PUBLIC_APP_URL||'https://docchaser-saas-v109-build-fix.vercel.app').replace(/\/$/,'')
 const routes=[
  ['/',1],['/features',.8],['/pricing',.9],['/faq',.7],['/privacy',.5],['/terms',.5],['/cookies',.4],
 ] as const
 return routes.map(([path,priority])=>({url:base+path,changeFrequency:'monthly' as const,priority}))
}
