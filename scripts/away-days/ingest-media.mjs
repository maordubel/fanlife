/**
 * AWAY DAYS — the stadium-photo pipeline (spec §29, 25.9.2026).
 *
 *   node scripts/away-days/ingest-media.mjs <jobs.json>      (e.g. scripts/away-days/media-jobs/*.json)
 *
 * One job = one photograph of one ground, ALREADY on disk (downloaded from its Wikimedia
 * Commons file page — the original or a ≥1280px thumb — or handed over by the owner):
 *
 *   { "id": "stamford-bridge-2019", "venueId": "stamford-bridge", "file": "/abs/path.jpg",
 *     "sourceUrl": "https://commons.wikimedia.org/wiki/File:…", "sourceTitle": "…",
 *     "credit": "Author Name", "license": "CC BY-SA 4.0", "licenseUrl": "https://creativecommons.org/…",
 *     "capturedYear": 2019, "capturedApprox": "year" | "decade",
 *     "origin": "free-licence" | "maor-upload", "position": "centre" | "attention" | "north" | … }
 *
 * For each job it writes two crops under `public/away/` — `<id>-wide.webp` 1600×900 and
 * `<id>-tall.webp` 900×1200 — and measures yellow (the band of `lib/isYellow.ts`, restated
 * below and re-checked against the real module by `tests/away-days-media.test.ts`) on the
 * DECODED bytes, because an encoder can invent yellow a source never had (rule 27/61).
 *
 * Yellow: a photograph of a ground is not an authentic object in the sense of the kit and
 * artefact folders — it is a modern picture of seats and sponsor boards — so there is no
 * exemption to lean on. Prefer a photo with none; when a crop still carries some, the
 * pixels in the band are desaturated below the rule's threshold (`de-yellow`, the same
 * token the life backdrops use), re-encoded and re-measured until the decode counts zero.
 * The credit line on screen then says the colour was treated.
 *
 * Then, read-modify-write: the row in `content/manual/away-media.json` (upsert by id,
 * with every file's measurement) and the record in `content/manual/asset-provenance.json`
 * (upsert by key `away-media-<id>`), so `scripts/life/asset-provenance.mjs` covers the file.
 */
import { mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'

// CommonJS resolution on purpose: sharp is a tool of this box (NODE_PATH / global install),
// not a dependency of the app, and ESM `import` would not look there.
const sharp = createRequire(import.meta.url)('sharp')

const ROOT = process.cwd()
const OUT = join(ROOT, 'public/away')
const LEDGER = join(ROOT, 'content/manual/away-media.json')
const PROVENANCE = join(ROOT, 'content/manual/asset-provenance.json')
const SIZES = [
  { tag: 'wide', width: 1600, height: 900 },
  { tag: 'tall', width: 900, height: 1200 },
]
const LICENCES = /^(CC BY(-SA)? [1-4]\.0|CC0 1\.0|Public domain|owner-upload)$/

/** lib/isYellow.ts, restated for plain node (the test proves the two agree) */
export function isYellow(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  if (delta === 0) return false
  const saturation = delta / max
  const value = max / 255
  if (saturation < 0.35 || value < 0.35) return false
  let hue
  if (max === r) hue = 60 * (((g - b) / delta + 6) % 6)
  else if (max === g) hue = 60 * ((b - r) / delta + 2)
  else hue = 60 * ((r - g) / delta + 4)
  return hue >= 38 && hue <= 70
}

export function countYellow(data, channels) {
  let n = 0
  for (let i = 0; i < data.length; i += channels) if (isYellow(data[i], data[i + 1], data[i + 2])) n += 1
  return n
}

/** pull every in-band pixel to `sat` saturation, keeping its value and hue */
function deYellow(data, channels, sat) {
  let changed = 0
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    if (!isYellow(r, g, b)) continue
    const max = Math.max(r, g, b)
    const min = max * (1 - sat)
    const scale = (v) => Math.round(min + ((v - Math.min(r, g, b)) / (max - Math.min(r, g, b))) * (max - min))
    data[i] = scale(r)
    data[i + 1] = scale(g)
    data[i + 2] = scale(b)
    changed += 1
  }
  return changed
}

