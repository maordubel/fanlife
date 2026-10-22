/**
 * LIFE · RUSH — every city its own street (owner's reference frames, 22.10.2026).
 *
 * The stage builds one street for every club; this module dresses it as the club's CITY: what stands at the
 * end of the road at night (the Acropolis on its rock, the towers of Tel Aviv, Mostar's arched bridge over
 * green water), the balconies and awnings, the kiosk and the shop words in the city's own script, the
 * bunting, the trees, what is parked against the walls, and the designer's graffiti on the ground floors.
 *
 * It only DRESSES: nothing here moves a wall, a kerb or a crossing, so the level the bot proves winnable is
 * the level that is played. A club's street carries its own marks and neutral city art only — the graffiti
 * list per club is cut and filtered by `scripts/life/cut-graffiti.py`, and every colour below goes through
 * `paint()`, which drops anything the club's rival-colour policy forbids (the yellow band for Hapoel too).
 */
import * as THREE from 'three'
import type {VoxelSkin} from '@/lib/life/universal/skin'
import type {Level} from '@/lib/life/rush/level'

export type Town = NonNullable<VoxelSkin['town']>

export type CityCtx = {
  scene: THREE.Scene
  keep: <T extends {dispose(): void}>(x: T) => T
  level: Level
  skin: VoxelSkin
  clubId: string
  seed: number
  night: boolean
  lite: boolean
  /** true when the club's policy forbids this colour */
  banned: (hex: string) => boolean
  glowTex: THREE.Texture
}

/** the words a shop front letters, in the city's own script — ordinary street words, never a fact */
const WORDS: Partial<Record<Town, string[]>> = {
  ath: ['ΚΑΦΕΝΕΙΟ', 'ΨΙΛΙΚΑ', 'ΣΟΥΒΛΑΚΙ', 'ΦΟΥΡΝΟΣ', 'ΠΕΡΙΠΤΕΡΟ', 'ΦΑΡΜΑΚΕΙΟ', 'ΤΑΒΕΡΝΑ'],
  tlv: ['פיצוצייה', 'חומוס', 'בית קפה', 'פלאפל', 'מכולת', 'מספרה', 'סביח'],
  mos: ['SUVENIRI', 'ĆEVAPI', 'KAFANA', 'BUREK', 'BAZAR', 'PEKARA', 'ASCINICA'],
}
const STREET: Partial<Record<Town, string>> = {ath: 'ΟΔΟΣ ΕΡΜΟΥ', tlv: 'רחוב דיזנגוף', mos: 'STARI GRAD'}

const C = (hex: THREE.ColorRepresentation) => new THREE.Color(hex)
function seeded(seed: number) { let s = (seed >>> 0) % 2147483647 || 1984; return () => (s = (s * 16807) % 2147483647) / 2147483647 }
function canvas(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: [number, number]) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h
  draw(cv.getContext('2d')!, w, h)
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat) }
  return t
}

