Verified against the code. Report follows.

## A5 — 28 Sept 1985 (`a5-first` / `ERA_A5`)

```
144 | A5 | day id/age/"wear the choice publicly" | PARTIAL | chapters.ts a5-first (28.9.1985, wd 6, 13:00) + STAGE_A_DAYS.a5 exist, but stagea-days.ts a5 `built:false` contradicts a playable chapter; age never asserted (age derives from year.entered, birthYear 1978 → 7 ✓)
145 | A5 | first personally prepared matchday | PARTIAL | only prep verb is `shirt-a5` (wear / wear-inside-out); no packing, no object, no ritual steps
146 | A5 | anchor 3–0 v Maccabi Yavne | MISSING | ERA_A5.anchorKey = '1986' (era.ts stageA()); content/manual/matches.json holds ONE 1985/86 row (1986-05-24). No 28.9.1985 row exists
147 | A5 | Sinai ×2, Eckhaus ×1 | MISSING | no scorer data for this fixture anywhere; correct abstention under rule 422, but zero content
148 | A5 | first match in his own shirt, doesn't steal the finale | DONE | ENDINGS_A5.there is a small card, no carnival/anchor screen
149 | A5 | attends as someone who prepared | PARTIAL | `shirt-a5` + `kobi-a5` only; no packing/route/food/return-time layer
150 | A5 | choose/wear the first shirt | PARTIAL | `shirt-a5` sets `a5:dressed` with NO ownership gate — a player who never bought the shirt in A4 (`own:shirt85`) still "wears" it. chapterStageA.ts:846-857
151 | A5 | Kobi notices how Pogi treats it | DONE | `kobi-a5` branch 1: "הוא הסתכל על החולצה. שנייה יותר מדי", remember kobi `saw-the-shirt-1985`
152 | A5 | Rachel: return time and food | MISSING | no Rachel actor with era 'a5-first' anywhere in world/scenes.ts
153 | A5 | Amit brings a fact/newspaper | MISSING | no `amit-a5`; the era-less `amit-kiosk` actor (scenes.ts:1451) bleeds in but speaks 1986 championship lines
154 | A5 | Ofir wants to change the route | MISSING | no Ofir in a5-first
155 | A5 | Aliza keeps an object / warns about the shirt | MISSING | Aliza has a character row (characters.ts:220 `crowd-aliza`) and a portrait key (chapterStageA.ts:46) but NO conversation and NO actor in any scene, any chapter
156 | A5 | route: stay with Kobi | DONE | `kobi-a5` b1 → `travel bloomfield-outside`, +25 min, bond+3
157 | A5 | route: walk partway with Ofir | MISSING | no Ofir; only alternative is walking alone after `a5:kobi-left`
158 | A5 | route: stop for Amit's lineup | MISSING | —
159 | A5 | route: help a supporter with a bundle | MISSING | ERA_A5.encounters = [] (era.ts stageA())
160 | A5 | do not recreate full football gameplay | DONE | no `match` action, no matchScript for a5-first
161 | A5 | stadium exploration / partial views / crowd rhythm / radio fragments | MISSING | `a5-in` at bloomfield-tunnel immediately runs `a5-close` → ending. The player never enters bloomfield-inside
162 | A5 | stay oriented in Gate 7, return to Kobi | MISSING | chapter ends at the tunnel mouth; `kobi-a5-gate` is a one-line actor at bloomfield-outside
163 | A5 | joyful but not staged like the championship | DONE | ENDINGS_A5, no cutscene (ERA_A5.cutscene = null), no carnival
164 | A5 | creates a normal happy match memory | PARTIAL | memory.kept `a5-first-there` written by finishChapter; nothing reads it later
165 | A5 | Pass 4.1 build the first-shirt matchday | PARTIAL | 5 beats, 5 conversations, 2 endings; no schedule/opportunities/encounters (era.ts:417-419)
```

## A6 — Winter 1985/86 (`a6-radio` / `ERA_A6`)

```
166 | A6 | day id, "loyalty survives an ordinary hard day" | DONE | chapters.ts a6-radio; BEATS_A6 + ENDINGS_A6 (heard/liron/quiet) all deliver an unremarkable day
167 | A6 | radio, disappointment, friendship | PARTIAL | radio ✓ (`radio-a6`), disappointment ✓ (endings), friendship = Liron only
168 | A6 | ordinary loyalty, life outside trophies | DONE | ENDINGS_A6.heard "יש עוד שבת"; no reward events
169 | A6 | verified winter match context, no hardcoded detail | DONE | ERA_A6.anchorKey='1986'; no score/opponent/date stated in any A6 line — correct abstention
170 | A6 | rain/cold changes street and movement | PARTIAL | narrated only ("גשם על התריס"); ambient = AMBIENT_1990 (era.ts:421), same as every other Stage A day; no weather layer, no movement change
171 | A6 | money is short | MISSING | no money event on a6-open (contrast a4-open/a5-open which dispatch money.changed); agorot is simply 0 from year.entered
172 | A6 | Kobi may not go, or choose radio over travel | PARTIAL | hardcoded: `a6-open` unconditionally raises `kobi:left`; no branch
173 | A6 | friends want different things | MISSING | only actor besides Rachel is `liron-a6`
174 | A6 | path: listen with Kobi, learn how he reacts | MISSING | Kobi is gone before minute one
175 | A6 | path: join Ofir outside | MISSING | no Ofir in a6-radio
176 | A6 | path: table with Amit + Liron's radio | PARTIAL | Liron ✓ (`liron-a6` hold-the-wire); no Amit, no table
177 | A6 | path: keep a promise to Rachel | MISSING | `rachel-a6` has zero choices in both branches
178 | A6 | path: follow Efi if Ussishkin open | MISSING | no Efi; `life:knows:hall` is never consulted in A6
179 | A6 | path: Keren, non-Hapoel | MISSING | no Keren in a6-radio
180 | A6 | free movement while commentary continues | PARTIAL | movement is free, but the radio is a hotspot flag (`a6:on`) with no running commentary — no audio bed, no minute-by-minute
181 | A6 | reception varies by position and radio condition | MISSING | one timed beat `a6-dies` at 15:35; no position term. TransistorNet (runtime) exists but is wired to chapter '1990' only (WorldScene.ts:3208)
182 | A6 | other radios through windows, delayed/conflicting | MISSING | ERA_A6.encounters = []; the `street-radio` encounter is era '1986'
183 | A6 | Amit interprets / Liron improves / Kobi reacts | PARTIAL | Liron only
184 | A6 | may miss a goal while doing something physical | PARTIAL | the 40-min Liron detour can overrun `a6-end` (16:50), but no goal event exists to miss
185 | A6 | no grand reward | DONE | endings give loyaltyReturn +2/+3 or loneliness +2 only
186 | A6 | memory is who he was with | DONE | `a6-end` derive → `a6:end-liron` / `-heard` / `-quiet` → three distinct endings
187 | A6 | supplies relationship pressure that resurfaces in A7 | MISSING | `a6:with-liron` and remember liron `held-the-wire-1986` are never read by any A7/A8 `when`
188 | A6 | Pass 4.2 build the winter radio day | PARTIAL | 3 beats, 4 conversations; two real paths out of six
```

## A7 — 17–23 May 1986 (`a7-week` / `ERA_A7`)

