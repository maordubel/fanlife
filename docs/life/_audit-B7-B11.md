I've verified every claim directly against the source. Report follows.

---

# STAGE B AUDIT — B7–B11 + GLOBAL SECTIONS

Verified against `/root/worker/lib/life/**` on 2026-09-06. Inventory file was **not** trusted; every citation below was re-read.

## B7 — "גם האולם יכול לרדת" (`1997-basket`)

```
245 | B7/§6  | B7 = 1996/97–1997/98, anchor basketball relegation | DONE | chapters.ts id '1997-basket', unit B7, dateHe '1996/97 – 1997/98', anchorKey '1997-relegation'
246 | B7/§6  | Q: "Does returning erase what ownership taught you?" | DONE | h2-corner ("אל תגיד לי הבראנו") + ENDINGS_HALL.hall titleHe 'עלינו. לא הבראנו.'
247 | B7/§7  | Title "גם האולם יכול לרדת" | DONE | chapters.ts:1997-basket titleHe
248 | B7/§7  | 1996/97 relegation is not a side note | DONE | anchor-server '1997-relegation' summaryHe; beats h1-open→h1-hall (match 'hall-97')→h2
249 | B7/§7  | Happens while football is also near relegation | PARTIAL | h1-open narration + h1-bloomfield ("משחק של הישרדות"); no football-relegation state or scene — B6's `1997-sale` anchor is a separate chapter
250 | B7/§7  | Football+basketball obligations collide with army leave | PARTIAL | h1-open text says "חופשה של ארבעים ושמונה שעות" but chapter1997basket.ts contains ZERO `e:'army'` effects and no armyAbove/armyRoute condition — leave is flavour, not a resource
251 | B7/§7  | Shachor and Limor need practical help at Ussishkin | DONE | h1-corner choice 'crates' → rel shachor bond+6, remember 'crates-relegation-1997'; h1-inside 'carry'
252 | B7/§7  | Freddy connects funding/ownership without a lecture | DONE | conversation `h1-freddy` (2 lines) → supporterOwnershipSeed+8, basketballOwnershipTrust−8
253 | B7/§7  | Choose one branch, hear the other result later | PARTIAL | football branch hears the hall on a transistor (h1-bloomfield); the hall branch never hears the Bloomfield result
254 | B7/§7  | First relegation raises ussishkinWound + supporterOwnershipSeed | DONE | h1-corner 'football' wound+4; h1-inside 'carry' wound+8/seed+6; h1-efi wound+6; h1-freddy seed+8
255 | B7/§7  | Promotion/return gives relief, not closure | DONE | ENDINGS_HALL.hall bodyHe; h2-inside "אף אחד לא ענה"
256 | B7/§7  | "עלינו" ≠ "הבראנו" | DONE | h2-corner Shachor line verbatim; ending title
257 | B7/§7  | Player can be hopeful, sceptical or exhausted | DONE | h2-corner choices hope / doubt / tired
```

## B8 — "השרוכים" (`1998-laces`)

```
258 | B8/§6  | B8 = 2.5.1998, championship trauma | DONE | chapters.ts '1998-laces' dateHe '2 במאי 1998', anchorKey '1998'
259 | B8/§6  | Q: rage you cannot spend | DONE | l1-ten five-way + LacesResponse
260 | B8/§7  | Title "השרוכים" | DONE | chapters.ts titleHe
261 | B8/§7  | Championship loss is fixed | DONE | matches.json 1998-05-02 both rows (1-0 home; Beit She'an 2-3 Beitar); no branch touches it
262 | B8/§7  | Not one more famous match / not a short bridge | DONE | 2 in-chapter days (L1/L2), 6 endings, directed script `laces-98` (12 steps) + classroom day
263 | B8/§7  | Decade's character forge | DONE | l1-ten → `e:'laces'` sets LacesResponse
264 | B8/§7  | Weight comparable to the whole B6 crisis | PARTIAL | B8 = 24KB / 2 days / 0 army effects except one commanderTrust−5; B6 = 32.6KB / 4 days / 9 army effects / gate choice / Liron road nodes. B8 has no travel or route system at all
265 | B8/§7  | Consequences stay active through both Cup finals + Double | PARTIAL | `lacesIs` is read in 2000-title `t-match` and 2000-double `d-match`, but the gated pairs (wait/wait2, trap/trap2) have IDENTICAL text and IDENTICAL effects → zero divergence. Never read in 1999-cup at all
266 | B8/§7  | No affecting another match / no adjudicated villains | DONE | l1-laces names no player, no club; archive note kept in matches.json
267 | B8/§7  | The play is information, travel and aftermath | PARTIAL | information ✓ (laces-98 half/pager/l1-laces); aftermath ✓ (l1-ten); TRAVEL absent — no `travel` effect and no route choice anywhere in chapter1998laces.ts
268 | B8/§7  | Attends / serves / works / listens per accumulated state | MISSING | the only alternative is beat `l1-radio` fired purely by clock (`afterMinute: FULL_98+4`); no army/work/gate condition on any route
269 | B8/§7  | Simultaneous info, delayed and contradictory, 1998-correct | DONE | LACES_98 steps 'half' ("מי אמר?"), 'late' (pager), kobi-laces ("היום יש פייג׳ר")
270 | B8/§7  | Nobody initially has a complete picture | DONE | same steps; m98-listen "אף אחד לא עונה אותו דבר"
271 | B8/§7  | Anger spreads faster than verification | PARTIAL | stated in l1-ten prose and asaf-laces; no mechanic (no rumour-propagation system as in match1990.ts)
272 | B8/§7  | Soko essential — know / heard / inventing | PARTIAL | `soko-laces` is 2 branches, ZERO choices, not wired into the information system; his "three lists" line is decoration
273 | B8a    | Open at home with 1990 promotion + 1993 Galil wound available | PARTIAL | l1-open references 1986 and 1990 ("שמונה מאז השבת שבבית לא מזכירים"); no reference to Galil/1993 anywhere in the file
274 | B8a    | Kobi careful; younger friends certain | DONE | kobi-laces b1 vs ofir-laces ("אני מרגיש את זה")
275 | B8a    | Calculate / celebrate early / refuse superstition / hide fear | DONE | kobi-laces choices calc / fear / sure (3 of the 4)
276 | B8a    | Army/work/gate history decides companions + promise at risk | MISSING | no armyRoute/gateIs/gateEver condition in chapter1998laces.ts
277 | B8a    | Sinai rupture supplies subtext | MISSING | no `sinaiIs`, no 'סיני' string in the file
278 | B8b    | Evolve B1 transistor into radio/phone/pager/human relays | DONE | LACES_98 'half', 'late' (pager), l1-laces (man with radio); `listen` mix ramp 1→0.05
279 | B8b    | Hapoel's match lived directly per presence route | PARTIAL | only the inside route is directed (`laces-98`); the radio route is `l1-radio-end`, 2 lines
280 | B8b    | Beit She'an–Beitar only via delayed attributed reports | DONE | never on the board; only through 'אוהד עם רדיו' / pager / 'קול מהרדיו'
281 | B8b    | Trusted friend can relay a wrong detail without being a liar | DONE | LACES_98 'half' three contradicting voices
282 | B8b    | At the decisive change remove explanatory UI | DONE | l1-laces has no board move, no stinger; `listen: 0.12`; l1-whistle "גל של פנים שמבינות"
283 | B8c    | Ten minutes of free-roam aftermath, no objective marker | MISSING | `l1-ten` is a 5-choice dialogue node; every choice raises `l1:cut`, and beat `l1-to-class` is `trigger:'clock'` with no delay/afterMinute → the very next tick cards to the classroom. There is no roam
284 | B8c    | NPCs shout, cry, verify, freeze, search, confront, leave | PARTIAL | described in l1-ten prose; `asaf-laces`'s five `lacesIs` branches are UNREACHABLE (laces is set in l1-ten, and l1-to-class fires before the player can walk to Asaf at bloomfield-outside)
285 | B8c    | Behaviour derives from relationships and gate identity | MISSING | no relationship or gate condition on any B8 aftermath branch
286 | B8c    | Human action under pressure, not ideology | DONE | l1-ten choices are all physical/spoken
287 | B8c    | Choice: stay with a devastated friend | DONE | l1-ten 'stay' → laces 'protector', remember ofir 'stayed-with-me-1998'
288 | B8c    | Choice: chase confrontation, be pulled back | DONE | l1-ten 'run' → l1-pulled (Shachor pulls him back, "לא קרה כלום")
289 | B8c    | Choice: go home to Kobi | DONE | l1-ten 'home' → laces 'withdrawn'
290 | B8c    | Choice: preserve evidence with Soko | DONE | l1-ten 'soko' → laces 'organizer', seed+6
291 | B8c    | Choice: return to Ussishkin, another branch needs people | MISSING | no such option in l1-ten (5 choices: stay/run/soko/home/look)
292 | B8d    | Arabic teacher says "טייב" | DONE | l2-tayeb, conversation opens from beat `l2-class`
293 | B8d    | Heard through the wound as an Eitan Tayeb taunt | DONE | l2-tayeb "המילה נכנסה דרך הפצע. השם ההוא. השרוכים."
294 | B8d    | Preserve misunderstanding; teacher not malicious | DONE | l2-after fallback "היא לא ידעה כלום... זה היה הכי גרוע"
295 | B8d    | React / ask / leave / snap / silence / understand later | DONE | l2-tayeb: snap, snap-any, ask, leave, silent (5)
296 | B8d    | Earlier knowledge, impulsiveness and trust decide repair | PARTIAL | only `lacesIs:'avenger'` gates the snap variant; no personality or relationship condition
297 | B8d    | The match changed how he hears an ordinary word | DONE | l2-close, all six branches
298 | B8e    | LacesResponse union of six | DONE | types.ts `export type LacesResponse`; all six reachable (5 in l1-ten + 'unresolved' in l1-radio-end)
299 | B8e    | Not a bonus class; changes later ownership/injustice/protest responses | PARTIAL | only `asaf-laces` (same evening, and unreachable — see 284) and the two no-op pairs in 2000
300 | B8e    | In 1999 changes what "closing a circle" means | MISSING | chapter1999cup.ts contains no `lacesIs` and no laces read
301 | B8e    | In 2000 changes ability to enjoy certainty | MISSING in effect | t-match wait/wait2 and d-match trap/trap2 are byte-identical apart from the `when`; the state changes nothing
302 | B8e    | No cathartic violence | DONE | l1-pulled "לא קרה כלום"
303 | B8e    | High escalation may fracture trust/army/safety | PARTIAL | l1-ten 'run' → protestEscalation+12, army commanderTrust−5; no safety or family consequence, and protestEscalation is never read anywhere
304 | B8e    | Quiet care as playable and consequential as shouting | DONE | 'stay' → ofir bond+6 + major memory + empathy+3 + its own ending
305 | B8/§7  | תקוה and אלימלך visible football anchors in this movement | PARTIAL | one Asaf line names שלום תקוה; שביט אלימלך appears nowhere in B8
306 | B8/§7  | Elimelech's steadiness makes the collapse feel impossible | MISSING | not present in chapter1998laces.ts
307 | B8/§7  | תקוה embodies beauty the sport can erase | PARTIAL | single line in asaf-laces fallback branch
308 | B8/§7  | Do not fabricate private access | DONE | every line is from the terrace or the classroom
```