/** Dresses the street as the club's city. Returns true when a landmark stands at the end of the road. */
export function dressCity(x: CityCtx): boolean {
  const town = x.skin.town
  if (x.level.place !== 'street' || !town || !WORDS[town]) return false
  const {scene, keep, level, night, lite} = x
  const rnd = seeded(x.seed ^ 3571)
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)]!
  /** a colour the club may print, else the fallback (else nothing) */
  const paint = (hex: string, fallback = '#8a8f99') => x.banned(hex) ? (x.banned(fallback) ? '#8a8f99' : fallback) : hex
  const box = keep(new THREE.BoxGeometry(1, 1, 1))
  const std = (color: THREE.ColorRepresentation, o: THREE.MeshStandardMaterialParameters = {}) => keep(new THREE.MeshStandardMaterial({color, roughness: 0.8, ...o}))
  const lit = (color: THREE.ColorRepresentation, k = 1, o: THREE.MeshBasicMaterialParameters = {}) => keep(new THREE.MeshBasicMaterial({color: C(color).multiplyScalar(k), toneMapped: false, ...o}))
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), s = new THREE.Vector3()
  const W = level.walk, H = level.half
  const z0 = level.bounds.z1 + 10, z1 = level.goal.z + 42
  const clear = (z: number, r = 9) => !level.crossings.some(c => Math.abs(z - c) < r)
  /** a plane flat against a facade, facing the street */
  const onWall = (geo: THREE.BufferGeometry, mat: THREE.Material, side: number, y: number, z: number, out = 0.06) => {
    const p = new THREE.Mesh(geo, mat); p.rotation.y = -side * Math.PI / 2; p.position.set(side * (W - out), y, z); scene.add(p); return p
  }

  /* ───────── the facades: balconies, railings, awnings, A/C units ───────── */
  const bays: {side: number; z: number}[] = []
  for (const side of [-1, 1]) for (let z = z0; z > z1; z -= 5.4 + rnd() * 1.6) if (clear(z, 8)) bays.push({side, z})
  const floors = town === 'mos' ? [1] : [1, 2]
  if (town !== 'mos' || !lite) {
    const slabs = new THREE.InstancedMesh(box, std(night ? '#8a8478' : '#d8d2c6'), bays.length * floors.length)
    const rail = keep(canvas(256, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#16181d'; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 5, w, 5); for (let i = 0; i < w; i += 12) g.fillRect(i, 0, 3, h) }))
    const rails = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(4.2, 1.05)), keep(new THREE.MeshStandardMaterial({map: rail, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6})), bays.length * floors.length)
    let i = 0
    for (const b of bays) for (const f of floors) {
      const y = f * 3.2 + 0.2
      m4.makeScale(1.25, 0.16, 4.4).setPosition(b.side * (W - 0.62), y, b.z); slabs.setMatrixAt(i, m4)
      q.setFromAxisAngle(up, -b.side * Math.PI / 2); m4.compose(v.set(b.side * (W - 1.22), y + 0.6, b.z), q, s.set(1, 1, 1)); rails.setMatrixAt(i, m4)
      i++
    }
    slabs.castShadow = !lite; scene.add(slabs, rails)
  }
  // striped awnings: Athens blue and white, Tel Aviv faded, Mostar the bazaar's red and cream
  const stripes: Record<Town, [string, string][]> = {
    ath: [['#2d6fb8', '#f1efe8'], ['#2e6a52', '#f1efe8'], ['#2d6fb8', '#f1efe8']],
    tlv: [['#c9784a', '#efe3cf'], ['#8b6f52', '#e9dcc4'], ['#5f7d8a', '#e9e3d6']],
    mos: [['#9c2f28', '#efe3cf'], ['#6d4a2e', '#e8d9bd']],
    ham: [], gla: [],
  }
  const awnTex = stripes[town].map(([a, b]) => keep(canvas(128, 64, (g, w, h) => { const n = 8; for (let k = 0; k < n; k++) { g.fillStyle = paint(k % 2 ? b : a, '#3b4250'); g.fillRect(k * w / n, 0, w / n, h) } g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, h - 10, w, 10) })))
  const awnGeo = keep(new THREE.PlaneGeometry(4.0, 1.5))
  const awnMats = awnTex.map(t => keep(new THREE.MeshStandardMaterial({map: t, side: THREE.DoubleSide, roughness: 0.85})))
  for (const b of bays) if (rnd() < (town === 'ath' ? 0.55 : 0.35) && awnMats.length) {
    const f = pick(floors) + 1
    const a = new THREE.Mesh(awnGeo, pick(awnMats)); a.rotation.set(0, -b.side * Math.PI / 2, 0); a.rotateX(-0.9)
    a.position.set(b.side * (W - 0.7), f * 3.2 - 0.25, b.z); scene.add(a)
  }
  if (town !== 'mos') {
    const n = bays.length
    const ac = new THREE.InstancedMesh(box, std('#d9d9d4', {roughness: 0.5}), n)
    let k = 0
    for (const b of bays) if (rnd() < (town === 'tlv' ? 0.85 : 0.45)) { m4.makeScale(0.42, 0.55, 0.85).setPosition(b.side * (W - 0.25), (1 + Math.floor(rnd() * 3)) * 3.2 + 1.6, b.z + 1.6); ac.setMatrixAt(k++, m4) }
    ac.count = k; scene.add(ac)
  }

  /* ───────── ground floors: shop words, the kiosk, stone and rugs in Mostar ───────── */
  const words = WORDS[town]!
  const signGeo = keep(new THREE.PlaneGeometry(3.4, 0.8))
  const signBg = town === 'ath' ? ['#3a2418', '#16263a', '#2a1a14'] : town === 'tlv' ? ['#2b1d16', '#1d2a38', '#30251a'] : ['#2e2016', '#3a1e18']
  const glass = keep(new THREE.PlaneGeometry(3.0, 1.9))
  for (const b of bays) if (rnd() < 0.42) {
    const word = pick(words), bg = pick(signBg)
    const t = keep(canvas(512, 120, (g, w, h) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(243,239,230,.55)'; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12)
      g.fillStyle = '#f6e7cf'; g.textAlign = 'center'; g.textBaseline = 'middle'
      let size = 74; const f = (n: number) => `700 ${n}px 'Fira Sans Condensed','Heebo','Arial Narrow',system-ui,sans-serif`
      g.font = f(size); while (g.measureText(word).width > w * 0.86 && size > 12) { size -= 2; g.font = f(size) }
      g.fillText(word, w / 2, h / 2 + 3)
    }))
    onWall(signGeo, lit('#ffffff', night ? 1.05 : 0.85, {map: t}), b.side, 3.05, b.z, 0.08)
    onWall(glass, lit(night ? '#ffc89a' : '#9fb0bd', night ? 0.95 : 0.6), b.side, 1.3, b.z, 0.05)
  }
  // a street-name plate at every crossing, in the city's own enamel
  const plateTxt = STREET[town]!
  const plateTex = keep(canvas(256, 80, (g, w, h) => {
    g.fillStyle = paint(town === 'tlv' ? '#1f4d8f' : town === 'ath' ? '#1f4e9c' : '#1c4a8a', '#2b2f38'); g.fillRect(0, 0, w, h)
    g.strokeStyle = '#f3efe6'; g.lineWidth = 5; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = '#f3efe6'; g.textAlign = 'center'; g.textBaseline = 'middle'
    g.font = `700 34px 'Fira Sans Condensed','Heebo',system-ui,sans-serif`; g.fillText(plateTxt, w / 2, h / 2 + 2)
  }))
  const plateGeo = keep(new THREE.PlaneGeometry(1.4, 0.44)), plateMat = lit('#ffffff', 0.9, {map: plateTex})
  for (const c of level.crossings) for (const side of [-1, 1]) onWall(plateGeo, plateMat, side, 3.6, c + 9.8, 0.05)

  if (town === 'ath') kiosk(x, paint, std, lit, z0 - 26)
  if (town === 'mos') bazaar(x, rnd, paint, std, lit, bays, onWall)

  /* ───────── trees: orange trees in Athens, palms in Tel Aviv — never where green is a rival's ───────── */
  const leaf = '#2f5a35'
  if (!x.banned(leaf)) {
    const spots: number[] = []
    for (let z = z0 - 13; z > z1; z -= 27) if (clear(z)) spots.push(z)
    if (town === 'tlv') palms(x, spots, std)
    else if (town === 'ath') {
      const crown = new THREE.InstancedMesh(keep(new THREE.IcosahedronGeometry(1, 1)), std(leaf, {flatShading: true}), spots.length * 2)
      const trunk = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.1, 0.14, 2.4, 6)), std('#4a3424'), spots.length * 2)
      const fruitCol = paint('#f07c1e', '#c9b9a0')
      const fruit = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.11, 6, 4)), lit(fruitCol, night ? 0.7 : 1), spots.length * 2 * 14)
      let i = 0, f = 0
      for (const z of spots) for (const side of [-1, 1]) {
        const tx = side * (H + 2.4)
        m4.makeTranslation(tx, 1.2, z); trunk.setMatrixAt(i, m4)
        m4.makeScale(1.35, 1.15, 1.35).setPosition(tx, 2.9, z); crown.setMatrixAt(i, m4); i++
        for (let k = 0; k < 14; k++) { const a = rnd() * Math.PI * 2, e = (rnd() - 0.3) * 1.2; m4.makeTranslation(tx + Math.cos(a) * 1.25, 2.9 + e, z + Math.sin(a) * 1.25); fruit.setMatrixAt(f++, m4) }
      }
      crown.castShadow = !lite; scene.add(trunk, crown, fruit)
    }
  }

  /* ───────── what is parked against the walls ───────── */
  const parked: {side: number; z: number; kind: 'vespa' | 'scooter' | 'bike'}[] = []
  const kinds: ('vespa' | 'scooter' | 'bike')[] = town === 'ath' ? ['vespa', 'vespa', 'bike'] : town === 'tlv' ? ['scooter', 'scooter', 'bike', 'bike'] : ['bike']
  for (const b of bays) if (rnd() < (town === 'tlv' ? 0.4 : 0.25)) parked.push({side: b.side, z: b.z + 1.2, kind: pick(kinds)})
  rides(x, parked, paint, std)

  /* ───────── bunting across the street ───────── */
  bunting(x, rnd, paint)

  /* ───────── the city at the end of the road ───────── */
  if (town === 'ath') acropolis(x, paint)
  else if (town === 'tlv') towers(x, rnd, paint)
  else if (town === 'mos') bridge(x, rnd, paint)

  /* ───────── the designer's graffiti on the ground floors ───────── */
  graffiti(x, rnd, bays)
  return true
}

