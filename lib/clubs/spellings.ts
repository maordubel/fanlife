/**
 * How each club's own archive spells the club in a match title — in the script it was recorded in.
 *
 * One table, read by the Question Forge (to know which side of a scoreline is "us") and by LIFE · RUSH
 * (to know whether a recorded night was home or away, and whether it named the rival). A club missing
 * here is still read through its English name; a spelling is added when an archive is seen to use it,
 * never guessed.
 */
export const CLUB_SPELLINGS: Readonly<Record<string, readonly string[]>> = {
  'aek-athens': ['ΑΕΚ', 'AEK'],
  'hapoel-tel-aviv': ['הפועל תל אביב', 'הפועל ת"א'],
  'hapoel-petah-tikva': ['הפועל פתח תקווה', 'הפועל פ"ת'],
  panathinaikos: ['Παναθηναϊκός', 'Panathinaikos'],
  olympiacos: ['Ολυμπιακός', 'Olympiacos', 'Olympiakos'],
  celtic: ['Celtic'],
  'st-pauli': ['St. Pauli', 'St Pauli'],
  'zrinjski-mostar': ['Zrinjski'],
  'raja-casablanca': ['Raja CA', 'Raja Casablanca', 'Raja Club Athletic'],
  'wydad-casablanca': ['Wydad AC', 'Wydad Casablanca', 'WAC Casablanca'],
  'al-ahly': ['Al Ahly', 'Al-Ahly'],
}
