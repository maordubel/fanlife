/** v4 templates: one per topic the plan markets. build(t, app, data) → {html} for a feed post (1080 × 1350) and the
 *  same composition as a story (1080 × 1920) that moves (see render.mjs). The data shapes are the plan's own kit data,
 *  unchanged, so every row already in marketing.posts draws in the new language without being rebuilt. */
import {shell} from './style.mjs'
import {brand, clubId, crest, lifeShot, legendsFx, local, paint, plate, shirts, CLUBS, mix} from './assets.mjs'

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]))
const at = (kind, s) => ` data-in="${kind}" data-d="${s}"`
const yearIn = s => String(s || '').match(/\b(18[89]\d|19\d\d|20\d\d)\b/)?.[0]
const strip = p => `<div class="strip" style="--s1:${p.s1};--s2:${p.s2}"></div>`
const top = (p, right = '') => `<div class="top"${at('up', .05)}><div class="brand"><img src="${brand.fanlife}" alt=""><b>FAN LIFE</b></div>${right}</div>`
const crestImg = c => (c ? `<img class="crest" src="${c}" alt="">` : '')
const foot = (label, url = 'fanlife.dubelteam.com', dare = '') => `${dare ? `<div class="dare"${at('wipe', 1.2)}><span>${esc(dare)}</span></div>` : ''}<div class="foot"${at('up', .9)}><span class="u">${esc(url)}</span><span class="btn" data-pulse>${esc(label)} <b>→</b></span></div>`
const tag = (s, hot = false, delay = .2) => `<p class="tag${hot ? ' hot' : ''}"${at('left', delay)}><i></i>${esc(s)}</p>`
const vars = (p, extra = '') => `--bg:${p.bg};--on:${p.on};--hot:${p.light ? '#15130F' : '#FF5A4E'};--btn:${p.light ? '#15130F' : '#FFFBF2'};--btnText:${p.light ? '#FFFBF2' : '#15130F'};${extra}`
const dots = (col, extra = '') => `<div class="dots" style="--d:${col};${extra}"></div>`
const sized = (s, big, mid, small, a = 18, b = 34) => (String(s).length <= a ? big : String(s).length <= b ? mid : small)

/** a gate's own comic plate on a paper card, as the club page shows it */
/** a real screen of the game inside a phone: the clearest way to say "come in and play" */
export const phone = (src, w = 430, delay = .45, tilt = -4) => src ? `<div style="width:${w}px;aspect-ratio:390/844;border-radius:${w * .14}px;background:#0B0B0B;padding:${w * .035}px;box-shadow:18px 18px 0 rgba(0,0,0,.4),0 0 0 3px #2A2A2A inset;transform:rotate(${tilt}deg);flex:none"${at('pop', delay)}><div style="width:100%;height:100%;border-radius:${w * .11}px;overflow:hidden;position:relative;background:#F4ECD8"><img src="${src}" alt="" style="width:100%;height:100%;object-fit:cover;object-position:top"><span style="position:absolute;left:50%;top:${w * .03}px;width:${w * .3}px;height:${w * .07}px;margin-left:-${w * .15}px;border-radius:${w * .04}px;background:#0B0B0B"></span></div></div>` : ''

const plateCard = (pl, h = 520, tone = '#FFFBF2', delay = .45) => pl ? `<div class="plate" style="height:${h}px;--tone:${tone};margin-top:34px"${at('pop', delay)}>${pl.tone ? `<div class="tone" style="-webkit-mask-image:url(${pl.tone});mask-image:url(${pl.tone});background:${tone}"></div>` : ''}<img class="line" src="${pl.line}" alt=""></div>` : ''

// ── features ─────────────────────────────────────────────────────────────────────
async function gate(d, o) {
  const name = String(d.name || '').toUpperCase()
  if (name === 'LIFE') return life(d, o)
  if (name === 'LEGENDS MANAGER' || d.brand === 'legends') return legends(d, o)
  const id = clubId(d), p = paint(id), c = await crest(d.crestName || p.name)
  const num = String(d.gate || '').match(/\d+/)?.[0]
  const label = [num ? `Gate ${num}` : String(d.gate || '').split('·').pop().trim(), d.name].filter(Boolean).join(' · ')
  let hero = ''
  if (name === 'SHIRT COLLECTION') {
    const ks = await shirts(id, d.screen ? 2 : 3)
    if (ks.length) hero = `<div class="paper" style="margin:40px -64px 0;padding:30px 44px 26px;display:grid;grid-template-columns:repeat(${ks.length},minmax(0,1fr));gap:12px;flex:1;min-height:420px"${at('wipe', .45)}>${ks.map((k, i) => `<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;min-height:0"><img src="${k.src}" alt="" style="width:100%;flex:1;min-height:0;object-fit:contain;filter:drop-shadow(10px 12px 0 rgba(0,0,0,.18))"${at('up', .6 + i * .15)}><span class="num" style="font-size:64px;margin-top:8px"${at('slam', .9 + i * .15)}>${k.year}</span></div>`).join('')}</div>`
  }
  const scr = local(d.screen)
  if (hero && scr) hero = `<div style="position:relative;flex:1;display:flex;min-height:0">${hero}<div style="position:absolute;right:-30px;bottom:-60px;z-index:4">${phone(scr, o.story ? 330 : 250, 1, 6)}</div></div>`
  if (!hero && scr) {
    // the real game in a phone on the right; the gate's plate, its promise and its line on the left
    const title = d.name || 'FAN LIFE'
    return {vars: vars(p), light: p.light, inner: `${dots(p.light ? 'rgba(0,0,0,.18)' : 'rgba(0,0,0,.28)')}${strip(p)}${top(p, crestImg(c))}
<div class="body" style="padding-top:${o.story ? 120 : 36}px">${tag(label)}
<p class="h shadowed"${at('slam', .3)} style="font-size:${sized(title, 150, 124, 96, 12, 18)}px;margin-top:14px">${esc(title)}</p>
<div style="flex:1;display:flex;gap:44px;align-items:center;min-height:0;margin-top:26px">
<div style="flex:1;display:flex;flex-direction:column;gap:26px;min-width:0">${plateCard(plate(d.name), o.story ? 420 : 300, '#FFFBF2', .4).replace('margin-top:34px', 'margin-top:0')}
<p class="lead" style="font-size:36px"${at('up', .8)}>${esc(d.headline || '')}</p>
${(d.body || []).length ? `<p class="k" style="opacity:.8;letter-spacing:.1em;font-size:20px"${at('up', .95)}>${esc((d.body || [])[0])}</p>` : ''}</div>
${phone(scr, o.story ? 470 : 318, .6, 3)}</div>
</div>${foot('Play free')}`}
  }
  if (!hero) hero = `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;min-height:0">${plateCard(plate(d.name), o.story ? 760 : 480, '#FFFBF2')}</div>`
  const title = d.name || 'FAN LIFE'
  return {vars: vars(p), light: p.light, inner: `${dots(p.light ? 'rgba(0,0,0,.18)' : 'rgba(0,0,0,.28)')}${strip(p)}${top(p, crestImg(c))}
<div class="body" style="padding-top:${o.story ? 120 : 36}px">${tag(label)}
<p class="h shadowed"${at('slam', .3)} style="font-size:${sized(title, 150, 124, 96, 12, 18)}px;margin-top:14px">${esc(title)}</p>
${hero}
<p class="lead" style="margin-top:30px"${at('up', .8)}>${esc(d.headline || '')}</p>
${(d.body || []).length ? `<p class="k" style="margin-top:14px;opacity:.75;letter-spacing:.12em"${at('up', .95)}>${esc((d.body || [])[0])}</p>` : ''}
</div>${foot(name === 'SHIRT COLLECTION' ? 'Open the archive' : 'Play free')}`}
}

