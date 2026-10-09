/**
 * Open local evaluation (a preview where every gate is unlocked and accounts are simulated on the device) versus the
 * real thing (Supabase accounts, durable market and stats, only published clubs open).
 *
 * Explicit wins: NEXT_PUBLIC_FAN_LIFE_EVALUATION = 'true' | 'false'. With nothing set the site decides for itself:
 * the moment a Supabase project is connected (URL + publishable key) it is the real thing, and without one it stays a
 * preview. So connecting Supabase is the only step that turns the product on, and nobody has to remember a second flag.
 * (The names are spelled out in full so Next can inline them into the browser bundle.)
 */
export const evaluationMode = () => {
  const flag = process.env.NEXT_PUBLIC_FAN_LIFE_EVALUATION
  if (flag === 'true') return true
  if (flag === 'false') return false
  return !((process.env.NEXT_PUBLIC_SUPABASE_URL ?? '') !== '' && (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '') !== '')
}
