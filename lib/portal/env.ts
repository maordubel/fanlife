import { evaluationMode } from '@/lib/master/mode'
/**
 * האם יש בכלל שרת — the one question every portal seam asks first.
 *
 * The app ships and runs with no Supabase project behind it: the gates play, the card
 * fills, the ballot is cast, and everything lives in the device's own storage. That is
 * not a degraded mode, it is the mode this build has been in since it was written, and
 * it stays the fallback for ever — a supporter with blocked site data, an offline train,
 * or simply nobody signed in must still be able to play a round.
 *
 * So every remote path is guarded by this, and the guard is a pure read of two build-time
 * constants rather than a network probe: `NEXT_PUBLIC_*` values are inlined by Next at
 * build time, so a deploy with no keys cannot even be asked to try. That is what makes
 * `activeStore()` decidable synchronously, which is what keeps the polls wing's interface
 * exactly as it was promised.
 *
 * **The names are the ones `lib/supabase/client.ts` already reads.** Supabase now calls
 * the browser key a *publishable* key rather than an *anon* key, and renaming the
 * variable to match would be a rename of three working clients for a word.
 * The value that goes into `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the publishable key; it is
 * a PUBLIC key by design, it ships in the browser bundle, and it is safe there only
 * because every table it can reach has RLS on it. It belongs in Vercel's environment
 * variables and in no committed file — see `docs/14-portal-identity.md`.
 */
export function portalConfigured(): boolean {
  if (evaluationMode()) return true
  return (
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '') !== '' &&
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '') !== ''
  )
}
