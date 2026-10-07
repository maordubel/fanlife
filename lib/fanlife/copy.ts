import copy from '@/messages/en.fanlife.json'

/** Strings that exist only in FAN LIFE (not forks of a Worker key). Typed by the catalogue. */
export type FanKey = keyof typeof copy
export function fl(key: FanKey, vars?: Record<string, string | number>): string {
  const raw: string = copy[key]
  return vars ? Object.entries(vars).reduce((out, [k, v]) => out.replaceAll(`{${k}}`, String(v)), raw) : raw
}
