// THE WEEKLY comes alive — a canvas toolkit for the comic series (owner, 4.11.2026: "lighter in motion, interesting,
// a real comic, full animation, the atmosphere of a cartoon film"). The look is FAN LIFE's own 1970–72 boys' football
// weekly: process inks on newsprint, 3–6px ink outlines, halftone dots, offset black shadows, speed lines, starbursts,
// Knewave shouts. Movement is drawn ON TWOS (12 drawings a second at 24 fps) with line boil — every outline is
// re-wobbled each drawing — which is what makes it read as hand-animated rather than slid around.
// Deterministic: frame(t) draws time t; nothing reads the clock.
const W = 1920, H = 1080
const INK = '#15130F', NEWS = '#F4ECD8', PAPER = '#FFFBF2', RED = '#D71920', DEEP = '#A20F18', CYAN = '#1B9AD6',
  NAVY = '#233C8F', NIGHT = '#16203F', GREEN = '#1F8A4C', ORANGE = '#F26A1B', YELLOW = '#FFC72C', SKIN = '#E8A27C', SKIN2 = '#C97C5A'
const cv = document.getElementById('c'), x = cv.getContext('2d')
let DRAW = 0            // the current drawing index (changes 12× a second)
function rnd(s) { s = (Math.abs(Math.floor(s)) % 2147483646) + 1; return () => (s = (s * 16807) % 2147483647, (s - 1) / 2147483646) }
const cl = (a, b, v) => Math.max(a, Math.min(b, v))
const lerp = (a, b, k) => a + (b - a) * k
const k01 = (t, a, b) => cl(0, 1, (t - a) / (b - a))
const ease = k => 1 - Math.pow(1 - cl(0, 1, k), 3)
const easeIO = k => (k = cl(0, 1, k), k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2)
const back = k => { k = cl(0, 1, k); const s = 2.2; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2) }
const pop = k => { k = cl(0, 1, k); return k < .6 ? back(k / .6) * 1.0 : 1 + Math.sin((k - .6) / .4 * Math.PI) * .04 * (1 - k) }

// ---------- textures, made once ----------
function mk(w, h, f) { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d')); return c }
const DOTS = {}
function dotPattern(color, size = 20, r = .27) {
  const key = color + size + r
  if (!DOTS[key]) DOTS[key] = x.createPattern(mk(size, size, g => {
    g.fillStyle = color; g.beginPath(); g.arc(size / 2, size / 2, size * r, 0, 7); g.fill()
    g.beginPath(); g.arc(0, 0, size * r * .7, 0, 7); g.arc(size, 0, size * r * .7, 0, 7); g.arc(0, size, size * r * .7, 0, 7); g.arc(size, size, size * r * .7, 0, 7); g.fill()
  }), 'repeat')
  return DOTS[key]
}
const GRAIN = mk(W, H, g => { const im = g.createImageData(W, H), r = rnd(11); for (let i = 0; i < im.data.length; i += 4) { const v = 150 + r() * 105; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 26 } g.putImageData(im, 0, 0) })
const PAPERFIBRE = mk(W, H, g => { g.fillStyle = NEWS; g.fillRect(0, 0, W, H); const r = rnd(5); g.globalAlpha = .05; for (let i = 0; i < 2600; i++) { g.fillStyle = r() < .5 ? '#8a7a55' : '#fff'; g.fillRect(r() * W, r() * H, 1 + r() * 30, 1) } g.globalAlpha = 1 })

// ---------- the boiling ink line ----------
// Points get a small seeded wobble that changes with each drawing; long edges are subdivided so they wobble along their length.
function wob(pts, closed = true, amp = 2.4, seed = 1) {
  const r = rnd(seed * 977 + DRAW * 131), out = []
  const n = pts.length, m = closed ? n : n - 1
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % n], len = Math.hypot(b[0] - a[0], b[1] - a[1]), s = Math.max(1, Math.floor(len / 40))
    for (let j = 0; j < s; j++) { const k = j / s; out.push([a[0] + (b[0] - a[0]) * k + (r() - .5) * amp, a[1] + (b[1] - a[1]) * k + (r() - .5) * amp]) }
  }
  if (!closed) out.push(pts[n - 1])
  return out
}
let SMOOTH = false
function trace(p, closed = true) {
  x.beginPath()
  if (!SMOOTH || p.length < 3) { p.forEach((q, i) => i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])); if (closed) x.closePath(); return }
  const n = p.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const m0 = mid(p[n - 1], p[0]); x.moveTo(m0[0], m0[1])
  for (let i = 0; i < n; i++) { const a = p[i], m = mid(a, p[(i + 1) % n]); x.quadraticCurveTo(a[0], a[1], m[0], m[1]) }
  x.closePath()
}
// an organic shape: the same as shape(), drawn with curves through the points (skin, hair, clouds, cloth)
function blob(pts, fill, o = {}) { SMOOTH = true; try { shape(pts, fill, {amp: 1.6, ...o}) } finally { SMOOTH = false } }
// a limb or finger: a fat rounded stroke, inked
function limb(pts, w, fill = SKIN, seed = 5) { stroke(pts, w + 10, INK, seed); stroke(pts, w, fill, seed) }
// a filled, inked shape; fill may be a colour or a pattern; shade = halftone over the fill on one side
function shape(pts, fill, o = {}) {
  const p = o.raw ? pts : wob(pts, true, o.amp ?? 2.4, o.seed ?? pts.length)
  if (o.shadow) { x.save(); x.translate(o.shadow, o.shadow); trace(p); x.fillStyle = INK; x.fill(); x.restore() }
  trace(p); if (fill) { x.fillStyle = fill; x.fill() }
  if (o.dots) { x.save(); trace(p); x.clip(); x.fillStyle = dotPattern(o.dots, o.dotSize || 20); x.fillRect(-W, -H, 3 * W, 3 * H); x.restore() }
  if (o.line !== 0) { trace(p); x.lineWidth = o.line || 5; x.lineJoin = 'round'; x.lineCap = 'round'; x.strokeStyle = INK; x.stroke() }
}
function stroke(pts, w = 5, color = INK, seed = 3) { const p = wob(pts, false, 2, seed); trace(p, false); x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = color; x.stroke() }
function ellipse(cx, cy, rx, ry, rot = 0, n = 28) { const p = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; p.push([cx + Math.cos(a) * rx * Math.cos(rot) - Math.sin(a) * ry * Math.sin(rot), cy + Math.cos(a) * rx * Math.sin(rot) + Math.sin(a) * ry * Math.cos(rot)]) } return p }
function rect(x0, y0, w, h) { return [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]] }

