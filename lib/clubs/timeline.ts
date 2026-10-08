import 'server-only'
import type {ClubData} from './contract'
import {createTimelineEngine} from '@/lib/game/timeline-engine'
import {chronologyPool} from './chronology'
const cache=new Map<string,ReturnType<typeof createTimelineEngine>>()
export function clubTimeline(club:ClubData) {
 const key=`${club.identity.id}:${club.version}`
 if(!cache.has(key))cache.set(key,createTimelineEngine(chronologyPool(club.timeline)))
 return cache.get(key)!
}
