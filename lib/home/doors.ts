import {SHARED_GATES,type GateKey} from '@/lib/clubs/gates'

/**
 * THE THREE DOORS (owner spec, 22.11.2026): a fan must read on the first screen that he can play alone, challenge a
 * friend, or open the archive the games are built from — and every game card says in advance which way it plays.
 * Pure: no I/O, no React. A mode is a statement about what the game can do TODAY (rule 128: a door promises only what
 * the room can do), so a game is 'both' only when a friend can really be invited: Blind Cow sends the same mystery
 * player as a challenge and has a live room; Legends Manager meets a friend's career when Friendlies is switched on.
 */
export type PlayMode='solo'|'friends'|'both'
export type PlayFilter='all'|'solo'|'friends'

export const GATE_MODE:Record<GateKey,PlayMode>={
 xi:'solo',trivia:'solo',lineup:'solo','kit-builder':'solo',kits:'solo',memory:'solo',polls:'solo',goal:'solo',
 'royal-rumble':'solo','blind-cow':'both',derby:'solo',archive:'solo',timeline:'solo',
}
/** the archive is the source, not a game: it has its own door */
export const ARCHIVE_GATE:GateKey='archive'

export const playFilter=(v:unknown):PlayFilter=>v==='solo'||v==='friends'?v:'all'
export const fits=(mode:PlayMode,filter:PlayFilter):boolean=>filter==='all'||mode==='both'||mode===filter

export type GameCard={key:GateKey|'legends';number:number|null;name:string;mode:PlayMode}
/** every game we make, in gate order, Legends Manager first; `filter` keeps the ones that play that way */
export function gameCards(opts:{legends:boolean;friendlies:boolean;legendsName:string},filter:PlayFilter='all'):GameCard[]{
 const all:GameCard[]=[
  ...(opts.legends?[{key:'legends' as const,number:null,name:opts.legendsName,mode:(opts.friendlies?'both':'solo') as PlayMode}]:[]),
  ...SHARED_GATES.filter(g=>g.key!==ARCHIVE_GATE).map(g=>({key:g.key,number:g.number,name:g.name,mode:GATE_MODE[g.key]})),
 ]
 return all.filter(c=>fits(c.mode,filter))
}
export const doorPicture=(key:'cover'|'solo'|'friends'|'archive'|'kits'|'album'|'manager')=>({
 src:`/brand/fanlife/doors/${key}-960.webp`,
 srcSet:`/brand/fanlife/doors/${key}-480.webp 480w, /brand/fanlife/doors/${key}-960.webp 960w${key==='cover'?', /brand/fanlife/doors/cover-1536.webp 1536w':''}`,
})