/** LIFE — coming soon: the club's own world, in-game */
async function life(d, o) {
  const id = clubId(d) || 'olympiacos', p = paint(id), c = await crest(d.crestName || p.name)
  const hot = p.light ? '#D71920' : p.primary || '#D71920'
  return {vars: vars({...p, bg: '#0B1020', on: '#FFFBF2', light: false}), inner: `
<div style="position:absolute;left:0;top:0;width:1080px;height:${o.story ? 1240 : 860}px;overflow:hidden"><img src="${lifeShot(id, d.shot || 'stand')}" alt="" style="width:100%;height:100%;object-fit:cover;object-position:50% 40%" data-kb></div>
<div style="position:absolute;left:0;top:0;width:1080px;height:260px;background:linear-gradient(rgba(11,16,32,.85),transparent)"></div>
<div style="position:absolute;left:0;top:${o.story ? 760 : 360}px;width:1080px;height:520px;background:linear-gradient(rgba(11,16,32,0),rgba(11,16,32,.75) 45%,#0B1020)"></div>
${strip({s1: '#FFFBF2', s2: hot})}${top(p, crestImg(c))}
<div class="body" style="justify-content:flex-end;padding-bottom:30px">
<span class="pill" style="--accent:${hot}"${at('left', .3)}>● In build · real game footage</span>
<p class="h" style="font-size:340px;font-stretch:66%;text-shadow:12px 12px 0 ${hot};margin:22px 0 0 -14px"${at('slam', .5)}>LIFE</p>
<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:30px;margin-top:20px">
<p class="h" style="font-size:72px;max-width:600px"${at('up', .8)}>${esc(d.headline || 'The open world of football fans.')}</p>
<div class="frame" style="width:316px;height:178px;flex:none"${at('pop', 1.1)}><img src="${lifeShot(id, 'tunnel')}" alt="" style="width:100%;height:100%;object-fit:cover"></div></div>
<p class="k" style="margin-top:26px;opacity:.8"${at('up', 1.2)}>${esc((d.body || [])[0] || 'Your city · your club · your life')}</p>
</div>${foot('Coming soon')}`}
}

/** LIFE — the GTA campaign: the owner's comic art is the hero, full size; a mission card from the real LIFE missions
 *  (lib/life/rush) sits under it. Portrait art fills the post; wide art runs as a cinematic band. */
const GTA_ART = {'cover-life': 'tall', 'cover-fanlife': 'tall', 'next-generation': 'wide', 'panels-wide': 'wide', 'panels-graffiti': 'wide'}
async function gta(d, o) {
  const art = GTA_ART[d.art] ? d.art : 'next-generation', tall = GTA_ART[art] === 'tall'
  const src = local(`v4/art/life-gta/${art}.jpg`), hot = d.hot || '#E8212B'
  const H = o.story ? 1920 : 1350, artH = tall ? H : o.story ? 1100 : 760
  const mission = d.mission ? `<div style="align-self:flex-start;background:#FFFBF2;color:#15130F;border:4px solid #15130F;box-shadow:12px 12px 0 ${hot};padding:18px 30px 16px;transform:rotate(-2deg)"${at('slam', .5)}>
<p class="k" style="font-size:20px;letter-spacing:.22em;color:${hot}">Mission${d.n ? ' ' + String(d.n).padStart(2, '0') : ''}</p>
<p class="h" style="font-size:${sized(d.mission, 84, 70, 56, 12, 20)}px;color:#15130F;margin-top:4px">${esc(d.mission)}</p></div>` : ''
  return {vars: vars({bg: '#0B0D14', on: '#FFFBF2', light: false}), inner: `
<div style="position:absolute;left:0;top:0;width:1080px;height:${artH}px;overflow:hidden;background:#0B0D14"><img src="${src}" alt="" style="width:100%;height:100%;object-fit:cover;object-position:${d.pos || '50% 45%'}" data-kb></div>
<div style="position:absolute;left:0;top:0;width:1080px;height:230px;background:linear-gradient(rgba(11,13,20,.82),transparent)"></div>
<div style="position:absolute;left:0;top:${tall ? H - 760 : artH - 300}px;width:1080px;height:${tall ? 760 : 300}px;background:linear-gradient(rgba(11,13,20,0),rgba(11,13,20,.86) 55%,#0B0D14)"></div>
${strip({s1: '#FFFBF2', s2: hot})}${top({}, `<span class="pill" style="--accent:${hot}">● LIFE · in build</span>`)}
<div class="body" style="justify-content:flex-end;gap:22px;padding-bottom:26px">
${mission}
<p class="h shadowed" style="font-size:${sized(d.headline, 84, 72, 60, 22, 40)}px;max-width:960px"${at('up', .8)}>${esc(d.headline || 'The open world of football fans.')}</p>
${d.line ? `<p class="k" style="opacity:.85;font-size:22px;letter-spacing:.14em"${at('up', 1)}>${esc(d.line)}</p>` : ''}
</div>${foot(d.cta || 'Coming soon')}`}
}

/** LIFE — loading-screen tip (GTA week): the in-game shot, the tip, a loading bar */
async function loading(d, o) {
  const id = clubId(d) || 'olympiacos', p = paint(id), c = await crest(d.crestName || p.name), hot = p.light ? '#D71920' : p.primary
  return {vars: vars({...p, bg: '#0B1020', on: '#FFFBF2', light: false}), inner: `
<div style="position:absolute;inset:0"><img src="${lifeShot(id, d.shot || 'scarf')}" alt="" style="width:100%;height:100%;object-fit:cover" data-kb></div>
<div style="position:absolute;inset:0;background:linear-gradient(rgba(11,16,32,.7),rgba(11,16,32,.15) 30%,rgba(11,16,32,.2) 50%,#0B1020 82%)"></div>
${strip({s1: '#FFFBF2', s2: hot})}${top(p, crestImg(c))}
<div class="body" style="justify-content:flex-end;padding-bottom:20px">
<p class="h" style="font-size:150px;text-shadow:8px 8px 0 ${hot}"${at('slam', .3)}>LIFE</p>
<p class="tag hot" style="margin-top:26px;color:${p.light ? '#FFC72C' : '#FF5A4E'}"${at('left', .5)}><i></i>Tip ${esc(d.n || 1)} · loading your club’s city</p>
<p class="h" style="font-size:64px;margin-top:20px"${at('up', .7)}>${esc(d.tip || '')}</p>
<div style="height:24px;border:3px solid #FFFBF2;margin-top:34px;padding:3px"><div style="height:100%;width:${Math.round((d.progress ?? .68) * 100)}%;background:${hot}"${at('wipe', 1)}></div></div>
</div>${foot('Coming soon')}`}
}

async function legends(d, o) {
  const p = {bg: '#0E1631', on: '#FFFBF2', s1: '#D4A84A', s2: '#0E1631', light: false}
  const fx = ['champion', 'hattrick', 'goal', 'fire-goal'][(d.seed || String(d.headline || '').length) % 4]
  return {vars: vars(p, '--hot:#D4A84A'), inner: `${dots('rgba(212,168,74,.35)')}${strip(p)}${top(p, `<img class="applogo" src="${brand.legends}" alt="">`)}
<div class="body" style="padding-top:${o.story ? 120 : 30}px">${tag('Legends Manager · free', true)}
<p class="h shadowed" style="font-size:118px;margin-top:14px"${at('slam', .3)}>${esc(d.headline || 'A season with your legends.')}</p>
<div style="flex:1;display:flex;align-items:center;justify-content:center;gap:30px;min-height:0"><img src="${legendsFx(fx)}" alt="" style="width:${d.screen ? '48%' : '100%'};height:100%;object-fit:contain;filter:drop-shadow(12px 12px 0 rgba(0,0,0,.45))"${at('pop', .6)}>${d.screen ? phone(local(d.screen), o.story ? 440 : 280, .8, 4) : ''}</div>
${(d.body || []).slice(0, 2).map((s, i) => `<p class="lead" style="font-size:30px;opacity:.9"${at('up', .9 + i * .12)}>${esc(s)}</p>`).join('')}
</div>${foot('Kick off')}`}
}

