import 'server-only'
import { evaluationMode } from '@/lib/master/mode'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Bypasses RLS. Ingestion and curation only — never import this from a route
 * that renders user-facing content.
 */
export function createAdminClient() {
  if (evaluationMode()) throw new Error('Remote ingestion is disabled in open evaluation. Use master research.')
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}