```
189 | A7 | day id, "pressure, promises, family rupture" | PARTIAL | chapters.ts a7-week (17.5.1986, 16:00) — a single afternoon, not the 17–23 span the brief asks for (contrast chapter1993galil.ts which does multi-day via day.entered)
190 | A7 | convergence and consequence preview | MISSING | no convergence: 4 actors, 4 conversations, no callback to A2–A6
191 | A7 | converge all Stage A relationships | MISSING | Rafi/Ilan/Efi/Keren/Liron/Barry/Aliza absent from a7-week
192 | A7 | anchor 17.5.1986 2–1 at Hapoel Be'er Sheva | MISSING | no such row in matches.json; ERA_A7.anchorKey='1986'
193 | A7 | experienced through radio, rumours, adults calculating | MISSING | no radio hotspot with era 'a7-week'; `radio-a6` is a6-only
194 | A7 | away result via radio/neighbours/table calculations | MISSING | a7-open is two narration lines; no result is ever delivered
195 | A7 | Pogi does not control the result | DONE | vacuously — no result mechanic
196 | A7 | Amit works through what the final round means | DONE | `amit-a7` → flag `a7:knows`, give `newspaper`, bond+3, historyMemory+2
197 | A7 | Liron's radio becomes socially important | MISSING | no Liron in a7-week
198 | A7 | Rafi's kiosk as information hub | MISSING | the kiosk `shopkeeper` actor is era-less so Rafi is standing there, but he speaks `kiosk-man` — the 1986 championship-day conversation. No A7 content
199 | A7 | Ilan's comic mis-repeated information chain | MISSING | `neighbour`/`אילן השכן` actor is era '1986'-scheduled only; no a7 variant
200 | A7 | Barry appears briefly at Gate 7 | MISSING | Barry exists only in a5-first (as "אוהד ותיק") and 1986
201 | A7 | Aliza knows which ticket to keep | MISSING | Aliza is unimplemented everywhere
202 | A7 | short playable vignettes, not exposition | MISSING | zero vignettes
203 | A7 | vignette: school concentration slips | MISSING | `classroom` scene exists but has no a7-week era content
204 | A7 | vignette: children argue who will score | MISSING | —
205 | A7 | vignette: the shirt is drying, won't be ready | MISSING | no shirt hotspot with era 'a7-week' (scenes.ts:465 is a5-first only)
206 | A7 | vignette: adults discuss crowds/tickets in half-sentences | MISSING | —
207 | A7 | vignette: Rachel notices Pogi is building a plan | MISSING | `rachel-a7` is two branches, no choices
208 | A7 | vignette: friends form incompatible plans | PARTIAL | `ofir-a7` me-too/dad only
209 | A7 | refusal reason: no ticket + fear of the crowd | PARTIAL | `kobi-a7`: "לא משחק לילדים"; `rachel-a7`: "יותר מדי אנשים, ואתה קטן מכולם". No ticket reason stated
210 | A7 | he is not cruel, his concern is not foolish | DONE | ENDINGS_A7.refused; Rachel backs him
211 | A7 | high trust: explains and asks a painful promise | MISSING | no relationship gate on any kobi-a7 branch
212 | A7 | low trust: shorter, checks if lying | MISSING | same
213 | A7 | repeated reliability: almost changes his mind | MISSING | same
214 | A7 | prior trouble/injury: fear dominates | MISSING | same
215 | A7 | strong Rachel trust: forces the truth | MISSING | `rachel-a7` has no choices
216 | A7 | weak Rachel trust: believes the Ofir excuse | MISSING | same
217 | A7 | Kobi must still leave without Pogi | DONE | A8: WorldScene.timeTriggers raises `kobi:left` at KOBI_LEAVES (15:10) unconditionally
218 | A7 | after the door closes, no immediate "Go to Bloomfield" | PARTIAL | in A8, `ERA_1986.objective` returns OBJECTIVES.onTheWay ("ללכת אחרי האנשים, מזרחה") the instant `kobi:left` is raised — the opposite of the rule
219 | A7 | return control in silence | MISSING | A7 ends on the refusal (`{e:'ending'}` on the same choice); there is no silent room
220 | A7 | may sit / count money / look at shirt / talk to Rachel / find Ofir | MISSING | chapter is over the moment the refusal lands
221 | A7 | objective appears only after Pogi commits | MISSING | see 218
222 | A7 | Pass 4.3 convergence, refusal, silence | PARTIAL | refusal ✓ (3 endings); convergence and silence absent
223 | A7 | editable assumption #3 in force | PARTIAL | tone varies by choice, not by prior promises/conflict; no relationship reads
```

## A8 — 24 May 1986 (`1986` / `ERA_1986`)