// ── content ──────────────────────────────────────────────────────────────────────
async function fact(d, o) {
  const id = clubId(d), p = paint(id), c = await crest(d.crestName || p.name), y = yearIn(d.fact)
  const ask = /\?\s*$/.test(String(d.fact || ''))
  return {vars: vars(p), light: p.light, inner: `${dots(p.light ? 'rgba(0,0,0,.18)' : 'rgba(0,0,0,.28)')}${strip(p)}${top(p, crestImg(c))}
<div class="body" style="padding-top:${o.story ? 140 : 40}px">${tag(d.kicker || (ask ? 'Tell us' : 'Did you know'))}
${y ? `<p class="num" style="font-size:${o.story ? 300 : 230}px;margin-top:20px;color:transparent;-webkit-text-stroke:4px ${p.on};opacity:.9"${at('slam', .3)}>${y}</p>` : `<p class="num" style="font-size:220px;margin-top:10px;opacity:.9"${at('slam', .3)}>“</p>`}
<p class="h" style="font-size:${sized(d.fact, 104, 84, 66, 60, 110)}px;margin-top:${y ? 30 : -40}px"${at('up', .55)}>${esc(d.fact)}</p>
<div style="flex:1"></div>
${d.shout ? `<p class="tag" style="margin-bottom:30px;opacity:.85"${at('up', .8)}><i></i>${esc(String(d.shout).replace(/!$/, ''))}</p>` : ''}
</div>${foot(ask ? 'Tell us in the comments' : 'More on your club')}`}
}

async function quiz(d, o) {
  const id = clubId(d), p = paint(id), c = await crest(d.crestName || p.name)
  const pd = {...p, bg: '#121212', on: '#FFFBF2', light: false}, hot = p.light ? '#FFC72C' : (p.primary && p.primary !== '#1F1F1F' ? p.primary : '#D71920')
  const opts = (d.options || []).slice(0, 4)
  return {vars: vars(pd, `--hot:${hot}`), inner: `${dots(mix(hot, '#000000', .2) + '99', 'right:auto;bottom:auto;width:720px;height:720px')}${strip({s1: '#FFFBF2', s2: hot})}${top(pd, crestImg(c))}
<div class="body" style="padding-top:${o.story ? 140 : 40}px">
<div style="display:flex;justify-content:space-between;align-items:center">${tag((d.level || 'Quiz') + ' · only real fans', true)}<span class="lamp"${at('pop', .3)}><span>1</span><span>0</span></span></div>
<p class="h" style="font-size:${sized(d.question, 112, 84, 62, 40, 72)}px;margin-top:30px"${at('up', .35)}>${esc(d.question)}</p>
<div style="flex:1;min-height:20px"></div>
<div class="grid2">${opts.map((x, i) => `<div class="ans" style="height:${o.story ? 230 : 146}px;padding:16px 24px"${at(i % 2 ? 'right' : 'left', .6 + i * .12)}><span class="num">${'ABCD'[i]}</span><b style="font-size:${sized(x, 52, 44, 36, 14, 24)}px">${esc(x)}</b></div>`).join('')}</div>
</div>${foot('Answer in the comments')}`}
}

async function debate(d, o) {
  const L = d.left || {}, R = d.right || {}
  const pl = paint(clubId({club: L.club})), pr = paint(clubId({club: R.club}))
  const lc = pl.primary ? mix(pl.primary, '#000', .1) : '#B02D10', rcRaw = pr.primary ? mix(pr.primary, '#000', .1) : '#1F2B5C'
  const rc = Math.abs(parseInt(lc.slice(1, 3), 16) - parseInt(rcRaw.slice(1, 3), 16)) < 40 && rcRaw.slice(1, 3) > '80' ? '#1F2B5C' : rcRaw
  const [ci, cj] = [await crest(L.crestName || L.name), await crest(R.crestName || R.name)]
  const H = o.story ? 1920 : 1350, band = o.story ? 1240 : 880
  return {vars: vars({bg: '#121212', on: '#FFFBF2', light: false}), inner: `
<div class="split" style="background:${lc};clip-path:polygon(0 0,62% 0,38% 100%,0 100%)"></div><div class="split" style="background:${rc};clip-path:polygon(62% 0,100% 0,100% 100%,38% 100%)"></div>
${dots('rgba(0,0,0,.25)')}${strip({s1: lc, s2: rc})}${top({}, `<span class="tag"><i></i>Opinion war</span>`)}
${ci ? `<img src="${ci}" alt="" style="position:absolute;left:60px;top:${o.story ? 330 : 200}px;width:400px;height:400px;object-fit:contain;filter:drop-shadow(14px 14px 0 rgba(0,0,0,.35));z-index:3"${at('left', .3)}>` : ''}
${cj ? `<img src="${cj}" alt="" style="position:absolute;right:44px;top:${o.story ? 700 : 470}px;width:380px;height:380px;object-fit:contain;filter:drop-shadow(14px 14px 0 rgba(0,0,0,.35));z-index:3"${at('right', .45)}>` : ''}
<p class="num" style="position:absolute;left:443px;top:${o.story ? 640 : 486}px;margin:0;font-size:140px;color:#FFFBF2;text-shadow:10px 10px 0 #15130F;transform:rotate(-8deg);z-index:4"${at('slam', .7)}>VS</p>
<p class="h" style="position:absolute;left:64px;top:${o.story ? 790 : 640}px;font-size:52px;z-index:3"${at('up', .55)}>1 · ${esc(L.name || '')}</p>
<p class="h" style="position:absolute;right:64px;top:${o.story ? 300 : 210}px;font-size:52px;text-align:right;z-index:3;max-width:420px"${at('up', .6)}>2 · ${esc(R.name || '')}</p>
<div style="position:absolute;left:0;top:${band}px;width:1080px;min-height:250px;background:#FFFBF2;color:#15130F;display:flex;flex-direction:column;justify-content:center;padding:30px 64px;gap:14px;z-index:3"${at('wipe', .9)}>
<span class="k" style="color:${lc}">Comment 1 or 2 · ${esc(dareFor('L-DEBATE', d))}</span><p class="h" style="font-size:${sized(d.question, 84, 72, 60, 34, 60)}px">${esc(d.question)}</p></div>
<div style="flex:1"></div>${foot('Vote in the comments')}`}
}

async function otd(d, o) {
  const p = {bg: '#121212', on: '#FFFBF2', s1: '#FFFBF2', s2: '#D71920', light: false}
  const rows = (d.rows || []).slice(0, o.story ? 6 : 5)
  const crests = await Promise.all(rows.map(r => crest(r.crestName || r.club)))
  return {vars: vars(p), inner: `${dots('rgba(215,25,32,.45)', 'width:760px;height:760px')}${strip(p)}${top(p, `<span class="num" style="font-size:40px;background:#FFFBF2;color:#15130F;padding:14px 20px;box-shadow:6px 6px 0 #D71920">${esc(d.date || '')}</span>`)}
<div class="body" style="padding-top:${o.story ? 120 : 40}px">${tag('From the archive', true)}
<p class="h shadowed" style="font-size:150px;margin-top:14px"${at('slam', .3)}>On this day</p>
<div style="margin-top:20px">${rows.map((r, i) => `<div class="row"${at('left', .5 + i * .12)}>${crests[i] ? `<img src="${crests[i]}" alt="">` : ''}<div style="flex:1;min-width:0"><p class="k" style="font-size:18px;opacity:.75">${esc(r.ago || '')}</p><p class="h" style="font-size:46px;margin-top:8px">${esc(r.line || '')}</p></div><span class="num" style="font-size:44px;color:#FF5A4E">${esc(r.year || '')}</span></div>`).join('')}</div>
</div>${foot('Open the archive')}`}
}

