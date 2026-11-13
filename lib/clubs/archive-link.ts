/**
 * The link a game prints to open what it just showed in the club's Living Archive (12.11.2026). Client-safe: it only builds
 * the URL — the archive page resolves it through lib/clubs/archive-door.ts and opens the entry, or searches the name, never 404s.
 */
export type ArchiveTarget={player?:string|null;match?:string|null;on?:string|null;score?:string|null;name?:string|null;year?:number|null}
export function archiveLink(club:string,locale:string,t:ArchiveTarget):string{
 const p=new URLSearchParams()
 if(t.player)p.set('player',t.player)
 if(t.match)p.set('match',t.match)
 if(t.on)p.set('on',t.on)
 if(t.score)p.set('score',t.score)
 if(t.name)p.set('name',t.name)
 if(t.year)p.set('y',String(t.year))
 p.set('lang',locale)
 return `/clubs/${club}/archive?${p}`
}
