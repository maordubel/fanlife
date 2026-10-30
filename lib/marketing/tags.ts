/**
 * Smart hashtags for the social plan (v4, owner 29.10.2026). One brand tag, the club's own supporters' tags, and the
 * topic — at most eight, because a wall of generic tags reads as spam and Instagram ranks 3–8 relevant ones best.
 * Shared by the plan builder (scripts/marketing/build-plan.mts) and the live slots (lib/marketing/live.ts).
 */
export const CLUB_TAGS: Record<string, string[]> = {
  'hapoel-tel-aviv': ['#HapoelTelAviv', '#Hapoel', '#IsraeliFootball'],
  'hapoel-petah-tikva': ['#HapoelPetahTikva', '#HPT', '#IsraeliFootball'],
  olympiacos: ['#Olympiacos', '#Thrylos', '#SuperLeagueGreece'],
  panathinaikos: ['#Panathinaikos', '#PAO', '#SuperLeagueGreece'],
  'aek-athens': ['#AEK', '#AEKAthens', '#SuperLeagueGreece'],
  celtic: ['#Celtic', '#CelticFC', '#COYBIG', '#SPFL'],
  'st-pauli': ['#FCStPauli', '#StPauli', '#Bundesliga'],
  'zrinjski-mostar': ['#Zrinjski', '#HSKZrinjski', '#ZrinjskiMostar'],
}
export const TOPIC_TAGS = {
  otd: ['#OnThisDay', '#FootballHistory', '#RetroFootball'],
  quiz: ['#FootballQuiz', '#FootballTrivia'],
  nerds: ['#FootballQuiz', '#FootballTrivia', '#FootballNerd'],
  fact: ['#FootballFacts', '#FootballHistory'],
  guess: ['#GuessTheScore', '#FootballQuiz', '#RetroFootball'],
  year: ['#GuessTheYear', '#FootballTrivia', '#FootballHistory'],
  shirt: ['#FootballShirts', '#ClassicFootballShirts', '#VintageKits'],
  derby: ['#Derby', '#FootballRivalry'],
  europe: ['#EuropeanNights', '#UEFA'],
  final: ['#CupFinal', '#Trophy'],
  goals: ['#Goals', '#FootballMemories'],
  gate: ['#FootballGames', '#FootballFans'],
  rumble: ['#FantasyFootball', '#DreamTeam', '#FootballGames'],
  legends: ['#FootballManager', '#Legends', '#FootballGames'],
  love: ['#Ultras', '#FootballFans', '#Terrace'],
  family: ['#FatherAndSon', '#FootballFamily', '#FootballMemories'],
  results: ['#FullTime', '#MatchDay'],
  fixtures: ['#MatchDay', '#NextUp'],
} as const
export type Topic = keyof typeof TOPIC_TAGS

/** #FANLIFE first, then each club's tags (the first three clubs), then the topics — de-duplicated, at most `max`. */
export function smartTags(o: {clubs?: readonly string[]; topics?: readonly Topic[]; brand?: string; max?: number}): string {
  const out: string[] = [o.brand ?? '#FANLIFE']
  const clubs = (o.clubs ?? []).slice(0, 3)
  // one club: all its tags; several: the first tag of each (a list of nine club tags is no longer smart)
  for (const c of clubs) out.push(...(clubs.length === 1 ? CLUB_TAGS[c] ?? [] : (CLUB_TAGS[c] ?? []).slice(0, 1)))
  for (const t of o.topics ?? []) out.push(...TOPIC_TAGS[t])
  return [...new Set(out)].slice(0, o.max ?? 8).join(' ')
}
