/**
 * CAMPAIGNS (owner, 24.11.2026: "a full campaign area — reports, building a new campaign from simple templates, running
 * it, split by topic, with full automation of publishing and graphics"). One library for three users:
 *   · the 30-day plan (scripts/marketing/plan-m30.mts) builds its campaigns here;
 *   · the control room's Campaigns area previews and launches a campaign from the same templates;
 *   · the report reads the campaign id back from each post (main.campaign) and from the visits it brought (utm_campaign).
 * A campaign is a set of rows in marketing.posts. Its pictures are drawn by the v4 pipeline (kit.t), its captions are
 * written here, and the marketing machine sends them. Nothing here touches the database: worker_marketing_campaign_add does.
 */

export const SITE = 'https://fanlife.dubelteam.com'

export const TOPICS = [
  {key: 'club', label: 'Clubs', hint: 'One club at a time, in its colours and its language'},
  {key: 'opening', label: 'New clubs', hint: 'Teaser, opening night, the first week'},
  {key: 'shop', label: 'Shop products', hint: 'A club’s products, one at a time'},
  {key: 'sale', label: 'Sales & Black Friday', hint: 'Announces the sale saved in the shop'},
  {key: 'youtube', label: 'YouTube', hint: 'Club films and the channel'},
  {key: 'legends', label: 'Legends Manager', hint: 'The big game'},
  {key: 'rumble', label: 'Royal Rumble', hint: 'All-time five on a budget'},
  {key: 'market', label: 'The market', hint: 'Supporters sell to supporters'},
  {key: 'kits', label: 'Kit archive', hint: 'Every shirt, every era'},
  {key: 'album', label: 'The Album', hint: 'The daily envelope, codes, club wings'},
] as const
export type Topic = typeof TOPICS[number]['key']

/** a club as the campaigns speak about it. Numbers are the archive's own (club packs, 24.11.2026); the local line is the
 *  club's own language (rule: Greek clubs carry Greek on screen); Israeli clubs stay English only (owner, 9.11.2026). */
export type ClubCard = {id: string; name: string; crestName: string; nickname?: string; city: string; local?: string; tags: string
  playlist?: string; film?: string; products?: boolean; stats: {matches: number; players: number; shirts: number; from: number}}
