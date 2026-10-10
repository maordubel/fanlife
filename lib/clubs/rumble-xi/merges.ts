import merges from '@/content/manual/rumble-merges.json'

/** one man, one card: records of one club that are the same man (content/manual/rumble-merges.json, found by scripts/rumble/find-merges.ts, editable by hand) */
type M={keep:string;drop:string;why:string}
const doc=merges as unknown as Record<string,M[]>
export const mergesFor=(club:string):readonly M[]=>doc[club]??[]