/* ───────────── pieces ───────────── */

type Std = (color: THREE.ColorRepresentation, o?: THREE.MeshStandardMaterialParameters) => THREE.MeshStandardMaterial
type Lit = (color: THREE.ColorRepresentation, k?: number, o?: THREE.MeshBasicMaterialParameters) => THREE.MeshBasicMaterial
type Paint = (hex: string, fallback?: string) => string

/** the periptero: a box of a kiosk on the near pavement, lit from inside, papers and drinks on its walls */
function kiosk(x: CityCtx, paint: Paint, std: Std, lit: Lit, z: number) {
  const {scene, keep, level, night} = x
  const g = new THREE.Group(); g.position.set(-(level.walk - 1.1), 0, z); scene.add(g)
  const box = keep(new THREE.BoxGeometry(1, 1, 1))
  const body = new THREE.Mesh(box, std(paint('#3a6ea8', '#4a505c'))); body.scale.set(1.8, 2.4, 2.6); body.position.y = 1.2; g.add(body)
  const roof = new THREE.Mesh(box, std('#e9e4da')); roof.scale.set(2.2, 0.18, 3.0); roof.position.y = 2.5; g.add(roof)
  const front = keep(canvas(256, 256, (c, w, h) => {
    c.fillStyle = '#e8dfcf'; c.fillRect(0, 0, w, h)
    const cols = ['#c23a2b', '#2a6fb5', '#2e7a46', '#e9e6df', '#7a4bb0', '#16181d']
    for (let r = 0; r < 6; r++) for (let k = 0; k < 7; k++) { c.fillStyle = paint(cols[(r * 3 + k) % cols.length]!, '#9a9488'); c.fillRect(8 + k * 35, 10 + r * 40, 28, 32) }
  }))
  const shelf = new THREE.Mesh(keep(new THREE.PlaneGeometry(2.4, 1.9)), lit('#ffffff', night ? 1.05 : 0.85, {map: front})); shelf.rotation.y = Math.PI / 2; shelf.position.set(0.91, 1.25, 0); g.add(shelf)
  const sign = keep(canvas(512, 110, (c, w, h) => { c.fillStyle = '#1b1e26'; c.fillRect(0, 0, w, h); c.fillStyle = '#f3efe6'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `700 70px 'Fira Sans Condensed',system-ui,sans-serif`; c.fillText('ΠΕΡΙΠΤΕΡΟ', w / 2, h / 2 + 3) }))
  const sg = new THREE.Mesh(keep(new THREE.PlaneGeometry(2.6, 0.55)), lit('#ffffff', night ? 1.2 : 0.9, {map: sign})); sg.rotation.y = Math.PI / 2; sg.position.set(0.95, 2.85, 0); g.add(sg)
  if (night) { const l = new THREE.PointLight('#ffd6a8', 22, 8, 1.6); l.position.set(1.8, 1.8, 0); g.add(l) }
}