export const CLUB_CARDS: Record<string, ClubCard> = {
  'panathinaikos': {id: 'panathinaikos', name: 'Panathinaikos', crestName: 'Panathinaikos', nickname: 'The Greens', city: 'Athens · Greece', local: 'Για όσους μεγάλωσαν πράσινοι.',
    tags: '#FANLIFE #Panathinaikos #Παναθηναϊκός #PAO #GreekFootball #FootballHistory', playlist: 'PLByxmMkC_mnI', products: true, stats: {matches: 1103, players: 544, shirts: 130, from: 1933}},
  'olympiacos': {id: 'olympiacos', name: 'Olympiacos', crestName: 'Olympiacos', nickname: 'The Legend', city: 'Piraeus · Greece', local: 'Για όσους μεγάλωσαν ερυθρόλευκοι.',
    tags: '#FANLIFE #Olympiacos #Ολυμπιακός #Thrylos #GreekFootball #FootballHistory', playlist: 'PLDnPSjoj59AM', products: true, stats: {matches: 732, players: 1116, shirts: 137, from: 1925}},
  'aek-athens': {id: 'aek-athens', name: 'AEK Athens', crestName: 'AEK Athens', nickname: 'The Double-Headed Eagle', city: 'Athens · Greece', local: 'Για όσους μεγάλωσαν κιτρινόμαυροι.',
    tags: '#FANLIFE #AEK #AEKAthens #ΑΕΚ #GreekFootball #FootballHistory', playlist: 'PLaWmFpNtD7Qw', products: true, stats: {matches: 3414, players: 1205, shirts: 139, from: 1924}},
  'celtic': {id: 'celtic', name: 'Celtic', crestName: 'Celtic', nickname: 'The Bhoys', city: 'Glasgow · Scotland',
    tags: '#FANLIFE #Celtic #CelticFC #TheBhoys #ScottishFootball #FootballHistory', playlist: 'PLBYu9GJD6VSc', products: true, stats: {matches: 6281, players: 1381, shirts: 157, from: 1888}},
  'zrinjski-mostar': {id: 'zrinjski-mostar', name: 'Zrinjski Mostar', crestName: 'Zrinjski Mostar', nickname: 'The Nobles', city: 'Mostar · Bosnia', local: 'Za sve koji su odrasli uz Plemiće.',
    tags: '#FANLIFE #Zrinjski #HSKZrinjski #Mostar #BalkanFootball #FootballHistory', playlist: 'PLAYwmWxiqQJI', products: true, stats: {matches: 987, players: 255, shirts: 63, from: 1993}},
  'hapoel-tel-aviv': {id: 'hapoel-tel-aviv', name: 'Hapoel Tel Aviv', crestName: 'Hapoel Tel Aviv', nickname: 'The Reds', city: 'Tel Aviv',
    tags: '#FANLIFE #HapoelTelAviv #Hapoel #FootballHistory #RetroFootball', playlist: 'PLY5FIwvZkgyA', products: true, stats: {matches: 3161, players: 666, shirts: 103, from: 1949}},
  'hapoel-petah-tikva': {id: 'hapoel-petah-tikva', name: 'Hapoel Petah Tikva', crestName: 'Hapoel Petah Tikva', nickname: 'The Malabs', city: 'Petah Tikva',
    tags: '#FANLIFE #HapoelPetahTikva #FootballHistory #RetroFootball', playlist: 'PLKwv_fWzbcbg', stats: {matches: 3010, players: 367, shirts: 84, from: 1986}},
  'st-pauli': {id: 'st-pauli', name: 'FC St. Pauli', crestName: 'FC St. Pauli', nickname: 'The Kiezkicker', city: 'Hamburg · Germany', local: 'Für alle, die am Millerntor groß geworden sind.',
    tags: '#FANLIFE #FCStPauli #StPauli #Millerntor #Bundesliga #FootballHistory', stats: {matches: 1476, players: 608, shirts: 107, from: 1956}},
  'atalanta': {id: 'atalanta', name: 'Atalanta', crestName: 'Atalanta', nickname: 'La Dea', city: 'Bergamo · Italy', local: 'Per chi è cresciuto nerazzurro.',
    tags: '#FANLIFE #Atalanta #LaDea #Bergamo #SerieA #FootballHistory', film: 'ft9K5YywahE', stats: {matches: 4050, players: 957, shirts: 176, from: 1913}},
  'raja-casablanca': {id: 'raja-casablanca', name: 'Raja Casablanca', crestName: 'Raja Casablanca', nickname: 'The Green Eagles', city: 'Casablanca · Morocco', local: 'Pour ceux qui ont grandi en vert.',
    tags: '#FANLIFE #RajaCasablanca #Raja #Botola #MoroccanFootball #FootballHistory', stats: {matches: 122, players: 553, shirts: 129, from: 1961}},
  'fenerbahce': {id: 'fenerbahce', name: 'Fenerbahçe', crestName: 'Fenerbahçe', nickname: 'The Yellow Canaries', city: 'Istanbul · Türkiye', local: 'Sarı lacivert büyüyenler için.',
    tags: '#FANLIFE #Fenerbahçe #Fenerbahce #SüperLig #TurkishFootball #FootballHistory', stats: {matches: 1957, players: 758, shirts: 53, from: 1906}},
  'partizan-belgrade': {id: 'partizan-belgrade', name: 'Partizan Belgrade', crestName: 'Partizan Belgrade', nickname: 'The Black-Whites', city: 'Belgrade · Serbia', local: 'Za sve koji su odrasli crno-beli.',
    tags: '#FANLIFE #Partizan #FKPartizan #Grobari #BalkanFootball #FootballHistory', stats: {matches: 2950, players: 624, shirts: 36, from: 2007}},
}
/** the clubs open to the public on 24.11.2026 (the clubs page). Fenerbahçe and Partizan open this week (owner) — their
 *  opening campaign waits for the club page itself (hold `open:<id>`), so no post ever sends a fan to a closed door. */
export const OPEN_CLUBS = ['panathinaikos', 'olympiacos', 'aek-athens', 'celtic', 'zrinjski-mostar', 'hapoel-tel-aviv', 'st-pauli', 'atalanta', 'hapoel-petah-tikva', 'raja-casablanca']
export const OPENING_SOON = ['fenerbahce', 'partizan-belgrade']

const n = (x: number) => x.toLocaleString('en-GB')
/** every link a campaign posts carries the campaign, so the Audience desk and the campaign report can count its visits */
export const track = (path: string, campaign: string) => `${SITE}${path}${path.includes('?') ? '&' : '?'}utm_source=social&utm_campaign=${encodeURIComponent(campaign)}`

export type Main = {app: 'fanlife'; label: string; tags: string; hook: string; body: string; url?: string; visual: string; comment?: string
  kit: {t: string; data: Record<string, unknown>; to: string[]}; campaign: {id: string; topic: Topic; name: string}; fill?: {hook?: string; body?: string}; hold?: string; launch?: boolean}
/** a row for marketing.posts: `at` is Athens wall time 'YYYY-MM-DD HH:MM' */
export type Row = {at: string; format: 'post'; main: Main; held?: boolean}
type C = {id: string; topic: Topic; name: string}

