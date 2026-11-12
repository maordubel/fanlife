import {REGISTRY} from '@/lib/master/registry'
import {CORE_CLUB_IDS} from '@/lib/clubs/resolver'
/** Who the shop sells for: FAN LIFE itself and every club that has a pack. */
export const SUBJECT_IDS:string[]=['fanlife',...CORE_CLUB_IDS]
export const isSubject=(id:string)=>SUBJECT_IDS.includes(id)
export const subjectName=(id:string)=>id==='fanlife'?'FAN LIFE':REGISTRY.find(c=>c.id===id)?.name??id
