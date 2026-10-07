/**
 * ONE access policy for every surface that can open a gate — the home hub, the club page, the timeline, the
 * game request and the control room (audit A10). Data readiness is a separate axis: a gate is OPEN NOW only when
 * the policy allows it AND the compiled data makes it playable.
 *  - paused club → closed everywhere
 *  - outside evaluation, only a `live` club opens
 *  - a `live` club opens only the gates switched on for it; in evaluation a non-live club previews all gates
 */
export type AccessControl={status:'research'|'review'|'live'|'paused';gates:readonly number[]}
export type AccessReason='open'|'unknown-club'|'paused'|'not-published'|'switched-off'
export function gateAccess(control:AccessControl|null|undefined,gate:number,preview:boolean):{allowed:boolean;reason:AccessReason}{
 if(!control)return {allowed:false,reason:'unknown-club'}
 if(control.status==='paused')return {allowed:false,reason:'paused'}
 if(!preview&&control.status!=='live')return {allowed:false,reason:'not-published'}
 if(control.status==='live'&&!control.gates.includes(gate))return {allowed:false,reason:'switched-off'}
 return {allowed:true,reason:'open'}
}
export const ACCESS_TEXT:Record<AccessReason,string>={open:'Open',['unknown-club']:'No control record',paused:'Club paused',['not-published']:'Not published',['switched-off']:'Gate switched off'}
