/** What every club-data provider hands the pipeline. Provider field names never appear above the adapter. */
export type Goal={name:string;minute:number|null;team:'home'|'away';own:boolean}
export type ProviderMatch={
  provider:string;providerId:string;url:string;publisher:string
  on:string;competition:string;home:string;away:string;homeId:string|null;awayId:string|null
  score:{home:number;away:number}|null;venue:string|null;goals:Goal[]
  lineup:{home:string[];away:string[];homeBench:string[];awayBench:string[];homeSquad?:SquadEntry[];awaySquad?:SquadEntry[]}|null
}
/** One man of a team sheet as the provider states him: position, birth date, nationality, shirt and height when given — never guessed. */
export type SquadEntry={name:string;pos:'GK'|'DF'|'MF'|'FW'|null;born:string|null;nat:string|null;shirt:number|null;height:number|null}
export type Fetcher=(url:string)=>Promise<unknown>
/** 403/404 are answers, never retried (CLAUDE.md rule 11/12). */
export class RefusedError extends Error{constructor(public status:number,url:string){super(`${status} ${url}`)}}
