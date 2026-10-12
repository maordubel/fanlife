import type {FormationId} from '@/lib/clubs/rumble-xi/types'
import type {LegendsSettings,QuotaPos} from './config'
import type {RULE_VERSION,EngineVersion} from './config'

/**
 * LEGENDS MANAGER — the shapes. One career = one real club and only men of THAT club (rulebook §1.1): `card.club` is never
 * stored because a career's catalog IS its club. Money is in € millions with one decimal.
 */
export type Price=1|2|3|4|5
/** one man of one club, frozen into a career at kick-off (§2.11 — a later archive change never rewrites a season) */
export type Card={id:string;name:string;pos:QuotaPos;alt?:QuotaPos[];price:Price;stars:number;attrs:Record<string,number>;from:number|null;to:number|null;decades:number[]}
export type Catalog={club:string;clubName:string;digest:string;priceVersion:string;cards:Card[]}

export type Approach='defensive'|'balanced'|'attacking'
export type Pressing='low'|'medium'|'high'
export type Tempo='slow'|'normal'|'fast'
export type Tactics={approach:Approach;pressing:Pressing;tempo:Tempo}
export const DEFAULT_TACTICS:Tactics={approach:'balanced',pressing:'medium',tempo:'normal'}
export type Lineup={formation:FormationId;xi:string[];bench:string[];tactics:Tactics;/** the armband — one of the eleven */captain?:string}

/** a man's place in a career squad (§0 "career player") */
export type SquadEntry={id:string;quota:QuotaPos;paid:number;apps:number;appsTotal:number;goals:number;joined:number}
/** discipline and fitness, per man, per career */
export type Status={yellows:number;thresholds:number;suspension:number;injury:number;injuryKind:'minor'|'moderate'|'severe'|null}
export type Emergency={id:string;card:Card;games:number;since:number}

export type Team={club:string;name:string;ai:boolean;squad:SquadEntry[];cards:Record<string,Card>;lineup:Lineup;cash:number;status:Record<string,Status>;emergency:Emergency[];morale:number;usedEmergency:string[]}

/* ───────── the draft (§1.2, §2.2) ───────── */
export type Offer={id:string;tier:'premium'|'mid'|'budget';locked:string|null}
export type DraftState={slot:number;group:QuotaPos|null;offers:Offer[];shown:string[];picks:{id:string;quota:QuotaPos;price:Price;slot:number}[];rerollsLeft:number;spent:number;optionalDone:boolean;confirmed:boolean;recentDecades:number[]}

/* ───────── a match (§1.4, §2.5) ───────── */
export type EventKind='kickoff'|'chance'|'goal'|'yellow'|'red'|'injury'|'sub'|'tactic'|'half-time'|'full-time'|'extra-time'|'penalties'|'stop'
export type MatchEventRow={seq:number;minute:number;kind:EventKind;side:0|1|null;player?:string;other?:string;detail?:string;n?:number}
export type SideSnapshot={club:string;name:string;formation:FormationId;tactics:Tactics;xi:{id:string;name:string;pos:QuotaPos;stars:number;attrs:Record<string,number>}[];bench:{id:string;name:string;pos:QuotaPos;stars:number;attrs:Record<string,number>}[];morale:number;home:boolean|null;captain?:string}
export type Decision={stop:number;tactics?:Tactics;subs?:{out:string;in:string}[]}
export type MatchSnapshot={id:string;seed:number;engine:EngineVersion;rules:typeof RULE_VERSION;sides:[SideSnapshot,SideSnapshot];knockout:boolean;decider?:'extra-time-penalties'|'penalties'}
export type MatchOutcome={goals:[number,number];pens:[number,number]|null;events:MatchEventRow[];stops:number[];
 /** who stepped on the pitch, per side — an official appearance (§2.3) */
 played:[string[],string[]];yellows:[Record<string,number>,Record<string,number>];reds:[Record<string,{second:boolean;length:number}>,Record<string,{second:boolean;length:number}>];
 injuries:[Record<string,{kind:'minor'|'moderate'|'severe';rounds:number}>,Record<string,{kind:'minor'|'moderate'|'severe';rounds:number}>];scorers:[Record<string,number>,Record<string,number>]}
export type Live={fixture:string;mode:'fast'|'interactive';snapshot:MatchSnapshot;decisions:Decision[];startedAt:string}

/** who started, kept with the result so the highlights can name and dress them however the squads change later */
export type FixtureSide={formation:string;xi:{id:string;name:string;pos:QuotaPos;from:number|null;to:number|null}[]}
export type Fixture={id:string;round:number;home:string;away:string;result:{goals:[number,number];pens:[number,number]|null;events:MatchEventRow[];seed:number;sides?:[FixtureSide,FixtureSide]}|null}
export type LedgerEntry={key:string;season:number;kind:'draft-budget'|'draft-buy'|'board-grant'|'buy'|'sell'|'season-grant'|'bonus'|'emergency';amount:number;card?:string;note?:string;at:string}
export type SeasonRecord={ordinal:number;place:number;of:number;points:number;w:number;d:number;l:number;gf:number;ga:number;champion:boolean;playoff:boolean;grant:number;bonus:number;cash:number;squad:string[];topScorer:{id:string;name:string;goals:number}|null}
export type Season={ordinal:number;rounds:number;played:number;fixtures:Fixture[];windows:{pre:boolean;mid:boolean;/** the window after round 2 */early?:boolean};bonusAwarded:number;playoff:Fixture|null;ended:boolean;ranks:string[]}
export type Phase='draft'|'window'|'season'|'playoff'|'season-end'

export type Career={
 v:2;id:string;rules:typeof RULE_VERSION;engine:EngineVersion;owner:string;clubId:string;clubName:string;status:'active'|'archived';
 settings:LegendsSettings;catalog:Catalog;teams:Team[];phase:Phase;draft:DraftState|null;season:Season;live:Live|null;
 cutscene:'board-grant'|'season-end'|null;soldThisWindow:string[];aiDone:string[];
 ledger:LedgerEntry[];reputation:{points:number;events:{key:string;season:number;points:number;why:string}[]};history:SeasonRecord[];
 keys:string[];revision:number;createdAt:string;updatedAt:string
}