## B9 — "זה לא נגמר כשעולים" (`1999-basket`)

```
309 | B9/§6  | B9 = 1998/99, second relegation / organizing | DONE | chapters.ts '1999-basket' anchorKey '1999-relegation'
310 | B9/§6  | Q: owning responsibility, not just anger | DONE | seed-gate5 choices 'list' vs 'anger'; ENDINGS_SEED list/anger
311 | B9/§7  | Title "זה לא נגמר כשעולים" | DONE | chapters.ts titleHe
312 | B9/§7  | Second relegation makes the rupture continuous | DONE | anchor-server '1999-relegation' summaryHe; seed-inside Soko "פעם שנייה בשלוש שנים... הם ייראו כמו זוג"
313 | B9/§7  | Eisenberg as subjective institutional "enemy" | PARTIAL | seed-corner has an unnamed 'אוהד' shouting "הבעלים הזה הורג את המועדון"; Eisenberg is registered (characters.ts `shaul-eisenberg`) but NEVER named in any dialogue line
314 | B9/§7  | Perspective vs proven biography; archive states only verified facts | DONE | anchor-server '1999-relegation' summaryHe is sporting-only; the accusation lives in a supporter's mouth
315 | B9/§7  | Thread 1 — Ussishkin wound, queues, labour, Shachor/Limor | DONE | seed-corner (תור/קופה/סדרן שלא שילמו לו), choice 'work' → energy−8, responsibility+3
316 | B9/§7  | Thread 2 — Freddy structures, Soko preserves records | DONE | seed-gate5 Freddy line ("מבנה. לא כעס"); seed-inside Soko 'why'/'help'
317 | B9/§7  | Pogi can begin lists of people/resources/principles | DONE | seed-gate5 'list' → seed:list, life:seed:list, supporterOwnershipSeed+14
318 | B9/§7  | Prehistory, not a premature founding | DONE | ENDINGS_SEED.list bodyHe "הדף הזה ישן במגירה שנים"
319 | B9/§7  | Asaf coordinates, Melamed creates, Michel transport, Dudu + Omer | DONE | seed-gate5 places all five with lines; actors in `kiosk` scene era '1999-basket'
320 | B9/§7  | Organization is work before iconography | DONE | seed-corner "הערב עובדים" / "אחרי."
321 | B9/§7  | 1999 Ultras culture via fictionalized labour + public facts | DONE | seed-gate5 "השנה הם התחילו לקרוא לעצמם 'היצורים'"
322 | B9/§7  | No unverified founding acts/quotes to memorial characters | DONE | Michel = minibus logistics, Omer = one record line; no founding attribution
```

## B10 — "שש־עשרה שנה" (`1999-cup`)

