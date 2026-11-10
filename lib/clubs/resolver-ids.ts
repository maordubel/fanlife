/** The repository packs, in the order `providers` (lib/clubs/providers.ts) declares them — checked against it in tests/clubs/providers-index.test.ts.
 * A file of its own so modules the resolver itself imports (the staged line, lib/research/staged) can read it without a cycle. */
export const STATIC_CLUB_IDS:readonly string[]=['hapoel-tel-aviv','zrinjski-mostar','hapoel-petah-tikva','panathinaikos','aek-athens','celtic','st-pauli','olympiacos','raja-casablanca','wydad-casablanca','al-ahly']