// ── the posts: one writer per track, each a real picture template (v4) and a caption with a hook and one ask ───────────
export function clubPost(c: ClubCard, k: C, opts: {kicker?: string; headline?: string; hook?: string; teaser?: boolean} = {}): Omit<Main, 'campaign'> {
  return {app: 'fanlife', label: `Club · ${c.name}`, tags: c.tags,
    hook: opts.hook || `${c.name} supporters: your whole club is already in here. 🏟️`,
    body: `${n(c.stats.matches)} matches. ${n(c.stats.players)} players. ${c.stats.shirts} shirts.${c.local ? `\n${c.local}` : ''}\n\nPlay its games, open its archive, find your season. Free.\nTag the mate you went with 👇`,
    comment: `Which season did you start going? Comment the year 👇`,
    url: track(`/clubs/${c.id}`, k.id), visual: 'L-CLUB: crest, nickname, the local line, three archive numbers, the club home in a phone.',
    kit: {t: 'L-CLUB', data: {club: {id: c.id, name: c.name}, crestName: c.crestName, name: c.name, nickname: c.nickname, city: c.city, local: c.local, kicker: opts.kicker,
      headline: opts.headline || 'Your club is already here.', ...(opts.teaser ? {noScreen: true, url: 'fanlife.dubelteam.com/clubs'} : {}), stats: [{n: n(c.stats.matches), label: 'Matches'}, {n: n(c.stats.players), label: 'Players'}, {n: c.stats.shirts, label: 'Shirts'}]}, to: ['feed', 'story']}}
}
export function shopPost(c: ClubCard | null, k: C, angle: 'club' | 'gift' = 'club'): Omit<Main, 'campaign'> {
  const who = c ? `${c.name} ` : ''
  const hook = angle === 'gift' ? `A gift for the ${who}supporter who has everything: {name}. 🎁` : `New in the FAN LIFE shop for ${c ? c.name + ' supporters' : 'every supporter'}: {name}.`
  return {app: 'fanlife', label: c ? `Shop · ${c.name}` : 'Shop', tags: (c?.tags || '#FANLIFE #FootballShirts') + ' #FootballGifts',
    hook: angle === 'gift' ? `A gift for the ${who}supporter who has everything. 🎁` : `New in the FAN LIFE shop${c ? ' for ' + c.name + ' supporters' : ''}.`,
    body: `Fan art, no official crest — made for the terrace, printed to order and shipped to your door.\n\nWho are you getting it for? Tag them 👇`,
    fill: {hook, body: `{product} — from {price}.\nFan art, no official crest — made for the terrace, printed to order and shipped to your door.\n\nWho are you getting it for? Tag them 👇`},
    url: track(c ? `/shop?club=${c.id}` : '/shop', k.id), visual: 'L-SHOP: a live product of this club, its own mock-up as the hero.',
    kit: {t: 'L-SHOP', data: {random: true, subject: c?.id, kicker: angle === 'gift' ? 'Christmas · the FAN LIFE shop' : undefined}, to: ['feed', 'story']}}
}
export function salePost(c: ClubCard | null, k: C, phase: 'soon' | 'on' | 'last', defaults: {label: string; percent: number; ends: string}): Omit<Main, 'campaign'> {
  const head = {soon: 'starts {ends}', on: 'is on', last: 'ends today'}[phase]
  return {app: 'fanlife', label: `Sale · ${defaults.label}`, tags: '#FANLIFE #BlackFriday #FootballGifts #FootballShirts' + (c ? ' ' + c.tags.split(' ').slice(1, 3).join(' ') : ''),
    hook: `${defaults.label} at the FAN LIFE shop ${head.replace('{ends}', defaults.ends)}: up to ${defaults.percent}% off. 🔥`,
    body: `Every club, every design — fan art printed to order and shipped to your door.\nThe price is already cut: no code at checkout.\n\nSend this to the one you’re buying for 👇`,
    fill: {hook: `{label} at the FAN LIFE shop ${head}: up to {percent}% off. 🔥`.replace('{label}', defaults.label)},
    url: track(c ? `/shop?club=${c.id}` : '/shop', k.id), visual: 'L-SALE: the cut in Ultra, a live product on its stage, the last day on a stamp.',
    kit: {t: 'L-SALE', data: {...defaults, phase, subject: c?.id, needsSale: true}, to: ['feed', 'story']}}
}
export function filmPost(c: ClubCard, k: C): Omit<Main, 'campaign'> {
  if (!c.film && !c.playlist) return channelPost(c, k) // no film of its own yet: the channel, never another club's story
  return {app: 'fanlife', label: `Film · ${c.name}`, tags: c.tags + ' #FootballDocumentary',
    hook: `A ${c.name} story, told properly. ▶️`, fill: {hook: `▶️ {title}`, body: `A ${c.name} story from FanLife: Football Stories — free on YouTube.\n\nWatch it, then send it to the one who was there 👇\nSubscribe so the next one finds you.`},
    body: `From FanLife: Football Stories — free on YouTube.\n\nWatch it, then send it to the one who was there 👇\nSubscribe so the next one finds you.`,
    url: c.film ? `https://youtu.be/${c.film}` : undefined, visual: 'L-FILM: a frame from the film itself, the play button in the club’s colour.',
    kit: {t: 'L-FILM', data: {club: {id: c.id}, ...(c.film ? {yt: c.film} : {playlist: c.playlist}), kicker: 'Now on YouTube', cta: 'Watch the film'}, to: ['feed', 'story']}}
}
/** a film from one of the channel's themed playlists (Ultras & Atmosphere, CLASSIFIED, Around the Ball…) — the research's
 *  best performers on YouTube were the atmosphere Shorts and the Greek films (Studio, 28 days to 22.11.2026) */