```
323 | B10/§6 | B10 = 19.5.1999, Cup final vs Beitar | DONE | chapters.ts '1999-cup' dateHe '26 במאי 1999', anchorKey '1999-cup'
324 | B10/§6 | Q: can the divided group celebrate together | DONE | c99-after: together / divided endings
325 | B10/§7 | Title "שש־עשרה שנה" | DONE | chapters.ts titleHe
326 | B10/§7 | Anchor: State Cup final vs Beitar | DONE | anchor-server '1999-cup' + matches.json 1999-05-26 (opponent בית"ר ירושלים)
327 | B10/§7 | 1:1 after 120 | DONE | matches.json 1–1; CUP_99 script steps 'theirs'→'equaliser'→'extra'; last board = anchor
328 | B10/§7 | Hapoel wins the shootout 3:1 | MISSING | 3:1 exists only in matches.json `noteHe`; `AnchorMatch` has no shootout field, resolveSpec drops noteHe, and no line or board states it
329 | B10/§7 | Shimon Gershon scores the decisive penalty | MISSING | 'גרשון' appears nowhere in lib/life; c99-pens-2 says only "אחד משלכם ניגש לאט"
330 | B10/§7 | שלום תקוה scores the equalizer | MISSING | CUP_99 'equaliser' step names no scorer; the only mention is an old man weeping "שלום תקוה" at the rail in c99-after
331 | B10/§7 | שביט אלימלך saves two penalties | PARTIAL | c99-pens/c99-pens-2 chant "שביט. פעם. ואז עוד פעם" — narrated, not an anchor field, and never with a surname
332 | B10/§7 | Fixed actions need buildup, crowd reaction, aftermath | DONE | CUP_99 11 steps + m99-scarf/m99-behind + c99-pens/won/after
333 | B10/§7 | First convergence checkpoint after the fractures | DONE | c99-after 4 choices spanning gate7/gate5/both/neither
334 | B10/§7 | Getting there depends on army/work, money, transport, reliability | PARTIAL | money ✓ (michel 2000, ofir 1000), transport ✓, reliability ✓ (liron sharedHistory≥4). Army only colours the c99-away text (`armyRoute:'punished'`); work never appears
335 | B10/§7 | Gate 7 and Gate 5 companions may arrive separately | DONE | kobi-cup99 (בארי's Gate 7 bus) vs michel-cup99 (`gateEver:'gate5'` minibus)
336 | B10/§7 | Basketball-first friends hurt or distant | DONE | efi-cup99 ("הוא אמר 'שלכם'. פעם היה 'שלנו'")
337 | B10/§7 | Liron/Michel/Ofir routes = different journeys, not skins | PARTIAL | they differ only in time (80/90/150), money and an `arrived:late` flag — no en-route content, unlike B6's road-1…road-3
338 | B10/§7 | Pogi may carry an object or promise from 1993 | MISSING | no `hasItem`/`life:promise:g4`/`life:galil:*` read in chapter1999cup.ts
339 | B10/§7 | Penalties: breath / looking / shoulder / turning away, not the kicks | DONE | c99-pens choices breathe/shoulder/turn → pens:looked/held/turned; c99-pens-2 branches on `pens:turned`
340 | B10/§7 | After victory: reunite, stay divided, or one temporary embrace | DONE | c99-after: both / kobi → 'together'; gate5 / alone → 'divided'
341 | B10/§7 | Do not force reconciliation because a trophy was won | DONE | 'divided' ending is reachable and unpunished
```

## B11 — "ארבעה ימים" (`2000-title` + `2000-double`)

```
342 | B11/§6      | B11 = 13–17.5.2000, championship + Cup | DONE | chapters.ts B11a '2000-title' 13.5, B11b '2000-double' 17.5, next null
343 | B11/§6      | Q: who have you become, who is still beside you | DONE | outcomeFamily() + d-family
344 | B11/§7      | Title "ארבעה ימים" | DONE | chapters.ts '2000-title' titleHe (B11b is 'הדאבל')
345 | B11/§7      | Persistent exhaustion, money, promises, relationships over 4 days | PARTIAL | d-open energy−35 + money+6000; but the 'ticket' pick says "שישים שקל" and spends NOTHING (no `e:'money'` in d-days-2), and no code reads energy/exhaustion at the final
346 | B11-I       | Bnei Yehuda 1–1 at Shkhunat Hatikva clinches | DONE | matches.json 2000-05-13; TITLE_00 board 0:0→against→for; scene 'hatikva'
347 | B11-I       | Arrive by different routes or miss it on a matured debt | DONE | beat `t-work-debt` `armyAbove:{leaveDebt,min:3}` → t-boss shift; kobi-title / michel-title / efi-title routes
348 | B11-I       | Remote routes remain full scenes | PARTIAL | `t-shift` = 2 lines, `t-radio` = 2 lines; both immediately end the chapter
349 | B11-I       | Check: who stands beside Pogi | DONE | t-champions 4 branches keyed on t:with-kobi / t:with-efi / t:with-gate5 / none
350 | B11-I       | Check: Kobi present, embrace earned | DONE | t-champions b0 → kobi bond+8, remember 'champions-hug-2000'; earned via kobi-title 'yes'
351 | B11-I       | Check: football friends, basketball friends or both | PARTIAL | efi-title covers "basketball friend at the football"; there is no "both" branch
352 | B11-I       | Check: how 1998 changes belief in the news | PARTIAL | t-match 'believe' vs 'wait'/'wait2' — the two wait variants are identical, so the laces state is decorative
353 | B11-I       | Check: celebration → care / excess / responsibility / lonely | PARTIAL | t-champions gives companion-flavoured variants, not those four modes; no 'excess' or 'care' branch
354 | B11-I       | Do not roll credits | DONE | t-close "אין קרדיטים. עוד ארבעה ימים גמר גביע."; chapters.ts next '2000-double'
355 | Interlude   | No montage-only skip; a compact schedule | PARTIAL | `d-days` + `d-days-2` = two dialogue nodes (4 options then 4), not a schedule/clock system
356 | Interlude   | Sleep/recover | DONE | d-days 'sleep' → energy+40
357 | Interlude   | Work or earn money | DONE | d-days 'work' → money+9000, energy−15
358 | Interlude   | Repair a family/army promise | DONE | d-days 'family' (kobi+rachel bond+6); d-days-2 'army' (leaveDebt−2)
359 | Interlude   | Help Gate 5 preparations | DONE | d-days 'gate5' gated `gateEver:'gate5'` with a real noteHe
360 | Interlude   | Help an Ussishkin friend despite football glory | DONE | d-days-2 'uss' → shachor bond+6, seed+6
361 | Interlude   | Secure transport/ticket | DONE | d-days-2 'ticket' → give ticket-stub, flag d:ticket (but see 345 — free)
362 | Interlude   | Visit the Red Box | PARTIAL | d-days-2 'box' is a historyMemory+6 line only; it does not open the box UI (that reads `state.redBox`, which B11 never writes)
363 | Interlude   | Player cannot maximize everything | DONE | exactly 2 picks from 8 options; each choice sets d:pick1 / d:final
364 | Interlude   | Championship exhaustion must affect the final | PARTIAL | d-open energy−35 is applied, but nothing in d-match/d-pens/outcomeFamily reads energy or wellbeing.exhaustion
365 | B11-II      | 2:2 after ET, 4:2 on penalties, Double completed | PARTIAL | 2:2 ✓ (matches.json + DOUBLE_00 last board); 4:2 exists only in matches.json noteHe and reaches no screen
366 | B11-II      | Input never changes a kick | DONE | d-match choices are breathe/hold/trap; d-pens has no input on the kicks
367 | B11-II      | Callback: 1993 joy then loss | PARTIAL | m00-memory 'hall' one line; no Galil-loss callback
368 | B11-II      | Callback: 1996/97 survival felt impossible | MISSING | no 1996/97 reference in chapter2000double.ts
369 | B11-II      | Callback: 1998, certainty is a trap | DONE | m00-memory 'laces'; d-match 'trap'/'trap2'
370 | B11-II      | Callback: 1999 first cup and partial reunion | PARTIAL | d-pens references Shavit "כי כבר עשה"; `life:cup99:together` is SET in B10 and never read anywhere — the reunion callback does not exist
371 | B11-II      | Callback: chosen gate and everyone on the other side | DONE | d-days `gateEver`; endings gate7-keeper / gate5-builder
372 | B11-II      | Callback: matches missed for army/work/promises | DONE | outcomeFamily uses `state.missedAnchors`; kobi-double fallback "לא היית פה"
373 | B11-II      | שלום תקוה assists the ET goal and joins the lift | MISSING | DOUBLE_00 'ours' names nobody; no trophy-lift beat; no 'תקוה' string in chapter2000double.ts
374 | B11-II      | שביט carries accumulated shootout trust from 1999 + semifinal | PARTIAL | d-pens narrates it; no state carried from B10 (no flag read)
375 | B11-II      | Keep access inside Pogi's supporter viewpoint | DONE | no dressing-room content anywhere
376 | Final walk  | End outside the stadium / on the way home, not a stats screen | PARTIAL | `d-walk` narrates the street outside; there is no travel to a walk-home room — the player is standing in `ramat-gan`
377 | Final walk  | Outcome families, not good/bad endings | DONE | `outcomeFamily()` returns one of 7; no ranking
378 | Final walk  | Ending — Inherited and chosen | DONE | ENDINGS_DOUBLE['inherited-chosen'] + branch `gate5 && asaf>=8 && kobi>=55`
379 | Final walk  | Ending — Gate 5 builder | DONE | 'gate5-builder' + `gate==='gate5' && asaf>=8`
380 | Final walk  | Ending — Gate 7 keeper | DONE | 'gate7-keeper' + `gate7|between`
381 | Final walk  | Ending — Two halls, one life | DONE | 'two-halls' + `seed>=25 && shachor>=12 && basketballLove>=25`
382 | Final walk  | Ending — Always travelling | DONE | 'always-travelling' + `travelDrive>=22`
383 | Final walk  | Ending — Heard from elsewhere | DONE | 'heard-elsewhere' + `missed >= attended+2`, presence 'radio'
384 | Final walk  | Ending — Alone in the crowd | DONE | 'alone-in-crowd' + `loneliness>=45 && kobi<45 && asaf<20`
385 | Final walk  | Every finale includes the Double | DONE | d-go both branches travel to ramat-gan; all 7 bodyHe open with "דאבל"
```

