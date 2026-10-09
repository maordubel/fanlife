import { REGISTRY } from '@/lib/master/registry'

/**
 * A club has two names: its registry id (`hapoel-tel-aviv`, what the shirt catalogue and the address bar use) and
 * its circle key (`hapoeltelaviv` — the prefix of its shirts' slugs, what the database groups by).
 */
export const circleKeyForClub = (id: string): string | null => REGISTRY.find((c) => c.id === id)?.sub ?? null
export const clubForKey = (key: string) => REGISTRY.find((c) => c.sub === key) ?? null
export const clubNameForKey = (key: string): string => clubForKey(key)?.name ?? key
