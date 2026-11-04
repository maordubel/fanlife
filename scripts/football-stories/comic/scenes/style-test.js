// STYLE TEST (4.11.2026) — 16 s: the cover of the comic, then three panels: the shelf, the slip, the SMASH.
// Captions are deliberately general until the fact-check lands (no date, no tendon, no name).
const T = 16
const CAMS = [  // t, centre x, centre y, zoom — the camera travels across the page from panel to panel
  [0, 960, 540, 1], [3.3, 960, 540, 1], [3.7, 640, 330, 1.45], [6.6, 640, 330, 1.55],
  [7.1, 1460, 330, 1.6], [9.3, 1460, 330, 1.7], [9.8, 960, 790, 1.35], [12.2, 960, 760, 1.3], [12.9, 960, 540, 1], [T, 960, 540, 1.04]]
function cam(t) {
  let i = 0; while (i < CAMS.length - 2 && t > CAMS[i + 1][0]) i++
  const a = CAMS[i], b = CAMS[i + 1], k = easeIO(k01(t, a[0], b[0]))
  return [lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k)]
}

function cover(t) {
  x.fillStyle = RED; x.fillRect(0, 0, W, H)
  rays(1260, 600, 22, DEEP, t * .25)
  // the masthead
  x.save(); x.translate(620, 190); x.rotate(-.05)
  const k = back(k01(t, .1, .7)); x.scale(lerp(.2, 1, k), lerp(.2, 1, k))
  x.font = '150px Mast'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'
  x.fillStyle = INK; x.fillText('Strange', 10, 12); x.lineWidth = 22; x.strokeStyle = INK; x.strokeText('Strange', 0, 0); x.fillStyle = PAPER; x.fillText('Strange', 0, 0)
  x.restore()
  x.save(); x.translate(700, 340); x.rotate(-.05)
  const k2 = back(k01(t, .35, .95)); x.scale(lerp(.2, 1, k2), lerp(.2, 1, k2))
  x.font = '130px Mast'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'
  x.fillStyle = INK; x.fillText('but True!', 10, 12); x.lineWidth = 20; x.strokeStyle = INK; x.strokeText('but True!', 0, 0); x.fillStyle = PAPER; x.fillText('but True!', 0, 0)
  x.restore()
  // the band and the price roundel
  if (t > .7) { const kb = ease(k01(t, .7, 1.1)); shape(rect(150 - (1 - kb) * 900, 470, 980, 90), INK, {seed: 50, line: 0}); x.save(); x.fillStyle = PAPER; x.font = '54px Head'; x.textBaseline = 'middle'; x.fillText('FANLIFE: FOOTBALL STORIES', 190 - (1 - kb) * 900, 516); x.restore() }
  if (t > 1) { const kr = back(k01(t, 1, 1.4)); x.save(); x.translate(260, 790); x.scale(kr, kr); shape(ellipse(0, 0, 120, 120), CYAN, {shadow: 10, line: 7, seed: 51}); x.fillStyle = PAPER; x.font = '40px Caps'; x.textAlign = 'center'; x.fillText('ISSUE', 0, -40); x.font = '96px Num'; x.fillText('1', 0, 52); x.restore() }
  // the cover star: the bottle, floating, with a question burst
  const by = 640 + Math.sin(t * 2.4) * 18
  if (t > .9) { const kp = back(k01(t, .9, 1.5)); x.save(); x.translate(1260, by); x.scale(kp, kp); burst(0, 0, 330, 14, YELLOW, {seed: 52, rot: t * .1}); bottle(0, 0, 1.55, -.18 + Math.sin(t * 1.7) * .06); x.restore() }
  caption('Spain\'s goalkeeper. A World Cup on the way. And a glass bottle on the bathroom shelf.', 140, 900, 1000, k01(t, 1.6, 3.2), {size: 34})
}