```
224 | A8 | day id, "choose Hapoel independently", master event | DONE | chapters.ts '1986' (24.5.1986, 12:35, bedroom/start); STAGE_A_DAYS.a8 `built:true`
225 | A8 | Hapoel 1–0 Maccabi Haifa | DONE | matches.json:341-351 (confidence 2, ynet source); read via anchor-server, never typed in a line
226 | A8 | Landau, 86th minute | DONE | anchor.match.decidedBy → WorldScene.scoreGoal toast `${goal.scorerHe}. דקה ${goal.minute}.`; `decidingMinute(anchor)` drives matchPace
227 | A8 | became champion | DONE | anchors.ts titlesSoFar computed from trophies.json
228 | A8 | archival video plays after he gets inside | DONE | cutscenes.ts CUTSCENES['1986-championship'] (yt dFykPEa8NAE); fired from WorldScene.stageGoal inside `final-86`
229 | A8 | after the video control returns, player searches | DONE | returnFromArchive() → startCarnival, controls restored, no teleport
230 | A8 | sourced to Red-Fans match list | DONE | sourceUrl on the matches.json row (ynet, not Red-Fans, but sourced and confidence-2)
231 | A8 | movement / route reading returns | DONE | world/scenes.ts rooms + world/route.ts + goal1986
232 | A8 | money and saved resources return | MISSING | `enterChapter` dispatches `year.entered` which zeroes `agorot`; chapters.ts '1986' has no `entry`; NOTHING in 1986 uses `{e:'withdraw'}` — `state.savings` is unreachable in A8. The tin from A4 is dead weight
233 | A8 | promises and truth return | PARTIAL | truth/lie to Rachel works within the day (`told:rachel`/`lied:rachel`, dialogue.ts:288-302); A7's `life:a7:refused` / `life:a7:promised` are written and never read anywhere in the repo
234 | A8 | friends and supporter network return | PARTIAL | Ofir/Amit/Efi/Keren/Barry present (SCHEDULE_1986, dialogue.ts); Liron and Aliza absent
235 | A8 | knowledge from newspapers/radio returns | DONE | `amit-street`/`amit-kiosk`, `radio`, `street-radio` encounter → `knows:match`, `knows:gate7`
236 | A8 | energy and time return | DONE | opportunities1986.ts costs {minutes, energy}; clock.advanced
237 | A8 | street football confidence returns | PARTIAL | `pitch-kids`/`pitch-ball` → `{e:'minigame', id:'football'}`; no confidence carried in from A2's `first-team-1984`
238 | A8 | optional Ussishkin identity returns | PARTIAL | `efi-hall` opportunity + `efi-hall-after` exist, but gate on nothing from A3 (`life:knows:hall` is read only by doors/map, never by 1986 dialogue)
239 | A8 | objects and clothing return | PARTIAL | inventory ✓; clothing: `wearingAt()` is called once at chapter end (rememberWhatYouWore, WorldScene:4152) purely to stamp a `own:worn:` flag — the shirt is never worn, seen, or referenced in A8
240 | A8 | navigating crowds without quest arrows | PARTIAL | no arrow to Kobi, but `goal1986` + world/route.ts paint a directional exit label the whole way to bloomfield-inside
241 | A8 | expand the current opening, don't replace | DONE | ERA_1986 kept intact; Stage A chapters were added alongside
242 | A8 | bedroom: shirt, poster, key, Red Box | PARTIAL | scenes.ts bedroom has `poster`, `desk` (key), `redbox`, `bed`. NO shirt hotspot in era '1986' (`shirt-a5` is era 'a5-first')
243 | A8 | home: Kobi with the real newspaper | DONE | `kobi-morning` (4 branches), `coffee-table`, kobi actor scheduled home 12:00–15:10
244 | A8 | kitchen: Rachel and bottles/food | DONE | `rachel-kitchen` (5br), `rachel-chore`, `bottles`, `kitchen-table`
245 | A8 | schedules visibly begin before Pogi engages | DONE | SCHEDULE_1986 DAY_START = 12:00, chapter opens 12:35
246 | A8 | the eight appear only where relationship supports it | PARTIAL | placement is by clock only — no `when` on any SCHEDULE_1986 row; Liron/Aliza never appear at all
247 | A8 | do not line them up as helpers | DONE | schedules drain eastwards; opportunities expire (goneHe lines)
248 | A8 | pre-departure: Rachel's errand | DONE | opportunity `rachel-bottles` (expires KOBI_LEAVES) + `rachel-chore`
249 | A8 | pre-departure: last alley match | DONE | opportunity `ofir-game` (expires 14:50, 35 min, 18 energy)
250 | A8 | pre-departure: read the table with Amit | DONE | opportunity `amit-paper` (13:00–14:40)
251 | A8 | pre-departure: Ofir's faster route | PARTIAL | `route-shortcut` exists but gates on `personalityAbove streetSmarts ≥14`, not on Ofir
252 | A8 | pre-departure: help Liron carry/repair the radio | MISSING | no Liron in 1986
253 | A8 | pre-departure: recover the shirt if left drying/hidden | MISSING | no shirt object in the 1986 bedroom at all
254 | A8 | pre-departure: buy food or preserve money | DONE | `kiosk-man` (bottles/paper/card/nothing), `kiosk-paper` −200, `kiosk-card` −100 vs the 1500 ticket
255 | A8 | pre-departure: wait for Kobi to reconsider | PARTIAL | `kobi-morning` opportunity (10 min) + `kobi-refuse`; waiting past 15:10 costs the day but is not itself an offered action
256 | A8 | the player cannot complete all of these | DONE | six overlapping opportunities with minute costs and hard expiries
257 | A8 | route: tell Rachel the truth | DONE | `rachel-kitchen` truth → `told:rachel` + `rachel:knows`
258 | A8 | route: lie that he's going to Ofir | DONE | same conversation → `told:rachel` + `lied:rachel`
259 | A8 | route: leave without speaking | DONE | the branch is gated `notFlag: 'told:rachel'`; leaving simply never sets it
260 | A8 | route: ask Ofir to come | PARTIAL | `ofir-knows`/`ofir-matchday`/`ofir-ground` exist; Ofir's cousin gets you IN (`entry:ofir`) but there is no "come with me" commitment before departure
261 | A8 | route: follow the red crowd alone | DONE | route scene fans + `route-stream`/`street-pole`; `went:alone` read by finale.ts
262 | A8 | no route morally labelled | DONE | finale.ts becameLine — four sentences, explicitly not a ladder
263 | A8 | each route alters fear, trust, help, reunion | PARTIAL | reunion ✓ (5 kobi-found branches); fear/trust ✓ within-day; "available help" is gated on streetSmarts/bond, not on route
264 | A8 | "follow the reds" + density/architecture/sound, no GPS | PARTIAL | crowd actors + AMBIENT_1986 + tunnel; but world/route.ts prints a labelled directional exit ("לאצטדיון") which is closer to a signpost than to density
265 | A8 | escalation 1: familiar street | DONE | `street` scene
266 | A8 | escalation 2: first isolated supporter | PARTIAL | `route-fan` actor, but it's already in the route room, not a graded step
267 | A8 | escalation 3: buses/cars, open windows | DONE | encounter `route-bus`
268 | A8 | escalation 4: food smoke and vendors | MISSING | no vendor in 1986 (`vendor-1990` is dialogue1990.ts); no smoke layer on route
269 | A8 | escalation 5: larger red groups | PARTIAL | route has 3 fan actors; no density ramp
270 | A8 | escalation 6: first stadium glimpse | DONE | `bloomfield-outside` arrival + `saw:ground`
271 | A8 | escalation 7: compressed exterior crowd | PARTIAL | `gate-push` encounter + terraceCrowd fill; no compression mechanic
      | | | | NOTE: 7 escalations are served by 3 rooms (street → route → bloomfield-outside), with `allenby` as an optional detour
272 | A8 | obstacle: wrong turn following the wrong group | MISSING | `route-shortcut` is a knowledge reward, not a wrong turn; no misdirection exists
273 | A8 | obstacle: dropped coins / torn pocket | DONE | encounter `street-lost` (requires hasItem coin) → take coin, −100, stress +6
274 | A8 | obstacle: help another child or go on | MISSING | no lost-child beat in 1986 (`street-lost` is about a coin)
275 | A8 | obstacle: traffic crossing with an adult | DONE | encounter `route-help` → stress −8, community +6, `knows:route`
276 | A8 | obstacle: crowd surge costing time/energy | PARTIAL | encounter `gate-push` costs stress only, no time or energy
277 | A8 | obstacle: vendor offering unaffordable food | MISSING | —
278 | A8 | obstacle: somebody recognising Kobi's name | DONE | encounter `kiosk-queue` (Ilan) and `gate-veteran` b1 ("אתה של קובי?")
279 | A8 | never teach a real security bypass | DONE | `gate-turnstile` is observational; `gate-family` truth-route is being taken in by an adult; no climbing/jumping route exists
280 | A8 | entry family 1 — ticket | PARTIAL | `ticket-window` at minAgorot 1500. But 1986 total obtainable income is exactly 1500 (Kobi 500 + Rachel 500 + gutter-coin 100 + bottles 300 + street-coin 100) and requires every source and zero spending — the legitimate route is functionally a perfect run
281 | A8 | entry family 2 — Ofir/network | DONE | `ofir-ground` → `entry:granted` + `entry:ofir`
282 | A8 | entry family 3 — known by Kobi's people | DONE | `gate-veteran` b1 gated `hasItem newspaper` + `bond kobi ≥60` → `entry:name`
283 | A8 | entry family 4 — adult kindness fallback, always available | DONE | `gate-veteran` fallback → `gate-veteran-in`; also `gate-family`
284 | A8 | fallback must not feel like a free dialogue button | DONE | costs 22 minutes and requires answering "ומי מחכה לך בפנים?" out loud; two answers write different memories (`told-him-about-kobi` / `said-nobody`)
285 | A8 | tunnel step 1: outside pressure | DONE | bloomfield-outside crowd + `gate-push`
286 | A8 | step 2: narrow concrete darkness | DONE | components/life/TunnelWalk.tsx, first-person, fired at WorldScene:2909
287 | A8 | step 3: muffled sound | DONE | AmbienceKey 'tunnel' + game.ts:126 tunnel progress the shell's sound follows
288 | A8 | step 4: light ahead | DONE | TunnelWalk fog ink→cream with distance to exit
289 | A8 | step 5: crowd sound opens | DONE | same progress term
290 | A8 | step 6: camera reveals the full stadium | DONE | `panoReveal` (WorldScene:3151-3154) → openPano → arrivedInside
291 | A8 | step 7: UI disappears for several seconds | DONE | `controls {visible:false}` + `prompt null` on tunnel entry, restored after the reveal
292 | A8 | step 8: Pogi stays visually tiny | DONE | ERA_1986.player has no scale (1.0 vs TEEN 1.22 / YOUNG_MAN 1.26) against GATE7 terrace band
293 | A8 | play the supplied match video as his experience | DONE | stageGoal() plays it AT the goal step of `final-86`, not as a framing device
294 | A8 | set historical_cutscene:1986_championship = completed | PARTIAL | equivalent flag exists under a different name: `cutscene:1986-championship` (cutscenes.ts completionFlag), plus `watched:1986-championship`
295 | A8 | set goal:landau = witnessed | MISSING | no `goal:landau` anywhere in the repo; nearest is `saw:goal` (undifferentiated)
296 | A8 | set match:1986_championship = completed | PARTIAL | `match:over` + `anchor.attended`/`presence.recorded` carry the meaning under other names
297 | A8 | then activate only "למצוא את אבא" | DONE | ERA_1986.objective returns OBJECTIVES.findKobi only when sceneId==='bloomfield-inside' && matchOver; checklist step 'kobi' revealWhen `saw:goal`
298 | A8 | do not teleport Pogi to Kobi | DONE | `kobi-crowd` actor at x 0.7 with `when {flag:'match:over'}` — you walk to him
299 | A8 | no finale card before the search | PARTIAL | normally yes (finishChapter is called by `kobi-found`'s ending). But `lastResort()` (WorldScene:1817) fires unconditionally once `livedFor >= 22*60` and picks `['home','missed','late','played'].find(...)` → 'home' — closing 1986 with the reunion card and no `found:kobi`
300 | A8 | layered crowd motion | DONE | terraceCrowd(GATE7_ROWS…) + LivingWorld
301 | A8 | strangers embrace Pogi | PARTIAL | `terrace-fan` "תזכור את היום הזה, ילד"; `m86-breath` choice 'hand'. No embrace beat
302 | A8 | flags and paper | DONE | startCarnival() — 34 tumbling red/cream strips
303 | A8 | controlled camera shake | DONE | scoreGoal: camera.shake(1200, 0.009) + flash + zoom Back.easeOut
304 | A8 | short loss of direct movement | DONE | scoreGoal sets paused=true, timeScale=0, controls hidden for ~7.2 s
305 | A8 | audio surge then subjective muffling/breath | DONE | CROWD_PLAN GOAL_BURST (0.85 / 5200 Hz) → AFTERMATH (0.34 / 1200 Hz) in the `final-86` script; `m86-breath` conversation
306 | A8 | regains orientation and remembers Kobi | DONE | delayed toast "הוא איפשהו כאן. תמצא אותו." (returnFromArchive, 7 s)
307 | A8 | search Gate 7 by landmarks and remembered descriptions | PARTIAL | one room, one named actor; `gate-seven` look-object gives the description but nothing gates on it
308 | A8 | people respond differently if he knows Barry/community | MISSING | `terrace-fan` has two branches, both keyed on `match:over` only
309 | A8 | the shirt makes him recognisable | MISSING | no branch anywhere reads a shirt flag
310 | A8 | may climb for a view, ask, listen, follow a chain | PARTIAL | `terrace-fan` says "תעלה על המדרגה" but there is no climb verb; `terrace-rail` is a one-line look
311 | A8 | no exact waypoint until accessibility is enabled | PARTIAL | no arrow, but the actor carries a permanent `nameHe: 'קובי'` label; checklist names the step
312 | A8 | reunion: Rachel knew, Kobi has been searching | DONE | `kobi-found` b0 `when {flag:'rachel:knows'}`
313 | A8 | reunion: promised to wait and broke it | DONE | b1 `when {relationshipMemory:{who:'kobi', eventId:'promised-to-wait'}}`
314 | A8 | reunion: somebody used Kobi's name | DONE | b2 `when {flag:'entry:name'}`
315 | A8 | reunion: Pogi lied to Rachel | DONE | b3 `when {flag:'lied:rachel'}`
316 | A8 | reunion: default disbelief/anger/fear/relief | DONE | b4 fallback
317 | A8 | no sentimental "you became a man" speech | DONE | longest branch is 7 lines; "אמרתי לך עוד שנה־שנתיים. טעיתי."
318 | A8 | first concern is physical safety | DONE | b0 "תסתכל עליי. שאני אראה שאתה שלם."
319 | A8 | humour only after relief | DONE | b2 "אמא הולכת להרוג את שנינו." after he stops trying to look angry
320 | A8 | make the walk home briefly playable | MISSING | `kobi-found` ends with `{e:'keep'},{e:'ending', id:'home'}` → card → PassageScene. 1986 never raises `walked:home` (only 1990/1991/1993-cup do)
321 | A8 | Kobi and Pogi walk side by side | MISSING | narrated in ENDINGS.home.bodyHe only
322 | A8 | Pogi can speak or stay quiet | MISSING | —
323 | A8 | street aftermath replaces buildup | MISSING | no post-match street state
324 | A8 | discarded paper, distant singing | MISSING | —
325 | A8 | Kobi adjusts pace | MISSING | —
326 | A8 | final line changes with trust/promise/entry route | PARTIAL | the ENDING CARD is fixed per id (home/late/missed); variation lives in `kobi-found`'s branch and finale.ts becameLine, not in a walk-home line
327 | A8 | Rachel truth route: anger + acknowledgement | MISSING | no Rachel scene after the reunion
328 | A8 | Rachel lie route: quiet disappointment | MISSING | —
329 | A8 | Rachel secret-help route: a shared look | MISSING | —
330 | A8 | Rachel no-contact route: fear before anger | MISSING | —
331 | A8 | Pogi PLACES one earned object in the Red Box | PARTIAL | `{e:'keep'}` → pickRedBoxItem() is a seeded weighted ROLL (redbox.ts:169), not a choice; no bedroom scene, no placing
332 | A8 | option: ticket stub if legitimately obtained | DONE | CANDIDATES_1986 'stub' `when {hasItem:'ticket-stub'}`, rare, w5
333 | A8 | option: folded paper if helped in | PARTIAL | 'folded' candidate exists but is UNCONDITIONAL (w1) — it is the always-eligible fallback, not tied to being helped in
334 | A8 | option: shirt-related object | MISSING | no shirt candidate in CANDIDATES_1986
335 | A8 | option: scarf if community carried him | DONE | 'scarf' `when {hasItem:'scarf'}`, legendary — obtained from the `gate-scarf` encounter
336 | A8 | option: the 1983 object beside the 1986 one | MISSING | `life:a1:red` is never a Red Box candidate; nothing files a 1983 object
337 | A8 | inherited memory sitting beside chosen memory | MISSING | see 336 — the box can only ever hold one object from this Saturday
338 | A8 | championship mandatory for Stage B | PARTIAL | finishChapter intercepts chapter '1986' + key 'missed' → retry (WorldScene:3766-3771). But 'late' advances, and lastResort can emit 'home' without `found:kobi`
339 | A8 | failure trigger: stayed home until it's over | PARTIAL | only via the `bed` conversation's 'sleep' choice (dialogue.ts:49), gated `when {flag:'match:over', notFlag:'found:kobi'}` — a deliberate button, not a time-out
340 | A8 | failure trigger: arrived too late for the film | MISSING | `arrived:late` maps 'home'→'late' (finishChapter), a NORMAL ending that completes the chapter and advances to 1990
341 | A8 | failure trigger: exhausted every safe entry path | MISSING | the kindness fallback is always open, so this state cannot be reached — arguably by design, but no trigger exists
342 | A8 | failure trigger: abandoned the route, went home | MISSING | RETRY_1986.turnedBack scene EXISTS and retryFor() can select it, but nothing raises the 'missed' ending from walking home — only `bed`+'sleep' does
343 | A8 | failure trigger: soft-lock detected | MISSING | lastResort() exists but picks 'home' (a success ending) for 1986, never 'missed' → never routes to retry
344 | A8 | failure ending: stayed home | DONE | RETRY_1986.home
345 | A8 | failure ending: arrived late | DONE | RETRY_1986.late (unreachable — see 340)
346 | A8 | failure ending: no entry | DONE | RETRY_1986.outside
347 | A8 | failure ending: returned home | DONE | RETRY_1986.turnedBack (unreachable — see 342)
348 | A8 | failure text "היום הזה נגמר. אבל עוד לא ככה." | DONE | retry1986.ts CLOSE, on all four
349 | A8 | restart championship morning from a clean checkpoint | DONE | LifeEngine.restartDay() slices the log to the last `chapter.entered`; LifeStage.tsx:1126 → reload
350 | A8 | preserve only knowledge, not story flags/money/relationships | DONE | log truncation replays from emptyState — the failed run's events are gone entirely
351 | A8 | do not replay A1–A7 | DONE | every earlier chapter's events are before the cut
352 | A8 | Pass 2.3 keep paths, change finale-miss to retry | PARTIAL | done for 'missed' only (see 339-343)
353 | A8 | Pass 2.4 video completes before find:kobi | DONE | stageGoal → playCutscene → returnFromArchive; objective gates on `matchOver` + bloomfield-inside
354 | A8 | Pass 5.1 expand schedules and callbacks | PARTIAL | SCHEDULE_1986 (11 rows) predates the brief; ZERO callbacks — no Stage A relationshipMemory or `life:` flag is read by any 1986 condition
355 | A8 | Pass 5.2 route variations and safe entry families | PARTIAL | entry families ✓ (4–5); route variation is one shortcut behind a personality gate
356 | A8 | Pass 5.3 polish tunnel/reveal/video/search/reunion/walk-home | PARTIAL | tunnel/reveal/video/reunion strong; search thin; walk-home absent
357 | A8 | Pass 5.4 failure variants and same-day checkpoint | PARTIAL | 4 variants + checkpoint built; 2 of 4 unreachable, 3 of 5 triggers missing
358 | A8 | Stage B unlocks only after reunion + completion | PARTIAL | dismissFinale → PassageScene → 1990, keyed off the ending card, not off `found:kobi`; lastResort can produce that card without a reunion
```

