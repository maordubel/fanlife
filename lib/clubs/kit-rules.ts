import type {ClothSpec,Variant} from './kit-model'

/**
 * Gate 4 · Build the Kit — the rules and the shapes the browser may hold (Wave kits, 8.10.2026).
 * Client-safe on purpose: no club data, no `server-only` module is reachable from here, so a presenter can import the
 * constants without dragging the deal (and the answer sheet) into the bundle. The deal itself is `kit-run.ts`.
 */
export type Step='colours'|'design'|'maker'|'sponsor'
export const STEP_ORDER:readonly Step[]=['colours','design','maker','sponsor']
export const STEP_WEIGHT:Readonly<Record<Step,number>>={colours:30,design:30,maker:20,sponsor:20}
export type KitMode='quick'|'full'
export const MODE_SIZE:Readonly<Record<KitMode,number>>={quick:3,full:5}
export const KIT_ROUND=5,MIN_SHIRTS=3,HINT_PENALTY=8,HINT_LIMIT=3,PERFECT_BONUS=15,SHIRT_POINTS=100
/** options per step by the shirt's place in the round: a warm-up, a middle, an expert close */
export const OPTION_RAMP:readonly number[]=[3,4,4,4,5]
/** `?n=3` → quick, `?n=5` → full, anything else asks */
export function kitModeFrom(raw:string|string[]|undefined):KitMode|null{const v=Number(Array.isArray(raw)?raw[0]:raw);return v===MODE_SIZE.quick?'quick':v===MODE_SIZE.full?'full':null}
export const nextCursor=(cursor:number,consumed:number)=>(Number.isFinite(cursor)&&cursor>0?Math.floor(cursor):0)+Math.max(0,Math.floor(consumed))

export type Option={id:string;step:Step;patch:Partial<ClothSpec>;/** how many of the club's drawable kits carry this value */seen:number}
export type PublicPuzzle={id:string;index:number;seasonLabel:string;variant:Variant;steps:{step:Step;options:Option[]}[]}
export type StepVerdict={step:Step;ok:boolean;points:number;max:number;/** what the player placed, or null */chosen:Option|null;/** what the shirt wore */truth:Option}
export type Verdict={index:number;seasonLabel:string;variant:Variant;steps:StepVerdict[];right:number;perfect:boolean;base:number;hints:number;score:number;answer:ClothSpec;kitId:string;sources:string[]}
/** a round's total: what the certificate adds up */
export const roundScore=(vs:Pick<Verdict,'score'>[])=>vs.reduce((n,v)=>n+v.score,0)
