import type {ClothSpec,Variant} from './kit-model'

/**
 * Gate 4 · Build the Kit — the rules and the shapes the browser may hold (rulebook §6, KB-R01..R12).
 * Client-safe on purpose: no club data and no `server-only` module is reachable from here, so a presenter can import the
 * constants without dragging the deal (and the answer sheet) into the bundle. The deal itself is `kit-run.ts`.
 *
 * The Worker's shirt is built in five steps and scored on ten FIELDS that add up to 100. A FAN LIFE club documents only part
 * of that (colours, a design name, a maker, sometimes a sponsor), so a shirt is scored on the fields its archive row actually
 * documents, renormalised to 100 — and a kit that documents all ten is the only one the full five-part assembly may use.
 */
export type Step='body'|'construction'|'crest'|'maker'|'sponsor'
export const STEP_ORDER:readonly Step[]=['body','construction','crest','maker','sponsor']
export type Field='base'|'pattern'|'secondary'|'collar'|'collarInk'|'sleeves'|'sleeveInk'|'crest'|'maker'|'sponsor'
/** the native 100-point field weights (KB-R03) */
export const FIELD_WEIGHT:Readonly<Record<Field,number>>={base:10,pattern:15,secondary:7,collar:6,collarInk:4,sleeves:6,sleeveInk:4,crest:17,maker:13,sponsor:18}
export const FIELDS:readonly Field[]=['base','pattern','secondary','collar','collarInk','sleeves','sleeveInk','crest','maker','sponsor']
export const STEP_FIELDS:Readonly<Record<Step,readonly Field[]>>={body:['base','secondary'],construction:['pattern','collar','collarInk','sleeves','sleeveInk'],crest:['crest'],maker:['maker'],sponsor:['sponsor']}
export const stepOf=(f:Field):Step=>STEP_ORDER.find(s=>STEP_FIELDS[s].includes(f))!

/** which game: the five-part assembly, the reduced-parts practice, or the older season/maker/design recognition board */
export type KitGame='assembly'|'practice'|'recognition'
export const GAMES:readonly KitGame[]=['assembly','practice','recognition']
export const gameFrom=(raw:string|string[]|undefined):KitGame|null=>{const v=Array.isArray(raw)?raw[0]:raw;return (GAMES as readonly string[]).includes(v??'')?v as KitGame:null}

export type KitMode='quick'|'full'
export const MODE_SIZE:Readonly<Record<KitMode,number>>={quick:3,full:5}
/** version of the dealing and grading rules; carried in links and in the unlock receipt (KB-R11, KB-R12) */
export const RULES='kb2'
export const KIT_ROUND=5,MIN_SHIRTS=3,HINT_PENALTY=8,HINT_LIMIT=3,PERFECT_BONUS=15,SHIRT_POINTS=100,DNA_THRESHOLD=75
/** options per step by the shirt's place in the round: a warm-up, a middle, an expert close (KB-R07) */
export const OPTION_RAMP:readonly number[]=[3,4,4,4,5]
/** `?n=3` → quick, `?n=5` → full, anything else asks */
export function kitModeFrom(raw:string|string[]|undefined):KitMode|null{const v=Number(Array.isArray(raw)?raw[0]:raw);return v===MODE_SIZE.quick?'quick':v===MODE_SIZE.full?'full':null}
export const nextCursor=(cursor:number,consumed:number)=>(Number.isFinite(cursor)&&cursor>0?Math.floor(cursor):0)+Math.max(0,Math.floor(consumed))

export type Option={id:string;step:Step;patch:Partial<ClothSpec>;/** how many of the club's drawable kits carry this value */seen:number}
export type PublicPuzzle={id:string;index:number;seasonLabel:string;variant:Variant;steps:{step:Step;options:Option[]}[]}
export type FieldVerdict={field:Field;ok:boolean;points:number;max:number}
export type StepVerdict={step:Step;ok:boolean;points:number;max:number;/** what the player placed, or null */chosen:Option|null;/** what the shirt wore */truth:Option}
export type Verdict={index:number;seasonLabel:string;variant:Variant;steps:StepVerdict[];fields:FieldVerdict[];right:number;perfect:boolean;/** field accuracy out of 100, before any hint penalty or perfect bonus (KB-R05) */fieldPoints:number;/** distinct documented parts this shirt was scored on */scored:number;/** fields the archive does not state for this kit: not asked, not scored */unknown:Field[];hints:number;score:number;/** true when fieldPoints reached the DNA threshold */dna:boolean;answer:ClothSpec;kitId:string;sources:string[]}
/** a round's total: what the certificate adds up */
export const roundScore=(vs:Pick<Verdict,'score'>[])=>vs.reduce((n,v)=>n+v.score,0)
/** a hint the server issued: `r` is the signed receipt, never trusted from the client without verification */
export type HintReceipt={step:Step;nth:number;optionId:string;r:string}
/** historical DNA opens on field accuracy alone, read BEFORE any hint penalty or perfect bonus (KB-R05) */
export const unlocksDna=(fieldPoints:number)=>fieldPoints>=DNA_THRESHOLD