## REQUIRED NEW STATE CONCEPTS (§5)

```
359 | ALL | stageADayId | PARTIAL | type StageADayId + STAGE_A_DAYS exist (stagea-days.ts); `state.stageADay` is written ONLY by `day.entered`, and Stage A's chapter chain uses `enterChapter` → `year.entered` (WorldScene:4455). So stageADay is never set for any Stage A day. Only 1993-galil/1995/1996/1997/1998 write it
360 | ALL | childhood savings distinct from pocket cash | DONE | `state.savings` (types.ts:484), `savings.changed` event, `{e:'save'}`/`{e:'withdraw'}` effects; untouched by day.entered and year.entered
361 | ALL | ownedClothing including the first shirt | DONE | `state.clothing` (types.ts:486) + `clothing.gained`; `own:shirt:visa86` flag survives via personFlags `own:` prefix
362 | ALL | dayOutcome | MISSING | no such field, no equivalent; endings are cards, not recorded state
363 | ALL | mandatoryMilestones | MISSING | no milestone concept anywhere in lib/; the mandatory finale is a hardcoded `chapter==='1986' && key==='missed'` branch
364 | ALL | promiseFlags surviving day transitions | PARTIAL | the `promise:` prefix IS in personFlags (events.ts:280) but nothing writes it — the only promise flags are `life:promise:g4` (1993) and `life:a7:promised` (write-only)
365 | ALL | relationshipMemory callbacks by day | PARTIAL | RelationshipMemory rows carry {characterId, eventId, significance, year, atMinute} — no dayId. Only 3 `relationshipMemory:` conditions exist in the whole repo, none of them Stage A
366 | ALL | story meaning as memory rows, not anonymous numbers | DONE | eventIds are sentences: `gave-the-tin-1985`, `held-the-wire-1986`, `said-no-1986`, `saw-the-shirt-1985`, `first-team-1984`, `said-my-name-1984`
```

## PERSISTENT STAGE A STATE — DAY TRANSITION (§5)

```
367 | ALL | day-level transition without abusing year.entered | MISSING (for Stage A) | the event exists and is correct, but Stage A specifically abuses `year.entered` — WorldScene.enterChapter:4455 is the only path between A2…A8
368 | ALL | recommended event shape | PARTIAL | events.ts:113-122 has {t, dayId, year, month?, day?, weekday, minute, dateHe?}. `month` and `day` are declared but the reducer (events.ts:412) ignores both
369 | ALL | resets clock and available time | DONE | minute: event.minute; resources.availableTime: 0
370 | ALL | resets energy | DONE | energy: 100, resources.energy: 100
371 | ALL | resets temporary carried items | DONE | inventory: {}, agorot: 0
372 | ALL | resets schedules and opportunities | DONE | opportunities: [], encounters: {}
373 | ALL | resets scene-local flags | DONE | flags: personFlags(state.flags)
374 | ALL | preserves bonds and every relationship axis | DONE | `relationships` untouched by the reducer case
375 | ALL | preserves relationship memories | DONE | `relationshipMemory` untouched
376 | ALL | preserves personality and Red Heart | DONE | `personality` / `redHeart` untouched
377 | ALL | preserves long-term savings | DONE | `savings` untouched (and explicitly documented at events.ts:405-411)
378 | ALL | preserves owned clothing | DONE | `clothing` untouched; `own:` prefix kept
379 | ALL | preserves Red Box items | DONE | `redBox` untouched
380 | ALL | preserves known routes and learned facts | PARTIAL | only if authored with a surviving prefix — `life:knows:hall` survives, plain `knows:hall`/`knows:route`/`knows:match` do NOT (a3 writes both, deliberately; 1986 writes only the plain form)
381 | ALL | preserves promises, lies and important failures | PARTIAL | `life:`/`promise:` prefixed ones survive; `lied:rachel`, `told:rachel`, `a7:said-yes` do not
382 | ALL | preserves injuries/trouble lasting into the next day | MISSING | wellbeing.exhaustion is reset to 0; there is no injury/trouble state at all
```

## GLOBAL — THESIS / SUPERSESSION / PRODUCT TARGET (§0–§2)

