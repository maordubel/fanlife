import 'server-only'
import {headers} from 'next/headers'
import {evaluationMode} from '@/lib/master/mode'
import {resolveClubId,loadClub} from './resolver'
export async function requestClub(pathId?:string) {
 const id=resolveClubId(headers().get('host'),pathId,evaluationMode())
 return id?loadClub(id):null
}
