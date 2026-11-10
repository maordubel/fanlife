import type {ClubData} from '@/lib/clubs/contract'
import type {GameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import type {Round} from '@/lib/rotation/round'
import type {GateKey} from '@/lib/clubs/gates'

/** What every gate view receives from the dispatcher (Wave 1 foundation). A view is a server component: it reads the club's
 *  data, deals what it needs, and mounts one client presenter. Upgrading a gate means editing ONE file in `views/`. */
export type GateSearch={seed?:string;r?:string;lang?:string;topic?:string;era?:string;hard?:string;q?:string;event?:string;today?:string;page?:string;[k:string]:string|undefined}
export type GateViewProps={
 club:ClubData
 locale:UiLocale
 copy:GameCopy&Record<string,string>
 round:Round
 gameKey:string
 searchParams:GateSearch
 /** READY | PARTIAL — a view never renders for a locked gate */
 state:string
 /** may this page link to that gate? The control room's switch for this club (review F04); readiness is the view's own check */
 allowed:(gate:GateKey)=>boolean
}
export type GateView=(props:GateViewProps)=>JSX.Element|null|Promise<JSX.Element|null>
export type ViewKey=Exclude<GateKey,'timeline'>
