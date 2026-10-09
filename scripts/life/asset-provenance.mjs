/**
 * מאיפה זה הגיע — the guard that stops the asset library from becoming anonymous.
 *
 *   node scripts/life/asset-provenance.mjs          → the audit, and a non-zero exit if it fails
 *   node scripts/life/asset-provenance.mjs --md     → the Hebrew table Maor reads
 *
 * There are 1,218 files under `public/life`. Six hundred of them are called things like
 * `sg80a-14.jpg` and `adultB3.png`, and in eighteen months nobody — Maor included — will
 * be able to say which of them he painted, which he photographed off a shirt on his own
 * wall, which came out of a collector's album, and which a script in this repository
 * invented out of two other files. The project's own audit asked for the answer to be
 * written down (§14, "ASSET MANIFEST & PROVENANCE"), and this is the half of it that
 * cannot rot: `content/manual/asset-provenance.json` is the claim, and this script is the
 * proof that the claim still describes the folder.
 *
 * **What it fails on, and why each one is a real failure and not a tidiness rule.**
 *
 *   1. **A shipped file no record covers.** This is the whole point. A file that arrives
 *      without a row is a file whose origin was never written down, and the moment it is
 *      on screen in a documentary game it is making a claim about 1986 with nothing behind
 *      it. Rule 11 is about facts; this is the same rule applied to pictures.
 *   2. **A file two records both claim.** Two answers to "where did this come from" is
 *      worse than none, because one of them is wrong and neither of them is marked.
 *   3. **A record that matches nothing**, and — separately — **a single pattern inside a
 *      record that matches nothing.** A group whose files were deleted is a row that has
 *      stopped describing anything; a dead glob inside a live group is worse, because the
 *      row still looks true. A pattern that matches nothing is a pattern that is lying.
 *   4. **`origin: "unknown"` at any confidence but 0**, and **`confidence: 0` carrying a
 *      `sourceUrl`.** This is rule 11 wired into the shape of the data. An honest "nobody
 *      wrote this down" is a correct and finished answer; a guess wearing a URL is the one
 *      outcome this manifest exists to prevent, so the schema refuses to hold it.
 *   5. **A vocabulary the manifest does not define.** `kind`, `origin` and every token in
 *      `treatment` come from closed lists. Free text in `treatment` would be a comment,
 *      and a comment cannot be asked "which assets were de-yellowed" — which is rule 8's
 *      question, and the reason `de-yellow` is a token and not a sentence.
 *
 * **Why `.mjs` and not `.ts` beside `art-audit.ts`.** That script imports the real art
 * module rather than reading it as text, and it is right to: a key renamed in code must
 * not slip past it. This one has nothing to import. Its subject is a folder of bytes and
 * one JSON file, and the thing it must never do is depend on the game booting — the day
 * the build is broken is exactly the day somebody drops forty files into
 * `public/life/art` to fix it, and the audit has to still run. So it is plain node, like
 * `check-repo-hygiene.mjs`, and it stands next to it in `doctor` for the same reason.
 *
 * **The one thing it deliberately does not check.** It cannot tell you whether a record is
 * TRUE — whether `docTicket.png` really is somebody's kept ticket from 24.5.1986. Nothing
 * automatic can. What it guarantees is narrower and still worth having: every shipped file
 * has an answer, exactly one, and the answers that are guesses are labelled as guesses.
 * The groups that say `unknown` are listed in `docs/life/ASSET-PROVENANCE.md`, for the
 * only person who can close them.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const MANIFEST = join(ROOT, 'content/manual/asset-provenance.json')

/**
 * The folders whose contents ship to a player's browser as documentary material.
 *
 * Hard-coded rather than derived from the manifest, and that direction matters: if the
 * list came out of the records, a folder nobody wrote a record for would be a folder the
 * audit never looked at, which is precisely the hole this exists to close. `public/brand`,
 * `public/fonts` and `public/video` are the site's own furniture — a logo, a typeface, the
 * intro animation — and they are not documentary assets, so they are out of scope by
 * being named here rather than by being forgotten.
 */
