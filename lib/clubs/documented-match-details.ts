import 'server-only'

type Raw = Record<string, unknown>
const object = (value: unknown): Raw => value && typeof value === 'object' && !Array.isArray(value) ? value as Raw : {}
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : []
const strings = (value: unknown): string[] => list(value).filter((item): item is string => typeof item === 'string' && !!item.trim())

/** The research import has already matched the teams and final score. At read time,
 * guard the canonical ID, date and score again, and preserve any existing team sheet. */
export function withDocumentedMatchDetails<T extends Raw>(pack: T, history: unknown): T {
  const details = list(object(history).matchDetails).map(object)
  if (!details.length) return pack
  const byId = new Map(details.map(row => [row.targetId, row]))
  const checked = new Set(list(pack.sources).map(object).filter(s => s.access === 'available' && s.checkedAt).map(s => s.id))
  const matches = list(pack.matches).map(input => {
    const match = object(input)
    const detail = byId.get(match.id)
    if (!detail) return input
    const value = object(match.value)
    const refs = strings(detail.sources)
    if (!refs.length || refs.some(ref => !checked.has(ref)) || value.on !== detail.on || value.score !== detail.score) return input

    const fields = object(detail.value)
    const added: Raw = {}
    for (const field of ['lineup', 'opponentLineup'] as const) {
      const eleven = strings(fields[field])
      if (strings(value[field]).length !== 11 && eleven.length === 11 && new Set(eleven).size === 11) added[field] = eleven
    }
    for (const field of ['scorers', 'goalEvents'] as const) {
      if (!list(value[field]).length && list(fields[field]).length) added[field] = fields[field]
    }
    if (!value.venue && typeof fields.venue === 'string' && fields.venue.trim()) added.venue = fields.venue
    if (!Object.keys(added).length) return input
    return {...match, value: {...value, ...added}, sources: [...new Set([...strings(match.sources), ...refs])]}
  })
  return {...pack, matches}
}