/** Mostar's ground floors: stone, lanterns in colours, rugs and copper hung out on the wall */
function bazaar(x: CityCtx, rnd: () => number, paint: Paint, std: Std, lit: Lit, bays: {side: number; z: number}[], onWall: (g: THREE.BufferGeometry, m: THREE.Material, side: number, y: number, z: number, out?: number) => THREE.Mesh) {
  const {scene, keep, level, night} = x
  // cobbles over the asphalt (the crossings stay above them)
  const cob = keep(canvas(256, 256, (g, w, h) => {
    g.fillStyle = '#4a4640'; g.fillRect(0, 0, w, h)
    for (let y = 0; y < h; y += 18) for (let k = 0; k < w; k += 22) { const v = 92 + rnd() * 40; g.fillStyle = `rgb(${v},${v - 6},${v - 14})`; g.beginPath(); g.ellipse(k + (y / 18 % 2) * 11 + 10, y + 9, 9.5, 7.5, 0, 0, Math.PI * 2); g.fill() }
  }, [level.half / 2, 70]))
  const span = level.bounds.z1 - level.goal.z + 60
  const road = new THREE.Mesh(keep(new THREE.PlaneGeometry(level.half * 2, span)), keep(new THREE.MeshStandardMaterial({map: cob, roughness: 0.75})))
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.003, (level.bounds.z1 + level.goal.z) / 2); road.receiveShadow = true; scene.add(road)
  // stone on the ground floors
  const stone = keep(canvas(256, 128, (g, w, h) => {
    g.fillStyle = '#6f675b'; g.fillRect(0, 0, w, h)
    for (let y = 0; y < h; y += 21) for (let k = -(y % 2) * 20; k < w; k += 40) { const v = 120 + rnd() * 50; g.fillStyle = `rgb(${v},${v - 8},${v - 20})`; g.fillRect(k + 2, y + 2, 36 + rnd() * 6, 17) }
  }, [6, 1]))
  const stoneMat = keep(new THREE.MeshStandardMaterial({map: stone, roughness: 0.95}))
  for (const side of [-1, 1]) {
    let from = level.bounds.z1 + 10
    for (const c of [...level.crossings].sort((a, b) => b - a).concat(level.goal.z + 40)) {
      const to = c + 9, len = from - to
      if (len > 4) { const p = onWall(keep(new THREE.PlaneGeometry(len, 3.0)), stoneMat, side, 1.5, (from + to) / 2, 0.03); p.receiveShadow = true }
      from = c - 9
    }
  }
  // lanterns, rugs, copper plates
  const lanternCols = ['#d2462e', '#2f7fb8', '#3c9a62', '#c9772e', '#8a3fa0'].map(c => paint(c, '#b9b1a3'))
  const lantern = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.2, 10, 8)), keep(new THREE.MeshBasicMaterial({toneMapped: false})), bays.length * 4)
  let li = 0
  const rugGeo = keep(new THREE.PlaneGeometry(1.3, 1.9))
  const rugs = [0, 1, 2].map(k => keep(new THREE.MeshStandardMaterial({side: THREE.DoubleSide, roughness: 0.95, map: keep(canvas(96, 140, (g, w, h) => {
    const a = paint(['#8e2a22', '#2b3f6e', '#7a3a1e'][k]!, '#5a5048'), b = paint('#e2cfa4', '#cfc6b6'), cc = paint(['#1f4f5a', '#9c3a2a', '#283a5c'][k]!, '#3a3f48')
    g.fillStyle = a; g.fillRect(0, 0, w, h); g.strokeStyle = b; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16)
    g.fillStyle = cc; for (let y = 30; y < h - 20; y += 26) { g.beginPath(); g.moveTo(w / 2, y - 10); g.lineTo(w / 2 + 18, y); g.lineTo(w / 2, y + 10); g.lineTo(w / 2 - 18, y); g.fill() }
  }))})))
  for (const b of bays) {
    if (rnd() < 0.5) for (let k = 0; k < 4; k++) { m4c.makeTranslation(b.side * (level.walk - 0.9 - rnd() * 0.3), 2.35 - rnd() * 0.3, b.z - 1.2 + k * 0.8); lantern.setMatrixAt(li, m4c); lantern.setColorAt(li, C(lanternCols[(li + k) % lanternCols.length]!).multiplyScalar(night ? 2.2 : 1.1)); li++ }
    if (rnd() < 0.35) onWall(rugGeo, rugs[Math.floor(rnd() * 3)]!, b.side, 1.45, b.z + 1.4, 0.12)
  }
  lantern.count = li; scene.add(lantern)
}
const m4c = new THREE.Matrix4()

