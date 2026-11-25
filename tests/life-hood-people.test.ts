/**
 * LIFE · the hood's skinned people (lib/life/rush-render/human): the kit on disk has what the code drives, the face
 * tables are sound, the IK's elbow obeys the triangle, and the classic figure stays as the fallback.
 */
import {describe, expect, it} from 'vitest'
import {readFileSync, statSync} from 'node:fs'
import {MOOD_MIX, MOOD_ROWS, UNITS, VISEMES, speak, U} from '@/lib/life/rush-render/human/face'
import {elbowAngle} from '@/lib/life/rush-render/human/ik'
import {CAST, CAST_LITE, STAND_IN} from '@/lib/life/rush-render/human/kit'
import {castFor} from '@/lib/life/rush-render/human/human'

const glb = (f: string) => { const b = readFileSync(`public/life/assets/${f}`); return JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString()) as {meshes?: {name: string; extras?: {targetNames?: string[]}}[]; animations?: {name: string}[]; nodes: {name?: string}[]; materials?: {name: string}[]; extensionsRequired?: string[]} }
const src = (f: string) => readFileSync(f, 'utf8')

describe('the human kit', () => {
  it('every character has the bones, the face units and the tintable top the code drives', () => {
    for (const id of CAST) {
      const j = glb(`cast/${id}.glb`), names = new Set(j.nodes.map(n => n.name))
      for (const b of ['Root', 'pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'head', 'eye_l', 'eye_r', 'upperarm_l', 'lowerarm_l', 'hand_l', 'upperarm_r', 'lowerarm_r', 'hand_r', 'thigh_l', 'thigh_r', 'foot_l']) expect(names.has(b), `${id} ${b}`).toBe(true)
      const head = j.meshes!.find(m => m.name.endsWith('Head'))!.extras!.targetNames!
      for (const u of UNITS) expect(head, `${id} ${u}`).toContain(u)
      expect(j.materials!.some(m => m.name === 'tint_top'), id).toBe(true)
      // the only decoder wired is meshopt (three's own module): no draco, no ktx2
      for (const e of j.extensionsRequired ?? []) expect(['EXT_meshopt_compression', 'EXT_texture_webp', 'KHR_mesh_quantization']).toContain(e)
    }
  })
  it('the clips the poses ask for are in the file', () => {
    const have = glb('clips/clips.glb').animations!.map(a => a.name)
    for (const c of ['idle', 'walk', 'run', 'carry', 'talk_1', 'talk_2', 'talk_3', 'wave', 'cheer', 'sit', 'crouch_to_child', 'hand_on_shoulder', 'hug']) expect(have).toContain(c)
  })
  it('a phone downloads five bodies and the clips: under 7 MB', () => {
    const bytes = CAST_LITE.reduce((s, c) => s + statSync(`public/life/assets/cast/${c}.glb`).size, 0) + statSync('public/life/assets/clips/clips.glb').size
    expect(bytes).toBeLessThan(7 * 1024 * 1024)
    for (const c of CAST) expect(CAST_LITE).toContain(STAND_IN[c])
  })
})

describe('a human face', () => {
  it('every mood is a face of known units, within 0 … 1', () => {
    for (const [m, mix] of Object.entries(MOOD_MIX)) { for (const [k, v] of Object.entries(mix)) { expect(UNITS, `${m} ${k}`).toContain(k); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1) } }
    expect(MOOD_ROWS.smile[U.mouthSmileLeft]).toBeGreaterThan(MOOD_ROWS.warm[U.mouthSmileLeft]!)
    expect(MOOD_ROWS.warm[U.mouthSmileLeft]).toBeGreaterThan(MOOD_ROWS.neutral[U.mouthSmileLeft]!)
    expect(MOOD_ROWS.worried[U.browInnerUp]).toBeGreaterThan(0.5)
  })
  it('a spoken line moves the lips, silence does not, and the lips change over time', () => {
    const a = new Float32Array(UNITS.length), b = new Float32Array(UNITS.length), c = new Float32Array(UNITS.length)
    speak(a, 1.0, 3, 0); expect(Math.max(...a)).toBe(0)
    let moved = 0
    for (let t = 0; t < 4; t += 0.05) { b.fill(0); c.fill(0); speak(b, t, 3, 1); speak(c, t + 0.07, 3, 1); if (VISEMES.some(v => Math.abs(b[U[v]]! - c[U[v]]!) > 0.02)) moved++; for (const v of b) expect(v).toBeLessThanOrEqual(1.2) }
    expect(moved).toBeGreaterThan(30)
  })
})

describe('two-bone IK', () => {
  it('the elbow is straight at full reach, folded when the target is near, and never impossible', () => {
    expect(elbowAngle(0.3, 0.3, 0.6)).toBeGreaterThan(3.0)
    expect(elbowAngle(0.3, 0.3, 0.3)).toBeCloseTo(Math.PI / 3, 2)
    expect(Number.isFinite(elbowAngle(0.3, 0.25, 5))).toBe(true)
    expect(Number.isFinite(elbowAngle(0.3, 0.25, 0))).toBe(true)
  })
})

describe('the cast and the fallback', () => {
  it('a child is a child, a grey head an elder, and the same person is always the same body', () => {
    expect(castFor({child: true})).toBe('boy'); expect(castFor({child: true, female: true})).toBe('girl')
    expect(castFor({grey: true})).toBe('grandfather'); expect(castFor({female: true, grey: true})).toBe('grandmother')
    expect(castFor({pick: 7})).toBe(castFor({pick: 7}))
  })
  it('the code-built figure stays: the default is human, `people=classic` and a kit that fails keep the old one', () => {
    const stage = src('lib/life/rush-render/stage.ts'), host = src('components/clubs/life/hood/HoodHost.tsx'), fig = src('lib/life/rush-render/figure.ts')
    expect(stage).toContain("o.people !== 'classic' && charNow('boy') && charNow('father')")
    expect(host).toContain("people: ok ? 'human' : 'classic'")
    expect(fig).toContain('if (hp) { hp(fig, st, t, dt, pose); return }')
    expect(src('app/qa/life-world/page.tsx')).toContain("searchParams.people === 'classic'")
    // the people this picture can afford: capped, the rest the cheap figure
    expect(stage).toContain('createTroupe({max: lite ? 8 : 16, lite})')
  })
})
