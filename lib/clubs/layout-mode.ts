/**
 * How a gate lays itself out (Wave 0, 8.10.2026).
 *
 *   reading — a page you read: the full magazine masthead stays, the tab bar stays.
 *   game    — a round you play: compact play header, the board owns the glass.
 *   arena   — a stage you play on (pitch, draft, duel): compact header, edge-to-edge field, no tab bar.
 *   studio  — a workbench (the kit designer): compact header, canvas first, tools in sheets.
 *
 * One map, one place. A page asks `modeOf(gateKey)`; a new gate without a row is a typecheck error.
 */
import type {GateKey} from './gates'
export type LayoutMode='reading'|'game'|'arena'|'studio'
export const GATE_MODES:Record<GateKey,LayoutMode>={
 xi:'arena',trivia:'game',lineup:'arena','kit-builder':'game',kits:'studio',memory:'game',polls:'game',
 goal:'arena','royal-rumble':'arena','blind-cow':'arena',derby:'game',archive:'reading',timeline:'game',
}
export const modeOf=(key:GateKey):LayoutMode=>GATE_MODES[key]
/** modes that give the glass to the play: a compact header and no bottom tab bar */
export const isPlayMode=(m:LayoutMode)=>m!=='reading'