export const PLAYLISTS: Record<string, {name: string; id: string; tags: string}> = {
  ultras: {name: 'Ultras & Atmosphere', id: 'PLdiv4r6uAEQQ', tags: '#FANLIFE #Ultras #FootballAtmosphere #Tifo #FootballFans'},
  classified: {name: 'CLASSIFIED', id: 'PLde9j-4kXKeQ', tags: '#FANLIFE #FootballStories #FootballHistory #Classified'},
  strange: {name: 'Around the Ball', id: 'PLN_98UgeJXto', tags: '#FANLIFE #FootballFacts #FootballHistory #UselessFacts'},
  worldcup: {name: 'World Cup Stories', id: 'PLTIDT9L3Vx7Q', tags: '#FANLIFE #WorldCup #FootballHistory #FootballStories'},
}
export function playlistPost(key: string, k: C): Omit<Main, 'campaign'> {
  const pl = PLAYLISTS[key] || PLAYLISTS.ultras!
  return {app: 'fanlife', label: `Film · ${pl.name}`, tags: pl.tags,
    hook: `▶️ ${pl.name} — free on YouTube.`, fill: {hook: '▶️ {title}', body: `From the ${pl.name} series on FanLife: Football Stories — free on YouTube.

Send it to the one who’d have been there 👇
Subscribe so the next one finds you.`},
    body: `From FanLife: Football Stories — free on YouTube.

Send it to the one who’d have been there 👇
Subscribe so the next one finds you.`,
    visual: 'L-FILM: a frame from the film itself.', kit: {t: 'L-FILM', data: {playlist: pl.id, kicker: pl.name, cta: 'Watch the film'}, to: ['feed', 'story']}}
}
/** FOOTBALL FAIRY TALES (owner, 24.11.2026: "Reels and viral things from Good Morning and Good Night, in the club's own
 *  language, smart hooks, linked to YouTube, perfect branding"). The film is found at drawing time in the language's own
 *  playlist by its title, so a scheduled episode is used the moment it is public. */
