/**
 * LIFE · the WATCH LAYER — the curated record. Every row names the repository file that holds its link.
 *
 * Read from (23.11.2026):
 *   · `lib/life/cutscenes.ts` — the Worker's historical cutscenes (the same file, byte for byte, in
 *     `maordubel/The-Worker`). `1986-championship` is the film the Worker opens at the end of the 1986 chapter.
 *     The period reel `1999-basket-context` is NOT here: its own record says it is not footage of the match.
 *   · `lib/life/history/days.ts` — the `films` rows of the day archive (17.5.2000 and 19.5.1999), sourced to Vikipoel.
 *   · `scripts/football-stories/channel/**` — the studio's own upload records (`published`, `video_id`, `full`).
 * `tests/life-watch.test.ts` opens every `source.file` and fails if the id is not in it. To add a row: record the
 * link in its home file first, then cite that file here. Never type an id that no file holds.
 */
import type {HighlightsMoment, OurFilmMoment, TransitionMoment} from './types'

const HTA = 'hapoel-tel-aviv'
const CUTS = 'lib/life/cutscenes.ts', DAYS = 'lib/life/history/days.ts', CH = 'scripts/football-stories/channel'
const hl = (id: string, youtubeId: string, title: string, matchDate: string | null, chapter: string | null, status: HighlightsMoment['status'], summary: boolean, file: string, note: string): HighlightsMoment =>
  ({kind: 'highlights', id, clubId: HTA, youtubeId, title, titleLocale: 'he', matchDate, chapter, status, summary, source: {file, note}})

export const HIGHLIGHTS: readonly HighlightsMoment[] = [
  hl('1986-championship', 'dFykPEa8NAE', 'משחק האליפות', '1986-05-24', '1986', 'verified', true, CUTS, 'CUTSCENES[1986-championship]: the full broadcast summary, on the archive row of 24.5.1986; opens once at the end of the 1986 chapter'),
  hl('1993-cup', 'I5FHT27dRgY', 'גמר הגביע — ארכיון', null, '1993-cup', 'verified', true, CUTS, 'CUTSCENES[1993-cup]: the record gives the chapter and no day'),
  hl('2000-title', 'pdQLDp_-Xgo', 'האליפות — ארכיון', '2000-05-13', '2000-title', 'verified', true, CUTS, 'CUTSCENES[2000-title]: tied by its record to the archive day 13.5.2000'),
  hl('2000-penalties', 'EGlBnUQN5AQ', 'הפנדלים — ארכיון', '2000-05-17', '2000-double', 'verified', false, CUTS, 'CUTSCENES[2000-penalties]: the shoot-out of 17.5.2000, the one film that chapter opens by itself'),
  hl('2000-double', 'RO14bGFcD-Q', 'גמר הגביע — ארכיון', '2000-05-17', '2000-double', 'optional', true, CUTS, 'CUTSCENES[2000-double]: the same id as the day archive row film-00-full'),
  hl('film-00-first', '36smQxcDzmQ', 'השער הראשון', '2000-05-17', null, 'archive-row', false, DAYS, 'day 2000-05-17, films[film-00-first], source Vikipoel'),
  hl('film-00-theirs', 'JXknFCs6nrg', 'שני השערים של בית"ר', '2000-05-17', null, 'archive-row', false, DAYS, 'day 2000-05-17, films[film-00-theirs], source Vikipoel'),
  hl('film-00-pens', 'RvyReKDwCC0', 'הפנדלים', '2000-05-17', null, 'archive-row', false, DAYS, 'day 2000-05-17, films[film-00-pens], source Vikipoel'),
  hl('film-00-fans', '3jT_ULOU09U', 'ראיון אוהדים אחרי המשחק', '2000-05-17', null, 'archive-row', false, DAYS, 'day 2000-05-17, films[film-00-fans], source Vikipoel'),
  hl('film-99-full', '0z6DE0LL-2g', 'התקציר המלא של הגמר', '1999-05-19', null, 'archive-row', true, DAYS, 'day 1999-05-19, films[film-99-full], source Vikipoel'),
  hl('film-99-goal', 'HIycf4LjzKY', 'השער של שלום תקוה', '1999-05-19', null, 'archive-row', false, DAYS, 'day 1999-05-19, films[film-99-goal], source Vikipoel'),
]

const film = (id: string, clubId: string, youtubeId: string, form: OurFilmMoment['form'], title: string, matchDates: string[], season: string | null, publishedOn: string | null, file: string, note: string): OurFilmMoment =>
  ({kind: 'our-film', id, clubId, youtubeId, form, title, titleLocale: 'en', matchDates, season, publishedOn, source: {file, note}})

