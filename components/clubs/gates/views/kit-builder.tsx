import {KitBuilderBoard} from '@/components/clubs/games/KitBuilderBoard'
import {buildableKits} from '@/lib/clubs/gate-content'
import type {GateView} from '../types'
const rotate=<T,>(a:T[],by:number)=>a.length?[...a.slice(by%a.length),...a.slice(0,by%a.length)]:a
const pick=(own:string,all:(string|null)[])=>{const rest=[...new Set(all.filter((x):x is string=>!!x&&x!==own))].sort().slice(0,3);return [own,...rest].sort((a,b)=>a.localeCompare(b))}
export const view:GateView=({club,locale,round,gameKey})=>{
 const kits=buildableKits(club)
 return <KitBuilderBoard key={gameKey} items={rotate(kits,round.seed).map(k=>({id:k.id,design:k.design,colours:k.colours,seasonLabel:'',seasons:pick(k.season,kits.map(x=>x.season)),makers:pick(k.maker!,kits.map(x=>x.maker)),designs:pick(k.design!,kits.map(x=>x.design))}))} club={club.identity.id} version={club.version} locale={locale}/>
}