// ---------- comic furniture ----------
function speedLines(cx, cy, r0, r1, n, color = INK, seed = 9, width = 4) {
  const r = rnd(seed + DRAW * 7); x.save(); x.strokeStyle = color; x.lineCap = 'round'
  for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, a0 = r0 * (0.8 + r() * .4); x.lineWidth = width * (.5 + r()); x.beginPath(); x.moveTo(cx + Math.cos(a) * a0, cy + Math.sin(a) * a0); x.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); x.stroke() }
  x.restore()
}
function motionLines(x0, y0, x1, y1, n, spread, seed = 4) {   // parallel streaks behind a moving thing
  const r = rnd(seed + DRAW), dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L
  x.save(); x.strokeStyle = INK; x.lineCap = 'round'
  for (let i = 0; i < n; i++) { const o = (i / (n - 1) - .5) * spread, k = .2 + r() * .5; x.lineWidth = 3 + r() * 3; x.beginPath(); x.moveTo(x0 + nx * o, y0 + ny * o); x.lineTo(x0 + dx * k + nx * o, y0 + dy * k + ny * o); x.stroke() }
  x.restore()
}
function burst(cx, cy, r, spikes, fill, o = {}) {
  const p = [], rr = rnd(o.seed || 21)
  for (let i = 0; i < spikes * 2; i++) { const a = i / (spikes * 2) * Math.PI * 2 + (o.rot || 0), R = i % 2 ? r * (.58 + rr() * .12) : r * (.95 + rr() * .12); p.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]) }
  shape(p, fill, {shadow: o.shadow ?? 12, line: o.line ?? 6, amp: 3})
}
function rays(cx, cy, n, color, spin = 0, len = 3000) {
  x.save(); x.translate(cx, cy); x.rotate(spin); x.fillStyle = color
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, w = Math.PI / n * .55; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a - w) * len, Math.sin(a - w) * len); x.lineTo(Math.cos(a + w) * len, Math.sin(a + w) * len); x.closePath(); x.fill() }
  x.restore()
}
// a shout: Knewave, white fill, thick ink outline, offset shadow; drops from big and settles (k = 0..1 of its entry)
function shout(text, cx, cy, size, k, o = {}) {
  if (k <= 0) return
  const s = k < 1 ? lerp(2.6, 1, back(k)) : 1 + Math.sin(DRAW * 1.7) * .012
  x.save(); x.translate(cx, cy); x.rotate((o.rot || -.06) + Math.sin(DRAW * 2.3) * .006); x.scale(s, s)
  x.font = `${size}px Shout`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'
  x.fillStyle = INK; x.fillText(text, size * .07, size * .08)
  x.lineWidth = size * .16; x.strokeStyle = INK; x.strokeText(text, 0, 0)
  x.fillStyle = o.fill || PAPER; x.fillText(text, 0, 0)
  if (o.inner) { x.lineWidth = size * .03; x.strokeStyle = o.inner; x.strokeText(text, 0, 0) }
  x.restore()
}
// the narrator's caption box (the comic's own voice): paper plate, ink border, offset shadow, types on
function caption(text, x0, y0, w, k, o = {}) {
  if (k <= 0) return
  const size = o.size || 44, font = `${o.weight || 800} ${size}px Body`
  x.font = font
  const words = text.split(' '), lines = []; let line = ''
  for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (x.measureText(t).width > w - 56) { lines.push(line); line = wd } else line = t }
  lines.push(line)
  const h = lines.length * size * 1.18 + 44, kk = ease(k * 3)
  x.save(); x.translate(x0, y0 + (1 - kk) * 30); x.globalAlpha = kk
  shape(rect(0, 0, w, h), o.fill || PAPER, {shadow: 10, line: 5, seed: 77})
  x.fillStyle = INK; x.font = font; x.textBaseline = 'top'
  const total = text.length, shown = Math.floor(total * cl(0, 1, k * (o.typeSpeed || 1.6)))
  let used = 0
  lines.forEach((ln, i) => { const part = ln.slice(0, Math.max(0, shown - used)); used += ln.length + 1; x.fillText(part, 28, 22 + i * size * 1.18) })
  x.restore()
}
// a comic panel: clip to its frame, draw the inside, then the ink border and the gutter shadow
function panel(px, py, pw, ph, k, inside, o = {}) {
  if (k <= 0) return
  const s = o.enter === 'slam' ? lerp(1.25, 1, back(k)) : lerp(.85, 1, back(k))
  x.save(); x.translate(px + pw / 2, py + ph / 2); x.rotate((o.rot || 0) * (1 - ease(k)) + (o.tilt || 0)); x.scale(s, s); x.translate(-pw / 2, -ph / 2)
  x.globalAlpha = cl(0, 1, k * 4)
  const frame = wob(rect(0, 0, pw, ph), true, 1.6, 400 + (o.seed || 0))
  x.save(); x.translate(14, 14); trace(frame); x.fillStyle = INK; x.fill(); x.restore()
  x.save(); trace(frame); x.clip(); x.fillStyle = o.bg || PAPER; x.fillRect(0, 0, pw, ph); inside(pw, ph); x.restore()
  trace(frame); x.lineWidth = 9; x.strokeStyle = INK; x.stroke()
  x.restore()
}
function shake(t0, t, amp = 22, dur = .45) { const k = k01(t, t0, t0 + dur); if (k <= 0 || k >= 1) return [0, 0]; const r = rnd(DRAW * 3 + 1), d = amp * (1 - k); return [(r() - .5) * 2 * d, (r() - .5) * 2 * d] }
function page() { x.drawImage(PAPERFIBRE, 0, 0) }
function finish() { x.drawImage(GRAIN, 0, 0) }

