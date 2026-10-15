import {hash} from '@/lib/clubs/rumble-rng'
import type {Card} from './types'

/**
 * Modern men first (owner, 15.10.2026: "priority to men from 1960 on, a low share of those who played before — show them, but
 * show more of the modern"). A man is MODERN when his recorded years at the club reach 1960 or later; a man with no recorded
 * years is treated as modern (we never hide someone only because the archive is thin). An old man is not removed from the pool:
 * he is dealt about one time in `OLD_SHARE_PCT` per chance, so the older names still turn up. Deterministic from a salt.
 */
export const MODERN_FROM=1960
export const OLD_SHARE_PCT=12
export const isModern=(c:Pick<Card,'from'|'to'>)=>{const y=c.to??c.from;return y==null||y>=MODERN_FROM}
/** true when this old man may be shown in this draw — `salt` makes it stable for a draw, different between draws */
export const oldMayShow=(c:Pick<Card,'id'|'from'|'to'>,salt:string)=>isModern(c)||hash(`${salt}:era:${c.id}`)%100<OLD_SHARE_PCT
/** the market's weight for a man: an old man weighs `OLD_SHARE_PCT`% of what a modern man of the same stars weighs */
export const eraWeight=(c:Pick<Card,'from'|'to'>)=>isModern(c)?1:OLD_SHARE_PCT/100
