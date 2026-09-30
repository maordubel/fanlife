import 'server-only'
import type {ClubData} from './contract'
import {createTimelineEngine} from '@/lib/game/timeline-engine'
const cache=new Map<string,ReturnType<typeof createTimelineEngine>>()
export function clubTimeline(club:ClubData) {
 const key=`${club.identity.id}:${club.version}`
 if(!cache.has(key))cache.set(key,createTimelineEngine(club.timeline.map(f=>f.value)))
 return cache.get(key)!
}