function bathroom(pw, ph, t) {
  // tiles
  x.fillStyle = '#d7eef7'; x.fillRect(0, 0, pw, ph)
  x.strokeStyle = 'rgba(27,154,214,.45)'; x.lineWidth = 3
  for (let gx = 0; gx < pw; gx += 80) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, ph); x.stroke() }
  for (let gy = 0; gy < ph; gy += 80) { x.beginPath(); x.moveTo(0, gy); x.lineTo(pw, gy); x.stroke() }
  // the mirror, steamed
  shape(rect(760, 60, 300, 380), '#eef7fb', {seed: 60, dots: '#b9dbe8', dotSize: 16})
  const r = rnd(61); for (let i = 0; i < 9; i++) { const sx = 790 + r() * 240, sy = 420 - ((t * 60 + r() * 400) % 380); shape(ellipse(sx, sy, 26 + r() * 20, 18 + r() * 10), 'rgba(255,255,255,.75)', {seed: 62 + i, line: 2}) }
  // the shelf
  shape(rect(440, 140, 330, 26), ORANGE, {seed: 63, dots: DEEP})
  const reach = easeIO(k01(t, 3.9, 5.6))
  const lift = k01(t, 5.6, 6.6)
  const [hx, hy] = backFigure(420, 360 + Math.sin(t * 3) * 3, .9, reach - lift * .25, {})
  // the bottle sits on the shelf until the hand reaches it, then rises with the hand
  if (reach < .98) bottle(560, 80, .62, 0)
  else bottle(hx + 4, hy - 8, .62, -.1 - lift * .3)
  // a tiny glint and a sparkle on the glass
  if (t > 4.2 && t < 5.6) { const kk = k01(t, 4.2, 5.6); shout('✦', 600, 40, 40, 1, {fill: YELLOW, rot: kk * 3}) }
  caption('Spain, 2002. A World Cup is coming. The goalkeeper is getting ready.', 40, ph - 150, 700, k01(t, 3.9, 5.3), {size: 32})
}

function slip(pw, ph, t) {
  x.fillStyle = CYAN; x.fillRect(0, 0, pw, ph); speedLines(pw / 2, ph / 2, 120, 900, 40, '#68c0ea', 70, 6)
  const kf = k01(t, 7.7, 9.2), fy = lerp(220, 640, kf * kf), rot = -.2 + kf * 2.8 + Math.sin(t * 30) * .05 * (1 - kf)
  // the hand, from above: a palm and four fat fingers that spring open as the bottle goes
  const open = back(k01(t, 7.35, 7.8))
  x.save(); x.translate(pw / 2 - 30, 70); x.rotate(.08)
  limb([[-40, -200], [-10, 10]], 120, SKIN, 70)                                     // the wrist
  blob(ellipse(0, 40, 120, 92), SKIN, {seed: 71, dots: SKIN2})                      // the palm
  for (let i = 0; i < 4; i++) { const bx = -84 + i * 56, sp = (i - 1.5) * 14 * open; limb([[bx, 90], [bx + sp * .6, 150 + open * 20], [bx + sp, 205 + open * 40 - Math.abs(i - 1.5) * 12]], 40, SKIN, 72 + i) }
  limb([[110, 30], [160 + open * 30, 70], [180 + open * 46, 120]], 42, SKIN, 76)     // the thumb
  x.restore()
  if (kf > 0) motionLines(pw / 2 + 40, fy, pw / 2 + 40, fy - 300, 6, 120, 75)
  bottle(pw / 2 + 40, kf > 0 ? fy : 230 + Math.sin(t * 40) * 4, .75, rot)
  shout('UH-OH!', 470, 430, 110, k01(t, 7.5, 7.95), {rot: -.12})
}

