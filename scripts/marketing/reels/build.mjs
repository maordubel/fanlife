/**
 * REELS from the Football Fairy Tales (owner, 24.11.2026: "Reels and viral things from Good Morning and Good Night, in
 * the club's own language, smart hooks, linked to YouTube, perfect branding"). For every episode in episodes.json:
 * two vertical 1080×1920 clips — the opening and the heart of the story — cut on the film's own shot changes, the frame
 * kept large with its burned-in subtitles, a hook in the club's language above it and "the whole tale on YouTube" below.
 * They go to the `social-reels` release under stable names (reel-<key>-<part>.mp4), which the campaign posts point at.
 * Run: node scripts/marketing/reels/build.mjs [outDir] [--upload]   (Actions: .github/workflows/marketing-reels.yml)
 */
import {execFileSync} from 'node:child_process'
import {existsSync, mkdirSync, readFileSync, writeFileSync, statSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url)), REPO = path.resolve(HERE, '../../..')
const OUT = path.resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'reels-out')
const {episodes} = JSON.parse(readFileSync(path.join(HERE, 'episodes.json'), 'utf8'))

/** the words on the reel, in the club's language: [hook for the opening, hook for the heart], the CTA, the series */
export const WORDS = {
  el: {cta: 'Όλο το παραμύθι στο YouTube', series: 'Ποδοσφαιρικά Παραμύθια',
    gm: {panathinaikos: ['Ο Παναθηναϊκός σαν παραμύθι.', 'Αυτό θα το ζήσει όλη η κερκίδα.'], olympiacos: ['Ο Ολυμπιακός σαν παραμύθι.', 'Αυτό θα το ζήσει όλη η κερκίδα.'], 'aek-athens': ['Η ΑΕΚ σαν παραμύθι.', 'Αυτό θα το ζήσει όλη η κερκίδα.']},
    gn: {panathinaikos: ['Καληνύχτα, Παναθηναϊκέ.', 'Μετράμε αστέρια με τους θρύλους.'], olympiacos: ['Καληνύχτα, Ολυμπιακέ.', 'Μετράμε αστέρια με τους θρύλους.'], 'aek-athens': ['Καληνύχτα, ΑΕΚ.', 'Μετράμε αστέρια με τους θρύλους.']},
    sub: {gm: 'Δείξ’ το στον μικρό σου πριν το ματς', gn: 'Ένα παραμύθι πριν τον ύπνο'}},
  he: {cta: 'האגדה המלאה ביוטיוב', series: 'אגדות כדורגל',
    gm: {'hapoel-tel-aviv': ['הפועל תל אביב, כמו אגדה.', 'את הקטע הזה כל היציע ירגיש.']},
    gn: {'hapoel-tel-aviv': ['לילה טוב, הפועל.', 'סופרים כוכבים עם האגדות.']},
    sub: {gm: 'תראו לקטנים לפני המשחק', gn: 'אגדה לפני השינה'}},
}
const INK = {panathinaikos: '#0B6E3A', olympiacos: '#C8102E', 'aek-athens': '#F2C200', 'hapoel-tel-aviv': '#D71920'}

const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, {stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28, ...opts}).toString()
const dur = f => Number(sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).trim())

async function fetchEpisode(ep, dir) {
  const f = path.join(dir, `${ep.key}.mp4`)
  if (existsSync(f) && statSync(f).size > 1e6) return f
  const bufs = []
  for (let i = 0; i < ep.parts; i++) {
    const u = `https://raw.githubusercontent.com/maordubel/fanlife/${ep.sha}/${ep.dir}/${ep.key}.part${String(i).padStart(2, '0')}`
    const r = await fetch(u)
    if (!r.ok) throw Error(`${u} → ${r.status}`)
    bufs.push(Buffer.from(await r.arrayBuffer()))
  }
  writeFileSync(f, Buffer.concat(bufs))
  return f
}

