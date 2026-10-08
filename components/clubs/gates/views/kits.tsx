import {KitPlate} from '@/components/clubs/games/KitPlate'
import {kitViews} from '@/lib/clubs/gate-content'
import type {GateView} from '../types'
export const view:GateView=({club,copy})=><><p>{copy.kitsSub}</p><ul className="mag-tiles" style={{listStyle:'none',padding:0}}>{kitViews(club).map(k=><li className="mag-tile" key={k.id}><KitPlate kit={k}/><b><bdi>{k.season}</bdi></b><small><bdi>{[k.type,k.maker,k.design].filter(Boolean).join(' · ')}</bdi></small></li>)}</ul></>
