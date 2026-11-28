/**
 * LIFE · the hood — what the street SOUNDS like (owner, 28.11.2026: "improve the sounds; the whole experience").
 *
 * Pure: what should be heard, from where he stands, the hour and the day. `components/clubs/life/sound.ts` plays it from
 * the recordings the game already owns (public/life/sfx). Three layers:
 *   - the street's own air, by the hour: a day street, a dusk street (quieter deep in the night);
 *   - the ground: on a matchday evening the crowd is heard long before the stand is seen, and it grows with every step
 *     toward it, the way a boy first learns where the ground is;
 *   - his own steps, at the pace he moves.
 * Behind a menu the world is turned down, never off: he is still standing in it.
 */
import {isDark, lightAt, wrapDay} from './daylight'

export type SoundScene = {street: {name: string; level: number}; ground: {name: string; level: number} | null; /** seconds between his footfalls, or 0 when he stands */ stepEvery: number}

const H = (h: number, m = 0) => h * 60 + m

export function soundScene(o: {clock: number; /** how far he is from the ground's gate, in metres */ toGround: number; matchday: boolean; speed: number; sprinting: boolean; /** a panel is over the street */ covered: boolean; /** a conversation: the street steps back for the words */ talking: boolean}): SoundScene {
  const m = wrapDay(o.clock), dark = isDark(m), lit = Math.min(1, lightAt(m).lit)
  const duck = o.covered ? 0.35 : o.talking ? 0.6 : 1
  // deep in the night the street is nearly asleep
  const late = m > H(22, 30) || m < H(5) ? 0.55 : 1
  const street = {name: dark || lit > 0.4 ? 'amb-street-dusk' : 'amb-street-day', level: 0.36 * duck * late}
  // the crowd gathers from the gold hour and is gone an hour and a half into the night
  const on = o.matchday && m >= H(16) && m <= H(21, 45)
  const near = Math.max(0, Math.min(1, 1 - o.toGround / 300))
  const ground = on ? {name: 'crowd-bed', level: Math.max(0.02, near ** 1.7 * 0.5) * duck} : null
  const stepEvery = o.covered || o.talking || o.speed < 0.4 ? 0 : o.sprinting ? 0.27 : Math.max(0.34, Math.min(0.62, 0.74 / Math.max(1, o.speed)))
  return {street, ground, stepEvery}
}