/** palms down the pavement: a leaning trunk and a crown of fronds */
function palms(x: CityCtx, spots: number[], std: Std) {
  const {scene, keep, level, lite} = x
  const n = spots.length * 2
  const trunk = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(0.16, 0.26, 7.5, 7)), std('#6e5a44'), n)
  const frondGeo = keep(new THREE.ConeGeometry(0.45, 3.4, 4).rotateX(Math.PI / 2).translate(0, 0, 1.7))
  const fronds = new THREE.InstancedMesh(frondGeo, std('#2f5a35', {flatShading: true}), n * 8)
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3(1, 0.25, 1)
  let i = 0, f = 0
  for (const z of spots) for (const side of [-1, 1]) {
    const tx = side * (level.half + 2.4), lean = side * 0.06
    e.set(0, 0, lean); q.setFromEuler(e); m.compose(p.set(tx, 3.75, z), q, new THREE.Vector3(1, 1, 1)); trunk.setMatrixAt(i++, m)
    for (let k = 0; k < 8; k++) { e.set(-0.5 + (k % 2) * 0.25, k * Math.PI / 4, 0, 'YXZ'); q.setFromEuler(e); m.compose(p.set(tx - lean * 7.5, 7.5, z), q, sc); fronds.setMatrixAt(f++, m) }
  }
  trunk.castShadow = fronds.castShadow = !lite; scene.add(trunk, fronds)
}

/** Vespas, e-scooters and bicycles leaning on the walls */
function rides(x: CityCtx, parked: {side: number; z: number; kind: 'vespa' | 'scooter' | 'bike'}[], paint: Paint, std: Std) {
  const {scene, keep, level} = x
  const wheel = keep(new THREE.TorusGeometry(0.3, 0.05, 6, 16)), box = keep(new THREE.BoxGeometry(1, 1, 1))
  const rubber = std('#15161a'), steel = std('#9aa0a8', {metalness: 0.5, roughness: 0.4})
  const vespaCols = ['#4a8a5a', '#b33a2e', '#e8e2d4', '#3a6ea8'].map(c => std(paint(c, '#7a7f88'), {roughness: 0.35}))
  const scooterDeck = std('#22252b'), green = std(paint('#3ea65a', '#9aa0a8'))
  for (const p of parked) {
    const g = new THREE.Group(); g.position.set(p.side * (level.walk - 0.55), 0, p.z); g.rotation.y = 0; scene.add(g)
    const w1 = new THREE.Mesh(wheel, rubber), w2 = new THREE.Mesh(wheel, rubber)
    for (const w of [w1, w2]) { w.rotation.y = Math.PI / 2; g.add(w) }
    if (p.kind === 'vespa') {
      w1.position.set(0, 0.3, -0.55); w2.position.set(0, 0.3, 0.55); w1.scale.setScalar(0.85); w2.scale.setScalar(0.85)
      const m = vespaCols[Math.floor(Math.abs(p.z * 7) % vespaCols.length)]!
      const body = new THREE.Mesh(box, m); body.scale.set(0.45, 0.5, 0.9); body.position.set(0, 0.55, 0.3); g.add(body)
      const shield = new THREE.Mesh(box, m); shield.scale.set(0.42, 0.75, 0.12); shield.position.set(0, 0.75, -0.42); shield.rotation.x = -0.2; g.add(shield)
      const seat = new THREE.Mesh(box, rubber); seat.scale.set(0.32, 0.12, 0.6); seat.position.set(0, 0.86, 0.32); g.add(seat)
      const bar = new THREE.Mesh(box, steel); bar.scale.set(0.6, 0.05, 0.05); bar.position.set(0, 1.15, -0.5); g.add(bar)
    } else if (p.kind === 'scooter') {
      w1.position.set(0, 0.16, -0.45); w2.position.set(0, 0.16, 0.45); w1.scale.setScalar(0.5); w2.scale.setScalar(0.5)
      const deck = new THREE.Mesh(box, scooterDeck); deck.scale.set(0.16, 0.06, 0.95); deck.position.set(0, 0.18, 0); g.add(deck)
      const stem = new THREE.Mesh(box, green); stem.scale.set(0.06, 1.05, 0.06); stem.position.set(0, 0.7, -0.45); stem.rotation.x = -0.12; g.add(stem)
      const bar = new THREE.Mesh(box, rubber); bar.scale.set(0.5, 0.05, 0.05); bar.position.set(0, 1.22, -0.52); g.add(bar)
    } else {
      w1.position.set(0, 0.3, -0.52); w2.position.set(0, 0.3, 0.52)
      const frame = std(paint(['#b33a2e', '#3e8a5a', '#2a5fa0'][Math.floor(Math.abs(p.z * 3) % 3)]!, '#5a5f68'))
      const top = new THREE.Mesh(box, frame); top.scale.set(0.05, 0.05, 0.8); top.position.set(0, 0.72, 0); g.add(top)
      const down = new THREE.Mesh(box, frame); down.scale.set(0.05, 0.6, 0.05); down.position.set(0, 0.48, 0.05); down.rotation.x = 0.6; g.add(down)
      const seat = new THREE.Mesh(box, rubber); seat.scale.set(0.12, 0.05, 0.24); seat.position.set(0, 0.86, 0.32); g.add(seat)
    }
  }
}