async function spicy(d, o) {
  const id = clubId(d), p = paint(id)
  const [hc, ac] = [await crest(d.homeCrestName), await crest(d.awayCrestName)]
  return {vars: vars(p), light: p.light, inner: `${dots(p.light ? 'rgba(0,0,0,.18)' : 'rgba(0,0,0,.3)')}${strip(p)}${top(p, '')}
<div class="body" style="padding-top:${o.story ? 160 : 50}px">${tag(d.date || 'From the archive')}
<div style="display:flex;align-items:center;justify-content:space-between;margin-top:${o.story ? 120 : 50}px">
<div style="width:300px;display:flex;flex-direction:column;align-items:center;gap:18px"${at('left', .3)}>${hc ? `<img src="${hc}" alt="" style="width:230px;height:230px;object-fit:contain;filter:drop-shadow(10px 10px 0 rgba(0,0,0,.3))">` : ''}<p class="h" style="font-size:36px;text-align:center">${esc(d.home || '')}</p></div>
<p class="num" style="font-size:150px;text-shadow:10px 10px 0 rgba(0,0,0,.3)"${at('slam', .6)}>${esc(d.score || '')}</p>
<div style="width:300px;display:flex;flex-direction:column;align-items:center;gap:18px"${at('right', .45)}>${ac ? `<img src="${ac}" alt="" style="width:230px;height:230px;object-fit:contain;filter:drop-shadow(10px 10px 0 rgba(0,0,0,.3))">` : ''}<p class="h" style="font-size:36px;text-align:center">${esc(d.away || '')}</p></div></div>
<div style="flex:1"></div>
<p class="h shadowed" style="font-size:150px;margin-bottom:40px"${at('up', .9)}>${esc(d.line || '')}</p>
</div>${foot('Relive it')}`}
}

async function film(d, o) {
  // a club's film wears the club's colour, never its rival's (Panathinaikos: no red)
  const id = clubId(d), hot = id ? paint(id).primary || '#D71920' : '#D71920'
  const p = {bg: '#0B0B0B', on: '#FFFBF2', s1: '#FFFBF2', s2: hot, light: false}
  const th = local(d.thumb)
  return {vars: vars(p, `--hot:${hot};--accent:${hot}`), inner: `${strip(p)}${top(p, `<span class="pill" style="box-shadow:none">▶ ${esc(d.kicker || 'Now on YouTube')}</span>`)}
<div class="body" style="padding-top:${o.story ? 160 : 50}px">
<div class="frame" style="width:952px;height:535px"${at('pop', .3)}>${th ? `<img src="${th}" alt="" style="width:100%;height:100%;object-fit:cover" data-kb>` : ''}<span style="position:absolute;left:50%;top:50%;width:130px;height:130px;margin:-65px 0 0 -65px;border-radius:50%;background:${hot};display:flex;align-items:center;justify-content:center;box-shadow:8px 8px 0 #000" data-pulse><i style="width:0;height:0;border-left:44px solid #FFFBF2;border-top:28px solid transparent;border-bottom:28px solid transparent;margin-left:10px"></i></span></div>
<p class="tag hot" style="margin-top:56px"${at('left', .6)}><i></i>${esc(d.channel || 'FanLife: Football Stories')}</p>
<p class="h shadowed" style="font-size:${sized(d.title, 104, 88, 72, 26, 44)}px;margin-top:18px"${at('up', .75)}>${esc(d.title)}</p>
${d.sub ? `<p class="lead" style="margin-top:18px;opacity:.85"${at('up', .9)}>${esc(d.sub)}</p>` : ''}
</div>${foot(d.cta || 'Watch now', 'YouTube · @FanLifeFootballStories')}`}
}

async function slide(d, o) {
  const id = clubId(d), p = paint(id), c = await crest(d.crestName || p.name)
  const count = d.of ? `${d.n} / ${d.of}` : ''
  const right = `<span class="k" style="font-size:24px">${esc(count)}</span>`
  if (d.s === 'cover') return {vars: vars(p), light: p.light, inner: `${dots(p.light ? 'rgba(0,0,0,.18)' : 'rgba(0,0,0,.28)')}${strip(p)}${top(p, right)}
<div class="body" style="padding-top:40px">${tag(d.kicker || '')}
<div style="flex:1;display:flex;align-items:center;justify-content:center;min-height:0">${c ? `<img src="${c}" alt="" style="width:${o.story ? 620 : 480}px;height:${o.story ? 620 : 480}px;object-fit:contain;filter:drop-shadow(16px 16px 0 rgba(0,0,0,.35))"${at('pop', .3)}>` : ''}</div>
<p class="h shadowed" style="font-size:${sized(d.title, 120, 100, 84, 22, 40)}px;margin-bottom:30px"${at('up', .6)}>${esc(d.title)}</p>
</div>${foot('Swipe')}`}
  if (d.s === 'night') return {vars: vars(p), light: p.light, inner: `${dots(p.light ? 'rgba(0,0,0,.18)' : 'rgba(0,0,0,.28)')}${strip(p)}${top(p, right)}
<div class="body" style="padding-top:40px">${tag(d.line || '')}
<p class="num" style="font-size:${o.story ? 320 : 260}px;margin-top:30px;color:transparent;-webkit-text-stroke:4px ${p.on}"${at('slam', .3)}>${esc(d.year || '')}</p>
<div style="flex:1"></div>
${d.score ? `<p class="num" style="font-size:210px;text-shadow:10px 10px 0 rgba(0,0,0,.3)"${at('slam', .6)}>${esc(d.score)}</p>` : ''}
<p class="h" style="font-size:70px;margin:20px 0 40px"${at('up', .8)}>${esc(d.teams || '')}</p>
</div>${foot('See the archive')}`}
  if (d.s === 'love') return {vars: vars(p), light: p.light, inner: `${dots(p.light ? 'rgba(0,0,0,.18)' : 'rgba(0,0,0,.28)')}${strip(p)}${top(p, right)}
<div class="body" style="padding-top:40px">${tag(d.shout ? String(d.shout).replace(/!$/, '') : '')}
<p class="h shadowed" style="font-size:${sized(d.big, 150, 124, 104, 12, 22)}px;margin-top:20px"${at('slam', .3)}>${esc(d.big || '')}</p>
<div style="flex:1"></div>
<p class="lead" style="font-size:44px;margin-bottom:40px"${at('up', .6)}>${esc(d.line || '')}</p>
</div>${foot('Your club')}`}
  return {vars: vars(p), light: p.light, inner: `${dots(p.light ? 'rgba(0,0,0,.18)' : 'rgba(0,0,0,.28)')}${strip(p)}${top(p, right)}
<div class="body" style="padding-top:40px;align-items:center;text-align:center">
<div style="flex:1;display:flex;align-items:center;justify-content:center;gap:30px"><img src="${brand.fanlife}" alt="" style="width:340px;height:340px;border-radius:50%;background:#FFFBF2;box-shadow:14px 14px 0 rgba(0,0,0,.35)"${at('pop', .2)}>${c ? `<img src="${c}" alt="" style="width:260px;height:260px;object-fit:contain"${at('pop', .4)}>` : ''}</div>
<p class="h shadowed" style="font-size:96px;margin-bottom:40px"${at('up', .6)}>${esc(d.title || '')}</p>
</div>${foot('Come in')}`}
}

