/**
 * בונים רק כשמשהו שהאתר מריץ השתנה — ה-Ignored Build Step של Vercel (22.9.2026).
 *
 * כל ZIP של דלתא שמועלה דרך GitHub הוא קומיט, וכל קומיט ל-main הוא פריסה מלאה: ~230MB של
 * קבצים סטטיים ועוד חבילת פונקציות, שנשמרים עם הפריסה. דלתא של עשרה ZIP-ים הייתה עשר פריסות,
 * והחשבון עבר את 10GB של Deployment Storage (Hobby), מה שעלול לחסום פריסות.
 *
 * הכלל כאן שמרני בכוונה: קומיט **נבנה** אם הוא נוגע בדבר אחד שהאתר מריץ או מגיש. הוא **מדולג**
 * רק כשכל הקבצים בו הם כאלה שהאתר לא קורא בכלל — מסמכים, בדיקות, סקריפטים, SQL, מקורות אמנות.
 * כשיש ספק — בונים. כש-git לא יודע לענות — בונים.
 *
 * Vercel: exit 0 = לדלג, exit 1 = לבנות.
 */
import { execSync } from 'node:child_process'

/** Paths the running site never reads. Everything else builds. */
const INERT = [
  /^docs\//,
  /^tests\//,
  /^scripts\//,
  /^supabase\//,
  /^brand\/source\//,
  /^data\/(reports|staging)\//,
  /^content\/raw\//,
  /^[^/]+\.md$/,
  /^CLAUDE\.md$/,
  /^\.github\//,
]

function changedFiles() {
  const base = process.env.VERCEL_GIT_PREVIOUS_SHA
  const range = base ? `${base} HEAD` : 'HEAD^ HEAD'
  return execSync(`git diff --name-only ${range}`, { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function decide(files) {
  if (files.length === 0) return { build: true, why: 'no file list — building to be safe' }
  const live = files.filter((file) => !INERT.some((pattern) => pattern.test(file)))
  if (live.length > 0) return { build: true, why: `${live.length} file(s) the site runs, e.g. ${live[0]}` }
  return { build: false, why: `all ${files.length} changed file(s) are docs, tests, scripts or sources` }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let verdict
  try {
    verdict = decide(changedFiles())
  } catch (error) {
    verdict = { build: true, why: `git could not answer (${String(error).split('\n')[0]}) — building` }
  }
  console.log(`should-build: ${verdict.build ? 'BUILD' : 'SKIP'} — ${verdict.why}`)
  process.exit(verdict.build ? 1 : 0)
}
