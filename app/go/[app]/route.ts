import 'server-only'

import { NextResponse } from 'next/server'

import { appUrl } from '@/ecosystem/sdk'
import { goDestination, goInput, isGoTarget } from '@/lib/ecosystem/go'

/** GET /go/<dubid|offsides|theworker>?club=<slug>&c=<campaign>&to=<path> — see lib/ecosystem/go.ts. */
export const dynamic = 'force-dynamic'

const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }

export async function GET(request: Request, { params }: { params: { app: string } }) {
  if (!isGoTarget(params.app)) return NextResponse.redirect(new URL('/', request.url), { status: 302, headers })
  const input = goInput(new URL(request.url).searchParams)
  let to: string
  try { to = await goDestination(params.app, input) } catch { to = appUrl(params.app, input.to) }
  return NextResponse.redirect(to, { status: 302, headers })
}
