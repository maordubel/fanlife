import 'server-only'
import {door} from '@/lib/features-server'
import type {PoolGate} from './pool'

/**
 * Who may enter an ALL FOOTBALL gate (ADR-fanlife-0009): the feature switch and its gate list — never `gateAccess` with an
 * invented club. While the switch is off the owner's verified session still enters ("owner preview").
 */
export async function experienceDoor(gate?:PoolGate){
 const d=await door('allFootball')
 const gateOn=!gate||d.features.allFootballGates.includes(gate)
 return {open:d.open&&(gateOn||d.preview),preview:d.preview||(!gateOn&&d.open),features:d.features}
}