const SHIPPED = [
  'public/brand/gates',
  'public/life/art',
  // 17.9.2026 — עשרה חפצים סרוקים. התיקייה נפרדת מ-`art` כי היא התיקייה היחידה תחת
  // `public/life` שנושאת צהוב בכוונה (כלל 69, החריג השני), ולכן היא בדיוק תיקייה שאסור
  // שתישאר מחוץ לביקורת הזאת: נכס תיעודי בלי שורת מקור הוא מה שהמניפסט קיים בשבילו.
  'public/life/artefacts',
  'public/life/docs',
  'public/life/film',
  'public/life/transitions',
  'public/life/opening',
  'public/life/sfx',
  // 7.9.2026 — תבניות השיתוף, שני קבצים שמאור צייר לפי הבריף
  'public/life/share',
  // 16.9.2026 — ארכיון החולצות. The only folder in this list that is NOT part of THE
  // WORKER LIFE, and it is here for exactly the reason the list exists: 168 photographs
  // of real garments, taken by somebody, published somewhere, and shown to a reader as
  // evidence. A documentary photograph with no row saying where it came from is the
  // failure this audit was written to prevent — the wing it hangs in is beside the point.
  'public/kits',
  // 24.9.2026 — the archive's dig table (gate 12) and the gate 11 wall paste-up
  'public/archive',
  'public/art',
  // 25.9.2026 — AWAY DAYS stadium photographs (§29). Every file also has a row in
  // content/manual/away-media.json with its licence, credit, capture year and yellow count.
  'public/away',
]

const KIND = new Set([
  'backdrop', 'figure', 'prop', 'photo-scan', 'card', 'document', 'audio', 'video', 'ui', 'generated',
])
// 25.9.2026 — `free-licence`: a photograph published under CC BY / CC BY-SA / PD (Wikimedia
// Commons), fetched from its file page; author, licence and page URL live in away-media.json.
const ORIGIN = new Set(['maor-upload', 'archive-scan', 'original-artwork', 'procedural', 'free-licence', 'third-party-archive', 'unknown'])
// 9.10.2026 — `third-party-archive`: product photographs from a public kit catalogue (footballkitarchive.com),
// the photographer credited in sourceTitle; the rights are NOT settled, and the records say so at confidence 1.
/** every physical thing done to a file between his hard drive and a player's browser */
const TREATMENT = new Set([
  'resize', // Controlled resizing recorded by the upstream asset import.
  'none',
  // 16.9.2026 — the kit archive. `cut-out` is a matte lifted off a photographed garment
  // (u2net), which is not `key-flat` or `key-checker`: those name a known background
  // being removed, and a shirt photographed on a wiki page has no known background.
  // `encode-webp` is the single encode every archive file gets, measured on the decode.
  'cut-out', 'centre', 'encode-webp',
  'de-yellow', 'quantise', 'palette-png', 'grade', 'halo',
  'crop', 'deskew', 'cut-from-sheet', 'upscale', 'trim-alpha', 'extend-strip',
  'key-green', 'key-flat', 'key-checker', 'fade',
  // 21.9.2026 — כלל 61: WebP מאבד-מידע שהאיכות שלו נבחרה במדידה — הצהוב נספר על הפענוח
  // של הבייטים שנשמרו, לא על המקור. שונה מ-`encode-webp` של הארכיון, שהוא קידוד אחד קבוע.
  'lossy-webp-measured', 'de-yellow-frame-level', 'lossless-vp9', 'downscale-270x480',
  'cut', 'loop-crossfade', 'normalise', 'encode-ogg-m4a', 'encode-mp4',
  // 17.9.2026 — סרט הפתיחה. `encode-webm` הוא הקידוד השני שכלל 30 דורש, ו-`poster-frame`
  // הוא פריים שנשלף מהסרט והפך לתמונה — שניהם פעולות פיזיות על קובץ, ולכן הם טוקנים
  // ולא טקסט חופשי. `encode-mp4` כבר היה כאן ומשמש את אותו סרט.
  'encode-webm', 'poster-frame',
  // 21.9.2026 — מנוע החולצות. `shading-map` הוא בגד מצולם שהפך למפה אפורה (קפלים/אור) שעליה
  // המנוע מדפיס את הצבעים של המפרט — פעולה פיזית על קובץ, ולכן טוקן ולא משפט.
  'shading-map',
])

/** `*` only, and it never crosses a `/` — these folders are flat, and a cleverer glob would hide a nested file */
function toRegExp(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')
  return new RegExp(`^${escaped}$`)
}

function walk(dir, base = dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, base, out)
    else out.push(relative(base, path))
  }
  return out
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
const records = manifest.records ?? []
const problems = []
const say = (message) => problems.push(message)

// ---- the envelope keeps the same shape as every other file in content/manual --------
for (const field of ['note', 'confidence', 'source', 'records']) {
  if (!(field in manifest)) say(`המעטפה חסרה שדה "${field}" — content/manual עובד בצורה אחת`)
}