function smash(pw, ph, t) {
  // tiled floor in perspective
  x.fillStyle = '#e9f4f8'; x.fillRect(0, 0, pw, ph)
  x.strokeStyle = 'rgba(27,154,214,.5)'; x.lineWidth = 3
  for (let i = -12; i <= 12; i++) { x.beginPath(); x.moveTo(pw / 2 + i * 40, 0); x.lineTo(pw / 2 + i * 210, ph); x.stroke() }
  for (let j = 0; j < 8; j++) { const y = Math.pow(j / 7, 1.6) * ph; x.beginPath(); x.moveTo(0, y); x.lineTo(pw, y); x.stroke() }
  // the bare foot, side on
  const hit = 10.2
  const wince = t > hit ? Math.sin((t - hit) * 26) * 10 * Math.max(0, 1 - (t - hit) * 1.5) : 0
  const hurt = t > hit ? cl(0, 1, (t - hit) * 2.5) : 0
  x.save(); x.translate(pw / 2 - 160, ph - 70 + wince)
  // ankle and leg rising out of the frame, the foot along the floor, the big toe up front
  limb([[-230, -40], [-260, -330]], 150, SKIN, 79)
  blob([[-330, 10], [-320, -110], [-220, -150], [-60, -150], [120, -128], [250, -96], [300, -50], [292, 10]], SKIN, {seed: 80, dots: SKIN2, shadow: 10})
  for (let i = 0; i < 4; i++) blob(ellipse(232 - i * 46, -74 - i * 16 + 6, 26 - i * 2, 20 - i), SKIN, {seed: 81 + i})
  blob(ellipse(270, -70, 46, 40), hurt ? `rgb(${lerp(232, 215, hurt)},${lerp(162, 40, hurt)},${lerp(124, 40, hurt)})` : SKIN, {seed: 86})   // the big toe — it goes red
  blob(ellipse(292, -84, 16, 12), PAPER, {seed: 87, line: 3})                                          // the nail
  if (hurt) for (let i = 0; i < 5; i++) { const a = -1.9 + i * .38, r0 = 70 + (DRAW % 2) * 10; stroke([[270 + Math.cos(a) * r0, -70 + Math.sin(a) * r0], [270 + Math.cos(a) * (r0 + 60), -70 + Math.sin(a) * (r0 + 60)]], 7, INK, 88 + i) }  // throb lines
  x.restore()
  // the bottle falls in from the top and meets the toe
  const kf = k01(t, 9.6, hit)
  if (t < hit) { const by = lerp(-160, ph - 290, kf * kf); motionLines(pw / 2 + 110, by, pw / 2 + 110, by - 360, 7, 130, 85); bottle(pw / 2 + 110, by, .8, 2.2 + kf * .8) }
  else {
    // the flash, the burst, the word, the shards
    const ke = k01(t, hit, hit + 1.2)
    if (t < hit + .12) { x.fillStyle = PAPER; x.fillRect(0, 0, pw, ph) }
    burst(pw / 2 + 110, ph - 250, lerp(60, 330, back(ke)), 16, RED, {seed: 90, rot: t * .4})
    const r = rnd(91); for (let i = 0; i < 16; i++) { const a = -Math.PI * (0.05 + r() * .9), sp = 280 + r() * 520, d = ease(ke) * sp; shard(pw / 2 + 110 + Math.cos(a) * d, ph - 250 + Math.sin(a) * d + ke * ke * 200, 1.4 + r(), ke * 9 * (r() - .5), 92 + i) }
    shout('SMASH!', pw / 2 + 110, ph - 270, 190, k01(t, hit + .02, hit + .45), {rot: -.08, fill: PAPER})
  }
}

function frame(t) {
  DRAW = Math.floor(t * 12)               // on twos
  const td = DRAW / 12                    // the drawing's time — everything moves in 12ths of a second
  x.setTransform(1, 0, 0, 1, 0, 0)
  if (t < 3.3) { cover(td); finish(); return }
  page()
  const [cx, cy, z] = cam(t), [sx, sy] = shake(10.2, t, 34, .55)
  x.setTransform(z, 0, 0, z, W / 2 - cx * z + sx, H / 2 - cy * z + sy)
  panel(60, 50, 1150, 560, k01(td, 3.35, 3.8), (pw, ph) => bathroom(pw, ph, td), {rot: -.04, seed: 1})
  panel(1260, 50, 600, 560, k01(td, 6.7, 7.1), (pw, ph) => slip(pw, ph, td), {rot: .05, seed: 2})
  panel(60, 660, 1800, 380, k01(td, 9.4, 9.7), (pw, ph) => smash(pw, ph, td), {enter: 'slam', seed: 3, tilt: -.012})
  x.setTransform(1, 0, 0, 1, 0, 0)
  // the turn: the page darkens and the last caption lands, stamped TRUE STORY
  if (t > 12.6) {
    const k = k01(t, 12.6, 12.95)
    x.save(); x.translate(W / 2, H / 2); x.rotate(-.02 * (1 - k)); x.scale(lerp(1.3, 1, back(k)), lerp(1.3, 1, back(k))); x.translate(-W / 2, -H / 2); x.globalAlpha = cl(0, 1, k * 3)
    panel(34, 30, 1852, 1020, 1, (pw, ph) => { x.fillStyle = RED; x.fillRect(0, 0, pw, ph); rays(pw / 2, ph * .55, 22, DEEP, t * .3) }, {seed: 9})
    x.restore()
    caption('One bottle. One foot. The World Cup went on without him.', 330, 330, 1260, k01(t, 12.9, 14.3), {size: 60})
    if (t > 14.4) { const ks = back(k01(t, 14.4, 14.8)); x.save(); x.translate(1380, 800); x.rotate(-.12); x.scale(lerp(2.4, 1, ks), lerp(2.4, 1, ks)); x.globalAlpha = cl(0, 1, k01(t, 14.4, 14.6))
      shape(rect(-330, -80, 660, 160), PAPER, {line: 10, seed: 99, shadow: 12}); x.fillStyle = INK; x.font = '96px Head'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('TRUE STORY', 0, 8); x.restore() }
  }
  finish()
}
