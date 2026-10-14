/**
 * LEGENDS MANAGER — the rules (owner rulebook V1.0, 12.10.2026; replaces FAN LEAGUE). Client-safe, no imports.
 *
 * `LEGENDS_RULES` holds what the owner CONFIRMED in rounds 1–9: nothing here is tuned by a screen. `LegendsSettings` holds the
 * rulebook's [PROPOSED] values (§9) — the owner answered "yes, all as settings", so each is a default the control room may
 * change. A career FREEZES the settings it started with (`career.settings`), so changing a setting never rewrites a season
 * already being played (S05).
 */
export const RULE_VERSION='legends-1.0.0' as const
export const ENGINE_VERSION='legends-engine-3' as const
/** every engine a stored match may name — a match started on an older engine keeps that engine's stops and rules (rule 112) */
export type EngineVersion='legends-engine-1'|'legends-engine-2'|typeof ENGINE_VERSION
export const LEGENDS_RULES={
 ruleVersion:RULE_VERSION,
 initialDraftBudgetM:52,firstBoardGrantM:8,
 minSquad:17,maxSquad:20,initialDraftRequired:17,initialDraftOptional:1,
 minimums:{GK:2,DF:6,MF:6,FW:3},
 offersPerSlot:3,rerollsPerDraft:3,
 maxSubs:3,maxInterventionWindows:3,
 /** engine 2's three touchline windows (owner, 12.10.2026): half-time, 60′ and 75′ — kept for a match begun on engine 2 */
 touchlineStops:[45,60,75],
 /** engine 3 (owner, 13.10.2026): half-time is the full touchline; on 65′ and 70′ the screen only asks "a change? yes / no" first */
 touchlineStopsV3:[45,65,70],
 /**
  * The dressing-room talk (owner, 13.10.2026), engine 3 only. A talk moves the squad's mood (−1…+1) and single men's moods
  * (−1…+1); the engine reads them as a SMALL, bounded edge: the team's strength × (1 + 0.025 × mood), a man's quality
  * × (1 + 0.02 × his mood) — at most ±2.5% and ±2%. Mood drifts back toward neutral after every match (× 0.6). A screen shows
  * words and faces, never these numbers.
  */
 talk:{teamEffect:0.025,manEffect:0.02,decay:0.6,min:-1,max:1,maxStep:0.5},
 /** the captain plays 3% above himself — a hidden edge the screens never name (owner, 12.10.2026) */
 captainBoost:1.03,
 /** round 1 is played with the squad of the draft; the first window opens after round 2, the second at the halfway mark */
 earlyWindowAfterRound:2,
 matchWeights:{quality:0.8,tactics:0.15,conditions:0.05},
 moraleMin:0.9,moraleMax:1.1,
 injuryPerTeamMatch:0.05,
 injurySeverity:{minor:0.7,moderate:0.25,severe:0.05},
 injuryRounds:{minor:[1,2],moderate:[3,5],severe:[6,10]},
 salePriceBaseRange:[0.8,1.2],
 achievementsBonusPerSeasonCapM:5,
 carryoverGrantRangeM:[4,10],
 maxAIPurchasesPerWindow:2,
 maxActiveCareers:3,
 emergencyMaxMatches:3,
 minEligibleClubs:4,
 maxLeagueClubs:8,/** the most clubs a manager may set up in a league of his own (owner, 14.10.2026: default is everyone) */maxLeagueClubsSetup:16,
} as const
export type QuotaPos='GK'|'DF'|'MF'|'FW'
export const QUOTA_POS:readonly QuotaPos[]=['GK','DF','MF','FW']

