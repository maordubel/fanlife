export const CLEAR: string
export function fix(req: {method?: string; url?: string; headers: Record<string, string | string[] | undefined>}, status: number, h: Record<string, string | string[] | undefined>): Record<string, string | string[] | undefined>
export const FRESH_MS: number
export const STALE_MS: number
type Req = {method?: string; url?: string; headers: Record<string, string | string[] | undefined>}
export function shelfKey(req: Req): string | null
export function shelvable(status: number, h: Record<string, string | string[] | undefined>, bytes: number): boolean
export function makeShelf(now?: () => number): {size(): number; get(key: string): {status: number; headers: Record<string, string | string[] | undefined>; body: Buffer; gz: Buffer; at: number; state: 'hit' | 'stale'} | null; put(key: string, status: number, headers: Record<string, string | string[] | undefined>, body: Buffer): void}