async function numbers(d, o) {
  const id = clubId(d), p = paint(id)
  return {vars: vars(p), light: p.light, inner: `${dots(p.light ? 'rgba(0,0,0,.18)' : 'rgba(0,0,0,.28)')}${strip(p)}${top(p, '')}
<div class="body" style="padding-top:60px">${tag(d.shout ? String(d.shout).replace(/!$/, '') : 'This week')}
<div style="flex:1;display:flex;align-items:center"><p class="num" style="font-size:${String(d.number).length > 4 ? 280 : 380}px;text-shadow:14px 14px 0 rgba(0,0,0,.3)"${at('slam', .3)}>${esc(d.number)}</p></div>
<p class="h" style="font-size:84px"${at('up', .6)}>${esc(d.line || '')}</p>
${d.sub ? `<p class="k" style="margin:20px 0 30px;opacity:.8"${at('up', .75)}>${esc(d.sub)}</p>` : '<div style="height:40px"></div>'}
</div>${foot('Play free')}`}
}

async function card(d, o, app) {
  const b = {dubid: {bg: '#0E1631', s2: '#3FB6F2', url: 'dubid.dubelteam.com', cta: 'Pick your XI'}, offsides: {bg: '#0B1226', s2: '#FF7A1A', url: 'offsides.dubelteam.com', cta: 'Open an arena'}}[app]
  const p = b ? {bg: b.bg, on: '#FFFBF2', s1: '#FFFBF2', s2: b.s2, light: false} : {...paint(clubId(d)), }
  return {vars: vars(p, b ? `--hot:${b.s2}` : ''), light: p.light, inner: `${dots('rgba(0,0,0,.28)')}${strip(p)}${top(p, b ? `<img class="applogo" src="${brand[app]}" alt="">` : '')}
<div class="body" style="justify-content:center"><p class="h shadowed" style="font-size:${sized(d.hook, 150, 120, 92, 14, 40)}px"${at('slam', .3)}>${esc(d.hook || 'Football. Forever.')}</p></div>${foot(b ? b.cta : 'Play free', b ? b.url : undefined)}`}
}

async function system(d, o, app) {
  const b = {dubid: {bg: '#0E1631', s2: '#3FB6F2', url: 'dubid.dubelteam.com', cta: 'Pick your XI'}, offsides: {bg: '#0B1226', s2: '#FF7A1A', url: 'offsides.dubelteam.com', cta: 'Open an arena'}}[app]
  const p = {bg: b.bg, on: '#FFFBF2', s1: '#FFFBF2', s2: b.s2, light: false}
  const t = d.title || []
  return {vars: vars(p, `--hot:${b.s2}`), inner: `${dots(b.s2 + '55')}${strip(p)}${top(p, `<img class="applogo" src="${brand[app]}" alt="">`)}
<div class="body" style="padding-top:${o.story ? 120 : 30}px">${tag(d.sub || '', true)}
<p class="h shadowed" style="font-size:140px;margin-top:16px"${at('slam', .3)}>${esc(t[0] || '')}<br><span style="color:${b.s2}">${esc(t[1] || '')}</span></p>
<div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:16px">${(d.points || []).slice(0, 3).map((x, i) => `<div style="display:flex;gap:26px;align-items:center;border-top:2px solid rgba(255,251,242,.25);padding-top:18px"${at('left', .6 + i * .15)}><span class="num" style="font-size:64px;color:${b.s2}">${i + 1}</span><div><p class="h" style="font-size:46px">${esc(x[0])}</p><p class="lead" style="font-size:28px;opacity:.8;margin-top:6px">${esc(x[1])}</p></div></div>`).join('')}</div>
${d.line ? `<p class="k" style="margin-bottom:30px">${esc(d.line)}</p>` : ''}
</div>${foot(b.cta, b.url)}`}
}

async function matchList(d, o, t) {
  const p = {bg: '#121212', on: '#FFFBF2', s1: '#FFFBF2', s2: '#D71920', light: false}
  const rows = (d.rows || []).slice(0, o.story ? 6 : 5)
  const cs = await Promise.all(rows.flatMap(r => [crest(r.homeCrestName || r.home), crest(r.awayCrestName || r.away)]))
  return {vars: vars(p), inner: `${dots('rgba(215,25,32,.45)', 'width:760px;height:760px')}${strip(p)}${top(p, `<span class="k">${esc([d.dayTop, d.dayBottom].filter(Boolean).join(' · '))}</span>`)}
<div class="body" style="padding-top:40px">${tag(d.label || 'From the FAN LIFE clubs', true)}
<p class="h shadowed" style="font-size:150px;margin-top:14px"${at('slam', .3)}>${t === 'L-RESULTS' ? 'Full time' : 'Next up'}</p>
<div style="margin-top:24px">${rows.map((r, i) => `<div class="row" style="justify-content:space-between"${at('left', .5 + i * .1)}>${cs[i * 2] ? `<img src="${cs[i * 2]}" alt="" style="width:80px;height:80px">` : '<span></span>'}<div style="flex:1;text-align:center;min-width:0"><p class="h" style="font-size:40px">${esc(r.home)} ${t === 'L-RESULTS' && r.score ? `<span class="num" style="font-style:normal;color:#FF5A4E">${esc(r.score)}</span>` : 'v'} ${esc(r.away)}</p><p class="k" style="font-size:16px;opacity:.7;margin-top:8px">${esc(r.line || '')}</p></div>${cs[i * 2 + 1] ? `<img src="${cs[i * 2 + 1]}" alt="" style="width:80px;height:80px">` : '<span></span>'}</div>`).join('')}</div>
</div>${foot(t === 'L-RESULTS' ? 'See the stories' : 'Play before kick-off')}`}
}

async function vote(d, o) {
  const p = {bg: '#121212', on: '#FFFBF2', s1: '#FFFBF2', s2: '#D71920', light: false}
  const rows = (d.rows || []).slice(0, 5), most = Math.max(1, ...rows.map(r => Number(r.votes) || 0))
  const cs = await Promise.all(rows.map(r => crest(r.crestName || r.name)))
  return {vars: vars(p), inner: `${dots('rgba(215,25,32,.45)', 'width:760px;height:760px')}${strip(p)}${top(p, '')}
<div class="body" style="padding-top:40px">${tag('The club vote · live count', true)}
<p class="h shadowed" style="font-size:130px;margin-top:14px"${at('slam', .3)}>Which club opens next?</p>
<div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:18px">${rows.map((r, i) => `<div style="display:flex;align-items:center;gap:22px"${at('left', .5 + i * .1)}>${cs[i] ? `<img src="${cs[i]}" alt="" style="width:76px;height:76px;object-fit:contain">` : ''}<div style="flex:1"><p class="h" style="font-size:40px">${esc(r.name)}</p><div style="height:14px;margin-top:10px;background:${i ? '#FFFBF2' : '#D71920'};width:${Math.max(4, 100 * (Number(r.votes) || 0) / most)}%"></div></div><span class="num" style="font-size:54px">${esc(r.votes)}</span></div>`).join('')}</div>
<p class="k" style="margin-bottom:30px;opacity:.8">${esc(d.total)} fans have voted</p>
</div>${foot('Vote now')}`}
}