## §4 — Persistent systems

```
386 | §4    | Typed, migratable state surfaces, not hundreds of flags | DONE | types.ts LifeState gate/army/institution/presence/laces + blankGate/blankArmy/blankInstitution; events.ts folds defaults
387 | §4.1  | GateIdentity union | DONE | types.ts:'gate7'|'gate5'|'between'|'outside'
388 | §4.1  | GateHistoryEntry {from,to,year,reason} | DONE | types.ts GateHistoryEntry; events.ts 'gate.moved' appends
389 | §4.1  | GateReason seven values | DONE | types.ts GateReason
390 | §4.1  | The 1990s split must force a side | PARTIAL | only in B6 `asaf-gate5`/`kobi-gate7` (flag a2:chose, 4 options); nothing later re-asks and B7–B11 never read `gateIs`
391 | §4.1  | `between` temporary, not a free permanent answer | MISSING | no content anywhere emits `{e:'gate', to:'between'}`; it is an unreachable state
392 | §4.1  | Store history, not a Boolean | DONE | GateState.history + gate.moved reducer
393 | §4.1  | Neither gate is the moral-good route | DONE | outcomeFamily treats gate5-builder/gate7-keeper symmetrically
394 | §4.1  | Gate 7 can be continuity or rigidity | PARTIAL | 'gate7-keeper' ending bodyHe carries both sides; no in-play rigidity consequence
395 | §4.1  | Gate 5 can be invention or conformity/escalation | PARTIAL | Asaf demands labour (banner-gate5 gig, d-days gate5 all-nighter energy−20); no conformity cost
396 | §4.1  | `outside` valid, creates loneliness and different access | DONE | B6 'neither' → outside + loneliness+6; `gateEver:'gate5'` locks 5 later options
397 | §4.2  | ArmyRoute union | DONE | types.ts ArmyRoute; all five values exist, 4 reachable in B6
398 | §4.2  | ArmyState shape | DONE | types.ts ArmyState
399 | §4.2  | Army service can materially change routes | PARTIAL | B6 gates the Liron trip on commanderTrust; B10 c99-away branches on `armyRoute:'punished'`; B11a t-work-debt on leaveDebt≥3. B7/B8/B9 do not touch it
400 | §4.2  | One match consumes trust needed for the next | PARTIAL | commanderTrust is spent only inside B6; no later chapter reads it
401 | §4.2  | Lying can work once and close a later door | MISSING | `life:lied:army` is set in B6 and read by nothing in the repo
402 | §4.2  | Covering a shift earns help in a bigger chapter | MISSING | `coveredForOthers` is never incremented anywhere; the B11b gate `armyAbove:{coveredForOthers,min:0}` is `>=0` on a default of 0, so it is always true and its noteHe is dead
403 | §4.2  | No perfect-attendance route that also maxes trust/energy/family/money | PARTIAL | true in B6 and the B11b interlude; B8 attendance is entirely free, B10 has a free Kobi route
404 | §4.3  | Distinct institutional positions, not generic loyalty | DONE | types.ts InstitutionState (7 fields)
405 | §4.3  | InstitutionState.sinai four stances | DONE | types.ts SinaiStance; all four written (B5 defending/doubting, B6 broken/reconciled-memory). Never read after B6 — `sinaiIs` appears only in chapter1995sinai.ts
406 | §4.3  | footballOwnershipTrust | PARTIAL | written in B6; never read by any condition (`institutionAbove/Below` used zero times in content) — gauge display only
407 | §4.3  | basketballOwnershipTrust | PARTIAL | written B7 h1-freddy −8, B9 seed-corner −10 / h2 +4; never read
408 | §4.3  | protestEscalation | PARTIAL | written B6/B8/B9; never read
409 | §4.3  | legalUnderstanding | PARTIAL | written once (B6 a4-freddy +8); never read
410 | §4.3  | ussishkinWound | PARTIAL | written B4/B7 (+3..+8); never read — not even by outcomeFamily
411 | §4.3  | supporterOwnershipSeed | DONE | written B7/B8/B9/B11b; READ by outcomeFamily (`seed>=25` → 'two-halls')
412 | §4.3  | Seed may become strong in 1996/97 and 1998/99 | DONE | B7 h1-freddy +8 / h1-inside +6; B9 seed-gate5 'list' +14
413 | §4.3  | Club not founded in this stage | DONE | ENDINGS_SEED.list bodyHe; no founding event
414 | §4.3  | Stage B creates the memory/lists/convictions for the later act | DONE | `life:seed:list`, relationship memories 'wrote-the-night-1999', 'rhythm-returned-1999'
415 | §4.4  | PresenceMode union of nine | DONE | types.ts PresenceMode
416 | §4.4  | Store a presence mode for every anchor | DONE | WorldScene.ts ~3798 dispatches `presence.recorded` from `card.presence`; every B7–B11 ending card has one
417 | §4.4  | Every mode needs its own scene; "missed" is a route | PARTIAL | only 6 of 9 modes are ever produced (inside/late/radio/television/working/heard-from-friend + one `army`); `outside` and `archive-later` are never emitted by any content
418 | §4.5  | Major choices touch at least two systems | DONE | e.g. l1-ten 'run' = laces + institution + army + personality + relationship
419 | §4.5  | Defend Sinai: Kobi up, young fans down, regret later | PARTIAL | B5 s2 'defend' → ofir/amit tension, loneliness+6, loyaltyReturn+4; no later regret hook (sinai never read again)
420 | §4.5  | Gate 5: Asaf access up, Kobi tension up, leave pressure up | PARTIAL | B6 'join' → asaf trust+3, kobi tension+5; no army leave pressure
421 | §4.5  | Basketball during a football crisis: belonging up, football friends remember | DONE | B7 h1-corner 'crates' → shachor bond+6 + kobi tension+4; 'football' → shachor trust−5 + memory 'left-relegation-night-1997'
422 | §4.5  | Protest: awareness/respect up, safety/army/family down | PARTIAL | l1-ten 'run' → escalation+12 + commanderTrust−5; no family or safety axis
423 | §4.5  | Miss 1999 Cup for a promise: reliability+regret up, Double reunion stronger | MISSING | c99-away has no promise route and no reliability/regret effect; `life:cup99:together` is never read by B11
```

