import 'server-only'

import { evaluationMode } from '@/lib/master/mode'
import { serverLocalClient } from '@/lib/master/evaluation-db'
import { cookies, headers } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { Database } from '@/types/database'
import { ssoCookieDomain } from '@/ecosystem/sdk'

type CookieToSet = { name: string; value: string; options: CookieOptions }

/** Request-scoped client carrying the user's session. Subject to RLS. */
export function createClient() {
  if (evaluationMode()) return serverLocalClient() as unknown as ReturnType<typeof createServerClient<Database>>
  const cookieStore = cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // One account across *.dubelteam.com (ecosystem SSO).
      cookieOptions: { domain: ssoCookieDomain((headers().get('host') ?? '').split(':')[0] ?? '') },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list: CookieToSet[]) => {
          try {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component: middleware refreshes the session instead.
          }
        },
      },
    },
  )
}
