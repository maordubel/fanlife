/**
 * A signing key with a development fallback. The fallback is public (it is in the repository), so on the live site it must never
 * be used: a forged token would grade as genuine. Off the live site (local, CI, previews) the fallback keeps things running.
 */
export function signingKey(configured: (string | undefined)[], devFallback: string): string {
  const k = configured.find(v => !!v)
  if (k) return k
  if (process.env.VERCEL_ENV === 'production') throw new Error('A signing key is not configured on the live site.')
  return devFallback
}