## §5 — Cast routing

```
424 | §5 | CHARACTER-BIBLE.md is the voice source | N/A | process/authoring rule; tests/life-bible.test.ts does enforce the id/spelling registry
425 | §5 | Kobi — inheritance; disagree without erasing love | DONE | actors kobi-laces/cup99/title/double; kobi-double 'gate5' choice = disagreement that keeps the bond
426 | §5 | Rachel — time, money, army aftermath, practical reality | PARTIAL | present in B8 only (`rachel-laces`), and her `talk` points at the RECYCLED B3 conversation `rachel-1993`; absent from B7/B9/B10/B11
427 | §5 | Ofir — street, away travel, risk; accumulating absence/loyalty | DONE | ofir-laces, ofir-cup99 (cheapest/latest route), l1-ten 'stay' memory
428 | §5 | Amit — facts, tables, scepticism | PARTIAL | one B8 line and his actor's `talk` is `ofir-laces`, not his own node; no rumour-vs-evidence role
429 | §5 | Efi — first basketball bridge, may drift | DONE | h1-efi gated `relationship efi trust max 45` (drift); efi-cup99 / efi-title trust-gated branches
430 | §5 | Barry — terrace continuity; recognizes Pogi after a concrete act | PARTIAL | placed in 1998-laces only; no recognition beat
431 | §5 | Melamed — songs; a rhythm returns years later | DONE | B6 sets `life:melamed:rhythm`; B9 seed-gate5 'rhythm' gated on it → memory 'rhythm-returned-1999'. The only cross-chapter flag read in B7–B11
432 | §5 | Asaf — belonging that demands labour | DONE | B6 asaf-gate5; gigs.ts `banner-gate5` (from '1998-laces'); B9 seed-gate5
433 | §5 | Michel — access through people, never magic fast travel | DONE | michel-cup99 (20₪ minibus, 6:30 from the kiosk), michel-title, seed-gate5 "זה לא כסף, זה אנשים"
434 | §5 | Soko — archive; challenges a false memory | PARTIAL | seed-inside 'why'/'help' is good; soko-laces has no choices, and he never corrects anybody
435 | §5 | Shachor — grief into tasks and lists | DONE | h1-corner crates, h1-inside "אותו סדר, הפוך", seed-corner "הערב עובדים"
436 | §5 | Omer Hermesh — ordinary warmth; late-90s scene with records/humour | PARTIAL | one line in seed-gate5 (holding a record); no scene of his own
437 | §5 | Freddy — separates legitimate protest from escalation | PARTIAL | B6 a4-freddy does it; B7 h1-freddy and B9 have no protest/escalation distinction
438 | §5 | Liron — one authored away day with a full return journey | PARTIAL | B6 road-1…road-3 is the outbound (fuel/food/argument); liron-cup99 is a plain route pick; no return journey node
439 | §5 | Yaron — army peer; protect or exploit access | PARTIAL | registered + placed once (kiosk, 1999-basket); no protect/exploit branch, no B6 access mechanic
440 | §5 | Dudu — comedy that becomes care when someone is stranded | PARTIAL | one comic line in seed-gate5; no stranded-supporter payoff
441 | §5 | Limor — queue intelligence, exposes bravado | DONE | limor-1993 'bluff' (`lacksItem:'hall-ticket'`), g4-limor bus list, seed-corner "אני עושה את הסדרן"
442 | §5 | שלום תקוה — bridges the bad years, 1999 Cup and Double | MISSING | 2 incidental mentions total (asaf-laces, c99-after); no 1999 goal, no Double assist, no continuity thread
443 | §5 | שביט אלימלך — shootouts as breath and accumulated belief | PARTIAL | narrated in c99-pens and d-pens by first name; no state carries 1999→2000
444 | §5 | Yosef/Batya/Uli/Melanie/Dor do not enter this stage | DONE | characters.ts activeEras exclude the 90s; tests/life-stage-b.test.ts 'keeps Yosef out of the nineties'
```

## §9 — Dialogue rules

```
461 | §9 | Choices are 2–4 spoken/physical responses; no "+loyalty" labels | PARTIAL | no abstract labels anywhere ✓, but `l1-ten` has FIVE choices (stay/run/soko/home/look)
462 | §9 | Nobody recites Wikipedia | DONE | facts arrive as decisions (h1-freddy, seed-gate5, l1-laces)
463 | §9 | Era-correct information technology and language | DONE | brick mobile 1997 (h1-corner), pager 1998 (kobi-laces, LACES_98 'late'), transistor throughout
464 | §9 | Sinai dialogue preserves the pain of loving the former player | DONE | chapter1995sinai s2 'defend'; B6 'reconcile' ("אני עדיין אוהב את השחקן")
465 | §9 | Kobi not automatically right; Gate 5 not automatically youthful truth | DONE | kobi-double 'gate5' choice; seed-corner Shachor shuts down the anti-owner shout
466 | §9 | Freddy interruptible — cut him off / practical point / let him finish | PARTIAL | B6 a4-gates offers protest-vs-legal; B7 `h1-freddy` and B9 give him zero choices — no interruption affordance anywhere
467 | §9 | Melamed uses a darbuka, never a guitar | DONE | audio.ts SampleKey 'darbuka-three-two'; tests/life-stage-b.test.ts asserts no guitar
468 | §9 | Soko corrects details but can be socially exhausting | PARTIAL | accuracy ✓; no exhausting/abrasive beat
469 | §9 | Omer and Michel get ordinary jokes and warmth, no memorial coding | DONE | seed-gate5 lines; characters.ts tags 'memorial' stay in data
470 | §9 | Eisenberg via supporter experience; "enemy" is viewpoint | PARTIAL | the framing is right but he is never named — see 313
```

## §10 — World, navigation, sensory

