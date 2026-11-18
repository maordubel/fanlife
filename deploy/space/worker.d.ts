export function originFor(host: string): string | null
export function edgeKey(request: Request): string | null
export function bootPage(path: string): string
export const EDGE_FRESH_S: number
export const EDGE_KEEP_S: number
export const BOOT_AFTER_MS: number
declare const worker: {fetch(request: Request, env?: Record<string, string>, ctx?: {waitUntil(p: Promise<unknown>): void}): Promise<Response>}
export default worker
