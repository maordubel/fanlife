import hub from '@/messages/en.hub.json'

/** The hub's own English strings (nothing here is a fork of a Worker key). A key that does not exist is a type error. */
export type HubKey = keyof typeof hub
export function h(key: HubKey, vars?: Record<string, string | number>): string {
  const raw: string = hub[key]
  return vars ? Object.entries(vars).reduce((out, [k, v]) => out.replaceAll(`{${k}}`, String(v)), raw) : raw
}
