import {clubFromHost,DEFAULT_CLUB} from '@/lib/master/registry'

/**
 * The two marks, named so they cannot be mixed up (owner, 18.11.2026 — docs/rules/two-logos.md).
 * FAN LIFE's colour roundel (the ball, "FOOTBALL. FOREVER.") is the mark of every FAN LIFE surface: the hub, every club,
 * every game, THE ALBUM, stickers, films, share cards. THE WORKER's badge (the worker with the hammer, "הפועל") belongs to
 * THE WORKER edition only — Hapoel Tel Aviv's own host. A file that needs a mark imports it from here.
 */
export const FANLIFE_LOGO={96:'/brand/fanlife/logo-96.png',192:'/brand/fanlife/logo-192.png',512:'/brand/fanlife/logo-512.png',mono:'/brand/fanlife/logo-mono.webp'} as const
export const WORKER_BADGE={192:'/brand/logo-192.png',512:'/brand/logo-512.png'} as const
export type Edition='fanlife'|'worker'
/** THE WORKER edition is Hapoel's own host and nothing else (the same test as the metadata and the manifest) */
export const editionOf=(host:string|null|undefined):Edition=>clubFromHost(host)===DEFAULT_CLUB?'worker':'fanlife'
export const markFor=(host:string|null|undefined,size:192|512=512)=>editionOf(host)==='worker'?WORKER_BADGE[size]:FANLIFE_LOGO[size]