async function crop(job, size) {
  const position = job.position ?? 'attention'
  const { data, info } = await sharp(job.file)
    .rotate()
    .resize(size.width, size.height, { fit: 'cover', position })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const before = countYellow(data, info.channels)
  let treated = false
  let pixels = data
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const sat = 0.3 - attempt * 0.04
    if (attempt > 0 || before > 0) {
      if (deYellow(pixels, info.channels, sat) > 0) treated = true
    }
    const webp = await sharp(pixels, { raw: { width: info.width, height: info.height, channels: info.channels } })
      .webp({ quality: 80, effort: 5 })
      .toBuffer()
    const decoded = await sharp(webp).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const yellowPx = countYellow(decoded.data, decoded.info.channels)
    if (yellowPx === 0) {
      const name = `${job.id}-${size.tag}.webp`
      writeFileSync(join(OUT, name), webp)
      const sha256 = createHash('sha256').update(webp).digest('hex')
      return { name, width: info.width, height: info.height, bytes: webp.length, sha256, sourceYellowPx: before, yellowPx, treated }
    }
    // the encoder put some back — treat the decode, not the source, and go again
    pixels = Buffer.from(decoded.data)
  }
  throw new Error(`${job.id} ${size.tag}: yellow survives six de-yellow passes — choose another photograph`)
}

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return fallback
  }
}

function validate(job) {
  const need = ['id', 'venueId', 'file', 'credit', 'license', 'origin']
  for (const key of need) if (!job[key]) throw new Error(`job ${job.id ?? '?'}: missing ${key}`)
  if (!/^[a-z0-9-]{3,64}$/.test(job.id)) throw new Error(`job ${job.id}: id must be kebab-case`)
  if (!LICENCES.test(job.license)) throw new Error(`job ${job.id}: licence "${job.license}" is not CC BY / CC BY-SA / CC0 / PD`)
  if (job.origin === 'free-licence' && !/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(job.sourceUrl ?? '')) {
    throw new Error(`job ${job.id}: a free-licence photo needs its Commons file page as sourceUrl`)
  }
  if (job.origin === 'maor-upload' && job.license !== 'owner-upload') throw new Error(`job ${job.id}: owner photos carry licence "owner-upload"`)
  if (typeof job.capturedYear !== 'number') throw new Error(`job ${job.id}: capturedYear is required (spec §29 — never unlabelled)`)
  job.file = resolve(ROOT, job.file)
  statSync(job.file)
}

async function main() {
  const jobsPath = process.argv[2]
  if (!jobsPath) throw new Error('usage: node scripts/away-days/ingest-media.mjs <jobs.json>')
  const jobs = JSON.parse(readFileSync(jobsPath, 'utf8'))
  mkdirSync(OUT, { recursive: true })
  const ledger = readJson(LEDGER, null)
  if (!ledger) throw new Error('content/manual/away-media.json is missing')
  const provenance = JSON.parse(readFileSync(PROVENANCE, 'utf8'))

  for (const job of jobs) {
    validate(job)
    const files = []
    for (const size of SIZES) files.push(await crop(job, size))
    const treated = files.some((f) => f.treated)
    const [wide, tall] = files
    const row = {
      id: job.id,
      venueId: job.venueId,
      ...(job.matchId ? { matchId: job.matchId } : {}),
      kind: 'stadium',
      assetUrl: `/away/${wide.name}`,
      assetUrlTall: `/away/${tall.name}`,
      sourceUrl: job.sourceUrl ?? null,
      sourceTitle: job.sourceTitle ?? null,
      credit: job.credit,
      license: job.license,
      licenseUrl: job.licenseUrl ?? null,
      capturedYear: job.capturedYear,
      capturedApprox: job.capturedApprox ?? 'year',
      deYellowed: treated,
      files: files.map(({ name, width, height, bytes, sha256, sourceYellowPx, yellowPx }) => ({
        path: `public/away/${name}`, width, height, bytes, sha256, sourceYellowPx, yellowPx,
      })),
    }
    const at = ledger.records.findIndex((r) => r.id === job.id)
    if (at >= 0) ledger.records[at] = row
    else ledger.records.push(row)

    const key = `away-media-${job.id}`
    const record = {
      key,
      kind: 'photo-scan',
      origin: job.origin,
      folder: 'public/away',
      match: files.map((f) => f.name),
      sourceUrl: job.sourceUrl ?? null,
      sourceTitle: `scripts/away-days/ingest-media.mjs ← ${job.sourceTitle ?? job.sourceUrl}`,
      treatment: ['crop', ...(treated ? ['de-yellow'] : []), 'lossy-webp-measured'],
      confidence: job.origin === 'free-licence' ? 2 : 1,
      noteHe: job.noteHe,
    }
    if (typeof record.noteHe !== 'string' || record.noteHe.length < 20) throw new Error(`job ${job.id}: noteHe (≥20 chars) is required`)
    const pAt = provenance.records.findIndex((r) => r.key === key)
    if (pAt >= 0) provenance.records[pAt] = record
    else provenance.records.push(record)
    console.log(`${job.id}: ${files.map((f) => `${f.name} ${f.bytes}B yellow ${f.sourceYellowPx}→${f.yellowPx}`).join(' · ')}`)
  }

  ledger.records.sort((a, b) => a.venueId.localeCompare(b.venueId) || a.id.localeCompare(b.id))
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 1) + '\n')
  writeFileSync(PROVENANCE, JSON.stringify(provenance, null, 1) + '\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
