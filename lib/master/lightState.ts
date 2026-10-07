import type {Club,State} from './types'
/** The admin's light state: clubs without their evidence arrays (paged on demand, audit A17) and the last 100 audit rows. */
export type LightState=Omit<State,'clubs'|'audit'>&{clubs:Omit<Club,'sources'|'findings'>[];auditTail:State['audit']}
export function lightState(state:State):LightState{
 const {audit,clubs,...rest}=state
 return {...rest,clubs:clubs.map(({sources:_s,findings:_f,...c})=>c),auditTail:audit.slice(-100)}
}