/** the film's own shot changes, so a reel starts and ends on a cut, never in the middle of a picture */
function cuts(file) {
  const log = execFileSync('ffmpeg', ['-hide_banner', '-i', file, '-vf', "scale=320:-1,select='gt(scene,0.12)',showinfo", '-an', '-f', 'null', '-'], {stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28}).toString() + ''
  return [...String(log).matchAll(/pts_time:([\d.]+)/g)].map(m => Number(m[1]))
}
function cutsOf(file) {
  try { return cuts(file) } catch (e) { return [...String(e.stderr || '').matchAll(/pts_time:([\d.]+)/g)].map(m => Number(m[1])) }
}
const near = (list, t, lo, hi) => list.filter(x => x >= lo && x <= hi).sort((a, b) => Math.abs(a - t) - Math.abs(b - t))[0] ?? t

/** two windows: the opening (from the first cut after 1.5 s) and the heart (around 45% of the film), 28–40 s each */
export function windows(total, list) {
  const a0 = near(list, 2, 0.8, 6), a1 = near(list, a0 + 34, a0 + 28, a0 + 40)
  const mid = total * 0.45, b0 = near(list, mid, mid - 15, mid + 15), b1 = near(list, b0 + 34, b0 + 28, b0 + 40)
  return [[a0, a1], [b0, b1]]
}

async function overlay(page, ep, part) {
  const w = WORDS[ep.lang], hook = w[ep.kind][ep.club][part], ink = INK[ep.club] || '#D71920'
  // an about:blank page may not read file:// — fonts and the roundel travel inline
  const he = ep.lang === 'he', data = (f, type) => `data:${type};base64,${readFileSync(path.join(REPO, f)).toString('base64')}`
  const font = f => data(f, 'font/woff2'), kitFont = f => data(path.join('scripts/marketing/kit/v4/fonts', f), 'font/woff2')
  const logo = data('public/brand/fanlife/logo-512.png', 'image/png')
  const html = `<!doctype html><html lang="${ep.lang}" dir="${he ? 'rtl' : 'ltr'}"><head><style>
@font-face{font-family:H;src:url(${he ? font('public/fonts/karantina-hebrew-700-normal.woff2') : kitFont('fira-sans-extra-condensed-greek-900-italic.woff2')})}
@font-face{font-family:L;src:url(${kitFont('archivo-latin-wdth-italic.woff2')});font-weight:100 900;font-stretch:62% 125%}
@font-face{font-family:B;src:url(${he ? font('public/fonts/heebo-hebrew-800-normal.woff2') : kitFont('fira-sans-greek-700-normal.woff2')})}
html,body{margin:0;width:1080px;height:1920px;background:transparent;overflow:hidden}
.top{position:absolute;inset:0 0 auto 0;height:410px;display:flex;flex-direction:column;justify-content:flex-end;padding:0 64px 34px;box-sizing:border-box;background:linear-gradient(rgba(11,11,11,.0),rgba(11,11,11,.55) 30%,rgba(11,11,11,.78))}
.tag{font:900 italic 30px L;font-stretch:70%;letter-spacing:.16em;text-transform:uppercase;color:#FFFBF2;display:flex;gap:14px;align-items:center}
.tag i{display:inline-block;width:46px;height:10px;background:${ink}}
.hook{font:${he ? '700 104px' : 'italic 900 92px'} H,L;line-height:.98;color:#FFFBF2;margin-top:18px;text-shadow:0 6px 0 rgba(0,0,0,.45)}
.sub{font:${he ? '800' : '700'} 34px B;color:#FFFBF2;opacity:.9;margin-top:14px}
.bot{position:absolute;inset:auto 0 0 0;height:410px;display:flex;align-items:center;gap:28px;padding:30px 64px 0;box-sizing:border-box;background:linear-gradient(rgba(11,11,11,.78),rgba(11,11,11,.55) 70%,rgba(11,11,11,0))}
.bot img{width:150px;height:150px;border-radius:50%;box-shadow:0 0 0 6px #FFFBF2}
.cta{font:${he ? '700 66px' : 'italic 900 60px'} H,L;color:#FFFBF2;line-height:1}
.yt{display:inline-flex;align-items:center;gap:14px;margin-top:16px;background:#FFFBF2;color:#15130F;font:900 italic 34px L;font-stretch:75%;padding:12px 22px;box-shadow:8px 8px 0 ${ink};direction:ltr}
.yt b{width:0;height:0;border-left:22px solid #E8212B;border-top:13px solid transparent;border-bottom:13px solid transparent}
</style></head><body>
<div class="top"><div class="tag"><i></i>${w.series}</div><div class="hook">${hook}</div><div class="sub">${w.sub[ep.kind]}</div></div>
<div class="bot"><img src="${logo}" alt=""><div><div class="cta">${w.cta}</div><div class="yt"><b></b>FanLife: Football Stories</div></div></div>
</body></html>`
  await page.setContent(html, {waitUntil: 'load'})
  await page.evaluate(() => document.fonts.ready)
  return page.screenshot({omitBackground: true, type: 'png'})
}

