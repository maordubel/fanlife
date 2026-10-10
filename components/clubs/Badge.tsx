import { crestFor } from '@/lib/clubs/crest'

type Wearer = { id?: string; clubId?: string; pattern?: string; initials?: string; name?: string }

/**
 * The club's mark: its crest when we hold one, otherwise the initials in its colours (`.mag-badge`).
 * The crest keeps the badge's box so every place that sized a badge keeps working.
 */
export function Badge({ club, className = '', style, name }: { club: Wearer | null | undefined; className?: string; style?: Record<string, string>; name?: string }) {
  if (!club) return null
  const src = crestFor(club.id ?? club.clubId)
  const cls = `mag-badge${src ? ' mag-badge--crest' : ''}${className ? ` ${className}` : ''}`
  if (src) return <span className={cls} style={style} data-livery={club.pattern}><img src={src} alt={name ?? ''} width={139} height={181} loading="lazy" decoding="async" /></span>
  return <span className={cls} data-livery={club.pattern} style={style} aria-hidden="true">{club.initials}</span>
}
