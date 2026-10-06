/**
 * A keepsake, drawn. The painted props of the archive stand in for the things a life keeps — a ticket is a ticket;
 * scarves are left out, they carry one club's crest. Only artwork that scans clean of yellow is used; a keepsake without a drawing is simply text.
 */
const ART: Record<string, string> = {
  ticket: 'propTicketsPair',
  stub: 'propTicketsPair',
  sheet: 'propPaperFolded',
  armband: 'propNote',
  programme: 'propNewspaper',
}

export const keepArt = (id: string): string | null => (ART[id] ? `/life/art/${ART[id]}.webp` : null)

export function KeepArt({id, tilt = 0}: {id: string; tilt?: number}) {
  const src = keepArt(id)
  if (!src) return null
  // eslint-disable-next-line @next/next/no-img-element -- palette artwork is shipped as measured; the optimiser would re-encode it
  return <img className="keepArt" src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" style={{transform: `rotate(${tilt}deg)`}} />
}
