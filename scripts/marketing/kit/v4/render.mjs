/** Render v4 pages: a PNG for the feed, an MP4 story that moves (owner, 14.11.2026: "stories that move, alive").
 *  Stories are drawn frame by frame: every CSS animation on the page is paused and set to the frame's time, so the
 *  video is identical on every run and needs no screen recorder. Needs Playwright's Chromium and ffmpeg (CI has both). */
import {mkdtempSync, readdirSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {spawnSync} from 'node:child_process'
import {page as build} from './templates.mjs'

let browser
async function launch() {
  if (browser) return browser
  const {chromium} = await import('playwright')
  browser = await chromium.launch(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})
  return browser
}
export async function close() { if (browser) await browser.close(); browser = null }

async function open(html, height) {
  const b = await launch()
  const dir = mkdtempSync(path.join(tmpdir(), 'fl-v4-'))
  const file = path.join(dir, 'p.html')
  writeFileSync(file, html)
  const p = await b.newPage({viewport: {width: 1080, height}})
  await p.goto('file://' + file)
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(150)
  return {p, dir}
}

/** text that leaves its box or the frame: the picture is refused, like the v2 fits() guard */
async function overflow(p) {
  return p.evaluate(() => {
    const bad = []
    for (const el of document.querySelectorAll('.h,.lead,.k,.tag,.btn,.ans b,.cell b')) {
      const r = el.getBoundingClientRect()
      if (r.right > 1080.5 || r.left < -.5 || el.scrollWidth > el.clientWidth + 2) bad.push(el.textContent.trim().slice(0, 40))
    }
    return bad
  })
}

export async function png(t, app, data, {story = false} = {}) {
  const html = await build(t, app, data, {story})
  if (!html) return null
  const {p, dir} = await open(html, story ? 1920 : 1350)
  try {
    const bad = await overflow(p)
    if (bad.length) throw Error(`${t}: text runs off the picture — ${bad.join(' | ')}`)
    return await p.screenshot({type: 'png'})
  } finally { await p.close(); rmSync(dir, {recursive: true, force: true}) }
}

/** a 1080 × 1920 story video: `seconds` long at `fps`, every animation seeked frame by frame */
export async function story(t, app, data, {seconds = 7, fps = 30, out} = {}) {
  const html = await build(t, app, data, {story: true, motion: true})
  if (!html) return null
  const {p, dir} = await open(html, 1920)
  try {
    await p.evaluate(() => document.getAnimations().forEach(a => a.pause()))
    const n = Math.round(seconds * fps)
    for (let i = 0; i < n; i++) {
      const ms = i * 1000 / fps
      await p.evaluate(ms => document.getAnimations().forEach(a => { a.currentTime = ms }), ms)
      await p.screenshot({path: path.join(dir, `f${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92})
    }
    const target = out || path.join(dir, 'story.mp4')
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(dir, 'f%04d.jpg'), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', target])
    if (r.status !== 0) throw Error('ffmpeg: ' + String(r.stderr).slice(0, 300))
    return target
  } finally { await p.close(); for (const f of readdirSync(dir)) if (f.endsWith('.jpg') || f.endsWith('.html')) rmSync(path.join(dir, f)) }
}
