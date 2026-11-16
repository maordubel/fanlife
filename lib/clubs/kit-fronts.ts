import 'server-only'

import references from '@/content/manual/hapoel-kit-fronts.json'
import type {ShirtOutline, SponsorBox} from './kit-model'
import type {Entity, Fact, Source} from './contract'

type Front = {
 photo: string
 source: string
 kitIds: string[]
 sponsor?: number[]
 outline?: ShirtOutline
 archive?: {season:string;type:string;maker:string|null;sponsor:string|null}
}

const fronts = new Map<string, Front>(references.flatMap((front) =>
 front.kitIds.map((id) => [`hapoel-tel-aviv:${id}`, front] as const),
))

/** Ids distinguish shirts that share a season and label but have different cuts or prints. */
export function kitFrontOf(kit: {id: string; also?: readonly string[]}) {
 for (const id of [kit.id, ...(kit.also ?? [])]) {
  const front = fronts.get(id)
  if (front) return front
 }
 return null
}

export function measuredSponsor(front: Front | null): SponsorBox | undefined {
 const [x, y, w, h] = front?.sponsor ?? []
 return x !== undefined && y !== undefined && w !== undefined && h !== undefined ? {x,y,w,h} : undefined
}

/** Season-identified fronts already in the photo archive, available as collection cards. */
export function hapoelFrontArchive() {
 const kits:Fact<Entity>[]=[]
 const sources:Source[]=[]
 const archival:Front[]=references
 for(const front of archival){
  if(!front.archive)continue
  const {season,type,maker,sponsor}=front.archive
  const id=`hapoel-tel-aviv:${front.kitIds[0]}`,sourceId=`${id}:source`
  sources.push({id:sourceId,title:'Football Kit Archive',url:front.source,publisher:'Football Kit Archive',access:'available',checkedAt:null})
  const value={id,name:`${season} ${type}`,season,type,manufacturer:maker,sponsor}
  kits.push({id,value,sources:[sourceId],confidence:2,status:'approved',researchedAt:null,approvedAt:null,approvedBy:null,notes:'Season and appearance from the existing front archive.'})
 }
 return {kits,sources}
}
