import {GATE_THRESHOLDS} from './thresholds'
import type {DatedCard} from '@/lib/game/timeline-run'
import type {ClubTheme} from './theme'
import type {MasterQuestion} from '@/lib/game/questions/types'
import type {MemoryCandidate} from '@/lib/game/memory-engine'
export type FactStatus = 'draft' | 'review' | 'approved' | 'rejected' | 'deep_research'
export type Confidence = 0 | 1 | 2 | 3
export type Locale = 'en' | 'he' | 'el' | 'hr'
export type ReadinessState = 'READY' | 'PARTIAL' | 'LOCKED' | 'HIDDEN'
export type Fact<T> = {
  id:string; value:T; sources:string[]; confidence:Confidence; status:FactStatus
  researchedAt:string|null; approvedAt:string|null; approvedBy:string|null; notes:string
}
export type Source = {id:string;title:string;url:string|null;publisher:string;access:'available'|'blocked'|'unknown';checkedAt:string|null}
export type Readiness = {state:ReadinessState;playable:boolean;eligible:number;target:number;reasons:string[]}
export type Entity = {id:string;name:string}
/** Optional finer evidence (rulebook PO-R03): `centreBack` only where a source states it beyond DF; `foreignSlot` is the club's own foreign-slot record, never a passport. */
export type PlayerDetail={centreBack?:boolean;foreignSlot?:'foreign'|'domestic'}
export type ClubPlayer = Entity & {positions:('GK'|'DF'|'MF'|'FW')[];fromYear:number|null;toYear:number|null;aliases:string[];detail?:PlayerDetail}
/** Optional typed fact on a clue (rulebook BC-R02/R03): when present the clue can be proven to narrow; prose-only clues stay valid for practice. */
export type MysteryClue={id:string;label:string;value:string;sources:string[];type?:string;family?:string;facet?:string;factKey?:string;scope?:{season?:string;competition?:string}}
/** `remaining[i]` = candidates still fitting after clue i+1, computed by the bank builder INCLUDING unresolved-name phantoms (BC-R04/R05). */
export type ClubMystery={id:string;targetPlayerId:string;clues:MysteryClue[];remaining?:number[]}
export type ClubTrivia = {questions:MasterQuestion[];pools:Record<string,string[]>}
export type HistoricalEvent = Entity & {on:string|null;precision:'day'|'year'|'unknown';year?:number|null;hint:string;sport:'football';sensitive:boolean}
/** null = not researched/migrated; [] = known empty. Never invent missing fields. */
export type ClubData = {
  schemaVersion:1; version:string
  identity:{id:string;name:string;city:string;country:string;sport:'football'}
  locales:{ui:Locale;content:Locale;supported:Locale[];direction:'ltr'|'rtl'}
  theme:ClubTheme
  rivals:Fact<Entity>[]|null;competitions:Fact<Entity>[]|null;seasons:Fact<Entity>[]|null
  players:Fact<ClubPlayer>[]|null;matches:Fact<Entity>[]|null;trophies:Fact<Entity>[]|null
  kits:Fact<Entity>[]|null;goals?:Fact<Entity>[]|null;stadiums:Fact<Entity>[]|null;places:Fact<Entity>[]|null;culture:Fact<Entity>[]|null
  archive:Fact<HistoricalEvent>[];timeline:Fact<DatedCard>[]
  trivia:ClubTrivia;memory:MemoryCandidate[];mysteries:Fact<ClubMystery>[]
  gates:{timeline:Readiness;trivia:Readiness;xi:Readiness;archive:Readiness;memory:Readiness;polls?:Readiness;'blind-cow'?:Readiness;lineup?:Readiness;'kit-builder'?:Readiness;kits?:Readiness;derby?:Readiness;goal?:Readiness;'royal-rumble'?:Readiness};life:{state:'legacy'|'unavailable';reason:string;href?:string};sources:Source[];readiness:Readiness
}
export type Diagnostic = {record:string;code:string;message:string}
export const missingSections={rivals:null,competitions:null,seasons:null,players:null,matches:null,trophies:null,kits:null,goals:null,stadiums:null,places:null,culture:null} as const
export function timelineReadiness(count:number):Readiness {
  const {target,minimum}=GATE_THRESHOLDS.timeline
  return {state:count>=target?'READY':count>=minimum?'PARTIAL':'LOCKED',playable:count>=minimum,eligible:count,target,
    reasons:count>=target?[]:[`${Math.max(0,target-count)} more approved, distinct, exact-date events needed for a full ten-card run.`]}
}
