import {headers} from 'next/headers'
import {resolveClubId} from './resolver'
import {evaluationMode} from '@/lib/master/mode'
import {REGISTRY} from '@/lib/master/registry'
import {clubTheme} from './theme'
import {livery} from '@/lib/club-livery'
import {BRAND} from '@/lib/brand'

/** What a club's installed app is called and coloured. Resolved from the request exactly like its pages, so a club that is not open has no manifest. */
export function clubApp(slug:string){
 const id=resolveClubId(headers().get('host'),slug,evaluationMode())
 const reg=id?REGISTRY.find(r=>r.id===id):undefined
 if(!id||!reg)return null
 const theme=clubTheme(reg),lv=livery(id)
 return {id,reg,theme,pattern:lv?.pattern??'solid',background:BRAND.sheet,primary:theme.primary,on:theme.onPrimary}
}
export const manifestHref=(id:string)=>`/clubs/${id}/manifest.webmanifest`
export const iconHref=(id:string,size:192|512|180)=>`/clubs/${id}/icon?s=${size}`