// ---- the records, as data ----------------------------------------------------------
const seen = new Set()
for (const record of records) {
  const where = `רשומה "${record.key}"`
  if (seen.has(record.key)) say(`${where}: מפתח כפול`)
  seen.add(record.key)
  if (!KIND.has(record.kind)) say(`${where}: kind לא מוכר — ${record.kind}`)
  if (!ORIGIN.has(record.origin)) say(`${where}: origin לא מוכר — ${record.origin}`)
  if (!SHIPPED.includes(record.folder)) say(`${where}: folder מחוץ לתחום הבדיקה — ${record.folder}`)
  if (!Array.isArray(record.treatment) || record.treatment.length === 0) {
    say(`${where}: treatment ריק — "none" הוא גם תשובה`)
  } else {
    for (const token of record.treatment) if (!TREATMENT.has(token)) say(`${where}: treatment לא מוכר — ${token}`)
  }
  if (![0, 1, 2].includes(record.confidence)) say(`${where}: confidence חייב להיות 0, 1 או 2`)
  if (typeof record.noteHe !== 'string' || record.noteHe.trim().length < 20) say(`${where}: noteHe חסר או ריק`)

  // rule 11, in the shape of the schema
  if (record.origin === 'unknown' && record.confidence !== 0) {
    say(`${where}: origin "unknown" חייב לשאת confidence 0 — אי־ידיעה היא תשובה, לא הערכה`)
  }
  if (record.confidence === 0 && record.origin !== 'unknown') {
    say(`${where}: confidence 0 חייב לשאת origin "unknown"`)
  }
  if (record.confidence === 0 && record.sourceUrl !== null) {
    say(`${where}: confidence 0 עם sourceUrl — זו בדיוק ההמצאה שחוק 11 אוסר`)
  }
  if (record.sourceUrl !== null && !/^https?:\/\//.test(String(record.sourceUrl))) {
    say(`${where}: sourceUrl שאינו כתובת — ${record.sourceUrl}`)
  }
  if (!Array.isArray(record.match) || record.match.length === 0) say(`${where}: אין match`)
}

// ---- the folders, as bytes ---------------------------------------------------------
const owner = new Map()
const hits = new Map()
const counts = new Map()

for (const folder of SHIPPED) {
  const rows = records.filter((record) => record.folder === folder)
  if (rows.length === 0) say(`התיקייה ${folder} נשלחת למשחק ואין עליה אף רשומה`)
  const files = walk(join(ROOT, folder))
  counts.set(folder, files.length)
  for (const file of files) {
    const claimants = []
    for (const record of rows) {
      for (const pattern of record.match ?? []) {
        if (!toRegExp(pattern).test(file)) continue
        claimants.push(record.key)
        hits.set(`${record.key} ${pattern}`, (hits.get(`${record.key} ${pattern}`) ?? 0) + 1)
      }
    }
    const unique = [...new Set(claimants)]
    if (unique.length === 0) say(`${folder}/${file} — אין רשומה שמכסה אותו`)
    else if (unique.length > 1) say(`${folder}/${file} — יותר מרשומה אחת טוענת לו: ${unique.join(', ')}`)
    else owner.set(`${folder}/${file}`, unique[0])
  }
}

const perRecord = new Map()
for (const key of owner.values()) perRecord.set(key, (perRecord.get(key) ?? 0) + 1)

for (const record of records) {
  if (!perRecord.get(record.key)) say(`רשומה "${record.key}" לא מכסה אף קובץ — הקבצים נמחקו או שהשם השתנה`)
  for (const pattern of record.match ?? []) {
    if (!hits.get(`${record.key} ${pattern}`)) say(`רשומה "${record.key}": התבנית "${pattern}" לא תופסת כלום`)
  }
}

// ---- output ------------------------------------------------------------------------
const covered = owner.size
const shipped = [...counts.values()].reduce((sum, n) => sum + n, 0)
const unknown = records.filter((record) => record.origin === 'unknown')

if (process.argv.includes('--md')) {
  const lines = ['| קבוצה | קבצים | מה זה | מקור | טיפול | ביטחון |', '|---|---|---|---|---|---|']
  for (const record of records) {
    const origin = record.origin === 'unknown' ? '**לא ידוע**' : record.origin
    lines.push(
      `| \`${record.key}\` | ${perRecord.get(record.key) ?? 0} | ${record.kind} | ${origin} | ` +
        `${(record.treatment ?? []).join(' · ')} | ${record.confidence} |`,
    )
  }
  console.log(lines.join('\n'))
} else {
  for (const folder of SHIPPED) {
    const rows = records.filter((record) => record.folder === folder)
    const n = rows.reduce((sum, record) => sum + (perRecord.get(record.key) ?? 0), 0)
    console.log(
      `${folder.padEnd(22)} ${String(n).padStart(4)}/${String(counts.get(folder) ?? 0).padEnd(5)} ${rows.length} records`,
    )
  }
  console.log(`\n${covered}/${shipped} covered · ${records.length} records · ${unknown.length} groups with no known origin`)
  if (unknown.length) console.log('   ' + unknown.map((record) => record.key).join(' · ') + '  → docs/life/ASSET-PROVENANCE.md')
}

if (problems.length) {
  console.error(`\n${problems.length} problems:`)
  for (const problem of problems) console.error(`  · ${problem}`)
  process.exit(1)
}