/** flags on a line across the street: Greece's and Israel's on their own streets, the club's cloth in Mostar */
function bunting(x: CityCtx, rnd: () => number, paint: Paint) {
  const {scene, keep, level} = x
  const town = x.skin.town!
  const greek = !x.banned('#0d5eaf') && town === 'ath', israeli = !x.banned('#0038b8') && town === 'tlv'
  const flagTex = greek
    ? keep(canvas(90, 60, (g, w, h) => { for (let k = 0; k < 9; k++) { g.fillStyle = k % 2 ? '#f6f4ee' : '#0d5eaf'; g.fillRect(0, k * h / 9, w, h / 9 + 1) } g.fillStyle = '#0d5eaf'; g.fillRect(0, 0, w * 0.4, h * 5 / 9); g.fillStyle = '#f6f4ee'; g.fillRect(w * 0.15, 0, w * 0.1, h * 5 / 9); g.fillRect(0, h * 2 / 9, w * 0.4, h / 9) }))
    : israeli
      ? keep(canvas(90, 64, (g, w, h) => { g.fillStyle = '#f6f4ee'; g.fillRect(0, 0, w, h); g.fillStyle = '#0038b8'; g.fillRect(0, 7, w, 8); g.fillRect(0, h - 15, w, 8); g.strokeStyle = '#0038b8'; g.lineWidth = 3; const cx = w / 2, cy = h / 2, r = 12; for (const o of [0, Math.PI]) { g.beginPath(); for (let k = 0; k < 3; k++) { const a = o - Math.PI / 2 + k * 2 * Math.PI / 3; g[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r) } g.closePath(); g.stroke() } }))
      : keep(canvas(64, 64, (g, w, h) => { g.fillStyle = paint(x.skin.p, '#c9c2b4'); g.beginPath(); g.moveTo(0, 0); g.lineTo(w / 2, h); g.lineTo(w, 0); g.fill(); g.fillStyle = paint(x.skin.s, '#efe9de'); g.fillRect(0, 0, w, 6) }))
  const rect = greek || israeli
  const geo = keep(new THREE.PlaneGeometry(rect ? 0.75 : 0.6, rect ? 0.5 : 0.75))
  const lines: number[] = []
  for (let z = level.bounds.z1 - 6; z > level.goal.z + 90; z -= 22) if (!level.crossings.some(c => Math.abs(z - c) < 4)) lines.push(z)
  const per = 16
  const flags = new THREE.InstancedMesh(geo, keep(new THREE.MeshStandardMaterial({map: flagTex, side: THREE.DoubleSide, roughness: 0.8, emissive: '#1a1a1a', transparent: !rect, alphaTest: rect ? 0 : 0.4})), lines.length * per)
  const ropePts: THREE.Vector3[] = []
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1)
  let i = 0
  for (const z of lines) {
    const zz = z + (rnd() - 0.5) * 2, y0 = 6.4 + rnd() * 0.6
    for (let k = 0; k < per; k++) {
      const t = (k + 0.5) / per, xx = -level.walk + t * level.walk * 2, y = y0 - Math.sin(t * Math.PI) * 1.1
      e.set(0, (rnd() - 0.5) * 0.4, 0); q.setFromEuler(e); m.compose(p.set(xx, y - 0.3, zz), q, one); flags.setMatrixAt(i++, m)
    }
    for (let k = 0; k < per; k++) { const t = k / (per - 1), t2 = (k + 1) / (per - 1); if (k === per - 1) break; ropePts.push(new THREE.Vector3(-level.walk + t * level.walk * 2, y0 - Math.sin(t * Math.PI) * 1.1, zz), new THREE.Vector3(-level.walk + t2 * level.walk * 2, y0 - Math.sin(t2 * Math.PI) * 1.1, zz)) }
  }
  scene.add(flags)
  const rope = new THREE.LineSegments(keep(new THREE.BufferGeometry().setFromPoints(ropePts)), keep(new THREE.LineBasicMaterial({color: '#2a2c33'}))); scene.add(rope)
}

/* ───────────── what stands at the end of the road ───────────── */

/** where the city's landmark stands: past the ground, high enough to clear its roof from the start of the run */
const far = (level: Level) => level.goal.z - 175
/** a landmark big enough to read as the city's skyline stands far behind everything, so it keeps its size
 *  through the whole run and rises between the ground's roof and the objective plate */
const skyline = (level: Level) => level.goal.z - 950

/** the Acropolis: the rock, its walls, and the Parthenon floodlit gold on top */
function acropolis(x: CityCtx, paint: Paint) {
  const {scene, keep, level, night} = x
  const g = new THREE.Group(); g.position.set(30, -175, skyline(level)); g.scale.setScalar(5); scene.add(g)
  const rockMat = keep(new THREE.MeshStandardMaterial({color: night ? '#5a4636' : '#8a7560', roughness: 1, flatShading: true, fog: false, emissive: night ? '#3a2616' : '#000000'}))
  const rock = new THREE.Mesh(keep(new THREE.IcosahedronGeometry(1, 2)), rockMat); rock.scale.set(150, 62, 80); rock.position.y = 0; g.add(rock)
  const wall = new THREE.Mesh(keep(new THREE.BoxGeometry(1, 1, 1)), rockMat); wall.scale.set(150, 10, 66); wall.position.y = 58; g.add(wall)
  const gold = paint('#f2c58a', '#e8e0d0'), shade = paint('#c9925a', '#b8b0a2')
  const lit = (c: string, k: number) => keep(new THREE.MeshBasicMaterial({color: C(c).multiplyScalar(night ? k * 0.5 : k * 0.85), toneMapped: false, fog: false}))
  const marble = lit(gold, 0.9), deep = lit(shade, 0.55)
  const P = new THREE.Group(); P.position.set(0, 63, 0); g.add(P)
  const base = new THREE.Mesh(keep(new THREE.BoxGeometry(70, 4, 32)), marble); base.position.y = 2; P.add(base)
  const col = keep(new THREE.CylinderGeometry(1.4, 1.6, 17, 10))
  const cols = new THREE.InstancedMesh(col, marble, 26)
  const m = new THREE.Matrix4(); let i = 0
  for (let k = 0; k < 8; k++) for (const zz of [15, -15]) { m.makeTranslation(-31 + k * 8.85, 12.5, zz); cols.setMatrixAt(i++, m) }
  for (let k = 1; k < 4; k++) for (const xx of [-31, 31]) { m.makeTranslation(xx, 12.5, -15 + k * 7.5); cols.setMatrixAt(i++, m) }
  cols.count = i; P.add(cols)
  const cella = new THREE.Mesh(keep(new THREE.BoxGeometry(56, 15, 20)), deep); cella.position.y = 11.5; P.add(cella)
  const ent = new THREE.Mesh(keep(new THREE.BoxGeometry(70, 4, 32)), marble); ent.position.y = 23; P.add(ent)
  const ped = new THREE.Shape(); ped.moveTo(-16, 0); ped.lineTo(16, 0); ped.lineTo(0, 6); ped.closePath()
  const pedGeo = keep(new THREE.ExtrudeGeometry(ped, {depth: 70, bevelEnabled: false}).rotateY(Math.PI / 2).translate(-35, 25, 0))
  P.add(new THREE.Mesh(pedGeo, deep))
  // the broken corner, the smaller temple to the side
  const ere = new THREE.Mesh(keep(new THREE.BoxGeometry(18, 10, 12)), deep); ere.position.set(-58, 68, 12); g.add(ere)
}