async function main() {
  mkdirSync(OUT, {recursive: true})
  const src = path.join(OUT, 'src'); mkdirSync(src, {recursive: true})
  const {chromium} = await import('playwright')
  const browser = await chromium.launch(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})
  const page = await (await browser.newContext({viewport: {width: 1080, height: 1920}})).newPage()
  const made = []
  for (const ep of episodes) {
    if (process.env.ONLY && !process.env.ONLY.split(',').includes(ep.key)) continue
    const file = await fetchEpisode(ep, src), total = dur(file), list = cutsOf(file)
    for (const [part, [t0, t1]] of windows(total, list).entries()) {
      const name = `reel-${ep.key}-${part ? 'heart' : 'open'}`
      const png = path.join(OUT, `${name}.png`); writeFileSync(png, await overlay(page, ep, part))
      const len = Math.max(20, t1 - t0)
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(t0), '-t', String(len), '-i', file, '-i', png, '-filter_complex',
        `[0:v]split=2[a][b];[a]scale=-2:1920,crop=1080:1920,boxblur=24:3,eq=brightness=-0.12[bg];[b]scale=-2:1100,crop=1080:1100[fg];[bg][fg]overlay=0:410[v0];[v0][1:v]overlay=0:0,format=yuv420p[v];` +
        `[0:a]afade=t=in:d=0.3,afade=t=out:st=${(len - 0.9).toFixed(2)}:d=0.9[aud]`,
        '-map', '[v]', '-map', '[aud]', '-r', '30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-profile:v', 'high', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
        path.join(OUT, `${name}.mp4`)])
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', '1.2', '-i', path.join(OUT, `${name}.mp4`), '-frames:v', '1', '-q:v', '3', path.join(OUT, `${name}.jpg`)])
      made.push({name, key: ep.key, club: ep.club, lang: ep.lang, kind: ep.kind, from: +t0.toFixed(2), seconds: +len.toFixed(2)})
      console.log('ok', name, t0.toFixed(1), '→', t1.toFixed(1))
    }
  }
  await browser.close()
  writeFileSync(path.join(OUT, 'reels.json'), JSON.stringify(made, null, 1))
  if (process.argv.includes('--upload')) {
    const files = made.flatMap(m => [`${m.name}.mp4`, `${m.name}.jpg`]).concat('reels.json')
    try { sh('gh', ['release', 'view', 'social-reels']) } catch { sh('gh', ['release', 'create', 'social-reels', '--title', 'Social reels', '--notes', 'Reels for the marketing machine (scripts/marketing/reels). Stable names; overwritten by every build.', '--prerelease']) }
    sh('gh', ['release', 'upload', 'social-reels', '--clobber', ...files], {cwd: OUT})
    console.log('uploaded', files.length)
  }
}
if (import.meta.url === `file://${process.argv[1]}`) await main()