// ── new viral formats (owner, 14.11.2026) ─────────────────────────────────────────
async function bingo(d, o) {
  const id = clubId(d), p0 = paint(id), c = await crest(d.crestName || p0.name)
  const hot = p0.light || !p0.primary ? '#E8432B' : mix(p0.primary, '#FFFFFF', .2)
  const p = {...p0, bg: '#121212', on: '#FFFBF2', light: false}
  const cells = (d.cells || []).slice(0, 16)
  return {vars: vars(p, `--hot:${hot}`), inner: `${dots(hot + '88', 'width:800px;height:800px')}${strip({s1: '#FFFBF2', s2: p0.primary || hot})}${top(p, crestImg(c))}
<div class="body" style="padding-top:${o.story ? 120 : 34}px">${tag(d.kicker || 'Supporter’s card', true)}
<p class="h shadowed" style="font-size:104px;margin-top:14px;max-width:760px"${at('slam', .3)}>${esc(d.title || 'How many have you done?')}</p>
<div class="stamp" style="right:64px;top:${o.story ? 150 : 50}px;width:180px;height:130px"${at('pop', .6)}><span class="k" style="font-size:16px">Your score</span><span class="num" style="font-size:44px">__/${cells.length}</span></div>
<div style="flex:1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:minmax(0,1fr);gap:10px;margin:26px 0 30px;min-height:0">${cells.map((s, i) => `<div class="cell"${at('pop', .5 + i * .05)}><span class="num">${String(i + 1).padStart(2, '0')}</span><b>${esc(s)}</b></div>`).join('')}</div>
</div>${foot('Comment your score')}`}
}

/** Name the season (two slides): s='zoom' magnifies a real shirt; s='reveal' shows it whole with the season */
async function zoom(d, o) {
  const id = clubId(d), p = paint(id), c = await crest(d.crestName || p.name)
  const k = (await shirts(id, 1, d.season ? [String(d.season).slice(0, 4)] : null))[0]
  const R = o.story ? 760 : 560
  const glass = d.s === 'reveal'
    ? `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:0">${k ? `<img src="${k.src}" alt="" style="max-width:${R + 120}px;max-height:100%;object-fit:contain;filter:drop-shadow(14px 14px 0 rgba(0,0,0,.35))"${at('pop', .3)}>` : ''}</div><p class="num" style="font-size:150px;text-align:center;text-shadow:10px 10px 0 rgba(0,0,0,.3);margin-bottom:30px"${at('slam', .6)}>${esc(d.answer || k?.season || '')}</p>`
    : `<div style="flex:1;display:flex;align-items:center;justify-content:center;min-height:0"><div style="position:relative;width:${R}px;height:${R}px;border-radius:50%;overflow:hidden;background:#FFFBF2;box-shadow:16px 16px 0 rgba(0,0,0,.4);outline:3px solid ${p.on};outline-offset:14px"${at('pop', .3)}>${k ? `<img src="${k.src}" alt="" style="position:absolute;width:${R * 3.2}px;height:${R * 3.2}px;left:${R / 2 - (d.focus?.[0] ?? .66) * R * 3.2}px;top:${R / 2 - (d.focus?.[1] ?? .3) * R * 3.2}px;object-fit:contain" data-kb>` : ''}</div></div>`
  return {vars: vars(p), light: p.light, inner: `${dots(p.light ? 'rgba(0,0,0,.18)' : 'rgba(0,0,0,.28)')}${strip(p)}${top(p, crestImg(c))}
<div class="body" style="padding-top:${o.story ? 120 : 36}px">${tag(d.s === 'reveal' ? 'Zoom · 2 of 2 · the answer' : 'Zoom · 1 of 2')}
<p class="h shadowed" style="font-size:${d.s === 'reveal' ? 110 : 132}px;margin-top:14px;position:relative;z-index:2"${at('slam', .25)}>${esc(d.s === 'reveal' ? (d.title || 'Did you get it?') : (d.question || 'Name the season.'))}</p>
${glass}
</div>${foot(d.s === 'reveal' ? 'Play Shirt collection' : 'Swipe for the answer')}`}
}

/** Tier list: the club's shirts S to C — "wrong? fix it in the comments" */
async function tier(d, o) {
  const id = clubId(d), p0 = paint(id), c = await crest(d.crestName || p0.name)
  const p = {...p0, bg: '#121212', on: '#FFFBF2', light: false}
  const ks = await shirts(id, 6)
  const order = d.order || [[0, 3], [1], [2, 4], [5]]
  const tiers = [['S', '#D71920'], ['A', '#F26A1B'], ['B', '#1B9AD6'], ['C', '#5B6170']]
  return {vars: vars(p), inner: `${strip({s1: '#FFFBF2', s2: p0.primary || '#D71920'})}${top(p, crestImg(c))}
<div class="body" style="padding-top:${o.story ? 120 : 34}px">${tag('Tier list · home shirts', true)}
<p class="h shadowed" style="font-size:110px;margin-top:14px"${at('slam', .3)}>${esc(d.title || 'Rank the shirts.')}</p>
<div style="flex:1;display:flex;flex-direction:column;gap:10px;margin:26px 0 30px;min-height:0">${tiers.map(([t, col], i) => `<div style="flex:1;display:flex;gap:10px;min-height:0"${at('left', .5 + i * .12)}><div style="width:130px;background:${col};display:flex;align-items:center;justify-content:center"><span class="num" style="font-size:80px;color:#FFFBF2">${t}</span></div><div style="flex:1;background:#1E1E1E;display:flex;align-items:center;gap:20px;padding:8px 18px">${(order[i] || []).map(j => ks[j] ? `<div style="height:100%;display:flex;flex-direction:column;align-items:center"><img src="${ks[j].src}" alt="" style="flex:1;min-height:0;width:150px;object-fit:contain"><span class="num" style="font-size:22px">${ks[j].year}</span></div>` : '').join('')}</div></div>`).join('')}</div>
</div>${foot('Fix it in the comments')}`}
}

/** shop: one live product from the open shop (prerender.mjs picks it at random for each post); its mock-up is the hero */
const money = (cents, cur = 'USD') => cents ? `${cur === 'EUR' ? '€' : cur === 'GBP' ? '£' : '$'}${(Number(cents) / 100).toFixed(2).replace(/\.00$/, '')}` : ''
async function shop(d, o) {
  const id = clubId({club: d.subject && d.subject !== 'fanlife' ? {id: d.subject} : d.club}), p = id ? paint(id) : {bg: '#121212', on: '#FFFBF2', s1: '#FFFBF2', s2: '#D71920', light: false}
  const c = id ? await crest(p.name) : null
  const img = local(d.image)
  const [name, kind] = String(d.title || '').split(' · ')
  return {vars: vars(p), light: p.light, inner: `${dots(p.light ? 'rgba(0,0,0,.18)' : 'rgba(0,0,0,.28)')}${strip(p)}${top(p, crestImg(c))}
<div class="body" style="padding-top:${o.story ? 120 : 34}px">${tag(d.kicker || `The FAN LIFE shop${kind ? ' · ' + kind : ''}`)}
<p class="h shadowed" style="font-size:${sized(name, 120, 100, 80, 14, 26)}px;margin-top:14px"${at('slam', .3)}>${esc(name || '')}</p>
<div style="flex:1;display:flex;align-items:center;justify-content:center;min-height:0;margin:24px 0 10px;position:relative"><div class="paper" style="height:100%;max-height:${o.story ? 980 : 620}px;aspect-ratio:1;box-shadow:16px 16px 0 rgba(0,0,0,.35);overflow:hidden"${at('pop', .5)}>${img ? `<img src="${img}" alt="" style="width:100%;height:100%;object-fit:cover" data-kb>` : ''}</div>
${d.price ? `<div class="stamp" style="right:-10px;bottom:30px;width:230px;height:130px"${at('pop', .8)}><span class="k" style="font-size:16px">From</span><span class="num" style="font-size:50px">${esc(money(d.price, d.currency))}</span></div>` : ''}</div>
</div>${foot(d.cta || 'Shop now', 'fanlife.dubelteam.com/shop')}`}
}

