import type {MetadataRoute} from 'next'
export default function robots():MetadataRoute.Robots{const base=process.env.NEXT_PUBLIC_APP_URL||'https://docchaser-saas-v109-build-fix.vercel.app';return{rules:{userAgent:'*',allow:'/'},sitemap:`${base.replace(/\/$/,'')}/sitemap.xml`}}
