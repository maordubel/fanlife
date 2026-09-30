/** Writes content/generated/player-prices.json — slug → Royal Rumble price — for the Blind Cow builder. */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import './inputs'
import { ROOT } from './inputs'

const engine = require('../../lib/game/royal-rumble') as typeof import('@/lib/game/royal-rumble')
const prices: Record<string, number> = {}
for (const p of engine.royalRumbleAuditView().players) prices[p.slug] = p.price
const sorted = Object.fromEntries(Object.entries(prices).sort(([a], [b]) => a.localeCompare(b, 'he')))
writeFileSync(join(ROOT, 'content/generated/player-prices.json'), JSON.stringify({ prices: sorted }, null, 1) + '\n')
console.log(`player-prices: ${Object.keys(sorted).length}`)
