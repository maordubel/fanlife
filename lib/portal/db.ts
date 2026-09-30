'use client'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

/**
 * הלקוח, עם הטיפוסים שלו — one cast, in one file, with the reason written down.
 *
 * `lib/supabase/client.ts` is correct and is not touched. What is wrong is underneath it:
 * `@supabase/ssr@0.5.2` declares its return type as `SupabaseClient<Database, SchemaName,
 * Schema>`, and `@supabase/supabase-js@2.112.4` — which is what `^2.45.4` resolves to
 * today — changed that class's THIRD generic from `Schema` to `SchemaName`. So the schema
 * object is handed to a slot constrained to `string & keyof Database`, the constraint
 * fails, `Schema` collapses to `never`, and every `from()` and every `rpc()` in the app
 * becomes an argument of type `never` — a typecheck error that says nothing about the
 * query it is pointing at.
 *
 * Nothing had noticed because nothing in `app/`, `components/` or `lib/` had used a typed
 * client before this delta: the three clients were written, correct, and never called.
 *
 * The honest fix is one `npm install` — either `@supabase/ssr` forward, or
 * `@supabase/supabase-js` pinned back to a version whose generics `ssr` was written
 * against. That is a lockfile change and a deploy, and it is Maor's call, not this
 * delta's. Until then this file re-states the type the library meant to return, exactly
 * once, so the mismatch is quarantined here instead of being cast at every call site or,
 * worse, worked around by dropping the types altogether.
 */
export function portalDb(): SupabaseClient<Database> {
  return createClient() as unknown as SupabaseClient<Database>
}