type Tale = {list: string; gm: string; gn: string; voc: string; lang: 'el' | 'he' | 'en'; title?: {gm: string; gn: string}}
export const FAIRY_TALES: Record<string, Tale> = {
  'panathinaikos': {list: 'PLZ444_YkvCCE', gm: 'Καλημέρα, Παναθηναϊκ', gn: 'Καληνύχτα, Παναθηναϊκ', voc: 'Παναθηναϊκέ', lang: 'el'},
  'olympiacos': {list: 'PLZ444_YkvCCE', gm: 'Καλημέρα, Ολυμπιακ', gn: 'Καληνύχτα, Ολυμπιακ', voc: 'Ολυμπιακέ', lang: 'el'},
  'aek-athens': {list: 'PLZ444_YkvCCE', gm: 'Καλημέρα, ΑΕΚ', gn: 'Καληνύχτα, ΑΕΚ', voc: 'ΑΕΚ', lang: 'el'},
  'hapoel-tel-aviv': {list: 'PLHUPZxGDyO1Q', gm: 'בוקר טוב, הפועל', gn: 'לילה טוב, הפועל', voc: 'הפועל תל אביב', lang: 'he', title: {gm: 'Good Morning, Hapoel Tel Aviv', gn: 'Good Night, Hapoel Tel Aviv'}},
  'celtic': {list: 'PLMhV68httZF4', gm: 'Good Morning, Celtic', gn: 'Good Night, Celtic', voc: 'Celtic', lang: 'en'},
}
const COLOUR_EL: Record<string, string> = {'panathinaikos': 'πράσινο', 'olympiacos': 'ερυθρόλευκο', 'aek-athens': 'κιτρινόμαυρο'}
export function fairyPost(c: ClubCard, k: C, when: 'gm' | 'gn'): Omit<Main, 'campaign'> | null {
  const t = FAIRY_TALES[c.id]
  if (!t) return null
  const words = t.lang === 'el'
    ? when === 'gm' ? {hook: `☀️ Καλημέρα, ${t.voc}! Ένα ποδοσφαιρικό παραμύθι για τον μικρό σου ${COLOUR_EL[c.id] || ''} οπαδό.`, body: 'Βάλ’ το στο παιδί πριν φύγετε για το γήπεδο — δωρεάν στο YouTube.\n\nΣτείλ’ το σε έναν μπαμπά της κερκίδας 👇', kicker: 'Ποδοσφαιρικά Παραμύθια', cta: 'Δες το τώρα'}
      : {hook: `🌙 Καληνύχτα, ${t.voc}! Ένα ποδοσφαιρικό παραμύθι πριν τον ύπνο.`, body: 'Μετράμε αστέρια μαζί με τους θρύλους της ομάδας — δωρεάν στο YouTube.\n\nΣτείλ’ το σε όποιον βάζει παιδί για ύπνο απόψε 👇', kicker: 'Ποδοσφαιρικά Παραμύθια', cta: 'Δες το τώρα'}
    : t.lang === 'he'
      ? when === 'gm' ? {hook: `⚽ בוקר טוב, ${t.voc}! אגדת כדורגל לילדים ולאוהדים.`, body: 'שימו לקטנים לפני שיוצאים למשחק — בחינם ביוטיוב.\n\nשלחו לאבא אדום אחד 👇', kicker: 'Football Fairy Tales', cta: 'Watch now'}
        : {hook: `💤 לילה טוב, ${t.voc}! אגדת כדורגל לפני השינה.`, body: 'סופרים כוכבים עם האגדות של המועדון — בחינם ביוטיוב.\n\nשלחו למי שמשכיב ילדים הערב 👇', kicker: 'Football Fairy Tales', cta: 'Watch now'}
      : when === 'gm' ? {hook: `⚽ Good morning, ${t.voc}! A football fairy tale for the little supporter in your house.`, body: 'Put it on before you leave for the game — free on YouTube.\n\nSend it to a dad from the terrace 👇', kicker: 'Football Fairy Tales', cta: 'Watch now'}
        : {hook: `🌙 Good night, ${t.voc}. A bedtime football story — counting stars with the club’s legends.`, body: 'Free on YouTube.\n\nSend it to whoever is putting a little one to bed tonight 👇', kicker: 'Football Fairy Tales', cta: 'Watch now'}
  return {app: 'fanlife', label: `Fairy Tales · ${c.name} · ${when === 'gm' ? 'Good Morning' : 'Good Night'}`, tags: c.tags + ' #FootballFairyTales #KidsFootball',
    hook: words.hook, body: `${words.body}
Subscribe: FanLife: Football Stories.`, visual: 'L-FILM: a frame of the episode itself, in the club’s own language.',
    kit: {t: 'L-FILM', data: {club: {id: c.id}, playlist: t.list, match: when === 'gm' ? t.gm : t.gn, kicker: words.kicker, cta: words.cta, ...(t.title ? {title: t.title[when]} : {})}, to: ['feed', 'story']}}
}
export function channelPost(c: ClubCard | null, k: C): Omit<Main, 'campaign'> {
  return {app: 'fanlife', label: 'YouTube · Football Stories', tags: '#FANLIFE #FootballStories #FootballDocumentary #FootballHistory',
    hook: 'Football stories nobody else tells. Free, every week. ▶️',
    body: `Club documentaries, the strangest true stories, the nights you still talk about.\nFanLife: Football Stories on YouTube.\n\nSubscribe — and tell us which club’s story we tell next 👇`,
    url: 'https://www.youtube.com/@FanLifeFootballStories?sub_confirmation=1', visual: 'L-YT: three frames from the club’s own films, Subscribe.',
    kit: {t: 'L-YT', data: {club: c ? {id: c.id} : undefined, playlist: c?.playlist || 'PLNHGaRUfwDtc', headline: 'Football stories nobody else tells.', line: 'Free club documentaries on YouTube.'}, to: ['feed', 'story']}}
}
/** THE ALBUM (owner, 24.11.2026: "a campaign for our sticker album — the daily envelope and everything it needs"; launch code
 *  FANLIFE99 = three extra envelopes on top of the daily one). The code's picture and caption carry it; the link types it in. */
export function albumPost(c: ClubCard | null, k: C, angle: 'code' | 'daily' | 'wing', code?: string, seed = 0): Omit<Main, 'campaign'> {
  const path = code ? `/album?code=${encodeURIComponent(code)}` : '/album'
  const tags = (c?.tags || '#FANLIFE #FootballHistory') + ' #StickerAlbum #Panini #FootballStickers'
  if (angle === 'code' && code) return {app: 'fanlife', label: 'The Album · launch code', tags,
    hook: `Launch code: ${code} = 3 free envelopes for your FAN LIFE sticker album. 🎁`,
    body: `The Album is open — a 1980s sticker album with every club’s legends.
Sign in, type ${code} and tear open three envelopes, on top of the free one you get every day.

Post your best pull in the comments 👇`,
    comment: `Code: ${code} — three envelopes, free. Who did you pull? 👇`, url: track(path, k.id), visual: 'L-ALBUM: the club’s own stickers, the code on a stamp.',
    kit: {t: 'L-ALBUM', data: {club: c ? {id: c.id} : undefined, code, headline: 'Launch code: 3 free envelopes.', seed}, to: ['feed', 'story']}}
  if (angle === 'wing' && c) return {app: 'fanlife', label: `The Album · ${c.name}`, tags,
    hook: `The ${c.name} wing of the album is waiting. How many have you stuck? 📒`,
    body: `Every ${c.name} legend is a sticker — the face shows only once you own it.
One free envelope every day. Swap your doubles with other supporters.

Who’s the one you still need? 👇`,
    url: track(path, k.id), visual: 'L-ALBUM: the club wing’s own stickers fanned out.',
    kit: {t: 'L-ALBUM', data: {club: {id: c.id}, code, headline: `Complete the ${c.name} wing.`, kicker: 'The Album · club wing', seed}, to: ['feed']}}
  return {app: 'fanlife', label: 'The Album · daily envelope', tags,
    hook: 'Your free envelope is waiting. It goes at midnight. ✉️',
    body: `One envelope a day, free: two stickers of real legends for your album.
Miss a day, miss the envelope.${code ? `
New here? Code ${code} adds three more.` : ''}

Tag the mate who still hasn’t opened his 👇`,
    url: track(path, k.id), visual: 'L-ALBUM: stickers and the daily envelope.',
    kit: {t: 'L-ALBUM', data: {club: c ? {id: c.id} : undefined, code, headline: 'A free envelope. Every day.', seed}, to: ['feed', 'story']}}
}

