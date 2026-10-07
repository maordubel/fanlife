import type { MessageKey } from '@/lib/i18n'
import admin from '@/messages/en.admin.json'
import economy from '@/messages/en.economy.json'

/**
 * FAN LIFE's English catalogue for the screens forked from The Worker (scripts/fanlife/fork-economy.py).
 * Same keys and the same `t(key, vars)` shape as `lib/i18n`, so a fork differs from its source only
 * in this import. A key the English catalogue lacks returns the key itself — and
 * `tests/fanlife-economy.test.ts` fails the build before that can ship.
 */
export type { MessageKey }
export const EN: Record<string, string> = { ...economy, ...admin }
export const LOCALE = 'en' as const
export const DIRECTION = 'ltr' as const

export function t(key: MessageKey, vars?: Record<string, string>): string {
  const raw = EN[key] ?? key
  if (!vars) return raw
  return Object.entries(vars).reduce((out, [name, value]) => out.replaceAll(`{${name}}`, value), raw)
}
