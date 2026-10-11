import zrinjski from '@/content/generated/away-days-zrinjski-mostar.json'
import aek from '@/content/generated/away-days-aek-athens.json'
import celtic from '@/content/generated/away-days-celtic.json'
import olympiacos from '@/content/generated/away-days-olympiacos.json'
import panathinaikos from '@/content/generated/away-days-panathinaikos.json'
import petah from '@/content/generated/away-days-hapoel-petah-tikva.json'

/** Each club's European journey file, keyed by club id. Club identity is data and lives here, outside the shared engine (tests/club-agnostic.test.ts). */
export const AWAY_FILES={'zrinjski-mostar':zrinjski,'aek-athens':aek,celtic,olympiacos,panathinaikos,'hapoel-petah-tikva':petah}