export type Feature = 'legends' | 'rumble' | 'market' | 'kits'
export function featurePost(f: Feature, c: ClubCard, k: C): Omit<Main, 'campaign'> {
  if (f === 'rumble') return {app: 'fanlife', label: `Royal Rumble · ${c.name}`, tags: c.tags + ' #FootballGames',
    hook: `${c.name}: your all-time five on one budget. Who makes it? 🥊`,
    body: `Royal Rumble — the legends come up one by one, the money runs out fast.\nBuild your five, then send it to your mate and let him try to beat it.\n\nFree, in your browser.`,
    comment: 'Post your five here 👇', url: track(`/clubs/${c.id}/royal-rumble`, k.id), visual: 'L-RUMBLE: the ring in the club’s colours, the real game in a phone.',
    kit: {t: 'L-RUMBLE', data: {club: {id: c.id}, crestName: c.crestName, headline: 'Your club’s all-time five. One budget.', body: ['Build it. Send it. Beat your mate.']}, to: ['feed']}}
  if (f === 'kits') return {app: 'fanlife', label: `Kit archive · ${c.name}`, tags: c.tags + ' #FootballShirts #ClassicFootballShirts',
    hook: `${c.stats.shirts} ${c.name} shirts, ${c.stats.from} to now. Which one was yours? 👕`,
    body: `The ${c.name} shirt archive: every home, away and third we could document, season by season.\nFind yours, then add it to your closet.\n\nWhich season’s shirt is the best ever? 👇`,
    comment: 'Best one ever — and the worst? 👇', url: track(`/clubs/${c.id}/kit-archive`, k.id), visual: 'L-KITS: four home shirts across the eras, the count.',
    kit: {t: 'L-KITS', data: {club: {id: c.id}, crestName: c.crestName, count: c.stats.shirts, span: `shirts · ${c.stats.from}–2026`}, to: ['feed']}}
  if (f === 'market') return {app: 'fanlife', label: 'The market', tags: c.tags + ' #FootballShirts #KitSwap',
    hook: 'That shirt in your wardrobe has a buyer. 👕',
    body: `The FAN LIFE market: supporters sell and swap shirts with supporters.\nList one in a minute — or find the ${c.name} shirt you missed.\n\nWhat’s the one shirt you’d never sell? 👇`,
    url: track('/market', k.id), visual: 'L-MARKET: real shirts of the club, the market in a phone.',
    kit: {t: 'L-MARKET', data: {club: {id: c.id}, headline: 'The shirt in your wardrobe has a buyer.'}, to: ['feed']}}
  return {app: 'fanlife', label: 'Legends Manager', tags: c.tags + ' #FootballManager #FootballGames',
    hook: `You’ve shouted at the ${c.name} manager for years. Your turn. 🧠`,
    body: `Legends Manager: your club’s legends, a real season, live ratings and a man of the match.\nPick the XI, set the shape, win it.\n\nFree. Who’s your captain? 👇`,
    url: track('/all-football/legends', k.id), visual: 'L-GATE · Legends Manager: the game’s own art and the game in a phone.',
    kit: {t: 'L-GATE', data: {gate: 'FAN LIFE · THE BIG GAME', name: 'LEGENDS MANAGER', brand: 'legends', headline: `A season with your ${c.name} legends.`, body: ['Pick the XI. Win it.']}, to: ['feed']}}
}

