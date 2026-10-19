'use client'

import { evaluationMode } from '@/lib/master/mode'
import { browserLocalClient } from '@/lib/master/evaluation-client'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'
import { ssoCookieDomain } from '@/ecosystem/sdk'

/**
 * Before SSO the session cookie was host-only (fanlife.dubelteam.com). A host-only cookie with the same name as the
 * shared one would shadow it, so it is expired once per page load on the real domains (never on localhost/previews,
 * where host-only IS the shared cookie).
 */
let swept = false
function sweepHostOnlySession(domain: string | undefined) {
  if (swept || !domain || typeof document === 'undefined') return
  swept = true
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]?.trim()
    if (name && /^sb-[a-z0-9]+-auth-token(\.\d+)?$/.test(name)) document.cookie = `${name}=; Max-Age=0; Path=/`
  }
}

export function createClient() {
  if (evaluationMode()) return browserLocalClient() as unknown as ReturnType<typeof createBrowserClient<Database>>
  const domain = typeof window === 'undefined' ? undefined : ssoCookieDomain(window.location.hostname)
  sweepHostOnlySession(domain)
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // One account across *.dubelteam.com (ecosystem SSO): the session cookie lives on the parent domain.
    { cookieOptions: { domain } },
  )
}
