/**
 * MATCH HIGHLIGHTS — the watch-only theatre for LEGENDS MANAGER and the club Royal Rumble (owner, 12.10.2026: "display only,
 * highlights only, many different scenes so every match feels different, the right kits, the line-ups shown properly").
 * Client-safe types, no imports. A REEL is what the server knows about one match — two teams with their elevens and kits, and
 * the moments worth showing; the scene builder turns each moment into a choreography and the theatre draws it.
 * The one import is a type (the garment spec the line-up board's shirts are drawn from) and is erased.
 */
import type {ClothSpec} from '@/lib/clubs/kit-model'
export type Pattern='plain'|'stripes'|'hoops'|'halves'|'sash'|'band'
export type PixelKit={shirt:string;second:string|null;pattern:Pattern;shorts:string;socks:string}
export type ReelPlayer={id:string;no:number;name:string;pos:'GK'|'DF'|'MF'|'FW';kit:PixelKit;/** came on from the bench — named when he does something, never on the line-up board, never a stand-in */bench?:true;
 /** the documented shirt he wears as a drawable garment (logo, sponsor), when the archive can draw it faithfully */cloth?:ClothSpec}
export type ReelTeam={name:string;code:string;kit:PixelKit;keeper:PixelKit;lineup:ReelPlayer[];formation?:string;
 /** the club's own crest (`lib/clubs/crest.ts`) — null/absent: the colour chip */crest?:string|null;
 /** the side's shirt as a drawable garment: the documented kit most of its eleven wear tonight — absent: the pixel kit's colours */cloth?:ClothSpec|null}
/** how the attack that ended in the moment was built — a hint; the builder picks a scene that fits */
export type Shape='cross'|'cutback'|'through'|'dribble'|'long'|'combo'|'corner'|'free-kick'|'penalty'|'counter'|'rebound'|'lob'|'volley'
export type MomentKind='goal'|'save'|'miss'|'post'|'block'|'offside'|'yellow'|'red'|'injury'
export type Moment={minute:number;side:0|1;kind:MomentKind;player?:string;assist?:string;keeper?:string;by?:string;header?:boolean;shape?:Shape;score:[number,number];/** the extra-time / penalty marker the clock shows */label?:string}
export type Reel={id:string;seed:number;teams:[ReelTeam,ReelTeam];moments:Moment[];final:[number,number];pens:[number,number]|null;
 /** whose match it is — their goals get the big celebration, their result picks the closing card; null = neutral */
 mine:0|1|null;champion?:boolean}
export type Celebration='goal'|'hattrick'|'fire-goal'|'win'|'champion'|'loss'|'game-over'
export const CELEBRATIONS:readonly Celebration[]=['goal','hattrick','fire-goal','win','champion','loss','game-over']
/** what plays after a goal: the celebration film for the side whose match it is (or both, on a neutral reel), and the muted
 * "against" card — the scoring side's colours, never a film — for the other side's goals */
export type GoalGraphic={kind:'film';film:Celebration}|{kind:'against';hattrick:boolean}