```
383 | ALL | born into Hapoel 1983, chooses it 24.5.1986 | DONE | PROLOGUE (chapter1986.ts) "לא בחרת בו" → "ואת זה כבר תבחר לבד"; CONVERSATIONS_A1 `a1-1983`
384 | ALL | supersedes the old timeline | N/A | a document-precedence rule, not code
385 | ALL | born 1978; five in 1983, eight in 1986 | DONE | DEFAULT_IDENTITY birthYear 1978 (chapter1986.ts:35); age = year − birthYear in every year/day event
386 | ALL | eight key days, not one Saturday, not a calendar | PARTIAL | eight declared (STAGE_A_DAYS); seven playable (a1 prologue + a2…a7 + 1986); each is a separate CHAPTER, not a day — so day.entered/stageADay never engage
387 | ALL | finale mandatory, route-specific failure, restart | PARTIAL | see 338-343: one trigger of five, two of four scenes reachable
388 | ALL | Ussishkin substantial optional, doesn't block football | PARTIAL | optional ✓ (a3-hall never gates 1986); "substantial" is 3 beats / 2 conversations / 2 endings
389 | ALL | current 1986 day extended not discarded | DONE | ERA_1986 unchanged; 57 conversations, 11 schedule rows, 6 opportunities, 12 encounters all intact
390 | ALL | ~90–120 min first play | PARTIAL | seven chapters exist; A5/A6/A7 are 3–5 beats each and close in minutes. No instrumentation to verify
391 | ALL | free movement through all named spaces | DONE | LocationId covers home/kitchen/bedroom/street/kiosk/pitch/route/allenby/bloomfield-{outside,tunnel,inside}/ussishkin-{outside,hall,end}
392 | ALL | physical actions instead of menu chains | PARTIAL | hotspots carry verbs (look/sit/…) and TunnelWalk/Panorama/minigame are physical; the bulk of A5–A7 is still `talk → choice`
393 | ALL | time, money and energy creating real conflicts | PARTIAL | true in 1986 (opportunity costs + expiries); in A5–A7 there are no opportunities and money is never spent
394 | ALL | characters move and leave without waiting | DONE | schedules.ts placementsAt + goneHe on every opportunity — but only in 1986/1990/1991
395 | ALL | minigames, errands, exploration, listening, carrying, searching | PARTIAL | football minigame, panoramas, tunnel, errands ✓; carrying and searching are narrated
396 | ALL | history fixed, attendance and experience vary | DONE | anchor-server resolves from matches.json; PresenceMode (inside/late/radio/heard-from-friend) on ending cards
397 | ALL | consequences carried between days | MISSING (Stage A) | see 187, 233, 354 — no A2–A7 flag or memory is read by any later chapter except `life:knows:hall` (a door) and `life:a1:red` (one A2 line)
398 | ALL | not a visual novel / checklist / trivia | PARTIAL | rooms + movement ✓, but checklist.ts ships an explicit growing step list for all 19 chapters including a5/a6/a7
399 | ALL | preserve event-sourced state and persistent memories | DONE | engine.ts append-only log; relationshipMemory persisted
400 | ALL | preserve movement, collisions, exits, contextual verbs | DONE | world/scenes.ts + world/types.ts
401 | ALL | preserve the home/street/kiosk/pitch/route/Bloomfield spaces | DONE | all present, era-redressed via artByEra
402 | ALL | preserve Kobi and Rachel branches | DONE | `kobi-morning`(4br), `rachel-kitchen`(5br), `kobi-found`(5br)
403 | ALL | preserve bottles/coins/newspaper/card/scarf/ticket | DONE | ITEMS in chapter1986.ts, all six present
404 | ALL | preserve the street-football minigame | DONE | `{e:'minigame', id:'football'}` at dialogue.ts:777, 787, 805 and chapterStageA.ts:469
405 | ALL | preserve timed NPC schedules and missable opportunities | DONE for 1986 / MISSING for A2–A7 | era.ts stageA() hardcodes schedule:[], opportunities:[]
406 | ALL | preserve seeded random encounters | DONE for 1986 / MISSING for A2–A7 | same — encounters:[]
407 | ALL | preserve several ways into Bloomfield | DONE | 4–5 (see 280-283)
408 | ALL | preserve the tunnel/reveal structure | DONE | TunnelWalk + panoReveal
409 | ALL | preserve the archival cutscene | DONE | CUTSCENES['1986-championship']
410 | ALL | preserve the physical search for Kobi | DONE | `kobi-crowd` actor, no teleport
411 | ALL | preserve endings derived from life state | DONE | finale.ts buildFinale/becameLine, pure state→words
412 | ALL | preserve Red Box memory storage | DONE | redbox.ts + `redbox.item_added`
413 | ALL | preserve continuation into 1990 | DONE | PassageScene → year.entered 1990 + chapter.entered
414 | ALL | extend, do not rebuild | DONE | Stage A chapters were added through the existing Era/Beat/Conversation types
415 | ALL | preserve stable IDs, saves, manifests, feel | DONE | chapters.ts documents ids as save keys; SAVE_VERSION migration; forward-only memory-id note in finishChapter
```

## GLOBAL — HISTORICAL CANON (§3, §15)

```
416 | ALL | only verified history as objective fact | DONE | anchors.ts isPlaceholder() + DEVELOPMENT_ANCHOR; the one historical claim in A7 dialogue (first live-broadcast league match) is backed by the matches.json noteHe on the 1986-05-24 row
417 | ALL | fiction around verified events, no manufactured match facts | DONE | no score/scorer is ever typed in a content file; all read through anchor.match
418 | ALL | players appear through photos/posters/radio/press, not dialogue | DONE | PORTRAIT['משה סיני'] exists with an explicit comment that he never speaks; `poster`, `wall-writing`, `amit-street` are the routes
419 | ALL | no invented sponsor/manufacturer/number/price for the shirt | PARTIAL | `visa86` names sponsor "VISA" and "אדידס" in noteHe — sourced to a shirt Maor photographed, not invented, but it IS a specific commercial identity for the 1985 shirt the brief asked to keep generic (row 129)
420 | ALL | no historic ticket price; abstract affordability | PARTIAL | dialogue.ts:879 the cashier says "ילד — חמישה־עשר" and charges exactly 1500 agorot. prices.ts attributes the 15/30/60/90 table to a design decision (Maor, 5.9.2026), not the archive, but nothing on screen marks it provisional
421 | ALL | static money values provisional until verified | PARTIAL | centralised in prices.ts with a stated non-archival source ✓; not marked provisional to the player, and the 1500 in dialogue.ts is hardcoded rather than read from ticketAgorot()
422 | ALL | no unverified historical claim written as fact | DONE | enforced by anchor-server + tests/life.test.ts placeholder assertion; A5/A6/A7 correctly state no match facts at all
```

## GLOBAL — STAGE-WIDE DAY STRUCTURE (§4)

```
423 | ALL | eight key days | PARTIAL | declared 8, `built:true` on 2 (stagea-days.ts), playable as chapters 7
424 | ALL | jumps via physical memory transitions, not "three months later" | MISSING | enterChapter emits exactly that card: `bridge: {titleHe:'קיץ 1985', subHe:'פחית עם חריץ'}` (chapters.ts) over a fade
425 | ALL | one visible personal want per day | DONE | `wantHe` on every STAGE_A_DAY + objectiveA5/A6/A7 one-liners
426 | ALL | one historical/period anchor per day | PARTIAL | anchorKey on the manifest, but A2/A3/A4/A6/A7 are null and A5's '1985' key has no ANCHOR_SPEC; era.ts stageA() overrides all of them to '1986'
427 | ALL | one system focus per day | DONE | `teachesHe` on every day
428 | ALL | ≥2 worthwhile activities that can't both be perfect | DONE for A2/A4/1986 | A5: dress+go only. A6: radio or Liron. A7: Amit+Ofir+Kobi with no time pressure between them
429 | ALL | one object/promise/relationship beat that returns later | MISSING | see 397 — nothing from A5/A6/A7 returns
430 | ALL | short night / Red Box resolution or hard cut per day | PARTIAL | every day ends on an EndingCard with memoryHe + memoryItem, but finishChapter dispatches `memory.kept`, NOT `redbox.item_added` — no Stage A day before 1986 puts anything in the Red Box
```

## GLOBAL — CHARACTER DEPLOYMENT (§15)

```
431 | ALL | Pogi: five in A1, eight by A8 | DONE | birthYear 1978; STAGE_A_DAYS ages 5→8
432 | ALL | Kobi: inheritance, ritual, trust, refusal, reunion | DONE | a1/a5/a7 + kobi-morning/kobi-refuse/kobi-found
433 | ALL | Rachel: home, responsibility, money, truth, consequence | PARTIAL | strong in A4 (`rachel-a4` give-the-tin) and 1986 (truth/lie); silent in A5 (absent) and A6/A7 (no choices)
434 | ALL | Ofir: adventure, street courage, alternate route | PARTIAL | A2/A7/1986 ✓; the "alternate route" in 1986 is gated on streetSmarts, not on Ofir
435 | ALL | Amit: newspaper, table, facts, interpretation | DONE | `amit-a7`, `amit-kiosk`, `amit-street`, `amit-paper` opportunity
436 | ALL | Efi: optional Ussishkin gateway | DONE | `efi-a3`, `efi-hall`/`efi-hall-after`, `saw:hall`
437 | ALL | Keren: culture/empathy/outside football, never automatic romance | DONE | `keren-street`, `keren-terrace`, `keren-scarf` opportunity; no romance path exists
438 | ALL | Rafi: economy, bottles, gossip, remembered debts | PARTIAL | economy ✓ (`rafi-a2`, `rafi-a4`, `kiosk-man`); remembered debts MISSING — nothing persists a debt to Rafi
439 | ALL | Ilan: inhabited building, warnings, incomplete gossip | PARTIAL | `neighbour` conversation (dialogue.ts:590) + `kiosk-queue` encounter, 1986 only; no A5–A7 presence
440 | ALL | Barry: brief authentic Gate 7 continuity, never a quest dispenser | PARTIAL | canonically placed at 1986 Gate 7 (`gate-veteran`, `barry-gate7`) and echoed in 1990 — but `gate-veteran` IS the always-available entry route, i.e. functionally the dispenser the rule warns about (mitigated by the 22-minute cost)
441 | ALL | Liron: 1980s radio repair, 1990s away-car | PARTIAL | A6 radio ✓ (`liron-a6`); 1996-army car ✓ (`a4-liron`); absent from A5, A7 and all of 1986
442 | ALL | Aliza: tickets, saved objects, quiet inclusion | MISSING | character row + portrait key only; zero conversations, zero actors, zero scenes
443 | ALL | veteran supporter: entry fallback and road safety | DONE | `gate-veteran`/`gate-veteran-in` + `route-help` encounter
444 | ALL | do not use the 1990s cast in Stage A | DONE | asserted by tests/life-stagea.test.ts "keeps the future cast out of the chapters that exist"; tests/life-bible.test.ts holds the exclusion list
```