export type LegendsSettings={
 /** league points for a win, a draw, a loss (§9.1) */
 points:{win:number;draw:number;loss:number}
 /** cumulative yellows start again from zero when a new season opens (§2.6, §9.1) */
 yellowsResetEachSeason:boolean
 /** does a BYE round count toward serving an injury or a suspension? (§2.7, §9.5) */
 byeCountsForAbsence:boolean
 /** a drawn title play-off goes to extra time and then penalties (§2.9) */
 playoffDrawDecider:'extra-time-penalties'|'penalties'
 /** the market's fee on every sale, as a share of the quoted price (§2.3) */
 marketFeeRate:number
 /** the cost of the automatic emergency player, in € millions (§2.7) */
 emergencyCostM:number
 /** the cash at which next season's grant is fully discounted (§2.4) */
 grantLiquidityM:number
}
export const DEFAULT_SETTINGS:LegendsSettings={points:{win:3,draw:1,loss:0},yellowsResetEachSeason:true,byeCountsForAbsence:false,playoffDrawDecider:'extra-time-penalties',marketFeeRate:0.05,emergencyCostM:0,grantLiquidityM:40}
export const SETTING_TEXT:Record<keyof LegendsSettings,{label:string;hint:string}>={
 points:{label:'League points',hint:'Points for a win, a draw and a loss.'},
 yellowsResetEachSeason:{label:'Yellows reset each season',hint:'Cumulative yellow cards start again at zero when a new season opens. Inside a season they never reset.'},
 byeCountsForAbsence:{label:'A BYE serves an absence',hint:'When on, a round your club does not play still counts toward an injury or a suspension.'},
 playoffDrawDecider:{label:'Drawn title play-off',hint:'How a level play-off is settled.'},
 marketFeeRate:{label:'Market fee',hint:'The share of the quoted price kept by the market on every sale.'},
 emergencyCostM:{label:'Emergency player cost',hint:'What the automatic emergency player costs, in € millions.'},
 grantLiquidityM:{label:'Grant cash ceiling',hint:'The cash at which the board’s next-season grant falls to its €4M floor.'},
}
const num=(v:unknown,lo:number,hi:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi
/** a settings document from storage: every field checked, anything malformed falls back to its default */
export function readSettings(raw:unknown):LegendsSettings{
 const s=(raw&&typeof raw==='object'?raw:{}) as Record<string,unknown>,d=DEFAULT_SETTINGS
 const p=(s.points&&typeof s.points==='object'?s.points:{}) as Record<string,unknown>
 const points=num(p.win,1,5)&&num(p.draw,0,3)&&num(p.loss,0,1)&&(p.win as number)>(p.draw as number)&&(p.draw as number)>=(p.loss as number)?{win:p.win as number,draw:p.draw as number,loss:p.loss as number}:{...d.points}
 return {points,
  yellowsResetEachSeason:typeof s.yellowsResetEachSeason==='boolean'?s.yellowsResetEachSeason:d.yellowsResetEachSeason,
  byeCountsForAbsence:typeof s.byeCountsForAbsence==='boolean'?s.byeCountsForAbsence:d.byeCountsForAbsence,
  playoffDrawDecider:s.playoffDrawDecider==='penalties'||s.playoffDrawDecider==='extra-time-penalties'?s.playoffDrawDecider:d.playoffDrawDecider,
  marketFeeRate:num(s.marketFeeRate,0,0.25)?s.marketFeeRate as number:d.marketFeeRate,
  emergencyCostM:num(s.emergencyCostM,0,2)?s.emergencyCostM as number:d.emergencyCostM,
  grantLiquidityM:num(s.grantLiquidityM,10,200)?s.grantLiquidityM as number:d.grantLiquidityM}
}
/** a patch from the control room: refused by name when a field is out of range, never silently clamped */
export function patchSettings(cur:LegendsSettings,raw:unknown):{ok:true;settings:LegendsSettings}|{ok:false;error:string}{
 if(!raw||typeof raw!=='object')return {ok:false,error:'Send the settings to change.'}
 const merged={...cur,...(raw as object)},next=readSettings(merged)
 for(const k of Object.keys(raw as object)){
  if(!(k in DEFAULT_SETTINGS))return {ok:false,error:`Unknown setting: ${k}.`}
  if(JSON.stringify((next as Record<string,unknown>)[k])!==JSON.stringify((merged as Record<string,unknown>)[k]))return {ok:false,error:`${SETTING_TEXT[k as keyof LegendsSettings].label}: value out of range.`}
 }
 return {ok:true,settings:next}
}
export const roundTenths=(x:number)=>Math.round(x*10)/10
export const clamp=(x:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,x))
