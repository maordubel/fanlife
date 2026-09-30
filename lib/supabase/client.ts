'use client'

import { evaluationMode } from '@/lib/master/mode'
import { browserLocalClient } from '@/lib/master/evaluation-client'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  if (evaluationMode()) return browserLocalClient() as unknown as ReturnType<typeof createBrowserClient<Database>>
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
