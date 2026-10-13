/**
 * THE FULL PITCH (owner, 13.10.2026: "both sides of the pitch"). A scene is choreographed on the ATTACKED half — x 0–68 across,
 * y the distance from the goal it attacks — and this file places it on the whole 105 × 68 ground: L along the length (0 = the
 * left goal, 105 = the right goal), D across it (0 = the far touchline, 68 = the near one, under the camera).
 *
 * Home (side 0) attack the right-hand goal in the first half, the away side the left; the teams change ends at half-time, change
 * again when extra time starts (its first period is played the way the first half was) and once more at extra time's interval.
 * Pure and client-safe.
 */
export const LENGTH=105,WIDTH=68,HALF=LENGTH/2
export type Dir=1|-1
/** 0 first half · 1 second half · 2 extra time, first period · 3 extra time, second period */
export const periodOf=(minute:number)=>minute<=45?0:minute<=90?1:minute<=105?2:3
/** the direction a side attacks at a minute: +1 toward L = 105, −1 toward L = 0 */
export function attackDir(minute:number,side:0|1):Dir{const flip=periodOf(minute)%2===1;return ((side===0)!==flip?1:-1)}
/** scene (x across, y from the attacked goal) → the ground */
export function toWorld(x:number,y:number,dir:Dir):{L:number;D:number}{return {L:HALF+dir*(HALF-y),D:dir===1?x:WIDTH-x}}
/** where the ends change between two moments; null when both are played the same way round */
export function endsChange(prev:number|null,next:number):null|'half-time'|'extra-time'|'extra-time-interval'{
 if(prev===null)return null
 const a=periodOf(prev),b=periodOf(next)
 if(a===b||attackDir(prev,0)===attackDir(next,0))return null
 return b===1?'half-time':b===2?'extra-time':'extra-time-interval'
}