/** Tel Aviv: a cluster of towers, lit floor by floor, palms in front of them */
function towers(x: CityCtx, rnd: () => number, paint: Paint) {
  const {scene, keep, level, night} = x
  const g = new THREE.Group(); g.position.set(0, 0, far(level)); scene.add(g)
  const winTex = keep(canvas(128, 512, (c, w, h) => {
    c.fillStyle = night ? '#1a2130' : '#8fa3b8'; c.fillRect(0, 0, w, h)
    for (let y = 4; y < h; y += 10) for (let k = 4; k < w; k += 10) { const on = rnd() < (night ? 0.45 : 0.15); c.fillStyle = on ? (rnd() < 0.7 ? '#ffd9a8' : '#cfe3ff') : (night ? '#232b3b' : '#a9bccd'); c.fillRect(k, y, 6, 6) }
  }))
  const glass = keep(new THREE.MeshBasicMaterial({map: winTex, color: C('#ffffff').multiplyScalar(night ? 0.75 : 0.95), toneMapped: false, fog: false}))
  const specs = [[-62, 130, 26], [-30, 190, 30], [0, 160, 24], [26, 220, 32], [58, 150, 26], [88, 120, 22], [-92, 110, 24]] as const
  for (const [xx, h, w] of specs) {
    const t = new THREE.Mesh(keep(new THREE.BoxGeometry(w, h, w)), glass); t.position.set(xx, h / 2 + 10, -20 + rnd() * 40); g.add(t)
    const cap = new THREE.Mesh(keep(new THREE.BoxGeometry(w * 0.6, 6, w * 0.6)), keep(new THREE.MeshBasicMaterial({color: C(paint('#e8eef6', '#cfd6df')).multiplyScalar(night ? 0.6 : 0.9), toneMapped: false, fog: false}))); cap.position.set(t.position.x, h + 13, t.position.z); g.add(cap)
    if (night) { const red = new THREE.Mesh(keep(new THREE.SphereGeometry(1.2, 8, 6)), keep(new THREE.MeshBasicMaterial({color: C(paint('#ff3b2e', '#e8eef6')).multiplyScalar(2), toneMapped: false, fog: false}))); red.position.set(t.position.x, h + 17, t.position.z); g.add(red) }
  }
  // a row of palms against the skyline
  if (!x.banned('#2f5a35')) {
    const dark = keep(new THREE.MeshBasicMaterial({color: C(night ? '#0d1410' : '#2f4a35'), fog: false}))
    for (let k = -4; k <= 4; k++) {
      const p = new THREE.Group(); p.position.set(k * 26 + (rnd() - 0.5) * 8, 0, 70); g.add(p)
      const tr = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.9, 1.3, 46, 6)), dark); tr.position.y = 23; p.add(tr)
      for (let f = 0; f < 7; f++) { const fr = new THREE.Mesh(keep(new THREE.ConeGeometry(2.2, 16, 4)), dark); fr.position.set(Math.cos(f) * 6, 45, Math.sin(f) * 6); fr.rotation.set(Math.sin(f) * 1.2, 0, -Math.cos(f) * 1.2); p.add(fr) }
    }
  }
}

