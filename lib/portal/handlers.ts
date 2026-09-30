import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

import { publicIdentityHandler } from './public-sync'

/**
 * עוד מה לסנכרן — the hook point for a sync this file does not know about yet.
 *
 * `syncProfile()` (`lib/portal/sync.ts`) reconciles the card, the runs, the deeds and the
 * collections. A gate that keeps a ledger of its OWN — gate 2's Revenge marks, with their
 * own table and their own "newer entry wins" merge — does not belong inside that
 * function, and must not have to edit it. It adds two lines here instead: an import of
 * its handler from `./marks-sync`, and that handler as an entry in `SYNC_HANDLERS`.
 *
 * **A static list, not a registration side effect.** A handler registered by importing
 * the gate's module would only exist on a page that happened to load that gate first —
 * open `/tik` straight from a bookmark and the Revenge ledger would silently not sync.
 * A list in this file is loaded wherever `syncProfile` is, which is the only guarantee
 * worth having. `registerSyncHandler` stays for tests and for a handler that genuinely
 * only matters once its gate has been opened.
 *
 * Every handler runs AFTER the core sync, in list order, each inside its own try/catch:
 * one failing handler never stops the card or another handler. It reports `true` for
 * "reconciled" and `false` for "could not" (missing table, offline, refused).
 */

export type SyncContext = {
  /** the typed client — the same cast `lib/portal/db.ts` explains */
  db: SupabaseClient<Database>
  /** the signed-in account's id; handlers are never called signed out */
  userId: string
}

export type SyncHandler = {
  /** a short stable id — it keys the handler's line in `SyncResult.extras` */
  id: string
  /** pull the account's rows, merge with the device, write the device, push the difference */
  sync(ctx: SyncContext): Promise<boolean>
}

export const SYNC_HANDLERS: SyncHandler[] = [
  // gate 2 · Revenge — `lib/portal/marks-sync.ts` goes here (challenge cluster).
  // ONE RED WORLD §35 — the public identity ("אדום #N" or a nickname), newest edit wins.
  publicIdentityHandler,
]

/** Add a handler at runtime. Idempotent by id. */
export function registerSyncHandler(handler: SyncHandler): void {
  if (SYNC_HANDLERS.some((row) => row.id === handler.id)) return
  SYNC_HANDLERS.push(handler)
}

/** Run every handler, isolated from each other. Never throws. */
export async function runSyncHandlers(
  ctx: SyncContext,
  handlers: readonly SyncHandler[] = SYNC_HANDLERS,
): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {}
  for (const handler of handlers) {
    try {
      out[handler.id] = await handler.sync(ctx)
    } catch {
      out[handler.id] = false
    }
  }
  return out
}
