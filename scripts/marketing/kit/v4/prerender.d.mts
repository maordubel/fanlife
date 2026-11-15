export const V4_VERSION: string
export const HOLDS: Record<string, string>
type P = {id: string; title: string; subject?: string; kind?: string; printify: {images: string[]; priceFrom: number; currency?: string; url?: string}}
export function pickProduct(list: P[], used: Set<string>, rnd?: () => number): P
export function shopFill(p: P): {data: Record<string, unknown> & {kicker: string}; words: Record<string, string>}
export function fillWords(s: string, w: Record<string, string>): string