## GLOBAL — BRANCH COLLISION MATRIX (§16)

```
445 | ALL | branches collide through time/relationships, reunite at history | PARTIAL | true inside 1986 (opportunity expiries); across days there is no collision because nothing crosses
446 | A2/A4 | help Rachel → trust+savings; cost: miss the alley | DONE | `rachel-a2` ok/after → `a2:errand`; a2-teams-full at 16:25 closes the game
447 | A2/A8 | choose Ofir → courage+shortcut; cost: broken promise | PARTIAL | courage ✓ (`ofir-a7` me-too, `alley-a2` play); the shortcut is streetSmarts-gated, and no promise breaks as a result
448 | A2/A6 | read with Amit → knowledge; cost: something expires | DONE (1986) | `amit-paper` costs 15 min against `ofir-game`/`rachel-bottles` expiries
449 | A3 | follow Efi → Ussishkin; cost: miss football/culture | PARTIAL | a3-hall is its own chapter, so nothing is missed by going; in 1986 `efi-hall` vs `ofir-game` overlap at the pitch ✓
450 | A4 | spend at Rafi → joy now; cost: shirt savings harder | DONE | `rafi-a4` b3 work/no, `kiosk-paper`/`kiosk-card` vs SHIRT_PRICE; goalA4 reads savings+agorot
451 | A2/A6 | help Liron → radio route; cost: time | DONE | `liron-a6` hold → +40 min, bond+5, remember `held-the-wire-1986`
452 | A2/A7 | trust Aliza with an object | MISSING | Aliza unimplemented
453 | A8 | lie to Rachel → faster; cost: trust and harsher reunion | DONE | `lied:rachel` → kobi-found b3 (trust −6, tension +16, regret +12)
454 | A7 | promise Kobi → trust; cost: breaking it transforms the finale | PARTIAL | works within 1986 (`kobi-refuse` promise → `promised-to-wait` → kobi-found b1). A7's own `life:a7:promised` is never read
455 | A8 | buy ticket → independent entry; cost: fewer resources | PARTIAL | mechanically correct, economically near-impossible (see 280)
456 | A8 | accept supporter help → community; cost: slower, less control | DONE | 22 min + community +8/+10 + a memory
457 | ALL | convergence does not erase consequences | DONE | 5 reunion branches + finale.ts becameLine + presence.recorded
```

## GLOBAL — SIDE-CONTENT POOL (§17)

```
458 | ALL | each side item appears once or moves between days | PARTIAL | encounters have `cooldown` + `weight` and opportunities are once-only, but only 1986/1990/1991 have any pools
459 | ALL | repair Liron's transistor antenna | DONE | `liron-a6` hold-the-wire (A6 only)
460 | ALL | retrieve a ball from a balcony safely | MISSING | —
461 | ALL | carry Rafi's empty bottle crate | PARTIAL | `bottles-a4` (collect 3) and `rachel-bottles` (return them); no crate-carrying
462 | ALL | locate Ilan's missing newspaper page | MISSING | —
463 | ALL | help Aliza date a ticket from visual clues | MISSING | Aliza unimplemented
464 | ALL | choose who gets the last football card in a trade | MISSING | `kiosk-card` is a purchase, `street-card` is a find; no trade
465 | ALL | keep or return a flattened street coin | PARTIAL | `gutter-coin` and `street-coin` auto-take with no return choice
466 | ALL | buy a snack or save for the shirt | DONE | `rafi-a4` buy vs work vs wait, against SHIRT_PRICE
467 | ALL | help Keren repair a cassette/record sleeve or make something | MISSING | `keren-scarf`/`keren-street` are about a red cloth only
468 | ALL | accompany Efi part of the way without entering | PARTIAL | a3-night ending 'door' ("עד הדלת") is exactly this; `efi-hall` 'later'/'no' in 1986 is a plain decline
469 | ALL | two radios out of sync | MISSING (Stage A) | TransistorNet implements it precisely, but WorldScene wires it to chapter '1990' only
470 | ALL | find a safe adult for a lost younger child | MISSING | —
471 | ALL | protect the clean first shirt during street football | MISSING | no shirt state interacts with the minigame
472 | ALL | collect matchday paper without treating litter as currency | DONE | `route-paper` gives the item + knowledge, no money
473 | ALL | draw a Hapoel symbol, decide whether to admit it | PARTIAL | `wall-writing` is look-only, no authorship, no admission
474 | ALL | no repeatable task generates unlimited money/bond/points | DONE | every income is flag- or item-gated (`a4:worked`, `a4:bottles`, `found:coin`, hasItem bottle); gigs.ts uses `once` flags + isPaid
```

## GLOBAL — DIALOGUE RULES (§18)

```
475 | ALL | short exchanges while moving | DONE | branches are 1–7 lines; kobi-found's longest is 7
476 | ALL | close-ups only on emotional change | DONE | `shot: {framing:'close'|'ots'|'medium', ambienceDuck}` used sparingly — kobi-found, rachel-doorway, gate-veteran-in
477 | ALL | characters interrupt, leave, misunderstand, resume | PARTIAL | leaving ✓ (schedules + goneHe); interruption and misunderstanding are authored only in `kiosk-queue`/Ilan
478 | ALL | children speak like children | DONE | "גם אני.", "תלוי באבא שלי.", "אתה בא?"
479 | ALL | adults don't explain the club to a household member | DONE | kobi-morning/kobi-a7 are terse; the exposition route is Amit's newspaper
480 | ALL | facts enter via newspapers/radio/objects/archive surfaces | DONE | `amit-a7` gives a newspaper item; `radio-a6`; `poster`; the cutscene
481 | ALL | every branch has a physical or relational consequence | PARTIAL | mostly true; counter-examples: `alley-a2` 'watch' (curiosity+1 + toast), `ofir-a7` 'dad' (reliability+1 + toast), `radio-a6` on (flag only)
482 | ALL | no modern slang | DONE | reviewed A5–A7 + 1986 lines; period-neutral
483 | ALL | profanity filtered through a child's hearing | DONE | `street-radio` "למעלה מקללים, ומיד אחר כך צוחקים" — reported, never quoted
```

## GLOBAL — WORLD EVOLUTION ACROSS EIGHT DAYS (§19)

```
484 | ALL | reuse hubs while changing them visibly | PARTIAL | `artByEra` exists on rooms, but it keys on '1990'/'1991'/'1990s'/'2000s' — every Stage A chapter (a2…a7 AND 1986) draws the SAME painting
485 | ALL | change laundry, cars, posters, shop stock | PARTIAL | layers carry `era` ('1980s'/'1990s'/'2000s' bottle and news-rack props); no per-Stage-A-day variation
486 | ALL | change weather and light | MISSING | A6 is "winter, rain" in text only; ambient = AMBIENT_1990 for all six Stage A chapters (era.ts:421)
487 | ALL | change newspaper headlines | MISSING | one `newspaper` item, one note string
488 | ALL | change Pogi's height and clothing | MISSING (Stage A) | stageA() sets `player: ERA_1986.player` for A2–A7 — the eight-year-old sprite plays the six-year-old. PlayerFigure.scale exists and is used for Stage B only
489 | ALL | change the state of Liron's radio | PARTIAL | within A6 (`a6:on`→`a6:radio-dead`→Liron's open-backed set); no cross-day state
490 | ALL | change Rafi's remembered debt marks | MISSING | no debt state
491 | ALL | change football marks on the wall | MISSING | `wall-writing` is one static look
492 | ALL | change shirt/souvenirs in the bedroom | MISSING | bedroom hotspots are era-keyed constants; owning `visa86` changes nothing in the room
493 | ALL | change Kobi's newspaper and ritual objects | PARTIAL | `coffee-table`, `sideboard-drawer`, `family-photo` exist in 1986; static across days
494 | ALL | change Rachel's household workload | MISSING | —
495 | ALL | change children's positions, confidence and alliances | PARTIAL | positions change by clock inside 1986 (SCHEDULE_1986); no cross-day change, no `when` on any schedule row
496 | ALL | the same street becoming familiar | DONE by architecture | one `street` scene reused by all 19 chapters
```