```
471 | §10 | Same home/bedroom/kitchen aging through the decade | PARTIAL | bedroom ages (`artByEra` 1990/1991/1990s/2000s → bedroom90); `home` (scenes.ts:537) and `kitchen` (:787) have NO artByEra. Actors do age (kobi90-paper/bag/stand/cheer)
472 | §10 | Neighbourhood street and Rafi's kiosk | DONE | street artByEra street90 / street90Flags (1998-laces, 1999-cup, 2000-*); kiosk artByEra kioskNight (1995-sinai, 1999-basket)
473 | §10 | Bloomfield exterior, Gate 7 approach, Gate 5 approach, inside-stand variants | PARTIAL | exterior ✓, gate-seven hotspot ✓, `gate5` scene ✓ (exit era-gated to 1996-army/1998-laces/1999-basket only). `bloomfield-inside` is one scene with no stand variants; the gate5 room has actors ONLY in era '1996-army', so it is empty in B8/B9
474 | §10 | Ussishkin exterior, queue, hall, edge/corridor, quiet after-game | DONE | ussishkin-outside (+`queue` hotspot), ussishkin-hall (artByEra ussHallNight for 1997/1999), ussishkin-end
475 | §10 | School/classroom for the early decade | DONE | 'classroom' (artByEra classroom98) + 'schoolyard'
476 | §10 | Army room/gate/telephone area, minimal but fully interactive | MISSING | no army LocationId and no scene uses the existing `base` ambience / `amb-base` sample; B6's army days run in home/bloomfield/bus-station/kiosk
477 | §10 | Liron's car and road/stop fragments | PARTIAL | a `plate` (art 'lironCar') plus dialogue nodes road-1..road-3; no walkable car/road scene
478 | §10 | Bus/train/away approach as reusable travel grammar | PARTIAL | one `bus-station` scene + the `travel` effect; each away trip is a bespoke conversation
479 | §10 | Workplace/shift fragment for 1999–2000 | MISSING | no workplace scene; the shift is `t-shift`, two narrated lines. gigs.ts supplies work but in existing rooms
480 | §10 | Ramat Gan approach and interior for both finals | PARTIAL | one stand-in scene 'ramat-gan' (art 'ramatGan'), `actors: []`, `hotspots: []`, no approach/interior split. Its `stuckHe` also asserts 'ארבעים אלף' — a crowd claim matchScripts.ts explicitly removed elsewhere
481 | §10 | Shkhunat Hatikva approach for 13.5.2000 | PARTIAL | 'hatikva' scene exists, stand-in art, `actors: []`, `hotspots: []`
482 | §10 | Do not build a decade by swapping title cards over one street | PARTIAL | street/bedroom/kiosk/hall/classroom age; home/kitchen/ramat-gan/hatikva do not
483 | §10 | Vehicles, signs, clothes, audio, objects, lighting, doors must age | PARTIAL | figures age (hero80→TEEN→SOLDIER→YOUNG_MAN; kobi90-*), doors age (`era`/`whenByEra` on the Bloomfield 'in' exit and the gate5 exit); props/signage mostly do not
484 | §10 | Audio: transistor static evolves into radio/phone/pager era | PARTIAL | `listen` weight ramp in LACES_98 and 'radio-tune'/'radio-open' samples; there is NO pager sample in audio.ts SampleKey — the pager is text only
485 | §10 | Ussishkin: hard reflections, intimate crowd pressure | PARTIAL | dedicated 'hall' AmbienceKey + `amb-hall`, and hall/stadium are in NO_MUSIC; no reverb/reflection treatment in the code
486 | §10 | Gate 5 songs begin small and imperfect, return at scale | PARTIAL | small cluster ✓ (B6 darbuka-three-two, B9 crowd-claps at the kiosk); no scaled return in B10/B11 — the finals use the generic CHANT crowd state
487 | §10 | Silence after Galil, relegations and 1998; do not wallpaper grief | DONE | LACES_98 listen 1→0.05; HALL_NIGHT uses LOW_MURMUR/AFTERMATH; AudioBus NO_MUSIC = ['stadium','hall']
488 | §10 | Double finale recalls motifs without a sentimental trailer | PARTIAL | m00-memory is a genuine motif callback; the audio itself reuses the same crowd states with no motif system
```

## §11 — Economy, time, failure

```
489 | §11 | Every major unit needs at least one resource conflict | PARTIAL | B7 energy+relationship ✓, B8 relationship only, B9 energy ✓, B10 money ✓, B11b time-budget ✓, B11a work-vs-attendance ✓. Money conflict exists ONLY in B10 — B7/B8/B9/B11 have zero `e:'money'` spends
490 | §11 | Fare vs ticket/food | PARTIAL | B6 road-1 (fuel 30₪ / food 15₪) and B10 (michel 2000, ofir 1000); Bloomfield entry is free from 1998 on (`whenByEra` nulls `entry:granted`), and the B11b ticket costs nothing
491 | §11 | Army leave vs future trust | DONE | B6 a3 truth/silent (commanderTrust −15/−20, leaveDebt +1/+2), a4 `armyAbove:{commanderTrust,min:25}`; B11a `t-work-debt` on leaveDebt≥3
492 | §11 | Sleep vs preparation | DONE | d-days sleep(+40) vs work(−15) vs gate5 banner(−20)
493 | §11 | Work shift vs attendance | DONE | t-boss 'go' → t:working, presence 'working', regret+8
494 | §11 | Helping people vs securing position | DONE | B7 h1-corner crates-vs-Bloomfield; B9 seed-corner 'work'; B3 hall-1993 'spot' vs helped:banner
495 | §11 | Keeping a promise vs following the crowd | DONE | B4 `life:promise:g4` → after-efi 'broke-promise-1993'; kobi-double 'promise' vs 'gate5'
496 | §11 | No dead end for lack of money | DONE | free routes exist in every unit (kobi-cup99, kobi-title, walking in B3, radio/away fallbacks); gigs.ts gives paid work in every chapter
497 | §11 | No instant reset after a miss | DONE | WorldScene ~3765 restricts the retry screen to `chapter === '1986' && key === 'missed'`; everything else is an authored ending
498 | §11 | Consequence appears later through behaviour | PARTIAL | consequence.ts + `later:` flags exist, but B7–B11 use `e:'consequence'` exactly ONCE (kobi-cup99 'other' → 'c99:alone'). Otherwise consequence is relationship-gated branches
499 | §11 | Random encounters seeded and QA-reproducible | DONE (vacuously for B7–B11) | rng.ts Roller + SeededRandomState persisted; but era.ts `stageB()` sets `encounters: []` for all of B7–B11, so no encounters exist there
```

## §12 — Red Box

```
500 | §12   | Period physical objects, not RPG loot | DONE | types.ts ItemId is all paper/cloth/coins; redbox.ts candidate notes
501 | B2    | 1991 Ussishkin stub / handwritten note | DONE | redbox.ts CANDIDATES_1991 'note' (school-note), 'stub-1991' (hall-ticket), 'score' — the only per-chapter list besides 1986
502 | B3    | 1993 Cup stub or red paper strip | PARTIAL | ENDINGS_1993 memoryItem only; `candidatesFor()` falls back to CANDIDATES_1986 for every chapter except '1991', so no Cup-specific candidate exists
503 | B4    | 1993 finals travel note / newspaper fragment | PARTIAL | same — ending memoryItem only
504 | B5    | Worn Sinai image, with store/fold/leave choice | DONE | chapter1995sinai s2-poster: 'keep' (life:poster:wall) / drawer / gone
505 | B6    | Army leave form fragment, no sensitive data | MISSING | no such item; ItemId has no leave-form
506 | B6    | Gate 7 or Gate 5 hand-made material | PARTIAL | ENDINGS_DOUBLE['gate5-builder'].memoryItem 'scarf' ("חתיכה מהבד") in B11; nothing in B6
507 | B6    | 1996 deficit/sale newspaper clipping | MISSING | 'clipping' ItemId exists but no B6 candidate or ending uses it
508 | B7/B9 | Basketball relegation stub | PARTIAL | ENDINGS_HALL.hall memoryItem 'hall-ticket' and ENDINGS_SEED.anger 'hall-ticket' — these dispatch `memory.kept` into `state.memories`, NOT `redbox.item_added` into `state.redBox`. The Red Box UI (ProfileCard.tsx:207) reads only `state.redBox`
509 | B8    | 1998 newspaper/radio note | PARTIAL | ENDINGS_LACES witness→'newspaper', organizer→'clipping', radio→'folded-paper'; same `memories`-not-`redBox` gap
510 | B10   | 1999 Cup stub | PARTIAL | ENDINGS_CUP99 all 'ticket-stub'/'folded-paper'; same gap
511 | B11   | 2000 championship and Cup objects | PARTIAL | ENDINGS_TITLE + all 7 ENDINGS_DOUBLE carry memoryItem; same gap. `{ e: 'keep' }` (the only path into `state.redBox`) appears ONLY in dialogue.ts (1986), dialogue1990.ts and dialogue1991.ts — nothing from B3 onward ever puts an object in the box
512 | §12   | Box allows contradictory memories side by side | DONE | events.ts 'memory.kept' is append-only and idempotent on id; nothing removes
513 | §12   | Never force discarding the Cup or Sinai's player image | DONE | no discard mechanic exists; s2-poster 'keep' is a valid terminal state
```