export const OUR_FILMS: readonly OurFilmMoment[] = [
  film('hapoel-five-days-in-may', HTA, 'ckPwO6Xr8sI', 'film', 'Five Days in May: Hapoel Tel Aviv’s Double', ['2000-05-13', '2000-05-17'], '1999/00', null, `${CH}/shorts-2026-11-02.json`, '`full` of both Hapoel Shorts, whose descriptions name 13 and 17 May 2000; the title is the pilot’s (channel/pilot/youtube.json)'),
  film('celtic-road-to-seville', 'celtic', 'b5eOGZzA-ec', 'film', 'Eighty Thousand to Seville: Celtic’s Road to the 2003 UEFA Cup Final', [], '2002/03', null, `${CH}/shorts-2026-11-02.json`, '`full` of both Celtic Shorts; title from channel/celtic-2002-03/upload-meta.json; season from the dossier celtic-2002-03.json'),
  film('olympiacos-2023-24', 'olympiacos', '-ozy76t1ByM', 'film', 'Three Goals Down at Home. Then They Won the Whole Thing.', ['2024-05-29'], '2023/24', null, `${CH}/olympiacos-2023-24/youtube.json`, '`video_id`; its description opens on the final of 29 May 2024'),
  film('olympiacos-maccabi-2024', 'olympiacos', 'tfnc4EziPxc', 'film', 'Three Goals Down at Home. 370 People Watching. Then This. | Olympiacos v Maccabi Tel Aviv 2024', ['2024-03-07'], '2023/24', '2026-11-03', `${CH}/olympiacos-maccabi-2024/upload-meta.json`, '`published.film`; its description opens on the first leg of 7 March 2024'),
  film('olympiacos-short-370', 'olympiacos', 'w3k37oSus50', 'short', '1–4 down at home. Then 6–1 in front of 370 people. Olympiacos 2024 #Shorts', [], '2023/24', null, `${CH}/shorts-2026-11-03.json`, 'olympiacos-comeback-370 `video_id`'),
  film('olympiacos-short-tzolakis', 'olympiacos', 'YFVqbXFu71w', 'short', 'Three penalties. Three saves. Tzolakis in Istanbul #Shorts', [], '2023/24', null, `${CH}/shorts-2026-11-03.json`, 'olympiacos-tzolakis-istanbul `video_id`'),
  film('olympiacos-short-116', 'olympiacos', 'XRuwwOuALeM', 'short', 'The 116th minute that gave Greece its first European trophy #Shorts', [], '2023/24', null, `${CH}/shorts-2026-11-03.json`, 'olympiacos-final-116 `video_id`'),
  film('olympiacos-maccabi-short-1', 'olympiacos', '7cGCXjXyvxI', 'short', 'Three Goals Down at Home. 370 People Watching. Then This. | Olympiacos v Maccabi Tel Aviv 2024 · Short', [], '2023/24', '2026-11-03', `${CH}/olympiacos-maccabi-2024/upload-meta.json`, '`published.shorts[0]`; the record does not say which title in shorts.json this id carries, so it is labelled with its film’s title'),
  film('olympiacos-maccabi-short-2', 'olympiacos', '76T4BwCfVIA', 'short', 'Three Goals Down at Home. 370 People Watching. Then This. | Olympiacos v Maccabi Tel Aviv 2024 · Short', [], '2023/24', '2026-11-03', `${CH}/olympiacos-maccabi-2024/upload-meta.json`, '`published.shorts[1]`; the record does not say which title in shorts.json this id carries, so it is labelled with its film’s title'),
  film('olympiacos-maccabi-short-3', 'olympiacos', 'KaxGsZgj2oI', 'short', 'Three Goals Down at Home. 370 People Watching. Then This. | Olympiacos v Maccabi Tel Aviv 2024 · Short', [], '2023/24', '2026-11-03', `${CH}/olympiacos-maccabi-2024/upload-meta.json`, '`published.shorts[2]`; the record does not say which title in shorts.json this id carries, so it is labelled with its film’s title'),
  film('zrinjski-az-2023', 'zrinjski-mostar', 'Vlbj4twpbxE', 'film', 'Nil–Three at Half-Time. Then This. | Zrinjski 4–3 AZ Alkmaar', ['2023-09-21'], '2023/24', '2026-11-03', `${CH}/zrinjski-az-2023/upload-meta.json`, '`published.film`; its description opens on 21 September 2023'),
  film('zrinjski-az-2023-short', 'zrinjski-mostar', 'SpAE5gLJ7lY', 'short', 'Nil–three at half-time. Then this. #Zrinjski #Shorts', [], '2023/24', '2026-11-03', `${CH}/zrinjski-az-2023/upload-meta.json`, '`published.short`; title from channel/zrinjski-az-2023/shorts.json'),
  film('real-madrid-in-athens', 'aek-athens', 'AWzmhu7R3hE', 'film', '54 Years Without a Win: Real Madrid in Athens | Before AEK v Real Madrid', [], null, '2026-11-04', `${CH}/real-madrid-athens/upload-meta.json`, '`published.film`; a film about a city’s record, filed under AEK because its own title names the AEK match; tied to no single night'),
  film('real-madrid-in-athens-short', 'aek-athens', 'jFABdCJfsDM', 'short', '54 Years Without a Win: Real Madrid in Athens | Before AEK v Real Madrid · Short', [], null, '2026-11-04', `${CH}/real-madrid-athens/upload-meta.json`, '`published.short`; the record gives the Short no title of its own, so it is labelled with its film’s title'),
]

const TR = 'lib/life/transitions.ts'
const tr = (id: string, use: TransitionMoment['use'], ms: number): TransitionMoment =>
  ({kind: 'transition', id, clubId: HTA, use, mp4: `/life/transitions/${id}.mp4`, webm: `/life/transitions/${id}.webm`, ms, source: {file: TR, note: `TRANSITIONS[${id}]: one of the clips the owner supplied on 30.9.2026 for the Worker; a cut, not a fact`}})

/**
 * The interstitials that exist today: the Worker's own clips, so Hapoel Tel Aviv only. Every other club has none
 * until the studio delivers the clips the story asks for (`scripts/football-stories/life/transition-requests.json`).
 */
export const TRANSITION_CLIPS: readonly TransitionMoment[] = [
  tr('enter-stadium-a', 'matchday-opener', 2917),
  tr('enter-stand', 'into-the-ground', 2417),
  tr('take-ticket', 'ticket', 1750),
]