## GLOBAL — AUDIO PLAN (§20)

```
497 | ALL | room tone, kitchen details, distant street radios | PARTIAL | AmbienceKey 'interior'/'kitchen'/'day'/'dusk' ✓; distant radios exist as the `street-radio` encounter (1986 only), not as an audio layer
498 | ALL | distinctive footsteps by surface | MISSING | no surface-keyed step samples in runtime/audio.ts SampleKey
499 | ALL | glass bottle weight/rattle | PARTIAL | `bottles` conversation has no sfx; `sfx: 'coins'` and `'bell-shop'` exist
500 | ALL | plastic ball impacts | DONE | sfx `ball-kick` (a2), `ball-bounce` (a3)
501 | ALL | transistor tuning/static as a playable sound layer | PARTIAL | `radio-tune` sfx + `{a:'sound', kind:'radio', on:false}` — a one-shot and a switch, not a layer that varies
502 | ALL | increasing supporter density toward Bloomfield | PARTIAL | CROWD_PLAN states are match-phase driven; the approach uses `crowd-swell` sfx one-shots, not a distance ramp
503 | A3 | Ussishkin close/dry/compressed acoustics | DONE | AmbienceKey 'hall'; TunnelWalk 'ussishkin' variant documented as the opposite configuration
504 | A8 | Bloomfield exterior wash + tunnel occlusion | DONE | AmbienceKey 'stadium' + 'tunnel'; game.ts:126 tunnel progress drives the shell's sound
505 | A8 | goal eruption with temporary subjective muffling | DONE | GOAL_BURST (0.85 / 5200 Hz, cut crowd-real-goal) → AFTERMATH (0.34 / 1200 Hz) in CROWD_PLAN, sequenced by the final-86 script
506 | A8 | post-match distant singing on the walk home | MISSING | there is no walk home
507 | ALL | no uncleared copyrighted songs/chants | DONE | audio.ts comment: the synthesised chant track was removed, "what is left is the ground itself"
508 | ALL | original period-credible rhythm and crowd layers | DONE | CROWD_PLAN + crowd-real-* samples over one loop/one bus
```

## GLOBAL — UI AND ACCESSIBILITY (§21)

```
509 | ALL | mobile-first controls and safe areas | DONE | components/life/TouchPad.tsx, ControlDeck.tsx; LifeHud uses env(safe-area-inset-top)
510 | ALL | status shows time/money/energy/object, never hidden percentages | DONE | LifeHud renders formatMoney + objective cloth; redHeartReading() returns bands and words, never values (finale.ts comment enforces it)
511 | ALL | compact diary/status line, not a checklist | MISSING | checklist.ts ships a literal checklist for all 19 chapters (`ChecklistItem {textHe, done}`), including a5-first/a6-radio/a7-week
512 | ALL | optional accessibility navigation, exit glow, directional sound | PARTIAL | exits carry `light: {x,y,w,h,tone}` glow ✓ and world/hints.ts + world/why.ts compose a stuck-hint ✓; no directional sound assistance, and the glow is not optional
513 | A8 | video controls, captions, fallback, reliable completion | PARTIAL | skip button + Escape + onError→'failed'→`finish('unavailable')` + fallbackHe + attribution ✓. Captions are explicitly DISABLED — embedUrl sets `cc_load_policy: '0'` (cutscenes.ts)
514 | A8 | failure retry immediate and clearly back to championship morning | DONE | RetryCard → restartDay() → window.location.reload() (LifeStage.tsx:1122-1127)
```

## GLOBAL — IMPLEMENTATION SEQUENCE (§22)

```
515 | ALL | Pass 1.1 StageADayId + day.entered | PARTIAL | both types exist and the reducer is correct; Stage A does not use them (see 359/367)
516 | ALL | Pass 1.2 preservation/reset rules + migration-safe defaults | DONE | personFlags() prefix rules; tests/life-stagea.test.ts "folds an unknown day event from a newer build as a no-op"
517 | ALL | Pass 1.3 day manifests | DONE | stagea-days.ts STAGE_A_DAYS with date/start/time/want/teaches/anchorKey — but no `schedules` field, and `built` disagrees with chapters.ts `playable`
518 | ALL | Pass 1.4 milestone resolver separate from objectives | MISSING | no milestone module; objectives are per-era functions only
519 | ALL | Pass 1.5 childhood savings + owned-shirt persistence | DONE | savings.changed, clothing.gained, `own:shirt:*`; tested at life-stagea.test.ts:176 "keeps the tin, the shirt and every promise across a day"
520 | ALL | Pass 1.6 deterministic route/checkpoint tests | PARTIAL | tests/life-goals.test.ts asserts every chapter's goal room is reachable from its start; life-stagea.test.ts asserts the restart cut. No per-day route matrix
521 | ALL | Pass 2.1 rename to רפי מהקיוסק / אילן השכן | DONE | scenes.ts:1446 nameHe 'רפי מהקיוסק'; dialogue.ts:590 nameHe 'אילן השכן'
522 | ALL | Pass 2.2 fix duplicated Rachel `text` | DONE | dialogue.ts:333-337 — one `text: 'לא עכשיו.'`
523 | ALL | Pass 2.5 no portraitSet for characters without art | DONE | PORTRAIT/PORTRAIT_STAGE_A are speaker→plate maps; tests/life-stagea.test.ts "never points a character at a plate that does not exist"
524 | ALL | Pass 6.1 placeholders that never impersonate a named character | DONE | `barry-a5` deliberately renamed to "אוהד ותיק" with a comment (scenes.ts:2039-2045); adultA*/adultB* generic figures
525 | ALL | Pass 6.2 sound, camera, crowd, mobile presentation | PARTIAL | strong for 1986; A5–A7 inherit AMBIENT_1990 and the 1986 player figure with no per-day treatment
526 | ALL | Pass 6.3 full branch matrix tests | MISSING | no test enumerates A5/A6/A7 branch combinations or A8 entry×route×reunion
527 | ALL | Pass 6.4 two complete human playthroughs | N/A | a process step, not code (scripts/life/finish-audit.mjs and deadend-audit.ts are the automated stand-in)
```

## GLOBAL — ACCEPTANCE TESTS (§23)

```
528 | ALL | five in 1983, eight in 1986 | DONE | tests/life-stagea.test.ts "declares eight days, in order"; age derived from birthYear 1978
529 | ALL | eight days advance without resetting biography | PARTIAL | biography survives ✓ (test at life-stagea.test.ts:176); but the mechanism is year.entered per chapter, and `stageADay` is never written
530 | ALL | Ofir, Amit, Efi, Keren each get an individual meaningful encounter | PARTIAL | across the whole of Stage A yes (a2 alley, a7 amit/ofir, a3 efi, keren-scarf); within any single day, no
531 | ALL | Rachel and Kobi each remember ≥3 distinct player behaviours | PARTIAL | Kobi: `saw-the-shirt-1985`, `said-no-1986`, `promised-to-wait`, `came-anyway`, `broke-the-promise` (5 written). Rachel: `gave-the-tin-1985`, `kept-a-promise` (2). And no test asserts it
532 | ALL | bottle task + money choices + first shirt = one economy arc | PARTIAL | coherent A2→A4 (bottles→tin→SHIRT_PRICE via goalA4); the arc DIES at A5 — savings never reach 1986 (see 232)
533 | ALL | Ussishkin can be meaningfully explored and meaningfully missed | PARTIAL | missed ✓ (a3 'door' ending, `efi-hall` expiry, `saw:hall`); explored is 1 room + 2 conversations
534 | ALL | Barry, Liron, Aliza appear naturally in period roles | MISSING | Barry ✓, Liron partial, Aliza absent
535 | ALL | Rafi and Ilan display canonical names everywhere | DONE | grep shows no generic label remaining on either
536 | ALL | ≥3 earlier decisions change championship morning | MISSING | ZERO. No Stage A flag or memory is read by any 1986 condition. Verified by grep over `life:a7:*`, `a5:*`, `a6:*`, and every Stage A `remember` eventId
537 | ALL | ≥3 safe entry families work | DONE | ticket / Ofir / name / kindness / family-in-queue
538 | ALL | no player can soft-lock the finale | DONE | lastResort() (WorldScene:1817) closes any chapter after 22 game-hours or 90 idle minutes, and `gate-veteran` is always open
539 | ALL | missing the championship returns to morning with a tailored scene | PARTIAL | tailored ✓ (retryFor picks by where he was standing); "missing" is reachable only through the `bed` sleep choice
540 | ALL | the full video completes before the search begins | DONE | stageGoal → playCutscene → returnFromArchive; findKobi objective is gated on matchOver + inside
541 | ALL | Kobi never found by teleport or automatic cut | DONE | a positioned actor with `when {flag:'match:over'}` and a talk verb
542 | ALL | reunion changes with truth, promise, network, trust | DONE | kobi-found's 5 branches key on `rachel:knows`, `promised-to-wait`, `entry:name`, `lied:rachel`, fallback
543 | ALL | the 1983 and 1986 objects coexist in the Red Box | MISSING | `life:a1:red` is never a RedBoxCandidate; CANDIDATES_1986 has no 1983 entry; `keep` picks exactly one item
544 | ALL | no yellow in new character art | N/A (as a design rule) — but enforced | tests/brand.test.ts "contains no yellow anywhere — the first absolute prohibition" + lib/brand/yellowExemptions
545 | ALL | mobile can finish every required route | PARTIAL | TouchPad/ControlDeck exist; no test walks a route on touch input
```

