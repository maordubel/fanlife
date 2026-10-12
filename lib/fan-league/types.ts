import type {Pos} from '@/lib/clubs/rumble-format'
import type {FormationId} from '@/lib/clubs/rumble-xi/types'

/**
 * FAN LEAGUE — the heritage manager (owner roadmap 12.10.2026, appendix B; ADR-fanlife-0011). One real club per career and only
 * men who played for THAT club: `card.club === career.clubId` is a server invariant on every signing, lineup, save and match.
 * Nothing here is a fact about history — a "1980s" card means "the man's recorded years at the club touch the 1980s", and a
 * signing is a time-machine fantasy, never a transfer that happened.
 */
export const RULES_ID='fan-league-v1' as const
export const ENGINE_ID='fan-league-engine-v1' as const
export type Decade=number
export type Tactic='balanced'|'attacking'|'defensive'
export const TACTICS:readonly Tactic[]=['balanced','attacking','defensive']

/** one man of one club, frozen into a career's catalog when the career starts (FL-05) */
export type Card={id:string;name:string;position:Pos;alt?:Pos[];free?:boolean;price:number;rating:number;fromYear:number|null;toYear:number|null;decades:Decade[]}
export type Catalog={club:string;clubName:string;digest:string;cards:Card[]}

export type Team={club:string;name:string;ai:boolean;decade:Decade;formation:FormationId;tactic:Tactic;squad:string[];xi:string[];/** the cards this team can field — the career's own catalog for the fan, a frozen eighteen for an AI side */cards:Card[]}
export type GoalEvent={seq:number;minute:number;kind:'goal';side:0|1;scorer:string;assist:string|null}
export type MarkEvent={seq:number;minute:number;kind:'kickoff'|'half-time'|'full-time'}
export type MatchEvent=GoalEvent|MarkEvent
export type MatchResult={engine:typeof ENGINE_ID;seed:number;goals:[number,number];events:MatchEvent[]}
export type Fixture={id:string;round:number;home:string;away:string;result:MatchResult|null}
export type LedgerEntry={key:string;kind:'buy'|'sell';card:string;amount:number;round:number;at:string}

export type Career={
 v:1;id:string;rules:typeof RULES_ID;owner:string;clubId:string;clubName:string;homeDecade:Decade;
 catalog:Catalog;teams:Team[];fixtures:Fixture[];rounds:number;played:number;budget:number;
 ledger:LedgerEntry[];soldThisWindow:string[];keys:string[];revision:number;status:'active'|'finished';createdAt:string;updatedAt:string
}

export const SQUAD_MIN=16,SQUAD_MAX=23,CORE_SIZE=18,KITTY=12,SELL_RATE=0.8,MAX_ACTIVE=3,LEAGUE_MIN=4,LEAGUE_MAX=8
