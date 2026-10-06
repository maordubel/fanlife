import 'server-only'
import {headers} from 'next/headers'
import {evaluationMode} from '@/lib/master/mode'
import {readState} from '@/lib/master/store'
import {resolveClubId,loadClub} from './resolver'
import {gateAccess} from './access'
export async function requestClub(pathId?:string,gate=13) {
 const preview=evaluationMode()
 const id=resolveClubId(headers().get('host'),pathId,preview)
 if(!id)return null
 const control=(await readState()).clubs.find(c=>c.id===id)
 if(!gateAccess(control,gate,preview).allowed)return null
 return loadClub(id)
}
