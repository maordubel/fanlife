import 'server-only'
import {headers} from 'next/headers'
import {evaluationMode} from '@/lib/master/mode'
import {readState} from '@/lib/master/store'
import {resolveClubId,loadClub} from './resolver'
export async function requestClub(pathId?:string,gate=13) {
 const preview=evaluationMode()
 const id=resolveClubId(headers().get('host'),pathId,preview)
 if(!id)return null
 const control=(await readState()).clubs.find(c=>c.id===id)
 if(!control||control.status==='paused'||(!preview&&control.status!=='live')||(control.status==='live'&&!control.gates.includes(gate)))return null
 return loadClub(id)
}