// ---------- people: generic cartoon figures — never a real person's likeness (no faces of real people) ----------
// a figure seen from behind, standing, one arm raised to `reach` (0 = down, 1 = up to a shelf)
function backFigure(cx, cy, s, reach, o = {}) {
  const hair = o.hair || '#4a3324', skin = SKIN, towel = o.towel || PAPER
  // legs
  shape([[cx - 46 * s, cy + 150 * s], [cx - 10 * s, cy + 150 * s], [cx - 14 * s, cy + 330 * s], [cx - 50 * s, cy + 330 * s]], skin, {dots: SKIN2, seed: 12})
  shape([[cx + 10 * s, cy + 150 * s], [cx + 46 * s, cy + 150 * s], [cx + 50 * s, cy + 330 * s], [cx + 14 * s, cy + 330 * s]], skin, {dots: SKIN2, seed: 13})
  // torso (back), shoulder blades as two ink ticks
  shape([[cx - 92 * s, cy - 120 * s], [cx + 92 * s, cy - 120 * s], [cx + 70 * s, cy + 40 * s], [cx - 70 * s, cy + 40 * s]], skin, {seed: 14})
  x.save(); trace(wob([[cx + 20 * s, cy - 120 * s], [cx + 92 * s, cy - 120 * s], [cx + 70 * s, cy + 40 * s], [cx + 10 * s, cy + 40 * s]], true, 1, 15)); x.clip(); x.fillStyle = dotPattern(SKIN2); x.fillRect(0, 0, W, H); x.restore()
  stroke([[cx - 40 * s, cy - 70 * s], [cx - 18 * s, cy - 40 * s]], 4, INK, 16); stroke([[cx + 40 * s, cy - 70 * s], [cx + 18 * s, cy - 40 * s]], 4, INK, 17)
  // towel round the waist, two stripes
  shape([[cx - 78 * s, cy + 30 * s], [cx + 78 * s, cy + 30 * s], [cx + 86 * s, cy + 168 * s], [cx - 86 * s, cy + 168 * s]], towel, {seed: 18, dots: '#d9cdb0'})
  shape(rect(cx - 82 * s, cy + 70 * s, 164 * s, 16 * s), o.stripe || CYAN, {seed: 19, line: 3})
  // arms: left hangs, right reaches (shoulder → elbow → hand)
  stroke([[cx - 86 * s, cy - 108 * s], [cx - 112 * s, cy - 10 * s], [cx - 104 * s, cy + 80 * s]], 34 * s, INK, 20); stroke([[cx - 86 * s, cy - 108 * s], [cx - 112 * s, cy - 10 * s], [cx - 104 * s, cy + 80 * s]], 24 * s, skin, 20)
  const ex = cx + lerp(118, 120, reach) * s, ey = cy + lerp(-10, -170, reach) * s, hx = cx + lerp(108, 150, reach) * s, hy = cy + lerp(80, -300, reach) * s
  stroke([[cx + 86 * s, cy - 108 * s], [ex, ey], [hx, hy]], 34 * s, INK, 21); stroke([[cx + 86 * s, cy - 108 * s], [ex, ey], [hx, hy]], 24 * s, skin, 21)
  // neck and head (back of the head: hair only, ears)
  shape(rect(cx - 22 * s, cy - 150 * s, 44 * s, 40 * s), skin, {seed: 22})
  shape(ellipse(cx - 62 * s, cy - 205 * s, 12 * s, 20 * s), skin, {seed: 23}); shape(ellipse(cx + 62 * s, cy - 205 * s, 12 * s, 20 * s), skin, {seed: 24})
  shape(ellipse(cx, cy - 215 * s, 62 * s, 72 * s), hair, {seed: 25})
  stroke([[cx - 30 * s, cy - 260 * s], [cx - 10 * s, cy - 236 * s]], 3, '#2a1d14', 26); stroke([[cx + 18 * s, cy - 262 * s], [cx + 30 * s, cy - 232 * s]], 3, '#2a1d14', 27)
  return [hx, hy]
}
// a big glass bottle (no brand): faceted body, stopper, a label with no words
function bottle(cx, cy, s, rot) {
  x.save(); x.translate(cx, cy); x.rotate(rot); x.scale(s, s)
  shape([[-46, -30], [46, -30], [56, 120], [-56, 120]], '#bfe3f2', {seed: 30, dots: CYAN, dotSize: 10})
  shape([[-10, -30], [10, -30], [16, 120], [-16, 120]], 'rgba(255,255,255,.55)', {seed: 31, line: 0})
  shape(rect(-18, -62, 36, 34), '#bfe3f2', {seed: 32}); shape(rect(-26, -96, 52, 36), NAVY, {seed: 33})
  shape(rect(-36, 34, 72, 46), PAPER, {seed: 34, line: 3})
  x.restore()
}
function shard(cx, cy, s, rot, seed) { x.save(); x.translate(cx, cy); x.rotate(rot); const r = rnd(seed); shape([[0, -18 * s], [14 * s * (0.6 + r()), 6 * s], [-12 * s, 14 * s * (0.5 + r())]], '#d6eef8', {seed, line: 3}); x.restore() }

