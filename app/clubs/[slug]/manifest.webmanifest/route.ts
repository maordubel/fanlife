import {NextResponse} from 'next/server'
import {clubApp,iconHref} from '@/lib/clubs/pwa'
import {worldFor,nicknameLine} from '@/lib/clubs/world'
import en from '@/messages/clubs/en.json'
export const dynamic='force-dynamic'

/** Each club installs as its own app: its name, its colour, its icon, starting on its own home. */
export function GET(_req:Request,{params}:{params:{slug:string}}) {
 const app=clubApp(params.slug)
 if(!app)return new NextResponse('Not found',{status:404})
 const {id,reg}=app,world=worldFor(reg)
 return NextResponse.json({
  name:reg.name,short_name:reg.name.length>12?reg.initials:reg.name,
  description:nicknameLine(world)||en.manifestDescription.replace('{club}',reg.name),
  lang:'en',dir:'ltr',id:`/clubs/${id}`,start_url:`/clubs/${id}`,scope:`/clubs/${id}/`,display:'standalone',
  background_color:app.background,theme_color:app.primary,
  icons:[{src:iconHref(id,192),sizes:'192x192',type:'image/png'},{src:iconHref(id,512),sizes:'512x512',type:'image/png'}],
 },{headers:{'Content-Type':'application/manifest+json','Cache-Control':'no-store'}})
}
