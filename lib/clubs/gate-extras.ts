import 'server-only'
import type {ClubData} from './contract'
import {rivalsOf} from './gate-content'
import {distinctCandidates,type WallCandidate} from './wall-engine'
import {pairableItems,type BinaryRow,type DatedItem} from './blackfile-engine'
import type {ThreadGraph} from './thread-engine'

/**
 * Reviewed gate data that is NOT part of a club's compiled pack: wall candidates, documented transfer careers
 * (Black File) and typed evidence edges (Thread). Real clubs have none yet, and the three modes say so honestly —
 * with exact counts — instead of inventing it. To open a mode, a reviewer adds `club-packs/<club>/gate-extras.json`
 * and ONE line below; nothing else changes.
 */
export type WallRow = WallCandidate & {status?: string; confidence?: number}
export type GateExtras = {wall?: WallRow[]; binary?: BinaryRow[]; thread?: ThreadGraph}

const EXTRAS: Record<string, () => Promise<GateExtras>> = {
 // 'olympiacos': async () => (await import('@/club-packs/olympiacos/gate-extras.json')).default as GateExtras,
}

export async function extrasOf(clubId: string): Promise<GateExtras> {
 const load = EXTRAS[clubId]
 return load ? await load().catch(() => ({})) : {}
}

/** HW-R01 — approved rivals (a club is a legitimate candidate) plus authored candidates the reviewer approved. */
export async function wallCandidates(club: ClubData): Promise<WallCandidate[]> {
 const rivals: WallCandidate[] = rivalsOf(club).map(r => ({id: `rival:${r.id}`, name: String((r.value as {name?: unknown}).name ?? ''), note: typeof (r.value as {note?: unknown}).note === 'string' ? ((r.value as {note?: string}).note as string) : undefined}))
 const authored = ((await extrasOf(club.identity.id)).wall ?? []).filter(w => w.status === 'approved' && (w.confidence ?? 0) >= 2)
 return distinctCandidates([...rivals, ...authored])
}

/** the club's dated events a pair may be built from: approved timeline facts with an exact calendar day */
export function timelineItems(club: ClubData): DatedItem[] {
 return pairableItems(club.timeline.filter(f => f.status === 'approved' && f.confidence >= 2).map(f => ({id: f.value.id, title: f.value.title, on: f.value.on, sources: f.sources})))
}

export async function blackFileSource(club: ClubData): Promise<{binary: BinaryRow[]; items: DatedItem[]}> {
 return {binary: (await extrasOf(club.identity.id)).binary ?? [], items: timelineItems(club)}
}

export async function threadGraphOf(club: ClubData): Promise<ThreadGraph> {
 return (await extrasOf(club.identity.id)).thread ?? {nodes: [], edges: []}
}
