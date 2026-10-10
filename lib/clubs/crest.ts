/**
 * A club's own crest, where we hold one. Files live in `public/crests/` and each is recorded, with where it came from
 * and the hash it had when it arrived, in `content/manual/club-crests.json`. A club with no crest on file (Zrinjski) is
 * drawn as its initials in its colours, as before; nothing is substituted or invented.
 */
export const CRESTS: Readonly<Record<string, string>> = {
  'aek-athens': '/crests/aek-athens.png',
  celtic: '/crests/celtic.png',
  olympiacos: '/crests/olympiacos.png',
  panathinaikos: '/crests/panathinaikos.png',
  'st-pauli': '/crests/st-pauli.png',
  'hapoel-petah-tikva': '/crests/hapoel-petah-tikva.png',
  'hapoel-tel-aviv': '/crests/hapoel-tel-aviv.png',
}

export const crestFor = (clubId: string | null | undefined): string | null => (clubId ? CRESTS[clubId] ?? null : null)