## §14 — Anchors and verification ledger

```
525 | §14   | All exact facts enter via canonical anchor data with source notes | DONE | anchors.ts HistoricalAnchor + PlaceholderNote; anchor-server.ts ANCHOR_SPECS; tests/life-stage-b.test.ts 'states no score and no scorer'
526 | §14   | Verify from an authoritative record; second source for disputed | N/A (process) | every spec carries sourceUrl/sourceTitle, but each row has a single source; the two-source rule is not machine-enforced
527 | B3    | basketball-cup-1993 — 19.4.1993, 71–65 vs Givatayim | DONE | basketball-matches.json + tests/life-anchors-b.test.ts asserts 71/65 and 'הפועל גבעתיים'
528 | B4    | finals G1 — Galil at Ussishkin, 88–73 | DONE | basketball-matches.json 1993-05-09 home 73 away 88 with an explicit winner-first orientation noteHe. (Only the deciding game is exposed as an anchor key)
529 | B4    | series 3–1 to Galil | DONE | all four game rows present; the 3–1 is stated in the G4 row's noteHe, not a typed field
530 | B5    | football-cup-final-1994 — 0–2 | DONE | anchor-server '1994-cup' + test asserts 0/2 vs מכבי תל אביב at Ramat Gan
531 | B5    | football-zimbru-1996 — verification required | PARTIAL | spec exists as `1995-europe` (1995-08-22, זימברו) but NO era references it, so it is unused — which does satisfy "not in dialogue until sourced"
532 | B6    | football-deficit-1996 — amounts need a sourced anchor | DONE (by omission) | no deficit anchor and no amount anywhere; '1997-sale' summaryHe names the sale with a ynet source and no figures
533 | B6    | sinai-departure-1997, Kashtan succeeds | MISSING | 'קשטן' appears in no content file; '1997-sale' summaryHe does not mention the manager change
534 | B6    | football-private-sale-1997 — Sagol/Teomim/Orenstein/Agiv | PARTIAL | '1997-sale' summaryHe says the Histadrut sold to a private group; none of the four buyers is named anywhere in lib/life
535 | B7    | basketball-relegation-1997 | DONE | anchor-server '1997-relegation' summaryHe + basket.co.il source; used by ERA_1997_BASKET
536 | B8    | football-laces-1998 — 2.5.1998 context | DONE | anchor-server '1998' + matches.json both rows for that date
537 | B9    | basketball-relegation-1999 | DONE | anchor-server '1999-relegation' summaryHe; used by ERA_1999_BASKET
538 | B10   | football-cup-1999 — 1:1/3:1, Gershon decisive | PARTIAL | 1:1 ✓ anchor+test; the 3:1 lives only in matches.json noteHe and Gershon is nowhere in lib/life
539 | B11   | football-title-2000 — 13.5.2000 1:1, title clinched | DONE | anchor-server '2000-title' + test (playedOn, atHome false, 1/1, titlesSoFar 12)
540 | B11   | football-cup-2000 — 17.5.2000 2:2, shootout 4:2, Double | PARTIAL | 2:2 + titlesSoFar chain asserted by test; the 4:2 shootout is in noteHe only and `AnchorMatch` has no shootout field
541 | §14   | Caution: sources display winner-first | DONE | every basketball row carries an explicit orientation noteHe ("בסדר מנצח-ראשון; הותאם…")
542 | §14   | Resolve orientation in the archive, test it, narrate from the normalized anchor | DONE | resolveSpec() normalizes by `homeClubSlug === US`; life-anchors-b.test.ts asserts home/away not winner-first; dialogue never states a score
```

## §16 — Acceptance tests

```
567 | §16 | Stage B incomplete unless all below true | PARTIAL | see rows 568–588
568 | §16 | Stage A save reaches B1, B1 reaches B2, no "coming soon" | DONE | chapters.ts chain a7-week→1986→1990→1991; "coming soon" appears only in a comment; tests/life-decade.test.ts asserts it
569 | §16 | Existing B1 saves still replay correctly | DONE | events.ts is an additive fold with blankGate/blankArmy/blankInstitution defaults; life-decade.test.ts 'defaults for a save written before the decade existed'
570 | §16 | Player experiences both 1993 peaks | DONE | chapters '1993-cup' → '1993-galil', both playable, both with beats and match scripts
571 | §16 | Sinai defensible, rupture gradual and remembered | DONE | B5 s1/s2 defending→doubting; B6 a4 broken/reconciled-memory; `life:sinai:broken`/`reconciled` persisted
572 | §16 | Real forced Gate split changing access and relationships | PARTIAL | forced once in B6 (a2:chose); access change is real but limited to 5 `gateEver:'gate5'` gates in B10/B11 — no `gateIs` read after B6
573 | §16 | Gate choice stored as history for a later decade | DONE | GateState.history + gate.moved reducer
574 | §16 | Army service genuinely closes one route and opens another | PARTIAL | B6 closes the Liron trip below commanderTrust 25 and opens the AWOL route; B11a's leaveDebt≥3 closes the ground. B7/B8/B9 unaffected
575 | §16 | No route attends everything without paying | PARTIAL | true for B7 (kobi tension / shachor trust), B11a (debt), B11b (2-of-8). B8 attendance is free of every cost; B10 has a zero-cost Kobi route
576 | §16 | Football near-relegation, danger, purchase, survival are lived events | PARTIAL | B6 a4 (Freddy/Amit, protest-vs-legal, gauges) is lived; the purchase itself is a summaryHe with no named buyers and no scene
577 | §16 | Both relegations form a continuing rupture; the return doesn't reset it | DONE | B7 h2 "עלינו. לא הבראנו"; B9 seed-open "אף אחד לא אמר אז 'הבראנו'. צדקו."; ussishkinWound and seed accumulate across both
578 | §16 | Hapoel Ussishkin seeded, not founded early | DONE | ENDINGS_SEED.list; `supporterOwnershipSeed` only
579 | §16 | Eisenberg as "enemy" is clearly supporter perspective | PARTIAL | the framing device is correct but the man is never named — the statement is true only vacuously
580 | §16 | 1998 trauma uses uncertainty and aftermath, not violence or counterfactual | DONE | l1-laces, l1-whistle, l1-pulled ("לא קרה כלום")
581 | §16 | 1999 Cup ends 1:1/3:1 and can converge but not automatically heal | PARTIAL | 1:1 ✓, convergence ✓ (together/divided), 3:1 never stated
582 | §16 | Stage B does not end on 13.5.2000 | DONE | chapters.ts '2000-title'.next = '2000-double'; t-close "אין קרדיטים"
583 | §16 | 17.5.2000 fully playable, Double fixed in every route | DONE | `d-go` both branches travel to ramat-gan; DOUBLE_00 + d-pens run in all cases; all 7 endings say דאבל
584 | §16 | Ending changes who is present, never whether Hapoel won | DONE | outcomeFamily() reads only relationships/gate/seed/presence
585 | §16 | Michel and Omer ordinary, no memorial foreshadowing | DONE | seed-gate5 / michel-cup99 lines are logistics and a record sleeve
586 | §16 | Melamed uses a darbuka, never a guitar | DONE | asserted by tests/life-stage-b.test.ts; only darbuka samples exist
587 | §16 | Gabi does not exist as a separate character; Gabi is Liron | DONE | characters.ts single `liron` row with the rename comment; life-stage-b.test.ts 'never says Gabi'
588 | §16 | Yosef has zero Stage B spawns/dialogue/schedules/encounters | DONE | characters.ts activeEras ['2000','2010','2020']; life-stage-b.test.ts + life-bible.test.ts both assert it
```

