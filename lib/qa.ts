import { evaluationMode } from '@/lib/master/mode'
/**
 * מי רשאי לראות מסך בדיקה — שאלה אחת, מקום אחד (7.9.2026, דלתא 47).
 *
 * The seven `/qa/*` routes all opened with `if (process.env.NODE_ENV === 'production')
 * notFound()`, which is the right instinct and the wrong test. **Every Vercel deployment
 * builds with `NODE_ENV=production` — a preview of a pull request just as much as the live
 * site.** So the QA screens were unreachable everywhere except a local `next dev`, and the
 * one person who needs to look at them does not use a terminal. A verification screen
 * nobody can open is not a safeguard, it is a dead file.
 *
 * `VERCEL_ENV` is the question that was actually being asked. Vercel sets it on every
 * deployment — `production` for the live site, `preview` for a pull request's own URL,
 * `development` for `vercel dev` — so this opens the QA screens on a preview and keeps them
 * shut on the site the public sees. No configuration, no secret query key, no hidden door
 * on a live page.
 *
 * Off Vercel it falls back to the old test, so `next dev` still shows them and a local
 * production build still hides them.
 */
export function qaAllowed(): boolean {
  if (evaluationMode()) return true
  const vercel = process.env.VERCEL_ENV
  if (vercel) return vercel !== 'production'
  return process.env.NODE_ENV !== 'production'
}
