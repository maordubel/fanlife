export const V4_TEMPLATES: string[]
export function dareFor(t: string, d?: Record<string, unknown> | null): string
export function phone(src: string | null, w?: number, delay?: number, tilt?: number): string
export function page(t: string, app: string, data: Record<string, unknown> | null, o?: {story?: boolean; motion?: boolean}): Promise<string | null>