/** a flagship garment as a lookbook page: the shirt cut out of its studio background, oversized type behind it,
 *  a detail lens on the print, colourways and a price tag. look: 'back' | 'fold' | 'look' (the lifestyle photo, full bleed) */
async function tee(d, o) {
  const H = o.story ? 1920 : 1350, look = d.look || 'back'
  const art = f => local(`v4/art/shop/${f}`)
  const [l1, l2] = String(d.words || 'Football. Forever.').split(/(?<=\.)\s+/)
  const price = `<div style="position:absolute;z-index:7;right:${look === 'look' ? 56 : 60}px;top:${o.story ? 640 : 470}px;width:190px;height:190px;border-radius:50%;background:#15130F;color:#FFFBF2;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(8deg);box-shadow:8px 8px 0 #C8102E"${at('pop', 1)}><span class="k" style="font-size:16px;letter-spacing:.2em">From</span><span class="num" style="font-size:52px;line-height:1">${esc(money(d.price || 2399, d.currency))}</span></div>`
  const swatch = (o.story ? ['#F6F4EF', '#1A1A1A', '#7B7B79'] : ['#F6F4EF', '#1A1A1A', '#7B7B79']).map(c => `<i style="width:34px;height:34px;border-radius:50%;background:${c};box-shadow:0 0 0 3px currentColor;display:inline-block"></i>`).join('')
  const spec = (col) => `<div style="display:flex;flex-direction:column;gap:14px;color:${col}"${at('left', .9)}>
<p class="k" style="font-size:18px;letter-spacing:.22em;opacity:.7">${esc(d.kind_label || 'Heavyweight tee · garment-dyed')}</p>
<div style="display:flex;gap:14px;align-items:center">${swatch}<span class="k" style="font-size:18px;letter-spacing:.16em;margin-left:6px">White · Black · Granite</span></div></div>`
  if (look === 'look') return {vars: vars({bg: '#15130F', on: '#FFFBF2', light: false}, '--hot:#C8102E'), inner: `
<div style="position:absolute;inset:0"><img src="${art('football-forever-tee-white.jpg')}" alt="" style="width:100%;height:100%;object-fit:cover;object-position:50% 30%" data-kb></div>
<div style="position:absolute;left:0;right:0;bottom:0;height:${o.story ? 900 : 640}px;background:linear-gradient(rgba(21,19,15,0),rgba(21,19,15,.78) 45%,#15130F)"></div>
<div style="position:absolute;left:0;right:0;top:0;height:220px;background:linear-gradient(rgba(21,19,15,.55),transparent)"></div>
${top({})}${price}
<div class="body" style="justify-content:flex-end;gap:18px;padding-bottom:22px">
<p class="k" style="font-size:20px;letter-spacing:.3em"${at('left', .3)}>${esc(d.kicker || 'Lookbook · FAN LIFE shop')}</p>
<p class="h" style="font-size:${o.story ? 150 : 128}px;line-height:.86"${at('slam', .5)}>${esc(l1)}<br><span style="color:transparent;-webkit-text-stroke:3px #FFFBF2">${esc(l2 || '')}</span></p>
${spec('#FFFBF2')}
</div>${foot(d.cta || 'Shop the tee', 'fanlife.dubelteam.com/shop')}`}
  const fold = look === 'fold'
  const bg = fold ? '#123B26' : '#ECE6DB', ink = fold ? '#F3EEE4' : '#15130F'
  const hero = fold ? art('football-forever-tee-black-cut.png') : art('football-forever-tee-back-cut.png')
  const lens = `<div style="position:absolute;z-index:6;left:64px;bottom:${o.story ? 470 : 290}px;width:${o.story ? 300 : 240}px;height:${o.story ? 300 : 240}px;border-radius:50%;overflow:hidden;border:6px solid ${fold ? '#F3EEE4' : '#15130F'};box-shadow:10px 10px 0 rgba(0,0,0,.28);background:#7B7B79"${at('pop', 1.2)}><img src="${art('football-forever-print.jpg')}" alt="" style="width:100%;height:100%;object-fit:cover;transform:scale(1.15)"></div>
`
  return {vars: vars({bg, on: ink, light: !fold}, '--hot:#C8102E'), light: !fold, inner: `${dots(fold ? 'rgba(0,0,0,.25)' : 'rgba(0,0,0,.06)')}
${top({})}
<p class="h" style="position:absolute;z-index:1;left:52px;right:40px;top:${o.story ? 250 : 210}px;font-size:${o.story ? 210 : 164}px;line-height:.84;color:${ink}"${at('slam', .3)}>${esc(l1)}<br><span style="color:transparent;-webkit-text-stroke:4px ${ink}">${esc(l2 || '')}</span></p>
<div style="position:absolute;z-index:3;left:0;right:0;top:${o.story ? 520 : 330}px;bottom:${o.story ? 300 : 200}px;display:flex;align-items:flex-end;justify-content:${fold ? 'center' : 'flex-end'};padding-right:${fold ? 0 : 150}px"><img src="${hero}" alt="" style="max-height:100%;max-width:${fold ? 82 : 60}%;object-fit:contain;filter:drop-shadow(0 30px 30px rgba(0,0,0,.28));${fold ? 'transform:rotate(-6deg)' : ''}"${at('up', .6)}></div>
${lens}${price}
<p class="k" style="position:absolute;z-index:2;left:64px;top:${o.story ? 210 : 178}px;font-size:18px;letter-spacing:.3em;color:${ink};opacity:.75"${at('left', .2)}>${esc(d.kicker || 'Lookbook · FAN LIFE shop')}</p>
<div class="body" style="z-index:5"></div>${foot(d.cta || 'Shop the tee', 'fanlife.dubelteam.com/shop')}`}
}

