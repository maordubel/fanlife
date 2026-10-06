import type {GateKey} from '@/lib/clubs/gates'

/**
 * How each gate's data is researched — the method the 6 Oct parity waves proved, written down once so the
 * control room can say not only WHAT a club lacks but HOW to close it. Source pairs are the ones that worked
 * from this environment; `blocked` lists what refused us (rule 11: say whose block it is).
 */
export type GateMethod={what:string;pairs:string[];watch:string}
export const GATE_METHOD:Record<GateKey,GateMethod>={
 xi:{what:'Players with a documented position and career years.',pairs:['Wikipedia squad table + FotMob squad page','Club museum/history page + Wikipedia player article'],watch:'Positions disagree often (museum "half" vs Wikipedia "forward") — leave empty, never pick.'},
 trivia:{what:'More approved exact-date events; questions are derived from them.',pairs:['UEFA match page + RSSSF season page','Club museum match page + RSSSF','Wikipedia final article + RSSSF'],watch:'Wikipedia season pages carry wrong dates/scores surprisingly often — always a second publisher.'},
 lineup:{what:'Matches with the identical starting eleven in two sources.',pairs:['UEFA line-up PDF/match page + Wikipedia final article','RSSSF final report + national FA report'],watch:'Wikipedia line-ups drawn as diagrams are unreadable; worldfootball/11v11 disallow robots.'},
 'kit-builder':{what:'Kits with season + maker + design.',pairs:['Football Kit Archive + club shop/news','Football Kit Archive + national press photo captions'],watch:'Footy Headlines copies Football Kit Archive word for word — it is NOT a second publisher.'},
 kits:{what:'Kits with a season (maker/design optional).',pairs:['Football Kit Archive + Wikipedia "kit manufacturers" table'],watch:'colours-of-football returns 404/403 from here.'},
 memory:{what:'Distinct sourced fact pairs (comes from the archive).',pairs:['Same as trivia'],watch:'Opens automatically once the archive grows.'},
 polls:{what:'Opinion prompts over eligible club choices.',pairs:['Derived — no research'],watch:'Never seed a vote.'},
 goal:{what:'Goals whose build-up two reports describe touch by touch (who, verb, zone).',pairs:['UEFA match report + ESPN/Sky/national press report','Club report + national FA report'],watch:'A scorer list is not a move. Drop a touch two reports describe differently.'},
 'royal-rumble':{what:'Players with positions covering GK/DF/MF/FW.',pairs:['Same as XI'],watch:'One MF/DF short keeps the gate partial.'},
 'blind-cow':{what:'Players with four or more clues, each in two publishers, never the name.',pairs:['Wikipedia player article + club history page','Wikipedia + national newspaper profile'],watch:'Leave out goals/caps/fees where totals differ between sources.'},
 derby:{what:'A human-approved primary rival.',pairs:['Owner decision'],watch:'Meetings are then read from the archives.'},
 archive:{what:'Eligible sourced records.',pairs:['Same as trivia'],watch:'Unapproved research stays in the review console.'},
 timeline:{what:'Eleven distinct exact-date events.',pairs:['Same as trivia'],watch:'One card per date; a title with its year in it is excluded.'},
}

/** Per-club sources that worked, and what refused us — from the 6 Oct parity waves. */
export const CLUB_SOURCES:Record<string,{worked:string[];blocked:string[];next:string[]}>={
 'hapoel-tel-aviv':{worked:['The Worker masters (Vikipoel Games table, Kit Master, Line-up Master, goal replay archive)'],blocked:['wiki.red-fans.com behind Cloudflare — human browser export only'],next:['Model club: all thirteen gates open. More line-ups and goal sequences deepen rounds.']},
 olympiacos:{worked:['UEFA match pages and reports','worldfootball.net (via page fetch)','ESPN, Sky Sports, TNT Sports reports'],blocked:['Transfermarkt','fbref','11v11'],next:['All thirteen open. Panathinaikos derbies need a second dated publisher (only worldfootball had dates).']},
 'hapoel-petah-tikva':{worked:['hpt.co.il museum: a page per match with date, score, scorers, full line-up (?ShowGame=N, ?ShowSeason=YYYY/YYYY)','RSSSF Israel season pages','English Wikipedia squad table + FotMob'],blocked:['Hebrew Wikipedia (fetch failed)','Transfermarkt','worldfootball.net robots'],next:['Kits: Football Kit Archive has makers 1986/87–2026/27; needs a design source (club shop/press photos).','Line-ups: museum has 1957/1959/1961 cup-final XIs — need a second publisher (contemporary press, RSSSF report).','Goals: museum gives scorers + minutes only; needs a narrative report.']},
 panathinaikos:{worked:['RSSSF European Cup / Greek Cup pages','UEFA match pages','Wikipedia final articles','Footbola.it / Gli Eroi del Calcio (1971 final XI)'],blocked:['Transfermarkt','worldfootball.net and 11v11 robots','colours-of-football 404'],next:['Line-ups: RSSSF has 1982/1984/1989/2004 cup-final XIs — second publisher needed.','Goals: UEFA describes Warzycha in Amsterdam 1996 and Basinas v Barcelona — second publisher needed.','Staged package (917 matches, 155 line-ups) awaits owner review in the research console.']},
 'zrinjski-mostar':{worked:['UEFA match feed','NFSBiH reports','Hercegovina.info, Bljesak, Klix press','club site'],blocked:['Wikipedia raw tables (cache-only)','fbref, Transfermarkt','UEFA line-up feed truncated after six starters'],next:['57 Football Kit Archive kits held as single-publisher — owner approval or club-shop pages would open gates 4 and 5.','Line-ups v AZ, Aston Villa, Breidablik 2023: only NFSBiH complete so far.','One more eligible event completes trivia.']},
}