/** Mostar: green hills, the old arched bridge over turquoise water, its two towers, a minaret, lanterns */
function bridge(x: CityCtx, rnd: () => number, paint: Paint) {
  const {scene, keep, level, night} = x
  const g = new THREE.Group(); g.position.set(0, -50, skyline(level)); g.scale.setScalar(5); scene.add(g)
  const hill = keep(new THREE.MeshStandardMaterial({color: paint(night ? '#1d2b22' : '#4a6a44', '#3a3a38'), roughness: 1, flatShading: true, fog: false, emissive: night ? '#0b120d' : '#000000'}))
  for (const [xx, zz, sx, sy] of [[-120, -40, 120, 70], [130, -30, 130, 80], [0, -160, 220, 110], [-60, -120, 90, 60]] as const) { const h = new THREE.Mesh(keep(new THREE.IcosahedronGeometry(1, 2)), hill); h.scale.set(sx, sy, 80); h.position.set(xx, 0, zz); g.add(h) }
  const stoneMat = keep(new THREE.MeshBasicMaterial({color: C(paint('#e6d3b0', '#d6d0c4')).multiplyScalar(night ? 0.55 : 0.95), toneMapped: false, fog: false}))
  // banks
  for (const side of [-1, 1]) { const b = new THREE.Mesh(keep(new THREE.BoxGeometry(70, 46, 40)), stoneMat); b.position.set(side * 58, 23, 0); g.add(b) }
  // the arch: half a torus, thick and flattened
  const arch = new THREE.Mesh(keep(new THREE.TorusGeometry(24, 3, 8, 32, Math.PI)), stoneMat); arch.position.set(0, 34, 0); arch.scale.set(1, 0.62, 1.4); g.add(arch)
  const deck = new THREE.Mesh(keep(new THREE.BoxGeometry(8, 1.6, 6)), stoneMat); deck.position.set(0, 49.6, 0); g.add(deck)
  for (const side of [-1, 1]) { const t = new THREE.Mesh(keep(new THREE.BoxGeometry(12, 22, 12)), stoneMat); t.position.set(side * 30, 57, 0); g.add(t); const r = new THREE.Mesh(keep(new THREE.ConeGeometry(9, 6, 4)), keep(new THREE.MeshBasicMaterial({color: C('#5a4a40').multiplyScalar(night ? 0.8 : 1), fog: false}))); r.rotation.y = Math.PI / 4; r.position.set(side * 30, 71, 0); g.add(r) }
  // the water under it
  const water = new THREE.Mesh(keep(new THREE.PlaneGeometry(46, 160)), keep(new THREE.MeshBasicMaterial({color: C(paint('#2fb5b0', '#3a6f80')).multiplyScalar(night ? 0.45 : 1), toneMapped: false, fog: false}))); water.rotation.x = -Math.PI / 2; water.position.set(0, 31, -30); g.add(water)
  // a minaret on the hill behind
  const mi = new THREE.Group(); mi.position.set(-46, 60, -70); g.add(mi)
  mi.add(at(new THREE.Mesh(keep(new THREE.CylinderGeometry(2.2, 2.6, 46, 10)), stoneMat), 0, 23, 0))
  mi.add(at(new THREE.Mesh(keep(new THREE.CylinderGeometry(3.6, 3.6, 1.6, 12)), stoneMat), 0, 38, 0))
  mi.add(at(new THREE.Mesh(keep(new THREE.ConeGeometry(2.4, 12, 10)), keep(new THREE.MeshBasicMaterial({color: C('#4a4f58'), fog: false}))), 0, 52, 0))
  if (night) {
    const lamp = keep(new THREE.SpriteMaterial({map: x.glowTex, color: C(paint('#ffc27a', '#f2e8d8')).multiplyScalar(0.9), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false}))
    for (let k = 0; k < 14; k++) { const s = new THREE.Sprite(lamp); s.scale.set(9, 9, 1); s.position.set(-50 + rnd() * 100, 46 + rnd() * 6, 18); g.add(s) }
  }
}

/** a mesh placed at x, y, z (an Object3D's position cannot be assigned) */
function at(o: THREE.Mesh, px: number, py: number, pz: number) { o.position.set(px, py, pz); return o }

/* ───────────── the designer's graffiti ───────────── */

type Graffiti = {rects: Record<string, [string, number, number][]>; clubs: Record<string, [string, number][]>}
let graffitiList: Promise<Graffiti | null> | null = null

/** the same list the town reads (`public/life/town/tex/graffiti/rects.js`), parsed once per page */
function loadGraffiti(): Promise<Graffiti | null> {
  graffitiList ??= fetch('/life/town/tex/graffiti/rects.js').then(r => r.ok ? r.text() : null).then(t => {
    if (!t) return null
    const json = t.slice(t.indexOf('=') + 1).trim().replace(/;\s*$/, '')
    return JSON.parse(json) as Graffiti
  }).catch(() => null)
  return graffitiList
}

/** pieces on the ground floors between the shop fronts; the club's own list only, never another club's */
function graffiti(x: CityCtx, rnd: () => number, bays: {side: number; z: number}[]) {
  const {scene, keep} = x
  const spots = bays.filter(() => rnd() < 0.45)
  const pickAt = spots.map(() => rnd()), tilt = spots.map(() => (rnd() - 0.5) * 0.06)
  let alive = true
  keep({dispose: () => { alive = false }})
  void loadGraffiti().then(G => {
    const list = G?.clubs[x.clubId]
    if (!alive || !G || !list?.length) return
    const loader = new THREE.TextureLoader()
    const mats = new Map<string, THREE.MeshStandardMaterial>()
    spots.forEach((b, k) => {
      const [sheet, i] = list[Math.floor(pickAt[k]! * list.length)]!
      const r = G.rects[sheet]?.[i]; if (!r) return
      const [file, w, h] = r
      let m = mats.get(file)
      if (!m) { const t = keep(loader.load(`/life/town/tex/graffiti/${file}.webp`)); t.colorSpace = THREE.SRGBColorSpace; m = keep(new THREE.MeshStandardMaterial({map: t, transparent: true, alphaTest: 0.25, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2})); mats.set(file, m) }
      const maxW = 3.2, maxH = 1.9, sc = Math.min(maxW / w, maxH / h)
      const p = new THREE.Mesh(keep(new THREE.PlaneGeometry(w * sc, h * sc)), m)
      p.rotation.set(0, -b.side * Math.PI / 2, tilt[k]!)
      p.position.set(b.side * (x.level.walk - 0.07), 1.25, b.z - 2.6)
      scene.add(p)
    })
  })
}
