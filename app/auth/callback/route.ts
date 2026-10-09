import { evaluationMode } from '@/lib/master/mode'
import { NextResponse } from 'next/server'

import { portalConfigured } from '@/lib/portal/env'
import { createClient } from '@/lib/supabase/server'

/**
 * החזרה מגוגל — the whole server side of signing in, and deliberately all of it.
 *
 * Supabase's browser client sends the person to Google with a PKCE verifier in a cookie;
 * Google sends them back here with a `?code`; this exchanges the two for a session and
 * puts them back where they were. That is the entire seam. There is no account system
 * behind it: no profile editor, no password reset, no email confirmation flow, because
 * the product does not have accounts — it has a CARD, and this is the door that lets the
 * card follow a person from a phone to a laptop.
 *
 * **`next` is validated, not trusted.** A redirect target that arrives in a query string
 * and is followed as written is an open redirect, and an open redirect on the one route
 * in the app that handles a session is the worst place in the app to have one. Only a
 * path on this origin is accepted — it must begin with a single `/`, which rules out
 * `//evil.example` (a protocol-relative URL that most parsers treat as another host) as
 * well as the obvious `https://…`.
 *
 * **No middleware.** The usual Supabase SSR setup refreshes the session cookie in
 * `middleware.ts`, and this build does not have one: nothing rendered on the server reads
 * the session yet — `/tik`'s account plate is a client component — so a middleware would
 * run on every request in the app in order to serve nobody. The day a server component
 * wants `auth.uid()`, that is the day the middleware is worth its cost, and
 * `docs/14-portal-identity.md` says so in as many words. Note also that `middleware.ts`
 * can only live at the repository root, which `npm run repo:hygiene` guards (rule 59) —
 * so adding one is a deliberate act with a guard to update, not a file that appears.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const cookieNext = /(?:^|;\s*)fl_next=([^;]*)/.exec(request.headers.get('cookie') ?? '')?.[1]
  const back = safePath(url.searchParams.get('next') ?? (cookieNext ? decode(cookieNext) : null))

  if (evaluationMode() || !portalConfigured()) return NextResponse.redirect(new URL(back, url.origin))

  const code = url.searchParams.get('code')
  if (code !== null) {
    try {
      const { error } = await createClient().auth.exchangeCodeForSession(code)
      if (!error) return clear(NextResponse.redirect(new URL(back, url.origin)))
    } catch {
      // fall through to the same place with the failure marked
    }
  }

  // A failure lands on the personal area with a flag rather than on an error page: the
  // card is still there, still readable, still playable. Signing in is an addition to it
  // and a failed addition must not take the screen away.
  return NextResponse.redirect(new URL(`${back}${back.includes('?') ? '&' : '?'}auth=failed`, url.origin))
}

function decode(v: string): string | null {
  try { return decodeURIComponent(v) } catch { return null }
}

function clear(response: NextResponse): NextResponse {
  response.cookies.set('fl_next', '', { path: '/', maxAge: 0 })
  return response
}

function safePath(value: string | null): string {
  if (value === null) return '/tik'
  if (!value.startsWith('/') || value.startsWith('//')) return '/tik'
  return value
}
