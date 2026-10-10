import extra from '@/content/manual/player-positions-extra.json'
import type {Pos} from '../rumble'

/**
 * Positions the archive does not state, read from a named public page (Wikipedia, CC BY-SA) by scripts/rumble/fill-positions.mjs and
 * accepted only on an exact title, a footballer page that names this club. Each entry keeps the page title, revision and the raw words
 * the page used. Men still absent are listed with the reason in the same file (`unplaced`) — and never dealt.
 */
type Doc={positions:Record<string,Record<string,{pos:Pos}>>;unplaced:Record<string,{id:string;name:string;why:string}[]>}
const doc=extra as unknown as Doc
export const extraPositions=(club:string):Record<string,Pos>=>Object.fromEntries(Object.entries(doc.positions[club]??{}).map(([id,v])=>[id,v.pos]))
export const unplacedFor=(club:string)=>doc.unplaced[club]??[]
