import 'server-only'
import {getHapoelData as getLegacyData} from '@/lib/clubs/adapters/hapoel'
import {hapoelMatchOfCard as legacyMatchOfCard} from '@/lib/clubs/adapters/hapoel-timeline'
import {createTimelineEngine} from './timeline-engine'
export {TIMELINE_LENGTH,type BlindCard,type DatedCard} from './timeline-run'
export type {TimelineDeal,InsertVerdict} from './timeline-engine'
// Native Hapoel compatibility facade; shared routes resolve their provider on the server.
const cards=()=>getLegacyData().timeline.map(f=>f.value)
let engine:ReturnType<typeof createTimelineEngine>|undefined
const game=()=>engine??=createTimelineEngine(cards())
export const timelineAvailable=()=>game().available
export const timelinePoolSize=()=>game().poolSize
export const dealTimelineRun=(seed:number,cursor=0)=>game().dealTimelineRun(seed,cursor)
export const boardAfter=(seed:number,placed:number,cursor=0)=>game().boardAfter(seed,placed,cursor)
export const gradeInsert=(seed:number,placed:number,slot:number,cursor=0)=>game().gradeInsert(seed,placed,slot,cursor)
export const timelineHasDate=(iso:string)=>cards().some(c=>c.on===iso)
export const timelineHasDateIn=(from:string,before:string)=>cards().some(c=>c.on>=from&&c.on<before)
export const matchOfCard=legacyMatchOfCard