// ── templates: a campaign is a template + a club (or clubs) + a start + days ────────────────────────────────────────────
export const TEMPLATES = {
  'club-days': {label: 'Club days', topic: 'club', hint: 'A club’s own days: its card, its shop, a game, its film — four posts a day.', needs: ['club'], days: 3},
  'club-opening': {label: 'New club opening', topic: 'opening', hint: 'Two teaser days, then opening night and its first week. Waits for the club to open.', needs: ['club'], days: 7},
  'product-push': {label: 'Shop products', topic: 'shop', hint: 'One live product of the club (or the whole shop) every day.', needs: [], days: 7},
  'sale-beats': {label: 'Sale', topic: 'sale', hint: 'Every day of the sale saved in the shop: before, during, last day.', needs: [], days: 4},
  'film-push': {label: 'YouTube films', topic: 'youtube', hint: 'The club’s films, one a day, and the channel on Sundays.', needs: [], days: 7},
  'fairy-tales': {label: 'Football Fairy Tales', topic: 'youtube', hint: 'Good Morning on the first morning, Good Night the next evening — in the club’s own language.', needs: ['club'], days: 2},
  'album-push': {label: 'The Album', topic: 'album', hint: 'The daily envelope, a club wing a day, and the launch code if you give one.', needs: [], days: 7},
  'feature-push': {label: 'A game or feature', topic: 'legends', hint: 'Legends Manager, Royal Rumble, the market or the kit archive — a club a day.', needs: ['feature'], days: 7},
} as const satisfies Record<string, {label: string; topic: Topic; hint: string; needs: readonly string[]; days: number}>
export type TemplateKey = keyof typeof TEMPLATES
export type CampaignInput = {template: TemplateKey; start: string; days?: number; club?: string; clubs?: string[]; feature?: Feature; name?: string; id?: string
  sale?: {label: string; percent: number; ends: string; starts?: string}; times?: string[]
  /** album-push: a launch code (e.g. FANLIFE99) the posts carry */
  code?: string
  /** film-push without a club: one of PLAYLISTS */
  playlist?: string
  /** club-opening for a club that is already open: no teaser days, nothing waits */
  opened?: boolean}

const addDays = (d: string, k: number) => new Date(Date.parse(`${d}T12:00:00Z`) + k * 864e5).toISOString().slice(0, 10)
const dow = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay()
const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
export const FEATURES: Feature[] = ['rumble', 'kits', 'legends', 'market']
const FEATURE_TOPIC: Record<Feature, Topic> = {rumble: 'rumble', kits: 'kits', legends: 'legends', market: 'market'}

