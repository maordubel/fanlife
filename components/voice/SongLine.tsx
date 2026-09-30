import { t } from '@/lib/i18n'
import { songLine, type SongLineSurface } from '@/lib/voice/songLine'

/**
 * One small line: a song's title, "מהיציע", and the wiki page it came from (ONE RED WORLD
 * §3). Metadata only — there is no prop, field or slot here that could print a verse
 * (rule 12). Deterministic by `seed` (a date or a chapter id), and a screen renders it at
 * most once. Renders nothing when the registry has no song for the surface.
 */
export function SongLine({
  surface,
  seed,
  tone = 'paper',
  className = '',
}: {
  surface: SongLineSurface
  seed: string | number
  /** `ink` for a dark card (the LIFE recap) */
  tone?: 'paper' | 'ink'
  className?: string
}) {
  const song = songLine(surface, seed)
  if (!song) return null
  return (
    <p data-song-line={surface} className={`font-body text-[11px] leading-snug ${tone === 'ink' ? 'text-concrete' : 'text-muted'} ${className}`}>
      <span aria-hidden="true" className="me-1 text-red">♫</span>
      <a href={song.sourceUrl} target="_blank" rel="noopener noreferrer" className={`font-extrabold underline underline-offset-2 ${tone === 'ink' ? 'text-sheet decoration-sheet/40' : 'text-ink decoration-ink/30'}`}>
        <bdi>{song.title}</bdi>
      </a>
      <span> · {t('redworld.song.attribution')}</span>
    </p>
  )
}
