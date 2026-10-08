import {clubKitPhoto} from '@/lib/clubs/kitArchive'
import {KitPlate} from '@/components/clubs/games/KitPlate'
import {kitViews} from '@/lib/clubs/gate-content'
import type {GateView} from '../types'
export const view:GateView=({club,copy})=><><p>{copy.kitsSub}</p><ul className="mag-tiles" style={{listStyle:'none',padding:0}}>{kitViews(club).map(k=><li className="mag-tile" key={k.id}>{(()=>{const ph=clubKitPhoto(club.identity.id,k.id);return ph?<img src={ph} alt={`${k.season} ${k.type} shirt`} width={160} height={160} data-archive-photo loading="lazy"/>:<KitPlate kit={k}/>})()}<b><bdi>{k.season}</bdi></b><small><bdi>{[k.type,k.maker,k.design].filter(Boolean).join(' · ')}</bdi></small></li>)}</ul></>
