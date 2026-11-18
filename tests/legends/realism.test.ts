import {describe,expect,it} from 'vitest'
import {run} from '@/lib/legends/engine'
import {ENGINE_VERSION} from '@/lib/legends/config'
import {snapshotsOf} from './fixtures'

/**
 * 18.11.2026 — "too many goals; make it real". The football engine 5 must read like a league: about 2.7 goals a game, a quarter
 * of matches drawn, a 0–0 now and then, a four-goal margin rare, and the home side ahead of the away side. Measured on 4,000
 * matches between real club squads (docs/legends-manager-fm-research.md); here on the test league's squads.
 */
describe('engine 5 plays like football',()=>{
 it('goals, draws, margins and the home crowd sit in a real league\'s bands',()=>{
  expect(ENGINE_VERSION).toBe('legends-engine-5')
  const snaps=snapshotsOf('legends-engine-5',900).filter(s=>!s.knockout)
  let g=0,d=0,nil=0,big=0,h=0,a=0
  for(const s of snaps){const r=run(s,[],false);if(!r.done)throw new Error('paused');const [x,y]=r.outcome.goals;g+=x+y;if(x===y)d++;if(x+y===0)nil++;if(Math.abs(x-y)>=4)big++;if(x>y)h++;if(y>x)a++}
  const n=snaps.length
  expect(g/n).toBeGreaterThan(2.2);expect(g/n).toBeLessThan(3.2)
  expect(d/n).toBeGreaterThan(0.17);expect(d/n).toBeLessThan(0.35)
  expect(nil/n).toBeGreaterThan(0.03)
  expect(big/n).toBeLessThan(0.12)
  expect(h).toBeGreaterThan(a)
 })
})
