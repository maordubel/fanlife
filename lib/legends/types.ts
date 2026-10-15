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
export type Lineup={formation:FormationId;xi:string[];bench:string[];tactics:Tactics;/** the armband — one of the eleven */captain?:string;/** the vice-captain — a squad man other than the captain; he wears the armband when the captain is not in the eleven */vice?:string}

/** a man's place in a career squad (§0 "career player") */
export type SquadEntry={id:string;quota:QuotaPos;paid:number;apps:number;appsTotal:number;goals:number;joined:number}
/** discipline and fitness, per man, per career */
export type Status={yellows:number;thresholds:number;suspension:number;injury:number;injuryKind:'minor'|'moderate'|'severe'|null}
export type Emergency={id:string;card:Card;games:number;since:number}

export type Team={club:string;name:string;ai:boolean;squad:SquadEntry[];cards:Record<string,Card>;lineup:Lineup;cash:number;status:Record<string,Status>;emergency:Emergency[];morale:number;usedEmergency:string[]
 /** the dressing room's mood after the manager's talks, −1…+1 (engine 3; absent = neutral) */mood?:number;/** single men's moods, −1…+1 */moodMen?:Record<string,number>}

/* ───────── the draft (§1.2, §2.2) ───────── */
export type Offer={id:string;tier:'premium'|'mid'|'budget';locked:string|null}
export type DraftState={slot:number;group:QuotaPos|null;offers:Offer[];shown:string[];picks:{id:string;quota:QuotaPos;price:Price;slot:number}[];rerollsLeft:number;spent:number;optionalDone:boolean;confirmed:boolean;recentDecades:number[];/** the draft budget, drawn on the slot machine at the start (€50–52M); absent on older careers = the standard budget */budget?:number;/** careers begun from 15.10.2026: men whose years end before 1960 are dealt at a low share (lib/legends/era.ts); absent = the old even deal */modern?:boolean}

/* ───────── a match (§1.4, §2.5) ───────── */
export type EventKind='kickoff'|'chance'|'goal'|'yellow'|'red'|'injury'|'sub'|'tactic'|'half-time'|'full-time'|'extra-time'|'penalties'|'stop'
/**
 * `detail` on a goal or a chance (engine 3): 'penalty' | 'free-kick' | 'corner' — a set piece; a penalty saved or missed is a
 * 'chance' with detail 'penalty' (`other` = the keeper when he saved it). On a red: 'second-yellow'; on an injury: its kind.
 */
export type MatchEventRow={seq:number;minute:number;kind:EventKind;side:0|1|null;player?:string;other?:string;detail?:string;n?:number}
export type SnapMan={id:string;name:string;pos:QuotaPos;stars:number;attrs:Record<string,number>;/** engine 3: his mood from the talks */mood?:number}
export type SideSnapshot={club:string;name:string;formation:FormationId;tactics:Tactics;xi:SnapMan[];bench:SnapMan[];morale:number;home:boolean|null;captain?:string;/** engine 3: the dressing room's mood */mood?:number}
export type Decision={stop:number;tactics?:Tactics;subs?:{out:string;in:string}[]}
export type MatchSnapshot={id:string;seed:number;engine:EngineVersion;rules:typeof RULE_VERSION;sides:[SideSnapshot,SideSnapshot];knockout:boolean;decider?:'extra-time-penalties'|'penalties';/** engine 4: minutes at which the manager asked for the touchline, besides half-time */stops?:number[]}
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
/** one dressing-room talk the manager gave (rule for CLAUDE.md: talks are server-side, one per match and moment) */
export type TalkRecord={fixture:string;when:'pre'|'post';situation:string;answer:number;season:number}
export type Phase='draft'|'window'|'season'|'playoff'|'season-end'

export type Career={
 v:2;/** begun from 15.10.2026: the draft and the market favour men of 1960 on (lib/legends/era.ts) */modernEra?:boolean;id:string;rules:typeof RULE_VERSION;engine:EngineVersion;owner:string;clubId:string;clubName:string;status:'active'|'archived';
 settings:LegendsSettings;catalog:Catalog;teams:Team[];phase:Phase;draft:DraftState|null;season:Season;live:Live|null;
 cutscene:'board-grant'|'meet-squad'|'camp'|'season-end'|null;soldThisWindow:string[];/** the manager's transfer list — squad men he is willing to sell (owner 14.10.2026) */transferList?:string[];/** F08: the window's five candidates, drawn once when the window opened (a career whose window opened earlier gets it at its first move) */market?:{w:string;ids:string[];scouted:number};/** bids declined in this window (`windowKey`) */declinedBids?:{w:string;ids:string[]};aiDone:string[];
 ledger:LedgerEntry[];reputation:{points:number;events:{key:string;season:number;points:number;why:string}[]};history:SeasonRecord[];
 keys:string[];revision:number;createdAt:string;updatedAt:string
 /** the dressing-room talks given, newest last (engine 3) */
 talks?:TalkRecord[];/** the press questions answered (or waved away), one per match at most */press?:{fixture:string;season:number;q:string;answer:number}[]
}