// ---------- a generic footballer, side on, running (phase 0..1 is one stride) — no face, a number on the back ----------
// kit = {shirt, sleeve, shorts, socks, number, skin, hair}; dir = 1 faces right, -1 faces left
function player(cx, cy, s, phase, kit = {}, dir = 1, o = {}) {
  const sh = kit.shirt || RED, sl = kit.sleeve || sh, so = kit.shorts || PAPER, sk = kit.socks || sh, skin = kit.skin || SKIN, hair = kit.hair || '#3b2a1e'
  const a = phase * Math.PI * 2, run = o.still ? 0 : 1
  x.save(); x.translate(cx, cy); x.scale(dir * s, s)
  const bob = -Math.abs(Math.sin(a)) * 14 * run, lean = .18 * run
  x.translate(0, bob); x.rotate(lean)
  const leg = (ph, back) => {  // thigh, shin, boot
    const t = Math.sin(ph) * .8 * run, k = Math.max(0, Math.cos(ph)) * 1.5 * run
    const hip = [0, 40], knee = [hip[0] + Math.sin(t) * 95, hip[1] + Math.cos(t) * 95], foot = [knee[0] + Math.sin(t - k) * 95, knee[1] + Math.cos(t - k) * 95]
    limb([hip, knee], 38, back ? so : so, 200 + back); limb([knee, foot], 30, sk, 202 + back)
    blob(ellipse(foot[0] + 14, foot[1] + 4, 26, 13, t - k), INK, {seed: 204 + back, line: 3})
  }
  const arm = (ph, back) => { const t = -Math.sin(ph) * 1.0 * run, sh0 = [0, -95], el = [sh0[0] + Math.sin(t) * 70, sh0[1] + Math.cos(t) * 70], h = [el[0] + Math.sin(t + 1.3) * 60, el[1] + Math.cos(t + 1.3) * 60]
    limb([sh0, el], 30, sl, 210 + back); limb([el, h], 24, skin, 212 + back) }
  if (o.dim !== false) { x.save(); x.globalAlpha = .9; leg(a + Math.PI, 1); arm(a + Math.PI, 1); x.restore() }
  blob([[-48, -120], [44, -124], [50, 46], [-50, 50]], sh, {seed: 220, shadow: 0})            // the shirt
  blob(rect(-52, 30, 104, 46), so, {seed: 221})                                                  // shorts
  leg(a, 0)
  blob([[-46, -128], [40, -132], [50, 40], [-48, 44]], sh, {seed: 222})                       // shirt over the far limbs, under the near arm
  arm(a, 0)
  limb([[0, -128], [4, -140]], 30, skin, 230)                                                   // neck
  blob(ellipse(6, -186, 42, 48), skin, {seed: 231})                                              // head, side on: a generic cartoon face
  blob([[44, -192], [60, -178], [44, -170]], skin, {seed: 234, line: 4})                          // nose
  x.fillStyle = INK; x.beginPath(); x.arc(28, -196, 5.5, 0, 7); x.fill()                          // eye
  blob([[-36, -214], [-6, -238], [36, -228], [46, -206], [14, -210], [-30, -170], [-44, -188]], hair, {seed: 232})
  blob(ellipse(-8, -180, 9, 13), skin, {seed: 233, line: 3})                                      // ear
  x.restore()
}
// a row of supporters seen from behind (heads, shoulders, raised arms, scarves) — a crowd that bounces on the beat
function crowd(y, h, colors, t, seed = 300, o = {}) {
  const r = rnd(seed), n = o.n || 18
  for (let row = 0; row < (o.rows || 2); row++) for (let i = 0; i < n; i++) {
    const cx = (i + (row % 2) * .5) * (W / n) + (r() - .5) * 30, base = y + row * h * .45, c = colors[Math.floor(r() * colors.length)]
    const jump = Math.max(0, Math.sin(t * (6 + r() * 3) + r() * 6)) * (o.jump ?? 18)
    const s = (h / 300) * (row ? 1.1 : .9)
    x.save(); x.translate(cx, base - jump)
    blob([[-70 * s, 0], [-60 * s, -120 * s], [60 * s, -120 * s], [70 * s, 0]], c, {seed: seed + i * 3 + row})
    if (r() < .45) { const up = r() < .5 ? 1 : -1; limb([[40 * s * up, -110 * s], [60 * s * up, -230 * s - jump * .3]], 22 * s, c, seed + i) }
    blob(ellipse(0, -160 * s, 44 * s, 50 * s), r() < .3 ? '#6b4a32' : '#2b211a', {seed: seed + i * 7 + row})
    if (o.scarf && r() < .5) { stroke([[-90 * s, -230 * s - jump * .2], [90 * s, -240 * s - jump * .2]], 22 * s, o.scarf, seed + i); stroke([[-90 * s, -230 * s - jump * .2], [90 * s, -240 * s - jump * .2]], 8 * s, PAPER, seed + i + 1) }
    x.restore()
  }
}