/** FLAGSHIP — Frame your All-Time XI: the fan's own XI, printed and framed on a wall (or as a poster) with his name */
async function frame(d, o) {
  const id = clubId(d) || 'celtic', p0 = paint(id), c = await crest(p0.name)
  const p = {...p0, bg: '#141210', on: '#FFFBF2', light: false}
  const names = (d.names || []).slice(0, 11)
  const who = String(d.manager || '').trim(), title = `${who ? who.toUpperCase().replace(/’S$|'S$/, '') + '’S' : 'MY'} ALL-TIME XI`
  const slots = [[.5, .88], [.14, .68], [.38, .71], [.62, .71], [.86, .68], [.24, .47], [.5, .5], [.76, .47], [.2, .24], [.5, .19], [.8, .24]]
  const poster = d.format === 'poster'
  const W = o.story ? 760 : 460, H = Math.round(W * 1.33)
  const pitch = `<div style="position:relative;width:100%;height:100%;background:${mix(p0.primary || '#0B7A3B', '#000000', .35)};overflow:hidden">
<div style="position:absolute;inset:0;background-image:repeating-linear-gradient(0deg,rgba(255,255,255,.05) 0 ${H / 10}px,transparent ${H / 10}px ${H / 5}px)"></div>
<div style="position:absolute;inset:6% 7% 8%;border:2px solid rgba(255,251,242,.55)"></div><div style="position:absolute;left:7%;right:7%;top:50%;border-top:2px solid rgba(255,251,242,.55)"></div>
<div style="position:absolute;left:50%;top:50%;width:${W * .22}px;height:${W * .22}px;margin:-${W * .11}px;border:2px solid rgba(255,251,242,.55);border-radius:50%"></div>
<p class="h" style="position:absolute;left:0;right:0;top:3.2%;text-align:center;font-size:${W * .07}px;color:#FFFBF2">${esc(title)}</p>
${c ? `<img src="${c}" alt="" style="position:absolute;right:5%;bottom:2.4%;width:${W * .09}px;height:${W * .09}px;object-fit:contain">` : ''}
${names.map((n, i) => `<div style="position:absolute;left:${slots[i][0] * 100}%;top:${slots[i][1] * 100}%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:4px"><span style="width:${W * .055}px;height:${W * .055}px;border-radius:50%;background:#FFFBF2;color:#15130F;display:flex;align-items:center;justify-content:center;font:400 ${W * .028}px/1 Ultra">${i + 1}</span><span style="font:italic 900 ${W * .026}px/1 Archivo;font-stretch:76%;text-transform:uppercase;color:#FFFBF2;white-space:nowrap">${esc(n)}</span></div>`).join('')}
<p class="k" style="position:absolute;left:5%;bottom:3%;font-size:${W * .018}px;color:rgba(255,251,242,.7)">FAN LIFE · ${esc(p0.name || '')}</p></div>`
  const art = poster
    ? `<div style="width:${W}px;height:${H}px;box-shadow:0 30px 50px rgba(0,0,0,.45);transform:rotate(-1.5deg)"${at('pop', .5)}>${pitch}</div>`
    : `<div style="width:${W + 60}px;height:${H + 60}px;background:#1A1714;padding:14px;box-shadow:0 34px 60px rgba(0,0,0,.55),inset 0 0 0 3px #2B2621"${at('pop', .5)}><div style="width:100%;height:100%;background:#F3EEE4;padding:16px">${pitch}</div></div>`
  const wall = `<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 30%,#3A332C,#141210 75%)"></div><div style="position:absolute;left:0;right:0;bottom:0;height:${o.story ? 300 : 170}px;background:linear-gradient(#2A241E,#1A1612)"></div>`
  return {vars: vars(p, '--hot:#FFC72C'), inner: `${wall}${strip({s1: '#FFFBF2', s2: p0.primary || '#D71920'})}${top(p, crestImg(c))}
<div class="body" style="padding-top:${o.story ? 100 : 22}px">${tag('New · Frame it', true)}
<p class="h shadowed" style="font-size:${o.story ? 120 : 96}px;margin-top:12px"${at('slam', .3)}>${esc(d.headline || 'Your all-time XI. On your wall.')}</p>
<div style="flex:1;display:flex;align-items:center;justify-content:center;min-height:0;margin-top:16px">${art}</div>
</div>${foot(d.cta || 'Frame yours')}`}
}

/** the market: a real listing from a supporter, its photo the hero */
async function market(d, o) {
  return shop({...d, kicker: d.kicker || 'The market · from a supporter', cta: d.cta || 'See the listing'}, o)
}

/** a Back Pages article (blog): kicker, title, the first line — the way into SEO pages from social */
async function article(d, o) {
  const p = {bg: '#F4ECD8', on: '#15130F', s1: '#15130F', s2: '#D71920', light: true}
  return {vars: vars(p, '--hot:#D71920'), light: true, inner: `${dots('rgba(21,19,15,.12)')}${strip(p)}${top(p, '<span class="k">The Back Pages</span>')}
<div class="body" style="padding-top:${o.story ? 160 : 60}px">${tag(d.kicker || 'Read', true)}
<p class="h" style="font-size:${sized(d.title, 120, 100, 84, 24, 44)}px;margin-top:20px"${at('up', .3)}>${esc(d.title || '')}</p>
<div style="flex:1"></div>
<p class="lead" style="font-size:40px;margin-bottom:40px;border-left:10px solid #D71920;padding-left:28px"${at('left', .6)}>${esc(d.lede || '')}</p>
</div>${foot('Read it')}`}
}

/** the dare above the foot: one line that pokes the supporter's pride (owner, 14.11.2026: "lots of hooks, emotion, ego") */
const DARE = {'L-GATE': 'Bet you can’t do it first time', 'L-LIFE': 'Your club. Your streets. Your story.', 'L-LOADING': 'Coming soon. Your city first?', 'L-LEGENDS': 'Think you can manage them? Prove it.',
  'L-FACT': 'Tag the one mate who knew this', 'T10-NERDS': 'Real fans don’t need the options', 'L-QUIZ': 'Real fans don’t need the options', 'L-DEBATE': 'Pick a side. No fence-sitting.',
  'T9-OTD': 'Were you there? Prove it in the comments', 'T11-SPICY': 'Were you there? Tell us.', 'L-FILM': 'Watch it before your mates do', 'L-NUMBERS': 'Is your club on the board?',
  'L-BINGO': 'Under 8? Not a real fan.', 'L-ZOOM': 'Real fans need one look', 'L-TIER': 'Wrong? Fight us in the comments', 'L-VOTE': 'Your club not on top? Send this.',
  'L-SHOP': 'Wear it to the next match', 'L-FRAME': 'Your name. Your XI. Your wall.', 'L-GTA': 'Real supporters only. Tourists wait outside.', 'L-TEE': 'Wear it. Let them read it.', 'L-MARKET': 'One supporter’s shirt. Your wardrobe next.', 'L-ARTICLE': 'Read it. Then argue with your dad.'}
const SHOP_DARE = {framed: 'Put it where your mates can see it', poster: 'Put it where your mates can see it', canvas: 'Put it where your mates can see it', mug: 'Your club with every morning coffee',
  'kids-tee': 'Start them young', puzzle: 'A thousand pieces of your club', sticker: 'Stick it everywhere', 'phone-case': 'Your club in your pocket', tote: 'Carry your club everywhere'}
export const dareFor = (t, d) => d?.dare === '' ? '' : d?.dare || (t === 'L-SHOP' && SHOP_DARE[d?.kind]) || DARE[t] || ''

const MAP = {'L-GATE': gate, 'L-LIFE': life, 'L-LOADING': loading, 'L-LEGENDS': legends, 'L-FACT': fact, 'T10-NERDS': quiz, 'L-QUIZ': quiz, 'L-DEBATE': debate, 'T9-OTD': otd, 'T11-SPICY': spicy,
  'L-FILM': film, 'L-SLIDE': slide, 'L-NUMBERS': numbers, 'L-CARD': card, 'L-DUBID-SYSTEM': (d, o) => system(d, o, 'dubid'), 'L-OFFSIDES-SYSTEM': (d, o) => system(d, o, 'offsides'),
  'L-FIXTURES': (d, o) => matchList(d, o, 'L-FIXTURES'), 'L-RESULTS': (d, o) => matchList(d, o, 'L-RESULTS'), 'L-VOTE': vote, 'L-BINGO': bingo, 'L-ZOOM': zoom, 'L-TIER': tier, 'L-SHOP': shop, 'L-MARKET': market, 'L-FRAME': frame, 'L-GTA': gta, 'L-TEE': tee, 'L-ARTICLE': article}
export const V4_TEMPLATES = Object.keys(MAP)

/** the page for one kit, or null when v4 has no layout for it (v2 then draws it) */
export async function page(t, app, data, {story = false, motion = false} = {}) {
  const fn = MAP[t]
  if (!fn) return null
  const r = await fn(data || {}, {story}, app)
  const nm = String(data?.name || '').toUpperCase()
  const key = t === 'L-GATE' && nm === 'LIFE' ? 'L-LIFE' : t === 'L-GATE' && (nm === 'LEGENDS MANAGER' || data?.brand === 'legends') ? 'L-LEGENDS' : t
  const dare = (t === 'L-SLIDE' && data?.s !== 'cta') || t === 'L-DEBATE' ? '' : dareFor(key, data)
  const inner = dare ? r.inner.replace('<div class="foot"', `<div class="dare"${at('wipe', 1.2)}><span>${esc(dare)}</span></div><div class="foot"`) : r.inner
  return shell(inner, {story, motion, vars: r.vars, light: r.light})
}
