import {door} from '@/lib/features-server'
import {REGISTRY} from '@/lib/master/registry'
import {Folio} from './Folio'

/** the folio behind its switch (Settings → Features → the new front page and wayfinding); the owner previews */
export async function FolioDoor(){
 const d=await door('frontDoors').catch(()=>null);if(!d?.open)return null
 return <Folio clubs={Object.fromEntries(REGISTRY.map(c=>[c.id,c.name]))}/>
}