## GLOBAL — EDITABLE ASSUMPTIONS (§24–§25)

```
546 | ALL | three defaults in force | N/A | a process fact about an unanswered form
547 | ALL | changing one assumption updates its day and tests only | N/A | a process rule; partially supported by the data-first Era/Beat architecture
548 | ALL | one connected childhood biography, not eight episodes | MISSING | structurally eight isolated chapters — the connection the rule names (carried consequence) does not exist (see 397, 536)
549 | ALL | preserve, deepen incrementally, history serves personal choice | PARTIAL | preserved ✓ and history-serves-choice ✓ in 1986; A5–A7 are new episodes rather than deepenings
550 | ALL | the result never changes; who he became does | PARTIAL | result fixed ✓ (anchor-driven); "who helped him / who he disappointed / what he carried" varies within 1986 only
```

## "WHAT IS CURRENTLY MISSING OR TOO SHALLOW" (§2, verbatim)

```
551 | A1 | 1983 is only a short narrated opening | RESOLVED (DONE) | CONVERSATIONS_A1 (`a1-1983`, `a1-red`, `a1-crowd`, `a1-goal`, `a1-home`) with three branches incl. `life:a1:red`; STAGE_A_DAYS.a1 `built:true`
552 | A1–A8 | almost no playable life between 1983 and 1986 | PARTIALLY RESOLVED | six chapters now exist (a2…a7) but each is 2–5 beats, no schedules, no opportunities, no encounters
553 | A2 | the four friends lack separate identity | PARTIALLY RESOLVED | each has a named actor and conversation across Stage A; within a2-alley all four share one conversation (`alley-a2` on ofir-a2/amit-a2/efi-a2 actors)
554 | A4 | the first shirt is not implemented | RESOLVED (DONE) | a4-shirt chapter, SHIRT_PRICE = shirtAgorot('a4-shirt'), `{e:'own', item:'shirt85'}` + `{e:'shirt', id:'visa86'}`, 3 endings
555 | A3 | Ussishkin not a substantial childhood branch | STILL SHALLOW (PARTIAL) | a3-hall: 3 beats, 2 conversations, 2 endings, no rhythm minigame, no memory object
556 | ALL | Barry, Liron, Aliza not integrated | PARTIALLY RESOLVED | Barry integrated at 1986 Gate 7; Liron in A6 + 1996; Aliza still entirely unimplemented
557 | ALL | Rafi and Ilan under generic labels | RESOLVED (DONE) | see 521/535
558 | A8 | all relationship decisions crammed into one afternoon | STILL TRUE (MISSING) | six days now exist but feed nothing forward, so every decision that MATTERS is still made on 24.5.1986
559 | A4 | money resets by year, cannot support multi-day saving | PARTIALLY RESOLVED | `state.savings` + `{e:'save'}`/`{e:'withdraw'}` survive both transitions; but only a4-shirt uses them — 1986 cannot spend the tin
560 | ALL | year.entered too coarse for 1984–1986 | NOT RESOLVED (MISSING) | `day.entered` was built but Stage A still transitions via `year.entered` in WorldScene.enterChapter
561 | A8 | optional endings let the championship be missed | PARTIALLY RESOLVED | 'missed' now routes to retry; 'late' still completes and advances (see 340)
562 | ALL | static money values provisional | PARTIALLY RESOLVED | centralised in prices.ts with a stated non-archival source; not marked provisional to the player; 1500 hardcoded in dialogue.ts rather than read from ticketAgorot()
563 | ALL | duplicated Rachel `text` | RESOLVED (DONE) | dialogue.ts:333-337
```

---

# TOP 10 GAPS FOR A5–A8 + GLOBALS

**1. Nothing from A2–A7 is ever read in A8 — the six new days are write-only.** (rows 187, 222, 233, 234, 238, 263, 308, 354, 365, 397, 429, 448, 454, 529, 531, 536, 548, 558)
Every Stage A `remember` eventId and every `life:a7:*` flag is dispatched and never appears in a `when` anywhere in the repo. *Add `when` clauses to 1986's `kobi-morning`, `kobi-refuse`, `rachel-kitchen`, `gate-veteran`, `terrace-fan` and `kobi-found` that read `life:a7:refused`/`life:a7:promised` and `relationshipMemory {who:'kobi', eventId:'said-no-1986'}` / `{who:'liron', eventId:'held-the-wire-1986'}`.*

**2. The savings tin cannot be spent in A8, so the legitimate ticket route needs a perfect run.** (rows 232, 280, 455, 532, 559)
`enterChapter` fires `year.entered` (zeroes `agorot`), 1986 has no `entry` money event, and no 1986 conversation uses `{e:'withdraw'}`. Total obtainable in-chapter income is exactly 1500 = the ticket price. *Add `entry: (s) => [{t:'savings.changed', agorot:-n}, {t:'money.changed', agorot:n}]` to the '1986' ChapterDef, or a `tin` hotspot in the 1986 bedroom that calls `{e:'withdraw'}`.*

**3. A7 delivers no week — no radio, no vignettes, no silent room, no trust-branched refusal.** (rows 190–208, 211–216, 218–221)
`a7-week` is 2 beats, 4 conversations, one afternoon. The refusal ends the chapter on the same choice, so the brief's central "return control in silence, objective only after he commits" never happens. *Split a7-week into 2–3 `day.entered` days like `chapter1993galil.ts` does, add a radio hotspot with era 'a7-week', and move `{e:'ending'}` off the refusal choice onto a later beat gated on a commitment flag.*

**4. A5 never enters the stadium — the "first match in his own shirt" has no match.** (rows 149, 161, 162, 164)
`a5-in` fires `a5-close` at `bloomfield-tunnel` and ends the chapter; `bloomfield-inside` is never reached in A5. *Route `a5-in` to `travel bloomfield-inside` and put the close behind a "return to Kobi" beat inside the terrace, reusing the existing GATE7 crowd.*

**5. The A4 shirt does not gate or appear in A5 or A8.** (rows 150, 239, 242, 253, 334, 471, 492)
`shirt-a5` sets `a5:dressed` with no `own:shirt85` check, the 1986 bedroom has no shirt hotspot, and `wearingAt()` is called once at chapter end purely to stamp a flag. *Gate `shirt-a5`'s wear branch on `{flag:'own:shirt85'}` with a fallback branch, add an era-'1986' shirt hotspot to the bedroom scene, and add a shirt RedBoxCandidate.*

**6. Four of five failure triggers are unreachable, and two failure scenes can never play.** (rows 339–343, 352, 357, 539, 561)
`retryFor` is called only from `finishChapter` when `chapter==='1986' && key==='missed'`, and 'missed' comes only from the `bed` 'sleep' choice. `late` completes and advances; `lastResort` picks `'home'`. *Route `arrived:late` and the lastResort path for chapter '1986' to `'missed'` (or to a new `finishChapter` branch that emits `retry`), and add a "turn back home" action on the route.*

**7. A6 offers two paths out of the six the brief specifies, and the radio has no reception model.** (rows 172–184)
Kobi is forcibly gone at `a6-open`; no Ofir/Amit/Efi/Keren actors have era 'a6-radio'; `a6-dies` is a fixed 15:35 timer. *Add era-'a6-radio' actors for Ofir (street) and Amit (kiosk), and wire the existing `TransistorNet` (currently `chapter==='1990'` only, WorldScene:3208) to a6-radio for position-dependent reception.*

**8. There is no walk home, no Rachel aftermath, and no Red Box placing scene in A8.** (rows 320–331, 337, 506, 543)
`kobi-found` ends with `{e:'keep'},{e:'ending'}` straight to the card; `walked:home` is never raised in 1986; `keep` is a seeded weighted roll. *Copy the 1990 pattern — `kobi-found` sets `found:kobi` only, then a street beat, a `rachel-doorway` after-branch, and a bedroom `redbox` conversation that offers the eligible candidates as choices.*

**9. Aliza does not exist, and Liron never leaves A6.** (rows 155, 201, 234, 252, 442, 452, 463, 534, 556)
`crowd-aliza` has a characters.ts row and a `faceAliza` portrait key and nothing else — no conversation, no actor, in any scene, in any chapter. *Add an `aliza-*` conversation set and place her in the street/kiosk for a5-first, a7-week and 1986 with a "keep this for me" object-safekeeping effect; add a `liron-a7`/`liron-1986` actor reusing `adultB2`.*

**10. Stage A transitions with `year.entered`, so `stageADay` is never set and the day manifest is decorative.** (rows 359, 367, 386, 423, 424, 515, 517, 529, 560)
`WorldScene.enterChapter:4455` is the only path between Stage A chapters; `stagea-days.ts` marks a2–a7 `built:false` while `chapters.ts` marks them `playable:true`. *Have `enterChapter` emit `day.entered` (with `dayId` from STAGE_A_DAYS) instead of `year.entered` when both chapters are stage 'A', and reconcile `built` with `playable`.*agentId: aa7e634e4da49ea1d (use SendMessage with to: 'aa7e634e4da49ea1d', summary: '<5-10 word recap>' to continue this agent)
<usage>subagent_tokens: 300127
tool_uses: 106
duration_ms: 984971</usage>