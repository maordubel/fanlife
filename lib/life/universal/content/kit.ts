/** Small hands for writing chapters: a line, a narration, a flag. Nothing clever lives here. */
import type {CastId, Effect, FlagValue, Line, Tx} from '../types'

/** Somebody says something. `me` is the supporter. */
export const say = (who: CastId | 'me', t: Tx): Line => ({who, t})
/** Nobody says it: what he sees, hears, or knows. */
export const tell = (t: Tx): Line => ({who: null, t})
export const flag = (k: string, v: FlagValue = true): Effect => ({e: 'flag', k, v})
export const heart = (by: number): Effect => ({e: 'heart', by})
export const bond = (who: CastId, by: number): Effect => ({e: 'bond', who, by})
export const coins = (by: number): Effect => ({e: 'coins', by})
export const keep = (item: string): Effect => ({e: 'keep', item})
