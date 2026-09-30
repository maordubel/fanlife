import type { MemoryObject } from '@/lib/game/memory'

/**
 * החפץ — six little archive objects, drawn rather than iconed.
 *
 * The prototype's "ARCHIVE OBJECTS" rule is that a closed board should not be twelve
 * identical tiles, and the cheap way to get there is decoration: pick a shape per card
 * so the wall looks varied. That is not what this is. `MemoryObject` is DERIVED from the
 * archive table the row came from (see `lib/game/memory.ts`), so the drawing is a
 * statement — a trophy card is backed by a `trophies` row, a clipping by a `moments`
 * row — and a source with no object gets no drawing rather than a borrowed one.
 *
 * It is also the only hint the closed board gives, and that is the point of keeping it
 * WEAK: the object separates the six things from the six dates, which tells a player
 * where to look without telling them which two belong together. The category — the fact
 * that actually pairs them — stays on the open face, where the existing board has always
 * put it.
 *
 * Everything is `currentColor` on a 24-unit box: one glyph serves the closed card at
 * 28px, the shelf at 20px and the fusion plate at 44px, and none of them has a colour of
 * its own to drift from the token the parent already set (rule 8).
 */
export function ObjectMark({
  object,
  className = '',
}: {
  object: MemoryObject
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      {object === 'trophy' && (
        <>
          <path d="M7 3h10v6a5 5 0 0 1-10 0V3Z" />
          <path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" />
          <path d="M12 14v4M8 21h8M9 18h6v3H9z" />
        </>
      )}
      {object === 'shirt' && (
        <>
          <path d="M9 3 4 5.5 5.5 10 8 9.2V21h8V9.2l2.5.8L20 5.5 15 3" />
          <path d="M9 3c.6 1.8 4.4 1.8 5 0" />
        </>
      )}
      {object === 'clipping' && (
        <>
          <path d="M3 5h18v14H3z" />
          <path d="M6 8h7v5H6zM16 8h2M16 11h2M16 14h2M6 16h12" />
        </>
      )}
      {object === 'ballot' && (
        <>
          <path d="M3 11h18v10H3z" />
          <path d="M8 11V3h8v8" />
          <path d="M10 6h4M10 8.5h4" />
          <path d="M9 11h6v2H9z" />
        </>
      )}
      {object === 'season' && (
        <>
          <path d="M3 6h18v15H3z" />
          <path d="M3 11h18M8 3v5M16 3v5" />
          <path d="M7 15h4" />
        </>
      )}
      {object === 'goal' && (
        <>
          <path d="M3 20V6h18v14" />
          <path d="M3 10h18M3 14h18M8 6v14M13 6v14M18 6v14" opacity=".55" />
          <circle cx="12" cy="17" r="2.6" />
        </>
      )}
      {object === 'ticket' && (
        <>
          <path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4Z" />
          <path d="M9 7v10" strokeDasharray="1.5 1.5" />
          <path d="M12 11h6M12 14h4" />
        </>
      )}
      {object === 'count' && (
        <>
          <path d="M4 20V9M9.5 20V5M15 20v-8M20.5 20V3" />
          <path d="M2 21h20" />
        </>
      )}
    </svg>
  )
}
