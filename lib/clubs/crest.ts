/**
 * A club's own crest, where we hold one. Files live in `public/crests/` and each is recorded, with where it came from
 * and the hash it had when it arrived, in `content/manual/club-crests.json`. A club with no crest on file is
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
  'zrinjski-mostar': '/crests/zrinjski-mostar.png',
  'atalanta': '/crests/atalanta.png',
  'maccabi-haifa': '/crests/maccabi-haifa.png',
  'raja-casablanca': '/crests/raja-casablanca.png',
  'wydad-casablanca': '/crests/wydad-casablanca.png',
  'al-ahly': '/crests/al-ahly.png',
  'fenerbahce': '/universe-crests/fenerbahce.png',
  'borussia-dortmund': '/universe-crests/borussia-dortmund.png',
  'dinamo-zagreb': '/universe-crests/gnk-dinamo-zagreb.png',
  'hajduk-split': '/universe-crests/hnk-hajduk-split.png',
  'partizan-belgrade': '/universe-crests/fk-partizan-belgrade.png',
  'union-berlin': '/universe-crests/1fc-union-berlin.png',
  'paok': '/universe-crests/paok-thessaloniki.png',
  'leicester-city': '/crests/leicester-city.png',
}

export const crestFor = (clubId: string | null | undefined): string | null => (clubId ? CRESTS[clubId] ?? null : null)