---

# TOP 10 GAPS FOR B7–B11 + GLOBALS

Ranked by how much they block a player from finishing or understanding the unit.

**1. B8's ten-minute aftermath does not exist — and Asaf's reactions are unreachable (rows 283, 284, 285, 291, 267, 299).**
`l1-ten`'s five choices all raise `l1:cut`, and beat `l1-to-class` in `chapter1998laces.ts` is `trigger:'clock'` with no `afterMinute`/`delayMs`, so the very next tick cards straight to the classroom. The brief's centrepiece scene is a menu, and the five `lacesIs` branches of `asaf-laces` can never run. *Fix: gate `l1-to-class` on `afterMinute: FULL_98 + 25` (or on a `l1:left-ground` flag raised by leaving `bloomfield-inside`), so the aftermath is walked.*

**2. LacesResponse is a dead-end stat (rows 265, 299, 300, 301).**
`lacesIs` is read outside B8 in exactly four places, and each is a `hidden` pair (`wait`/`wait2`, `trap`/`trap2`) whose text and effects are byte-identical. The decade's "character forge" changes nothing. *Fix: differentiate the pairs' effects, and add `lacesIs` branches to `c99-pens`/`c99-after` and `d-family`.*

**3. Two goal functions read flags that no code ever sets (rows 247, 260, and every navigation row for B7/B8).**
`goals.ts` `goalHall` tests `'life:hall:h2'` while `chapter1997basket.ts` exports `H2 = 'life:hall:d2'`; `goalLaces` tests `'life:laces:l2'` while `L2 = 'life:laces:d2'`. Both second-day branches are unreachable, so the arrow and the map hint go dark exactly when the chapter switches days. *Fix: one-character rename in `goals.ts`; add a `life-goals.test.ts` case per second day.*

**4. B7 promises an army collision it never charges (rows 250, 399, 400, 403, 491).**
`h1-open` narrates "חופשה של ארבעים ושמונה שעות", but `chapter1997basket.ts` contains no `e:'army'` effect and no `armyAbove`/`armyRoute` condition. The unit's stated three-way squeeze is a two-way one. *Fix: gate the crates/Bloomfield choice on `armyAbove:{commanderTrust,min:N}` and spend `leaveDebt` on whichever is taken.*

**5. The Red Box stops filling after 1991 (rows 502, 503, 505–511, 362).**
`{ e: 'keep' }` — the only producer of `redbox.item_added` — appears only in `dialogue.ts`, `dialogue1990.ts`, `dialogue1991.ts`; `redbox.ts` `candidatesFor()` has lists for 1986 and 1991 only. B3–B11 write `memory.kept` into `state.memories`, which `ProfileCard.tsx` never displays. Nine years of the decade leave the box empty, and B11b's "open the red box" pick shows nothing. *Fix: add `CANDIDATES_<chapter>` lists and an `{e:'keep'}` in each B-unit's terminal node, or render `state.memories` alongside `state.redBox`.*

**6. Six institution gauges are write-only (rows 406–410, 419, 422, 303, 405).**
`institutionAbove`/`institutionBelow`/`sinaiIs` are used zero times outside `chapter1995sinai.ts`. `ussishkinWound`, `protestEscalation`, `legalUnderstanding` and both ownership-trust numbers move all decade and gate nothing — they only appear on the gauges sheet. *Fix: add at least one `institutionAbove` branch per gauge in B9/B10/B11 (e.g. `ussishkinWound` on `d-days-2` 'uss', `protestEscalation` on `seed-gate5`).*

**7. B11 forgets both of its own prior days (rows 350, 370, 385, 423).**
`life:cup99:together` (B10) and `life:title:kobi` / `:efi` / `:gate5` (B11a) are set and read by nothing. The Double's walk home cannot say whether the group already reunited in 1999 or who stood beside him four days earlier — `outcomeFamily()` sees only aggregate bonds. *Fix: read those four flags in `outcomeFamily`/`d-family`.*

**8. The two Cup finals' fixed human actions are absent (rows 328–331, 365, 373, 374, 442, 538, 540).**
No Gershon anywhere in `lib/life`; no תקוה equalizer or extra-time assist; the 3:1 and 4:2 shootouts exist only inside `matches.json` `noteHe`, which `resolveSpec()` discards, so no screen ever states them. The brief's named anchors reach the player as anonymous crowd noise. *Fix: add `shootoutFor/Against` and a scorer list to `AnchorMatch`, populate from a new `match-events.json` row set, and let `CUP_99`/`DOUBLE_00` name them on the board rather than in dialogue.*

**9. B7–B11 have almost no money (rows 489, 490, 345, 361).**
Only `chapter1999cup.ts` spends money (2000 and 1000 agorot). B7, B8, B9, B11a and B11b contain zero `e:'money'` deductions, Bloomfield entry is free from 1998 (`whenByEra` nulls `entry:granted`), and B11b's ticket line says "שישים שקל" while costing nothing. The economy stops being a system in the second half of the decade. *Fix: charge the B11b ticket 6000, add a fare/food gate to B7's two rooms and B9's kiosk night.*

**10. Two required spaces do not exist, and the finals' rooms are empty shells (rows 476, 479, 480, 481, 473).**
There is no army scene at all (the `base` ambience and `amb-base` sample are defined and unused) and no workplace scene. `ramat-gan` and `hatikva` have `actors: []` and `hotspots: []`, so both finals are a card over a painting; `gate5` has actors only in era `'1996-army'`, so it is an empty room in B8/B9. *Fix: add a minimal `army-base` scene reusing the `base` ambience; place at least the route companions as actors in `ramat-gan`/`hatikva` and widen the gate5 actors' `era` to `'B'`.*

**Minor issues worth a line, not in the top ten:** `limor-hall` (scenes.ts:~2480) has no `when`, so on the second Ussishkin night she re-opens `h1-corner`, night one's dialogue; `coveredForOthers` is never incremented, making B11b's `armyAbove:{coveredForOthers,min:0}` always true and its noteHe dead; `l1-ten` has five choices against §9's 2–4 rule; `rachel-laces` points at the recycled `rachel-1993` conversation; `ramat-gan.stuckHe` asserts a crowd size ("ארבעים אלף") that `matchScripts.ts` explicitly removed elsewhere as an unsourceable claim.agentId: a8165e941a8393d89 (use SendMessage with to: 'a8165e941a8393d89', summary: '<5-10 word recap>' to continue this agent)
<usage>subagent_tokens: 332622
tool_uses: 92
duration_ms: 1052395</usage>