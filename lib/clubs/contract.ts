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
export type ClubPlayer = Entity & {positions:('GK'|'DF'|'MF'|'FW')[];fromYear:number|null;toYear:number|null;aliases:string[]}
export type ClubMystery={id:string;targetPlayerId:string;clues:{id:string;label:string;value:string;sources:string[]}[]}
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
  kits:Fact<Entity>[]|null;stadiums:Fact<Entity>[]|null;places:Fact<Entity>[]|null;culture:Fact<Entity>[]|null
  archive:Fact<HistoricalEvent>[];timeline:Fact<DatedCard>[]
  trivia:ClubTrivia;memory:MemoryCandidate[];mysteries:Fact<ClubMystery>[]
  gates:{timeline:Readiness;trivia:Readiness;xi:Readiness;archive:Readiness;memory:Readiness;polls?:Readiness;'blind-cow'?:Readiness;lineup?:Readiness;'kit-builder'?:Readiness;kits?:Readiness;derby?:Readiness;goal?:Readiness;'royal-rumble'?:Readiness};life:{state:'legacy'|'unavailable';reason:string};sources:Source[];readiness:Readiness
}
export type Diagnostic = {record:string;code:string;message:string}
export const missingSections={rivals:null,competitions:null,seasons:null,players:null,matches:null,trophies:null,kits:null,stadiums:null,places:null,culture:null} as const
export function timelineReadiness(count:number):Readiness {
  return {state:count>=11?'READY':count>=3?'PARTIAL':'LOCKED',playable:count>=3,eligible:count,target:11,
    reasons:count>=11?[]:[`${Math.max(0,11-count)} more approved, distinct, exact-date events needed for a full ten-card run.`]}
}