/** the rows of one campaign. Pure: the same input always gives the same rows (the desk previews exactly what runs). */
export function buildCampaign(i: CampaignInput): {campaign: C & {template: TemplateKey; club?: string; start: string; days: number}; rows: Row[]} {
  const t = TEMPLATES[i.template]
  if (!t) throw Error('unknown template')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.start)) throw Error('start must be YYYY-MM-DD')
  const days = Math.max(1, Math.min(31, Math.round(i.days ?? t.days)))
  const clubs = (i.clubs?.length ? i.clubs : i.club ? [i.club] : []).filter(id => CLUB_CARDS[id])
  if (t.needs.includes('club' as never) && !clubs.length) throw Error('pick a club')
  const c0 = clubs[0] ? CLUB_CARDS[clubs[0]]! : null
  const topic: Topic = i.template === 'feature-push' ? FEATURE_TOPIC[i.feature || 'legends'] : t.topic
  const name = i.name || `${t.label}${c0 && clubs.length === 1 ? ' · ' + c0.name : ''} · ${i.start}`
  const id = i.id || `${slug(i.template)}-${c0 && clubs.length === 1 ? c0.id + '-' : ''}${i.start.replace(/-/g, '')}`
  const k: C = {id, topic, name}
  const rows: Row[] = []
  const put = (day: string, time: string, m: Omit<Main, 'campaign'>, extra: Partial<Main> = {}) => { const main = {...m, ...extra, campaign: {id, topic, name}} as Main; rows.push({at: `${day} ${time}`, format: 'post', main, ...(main.hold ? {held: true} : {})}) }
  const T = (j: number, def: string) => i.times?.[j] && /^\d\d:\d\d$/.test(i.times[j]!) ? i.times[j]! : def
  const clubOf = (d: number) => CLUB_CARDS[clubs.length ? clubs[d % clubs.length]! : OPEN_CLUBS[d % OPEN_CLUBS.length]!]!
  for (let d = 0; d < days; d++) {
    const day = addDays(i.start, d), c = clubOf(d)
    if (i.template === 'club-days') {
      put(day, T(0, '09:13'), clubPost(c, k))
      put(day, T(1, '12:31'), shopPost(c.products ? c : null, k, day.slice(5) >= '12-01' && day.slice(5) <= '12-21' ? 'gift' : 'club'))
      put(day, T(2, '17:03'), featurePost(FEATURES[d % FEATURES.length]!, c, k))
      put(day, T(3, '20:47'), dow(day) === 0 ? channelPost(c, k) : filmPost(c, k))
    } else if (i.template === 'club-opening') {
      const hold = i.opened ? undefined : `open:${c.id}`, e = i.opened ? d + 2 : d
      if (e === 0) put(day, T(0, '19:12'), clubPost(c, k, {kicker: 'Coming to FAN LIFE', headline: `${c.name} opens on FAN LIFE this week.`,
        hook: `${c.name} is coming to FAN LIFE this week. 👀`, teaser: true}), {url: track('/clubs', id)})
      else if (e === 1) put(day, T(0, '19:12'), featurePost('kits', c, k), {url: track('/clubs', id), hook: `${c.stats.shirts} ${c.name} shirts are about to go up. Which one is yours? 👕`})
      else if (e === 2) put(day, T(0, '19:47'), clubPost(c, k, {kicker: i.opened ? 'New on FAN LIFE' : 'Now open', headline: `${c.name} is open. Walk in.`,
        hook: `It’s open. ${c.name} on FAN LIFE: ${n(c.stats.matches)} matches, ${n(c.stats.players)} players, ${c.stats.shirts} shirts. 🏟️`}), hold ? {hold, launch: true} : {})
      else {
        const plan: [string, Omit<Main, 'campaign'>][] = [['17:03', featurePost('rumble', c, k)], ['17:03', featurePost('legends', c, k)], ['12:31', shopPost(c.products ? c : null, k)], ['17:03', featurePost('kits', c, k)], ['20:47', channelPost(c, k)]]
        const [time, m] = plan[(e - 3) % plan.length]!
        put(day, T(1, time), m, hold ? {hold} : {})
      }
    } else if (i.template === 'product-push') {
      put(day, T(0, '12:31'), shopPost(clubs.length ? c : null, k, i.name?.toLowerCase().includes('christmas') ? 'gift' : 'club'))
    } else if (i.template === 'sale-beats') {
      const sale = i.sale || {label: 'Black Friday', percent: 30, ends: ''}
      const phase: 'soon' | 'on' | 'last' = i.sale?.starts && day < i.sale.starts ? 'soon' : d === days - 1 ? 'last' : 'on'
      put(day, T(0, phase === 'last' ? '10:31' : '08:31'), salePost(clubs.length ? c : null, k, phase, sale))
      if (phase === 'last') put(day, T(1, '21:13'), salePost(null, k, 'last', sale))
    } else if (i.template === 'film-push') {
      put(day, T(0, '20:47'), i.playlist && !clubs.length ? playlistPost(i.playlist, k) : dow(day) === 0 ? channelPost(clubs.length ? c : null, k) : filmPost(c, k))
    } else if (i.template === 'fairy-tales') {
      const m = fairyPost(c, k, d % 2 ? 'gn' : 'gm')
      if (m) put(day, T(d % 2, d % 2 ? '21:31' : '07:31'), m)
    } else if (i.template === 'album-push') {
      const angle = i.code ? (['code', 'wing', 'daily'] as const)[d % 3]! : d % 2 ? 'wing' : 'daily'
      put(day, T(0, '11:07'), albumPost(c, k, angle, i.code, d))
    } else if (i.template === 'feature-push') {
      put(day, T(0, '17:03'), featurePost(i.feature || 'legends', c, k))
    }
  }
  return {campaign: {...k, template: i.template, club: clubs.length === 1 ? clubs[0] : undefined, start: i.start, days}, rows}
}

/** the form's answers, checked: only known templates, clubs and features; a start date; 1–31 days */
export function inputFrom(b:Record<string,unknown>):CampaignInput{
 const template=String(b.template||'') as TemplateKey
 if(!(template in TEMPLATES))throw Error('Pick a template.')
 const start=String(b.start||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(start))throw Error('Pick a start day.')
 const clubs=(Array.isArray(b.clubs)?b.clubs:b.club?[b.club]:[]).map(String).filter(id=>!!CLUB_CARDS[id]).slice(0,12)
 const feature=FEATURES.includes(b.feature as Feature)?b.feature as Feature:undefined
 const days=Math.max(1,Math.min(31,Number(b.days)||TEMPLATES[template].days))
 const name=typeof b.name==='string'&&b.name.trim()?b.name.trim().slice(0,80):undefined
 const times=(Array.isArray(b.times)?b.times:[]).map(String).filter(t=>/^\d\d:\d\d$/.test(t)).slice(0,4)
 const opened=b.opened===true
 const code=typeof b.code==='string'&&/^[A-Za-z0-9_-]{3,40}$/.test(b.code.trim())?b.code.trim().toUpperCase():undefined
 const sale=b.sale&&typeof b.sale==='object'?(()=>{const s=b.sale as Record<string,unknown>;return {label:String(s.label||'Sale').slice(0,40),percent:Math.max(5,Math.min(60,Number(s.percent)||20)),ends:String(s.ends||'').slice(0,24),starts:typeof s.starts==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s.starts)?s.starts:undefined}})():undefined
 // a campaign launched from the desk carries its own id: the template, the club, the day and a short stamp
 const id=`${template}-${clubs.length===1?clubs[0]+'-':''}${start.replace(/-/g,'')}-${Date.now().toString(36).slice(-4)}`
 const playlist=typeof b.playlist==='string'&&PLAYLISTS[b.playlist]?b.playlist:undefined
 return {template,start,days,clubs,feature,name,times,opened,sale,code,playlist,id}
}

