# STAGE B (1990–2000) — IMPLEMENTATION REQUIREMENTS MATRIX

Source: `/root/worker/docs/life/STAGE-B-1990-2000-CONTENT-IMPLEMENTATION.md`
623 numbered requirements. Format: `# | Unit | Section | Requirement | Type`

---

## GLOBAL — Direct order, existing code, canon, thesis, chapter map (§0–§3, §6)

| # | Unit | Section | Requirement | Type |
|---|---|---|---|---|
| 1 | ALL | §0 | Expand Stage B into a complete playable decade | RULE |
| 2 | ALL | §0 | Do not replace the working 12.5.1990 chapter; preserve it as B1 and build forward from its state and memories | RULE |
| 3 | ALL | §0 | Implement the decade as lived days, journeys, rooms, queues, arguments, missed events and consequences—not as a history menu, quiz, slideshow or sequence of match summaries | RULE |
| 4 | ALL | §0 | Fixed spine 1: promotion day, 12.5.1990 | ANCHOR |
| 5 | ALL | §0 | Fixed spine 2: deepening bond with Ussishkin and the two sporting branches | ANCHOR |
| 6 | ALL | §0 | Fixed spine 3: the 1992/93 basketball Cup win over Hapoel Givatayim | ANCHOR |
| 7 | ALL | §0 | Fixed spine 4: the 1993 basketball championship loss to Hapoel Galil Elyon | ANCHOR |
| 8 | ALL | §0 | Fixed spine 5: the long bad football years and Pogi's tragic rupture with childhood hero Moshe Sinai | ANCHOR |
| 9 | ALL | §0 | Fixed spine 6: the Gate 7 / Gate 5 generational split | ANCHOR |
| 10 | ALL | §0 | Fixed spine 7: army service that can materially alter routes and attendance | ANCHOR |
| 11 | ALL | §0 | Fixed spine 8: football's financial crisis, relegation danger, Sinai's departure and private acquisition | ANCHOR |
| 12 | ALL | §0 | Fixed spine 9: basketball's 1996/97 relegation, brief return and 1998/99 relegation as one continuing wound | ANCHOR |
| 13 | ALL | §0 | Fixed spine 10: the 2.5.1998 championship trauma | ANCHOR |
| 14 | ALL | §0 | Fixed spine 11: the 1999 Cup | ANCHOR |
| 15 | ALL | §0 | Fixed spine 12: the 1999/00 championship and the 17.5.2000 Cup final—the complete Double—as the finale | ANCHOR |
| 16 | ALL | §0 | Historical results never branch | RULE |
| 17 | ALL | §0 | Pogi's presence, knowledge, companions, conduct, memory and relationships do branch | BRANCH |
| 18 | ALL | §0 | A player who misses a canonical event must receive authored alternate play: radio, guard duty, a phone call, a drive, a late arrival, the next morning or later archive | BRANCH |
| 19 | ALL | §0 | A missed canonical event is never a punishment screen and never a missing chapter | RULE |
| 20 | ALL | §0 | Opening lock: Stage B begins with the promotion match on 12.5.1990—not in 1991, with the army, with Sinai's managerial crisis or with a retrospective montage | RULE |
| 21 | ALL | §0 | Every normal new game and migrated save enters the decade through B1 | RULE |
| 22 | ALL | §1 | Preserve `lib/life/content/chapter1990.ts`: passage from 1986, kitchen-table arithmetic, objectives and three endings for 12–13 May 1990 | SCENE |
| 23 | ALL | §1 | Preserve `dialogue1990.ts`, `opportunities1990.ts`, `encounters1990.ts`, `schedules1990.ts`: the lived day | SCENE |
| 24 | ALL | §1 | Preserve `runtime/match1990.ts`: the transistor information network, rumour latency and parallel score | MECHANIC |
| 25 | ALL | §1 | Preserve `runtime/scenes/PassageScene.ts`: the four-year transition through objects rather than a menu | SCENE |
| 26 | ALL | §1 | Preserve `finale.ts`: the first movement's personalized ending | ENDING |
| 27 | ALL | §1 | `dialogueUssishkin.ts` is a prepared Ussishkin doorway, not yet a decade-long basketball plot | CHARACTER |
| 28 | ALL | §1 | The opening must survive; "history reaches a child through incomplete information" is the grammar the rest of the decade evolves, not discards | RULE |
| 29 | ALL | §1 | Replace the "coming soon" dead end with B2 only after B2 is genuinely playable; until then, do not fake completion | RULE |
| 30 | ALL | §2.1 | Pogi was born in 1978 | STATE |
| 31 | ALL | §2.1 | 1990: age 12 — child becoming independent | STATE |
| 32 | ALL | §2.1 | 1993: age 15 — adolescent; emotion before perspective | STATE |
| 33 | ALL | §2.1 | 1996: age 18 — conscript | STATE |
| 34 | ALL | §2.1 | 1997: age 19 — army constraints and adult supporter choices | STATE |
| 35 | ALL | §2.1 | 1998: age 20 — young adult, still serving or newly released according to route | STATE |
| 36 | ALL | §2.1 | 1999: age 21 — work, money, organization and travel | STATE |
| 37 | ALL | §2.1 | 2000: age 22 — Stage B final form, not final form for life | STATE |
| 38 | ALL | §2.1 | Do not put army mechanics into 1990 | RULE |
| 39 | ALL | §2.1 | Do not write 1996 Pogi like a child or 2000 Pogi like a settled middle-aged narrator | RULE |
| 40 | ALL | §2.2 | No choice changes a score, table, appointment, ownership event or trophy | RULE |
| 41 | ALL | §2.2 | The simulation may change whether Pogi attends, arrives late, hears, misunderstands, helps, protests, leaves, reconciles or keeps an object | BRANCH |
| 42 | ALL | §2.2 | Do not let a skill check score a goal, save a penalty or prevent relegation | RULE |
| 43 | ALL | §2.2 | Never imply that Pogi caused a real historical event | RULE |
| 44 | ALL | §2.3 | Stage B ends only after the second fully playable finale on 17.5.2000; the older 13.5.2000 ending is superseded | RULE |
| 45 | ALL | §2.3 | Championship clinched at Bnei Yehuda, 13.5.2000 | ANCHOR |
| 46 | ALL | §2.3 | Cup final against Beitar Jerusalem, 2:2 after extra time and 4:2 on penalties, 17.5.2000 | ANCHOR |
| 47 | ALL | §2.3 | Personalized aftermath, Red Box placement and decade summary only after the Cup is won | RULE |
| 48 | ALL | §2.4 | `Gabi`/גבי is retired; the same character is `liron`/לירון — Gabi became Liron; never create both | RULE |
| 49 | ALL | §2.4 | Liron returns in the 1990s and drives Pogi to an away match in a dedicated authored route | CHARACTER |
| 50 | ALL | §2.4 | מאור הראל maps to יוסף; Yosef enters only at the beginning of the 2000s and must not appear in Stage B, including the May 2000 finale | RULE |
| 51 | ALL | §2.4 | אסי והבה maps to אסף | CHARACTER |
| 52 | ALL | §2.4 | אייל מלמד maps to מלמד | CHARACTER |
| 53 | ALL | §2.4 | `shopkeeper` is רפי מהקיוסק | CHARACTER |
| 54 | ALL | §2.4 | `neighbour` is אילן השכן | CHARACTER |
| 55 | ALL | §2.4 | Real memorial characters are alive, ordinary and unshadowed in this decade — no halos, ghosts, premonitions or lines that exploit what the audience knows about their later deaths | RULE |
| 56 | ALL | §2.4 | The player's name is שלום תקוה; this spelling is binding — תקוה, not תקווה | RULE |
| 57 | ALL | §2.4 | Correct the two-vav spelling (תקווה) wherever it refers to this player | RULE |
| 58 | ALL | §2.4 | Do not globally replace תקווה — names such as אבי תקווה and מכבי פתח תקווה are different | RULE |
| 59 | ALL | §2.4 | שביט אלימלך is a recurring historical football presence from the 1996/97 rescue through the 1998 title race, both Cup wins and the 2000 Double — not background roster data | CHARACTER |
| 60 | ALL | §3 | Stage A asked "Will you get there?"; the 1990 opening asks "Will you know in time?" | RULE |
| 61 | ALL | §3 | The full Stage B asks "Where do you stand when the people you love split apart?" | RULE |
| 62 | ALL | §3 | This is a decade about inherited love becoming chosen identity | RULE |
| 63 | ALL | §3 | By 22 Pogi has been forced to choose between Gate 7 and Gate 5, football and basketball obligations, hero and institution, army and attendance, protest and restraint, being there and being reliable | RULE |
| 64 | ALL | §3 | The correct ending is not one faction; it is a life that can explain what its choices cost | RULE |
| 65 | ALL | §3 | Movement 1 — Inheritance (1990–1992): father's gate, childhood friends, first independent routes | RULE |
| 66 | ALL | §3 | Movement 2 — Joy with a crack in it (1993–1995): Cup glory, Galil heartbreak, decline and denial | RULE |
| 67 | ALL | §3 | Movement 3 — Choosing a side (1996–1998): army, Sinai rupture, Gate split, financial danger, purchase, basketball relegation, survival, then championship trauma | RULE |
| 68 | ALL | §3 | Movement 4 — Building after loss (1998–2000): second basketball relegation, seed of supporter-owned rebirth, organization, 1999 Cup and the Double | RULE |
| 69 | ALL | §6 | Use 11 major playable units and short playable bridges | RULE |
| 70 | ALL | §6 | A "unit" can contain several scenes and dates; it is not necessarily one continuous day | RULE |

---

## B1 — "כמה צריך?" · 12–13.5.1990

| # | Unit | Section | Requirement | Type |
|---|---|---|---|---|
| 71 | B1 | §6 | B1 = 12–13.5.1990, anchor: football promotion | ANCHOR |
| 72 | B1 | §6 | Primary dramatic question: "Did you know, and with whom did you arrive?" | RULE |
| 73 | B1 | §7-B1 | Chapter title "כמה צריך?" | SCENE |
| 74 | B1 | §7-B1 | Preserve kitchen arithmetic | SCENE |
| 75 | B1 | §7-B1 | Preserve Kobi waiting | BEAT |
| 76 | B1 | §7-B1 | Preserve the transistor network | MECHANIC |
| 77 | B1 | §7-B1 | Preserve the friends route | BRANCH |
| 78 | B1 | §7-B1 | Preserve rumours | MECHANIC |
| 79 | B1 | §7-B1 | Preserve the late gate opening | BEAT |
| 80 | B1 | §7-B1 | Preserve possible missed attendance | BRANCH |
| 81 | B1 | §7-B1 | Preserve the search for Kobi | SCENE |
| 82 | B1 | §7-B1 | Preserve the walk home | SCENE |
| 83 | B1 | §7-B1 | Preserve existing save/event IDs | RULE |
| 84 | B1 | §7-B1 | B1 is the opening of Stage B, not a prologue that normal play may skip | RULE |
| 85 | B1 | §7-B1 | The promotion is the decade's baseline: in 1996/97 "survival" must feel like the possible loss of everything regained here | RULE |
| 86 | B1 | §7-B1 | Replace the post-chapter "coming soon" card only when B2 is wired | RULE |
| 87 | B1 | §7-B1 | Carry `withKobi`, `withFriends`, radio decisions and the Red Box item into later callbacks | STATE |
| 88 | B1 | §7-B1 | Introduce no army, Gate 5 conflict or adult supporter organization here | RULE |
| 89 | B1 | §7-B1 | Liron may be recognized as the radio-repair continuity character if Stage A established him | CHARACTER |
| 90 | B1 | §7-B1 | Do not overwrite the current transistor mechanics | RULE |
| 91 | B1 | §7-B1 | Bridge: bedroom objects, changing voice, school notebook, Ussishkin invitation | SCENE |
| 92 | B1 | §7-B1 | Time passes through interactions, not a year-selection screen | RULE |

---

## B2 — "יש עוד בית" · 11.3.1991 + Ussishkin season

| # | Unit | Section | Requirement | Type |
|---|---|---|---|---|
| 93 | B2 | §6 | B2 = 11.3.1991 + season bridge, anchor: Ussishkin initiation | ANCHOR |
| 94 | B2 | §6 | Primary dramatic question: "Can football inheritance make room for basketball love?" | RULE |
| 95 | B2 | §7-B2 | Chapter title "יש עוד בית" | SCENE |
| 96 | B2 | §7-B2 | The player follows Efi's invitation from the current B1 morning-after scene | BEAT |
| 97 | B2 | §7-B2 | The first meaningful action is logistical: money, route and queue | MECHANIC |
| 98 | B2 | §7-B2 | Limor knows the correct entrance | CHARACTER |
| 99 | B2 | §7-B2 | Bluffing without preparation can cost time | BRANCH |
| 100 | B2 | §7-B2 | Ussishkin must feel physically unlike Bloomfield: close ceiling, sweat, wood/paint, voices bouncing back immediately and no safe distance from emotion | ART |
| 101 | B2 | §7-B2 | Choice: go with Efi or keep a football/family promise | CHOICE |
| 102 | B2 | §7-B2 | Choice: spend limited money on entry, food or preserving fare home | CHOICE |
| 103 | B2 | §7-B2 | Choice: help Shachor with a practical problem or push toward the best standing place | CHOICE |
| 104 | B2 | §7-B2 | Choice: admit ignorance about basketball or pretend | CHOICE |
| 105 | B2 | §7-B2 | Choice: keep the first Ussishkin object in the Red Box | ITEM |
| 106 | B2 | §7-B2 | Payoff: loving another branch does not divide the heart neatly; it divides time | RULE |
| 107 | B2 | §7-B2 | This unit establishes the future collision system between simultaneous obligations | MECHANIC |

---

## B3 — "הגביע אדום" · 19.4.1993

| # | Unit | Section | Requirement | Type |
|---|---|---|---|---|
| 108 | B3 | §6 | B3 = 19.4.1993, anchor: basketball Cup vs Givatayim | ANCHOR |
| 109 | B3 | §6 | Primary dramatic question: "Who gets to share a joy that feels finally complete?" | RULE |
| 110 | B3 | §7-B3 | Chapter title "הגביע אדום" | SCENE |
| 111 | B3 | §7-B3 | Historical anchor: Hapoel Tel Aviv defeats Hapoel Givatayim 71:65 in the basketball State Cup final at Yad Eliyahu | ANCHOR |
| 112 | B3 | §7-B3 | The score and winner are immutable | RULE |
| 113 | B3 | §7-B3 | Gameplay begins before the hall | RULE |
| 114 | B3 | §7-B3 | Secure money and transport | MECHANIC |
| 115 | B3 | §7-B3 | Choose Efi/Limor's planned route, an improvised friends route or family viewing | BRANCH |
| 116 | B3 | §7-B3 | Help carry a banner/materials and risk worse position/late entry | CHOICE |
| 117 | B3 | §7-B3 | Respond when somebody dismisses Givatayim before the game | CHOICE |
| 118 | B3 | §7-B3 | Decide whom to call or find after the win | CHOICE |
| 119 | B3 | §7-B3 | Do not write the match as inevitable domination just because the result is known | RULE |
| 120 | B3 | §7-B3 | The player in the stands does not experience the final score in advance | RULE |
| 121 | B3 | §7-B3 | Emotional climax is the walk after the trophy: noise and impossible optimism | SCENE |
| 122 | B3 | §7-B3 | ...followed by a tiny quiet warning that a league title is still unfinished | BEAT |
| 123 | B3 | §7-B3 | Memory variants: Cup ticket, red paper strip, handwritten route | ITEM |
| 124 | B3 | §7-B3 | A shared photo placeholder only if art exists | ART |
| 125 | B3 | §7-B3 | The trophy itself is not loot | RULE |

---

## B4 — "הבית נשבר" · 9–19.5.1993

| # | Unit | Section | Requirement | Type |
|---|---|---|---|---|
| 126 | B4 | §6 | B4 = 9–19.5.1993, anchor: finals vs Galil Elyon | ANCHOR |
| 127 | B4 | §6 | Primary dramatic question: "What remains when the expected championship disappears?" | RULE |
| 128 | B4 | §7-B4 | Chapter title "הבית נשבר" | SCENE |
| 129 | B4 | §7-B4 | Historical anchor: Galil Elyon wins the final series 3:1 | ANCHOR |
| 130 | B4 | §7-B4 | Anchor: Hapoel loses Game 1 at Ussishkin 88:73 | ANCHOR |
| 131 | B4 | §7-B4 | Anchor: Hapoel loses Game 2 | ANCHOR |
| 132 | B4 | §7-B4 | Anchor: Hapoel wins Game 3 90:63 | ANCHOR |
| 133 | B4 | §7-B4 | Anchor: Hapoel loses the decisive Game 4 | ANCHOR |
| 134 | B4 | §7-B4 | Use canonical home/away ordering and score orientation from the verified archive data layer | RULE |
| 135 | B4 | §7-B4 | Never type ambiguous scraped score columns directly into dialogue | RULE |
| 136 | B4 | §7-B4 | This is one escalating mini-arc, not four full duplicate matches | RULE |
| 137 | B4 | §7-B4 | Game 1, Ussishkin: confidence from the Cup; player chooses position and companions | SCENE |
| 138 | B4 | §7-B4 | Game 1: the home defeat creates disbelief | BEAT |
| 139 | B4 | §7-B4 | Game 2, away: attendance competes with school/family/money | SCENE |
| 140 | B4 | §7-B4 | Game 2: radio/phone route is fully authored if missed | BRANCH |
| 141 | B4 | §7-B4 | Game 3, Ussishkin: the large win restores hope | SCENE |
| 142 | B4 | §7-B4 | Game 3: a high-impulsiveness Pogi may promise too much about Game 4 | BRANCH |
| 143 | B4 | §7-B4 | Game 4, Galil: travel is the main gameplay | MECHANIC |
| 144 | B4 | §7-B4 | Game 4: missing it, hearing it en route or being inside are equally authored states | BRANCH |
| 145 | B4 | §7-B4 | Aftermath occurs back at Ussishkin or the neighbourhood, not on a generic results card | SCENE |
| 146 | B4 | §7-B4 | Shachor stacks or carries something | BEAT |
| 147 | B4 | §7-B4 | Limor reconstructs logistics | BEAT |
| 148 | B4 | §7-B4 | Efi can rage, go silent or avoid Pogi based on earlier choices | BRANCH |
| 149 | B4 | §7-B4 | Soko is introduced only if age/art continuity is correct, as the adult who writes down what happened while everyone else argues | CHARACTER |
| 150 | B4 | §7-B4 | The emotional sentence: the Cup was real; the loss is also real. One does not cancel the other | RULE |

---

## B5 — "המספר שבע על הקיר" · 1993–1996

| # | Unit | Section | Requirement | Type |
|---|---|---|---|---|
| 151 | B5 | §6 | B5 = 1993–1996, anchor: bad football years / Sinai | ANCHOR |
| 152 | B5 | §6 | Primary dramatic question: "How long do you defend a hero?" | RULE |
| 153 | B5 | §7-B5 | Chapter title "המספר שבע על הקיר" | SCENE |
| 154 | B5 | §7-B5 | Turn Moshe Sinai from a poster/childhood hero into the decade's most personal conflict | RULE |
| 155 | B5 | §7-B5 | Canonical arc: defence → doubt → rupture | BRANCH |
| 156 | B5 | §7-B5 | The pace and social price of that arc branch | BRANCH |
| 157 | B5 | §7-B5 | Structure as three playable slices: B5a Defence, B5b Doubt, B5c Rupture | RULE |
| 158 | B5 | §7-B5a | A bad football day ends in an argument at the kiosk or gate | SCENE |
| 159 | B5 | §7-B5a | Younger supporters blame Sinai; Kobi remembers the player, not only the manager | BEAT |
| 160 | B5 | §7-B5a | Pogi defends him sincerely | CHOICE |
| 161 | B5 | §7-B5a | The defence can strengthen the Kobi/Barry bond and create tension with Ofir or emerging younger supporters | STATE |
| 162 | B5 | §7-B5a | The game must make the defence emotionally reasonable, not foolish | RULE |
| 163 | B5 | §7-B5b | Repeated poor performances, derby humiliation and the 1994 Cup-final loss accumulate through newspaper, radio and lived fragments | BEAT |
| 164 | B5 | §7-B5b | Amit presents facts | CHARACTER |
| 165 | B5 | §7-B5b | Freddy explains responsibility and institutional cover | CHARACTER |
| 166 | B5 | §7-B5b | Rumours contradict | MECHANIC |
| 167 | B5 | §7-B5b | Pogi may still defend the person while questioning the role | BRANCH |
| 168 | B5 | §7-B5b | A player who refuses all evidence becomes more isolated | BRANCH |
| 169 | B5 | §7-B5b | A player who turns instantly earns group access but may carry guilt | BRANCH |
| 170 | B5 | §7-B5c | The 1996 European disappointment and worsening conflict lead toward the last-place crisis | BEAT |
| 171 | B5 | §7-B5c | The final break is not "I hate Sinai" — it is "the person who taught me what this shirt means can no longer be the answer" | RULE |
| 172 | B5 | §7-B5c | Preserve a possible later `reconciled-memory` state: affection for Sinai the player can coexist with judgment of the managerial period | STATE |
| 173 | B5 | §7-B5 | Never ask the player to place, threaten or approve a bomb | RULE |
| 174 | B5 | §7-B5 | Extreme real-world threats may be reported as frightening background only after historical/legal review; they are not gameplay, spectacle or a rewarded protest route | RULE |

---

## B6 — "אין מקום אחד לעמוד בו" · 1996–spring 1997

| # | Unit | Section | Requirement | Type |
|---|---|---|---|---|
| 175 | B6 | §6 | B6 = 1996–spring 1997, anchor: army, Gate split, crisis, purchase | ANCHOR |
| 176 | B6 | §6 | Primary dramatic question: "Where do you stand when every institution shakes?" | RULE |
| 177 | B6 | §7-B6 | Chapter title "אין מקום אחד לעמוד בו" | SCENE |
| 178 | B6 | §7-B6 | This is Stage B's central crisis and should be the longest unit | RULE |
| 179 | B6 | §7-B6 | Opening: conscription — Pogi is eighteen | BEAT |
| 180 | B6 | §7-B6 | Build a compact army location and schedule system, not a military action game | MECHANIC |
| 181 | B6 | §7-B6 | Yaron enters as a peer | CHARACTER |
| 182 | B6 | §7-B6 | Yaron's famous television-supporter father remains unnamed and unseen until the user approves an exact identity | RULE |
| 183 | B6 | §7-B6 | The first leave negotiation teaches the player that attendance now spends institutional trust | SCENE |
| 184 | B6 | §7-B6 | "לא עולה על האוטובוס הזה" is confirmed user oral history, not invented flavour | RULE |
| 185 | B6 | §7-B6 | Scene: Tel Aviv Central Bus Station; Pogi must return to base | SCENE |
| 186 | B6 | §7-B6 | Factual core: he has a real deadline to return to base | ANCHOR |
| 187 | B6 | §7-B6 | Factual core: this bus would get him there on time | ANCHOR |
| 188 | B6 | §7-B6 | Factual core: it is a Beitar Jerusalem supporters' bus | ANCHOR |
| 189 | B6 | §7-B6 | Factual core: he knowingly does not board | ANCHOR |
| 190 | B6 | §7-B6 | Factual core: the consequence is arriving two hours late to base | ANCHOR |
| 191 | B6 | §7-B6 | Do not "improve" the memory: no bus breakdown, no secret faster ride, no automatic army forgiveness | RULE |
| 192 | B6 | §7-B6 | Do not invent the route, base, match, commander, punishment, companions, exact dialogue or how the bus was marked as Beitar | RULE |
| 193 | B6 | §7-B6 | A visible clock and a genuinely viable bus establish that boarding is the responsible action | MECHANIC |
| 194 | B6 | §7-B6 | The player can board, refuse openly, hesitate until it leaves, or search for another route | CHOICE |
| 195 | B6 | §7-B6 | The canonical personal-memory route is refusal and lateness; other choices are fictional Pogi branches and must not be presented as what happened to the user | RULE |
| 196 | B6 | §7-B6 | The late arrival changes `commanderTrust`, `leaveDebt` and access to a later match | STATE |
| 197 | B6 | §7-B6 | Yaron, Kobi or a squadmate may later challenge whether this was loyalty, stubbornness or theatre | BEAT |
| 198 | B6 | §7-B6 | The Double finale recalls the incident without forcing a moral verdict | BEAT |
| 199 | B6 | §7-B6 | The humour is in the impossible seriousness of the decision, never in mocking military duty or supporter identity | RULE |
| 200 | B6 | §7-B6 | The consequence must land before the joke can become a cherished story | RULE |
| 201 | B6 | §7-B6 | The crowd splits around Gate 7, its closure/conflict history and the younger move toward Gate 5 | SCENE |
| 202 | B6 | §7-B6 | Kobi and legacy supporters pull one way; Asaf, Melamed and younger organization pull another | CHARACTER |
| 203 | B6 | §7-B6 | Choice: stay with Gate 7 / Kobi | CHOICE |
| 204 | B6 | §7-B6 | Choice: move to Gate 5 / the emerging group | CHOICE |
| 205 | B6 | §7-B6 | Choice: walk away from the confrontation | CHOICE |
| 206 | B6 | §7-B6 | Walking away is `outside`, not a permanent neutral victory | RULE |
| 207 | B6 | §7-B6 | A delayed choice later forces itself through access and relationships | RULE |
| 208 | B6 | §7-B6 | Record the reason and witnesses of the gate choice | STATE |
| 209 | B6 | §7-B6 | The player may change side only in a later decade or a deliberately authored later turning point—never by toggling a menu | RULE |
| 210 | B6 | §7-B6 | Required scene: first approach to Gate 5, where Pogi is not automatically welcomed | SCENE |
| 211 | B6 | §7-B6 | Required scene: Melamed tests a rhythm with a darbuka, never a guitar | SCENE |
| 212 | B6 | §7-B6 | Required scene: Asaf assigns unglamorous work before offering status | SCENE |
| 213 | B6 | §7-B6 | Required scene: Kobi responds according to shared history, not with one fixed speech | SCENE |
| 214 | B6 | §7-B6 | Required scene: Barry can remain a bridge without resolving the dispute | SCENE |
| 215 | B6 | §7-B6 | Financial danger through concrete lived signs: delayed payment rumours, missing supplies, a closed office window, newspaper figures, an overheard creditor conversation, uncertainty about tickets, staff doing two jobs | SCENE |
| 216 | B6 | §7-B6 | In November 1996 the club's deficits and supervised accounting make the danger tangible | ANCHOR |
| 217 | B6 | §7-B6 | Freddy can explain what a deficit, Histadrut control and sale mean | CHARACTER |
| 218 | B6 | §7-B6 | Amit verifies | CHARACTER |
| 219 | B6 | §7-B6 | Supporters still disagree about what ownership will cost | BEAT |
| 220 | B6 | §7-B6 | Sinai's exit, Dror Kashtan's arrival, survival and the sale to the private group led by Sami Sagol must occur historically | ANCHOR |
| 221 | B6 | §7-B6 | The buyers are Sami Sagol, Moshe/Moshik Teomim, Moti Orenstein and Rafi Agiv | ANCHOR |
| 222 | B6 | §7-B6 | Treat the purchase as rescue mixed with uncertainty, not a magical happy ending | RULE |
| 223 | B6 | §7-B6 | Player can help a lawful protest or choose distance | CHOICE |
| 224 | B6 | §7-B6 | Player can use Freddy's legal/institutional route | CHOICE |
| 225 | B6 | §7-B6 | Player can follow Asaf's direct-action logistics within safe gameplay boundaries | CHOICE |
| 226 | B6 | §7-B6 | Player can prioritize an army promise and experience the turning point remotely | BRANCH |
| 227 | B6 | §7-B6 | Player can arrive through Liron's car route if its prerequisites were built | BRANCH |
| 228 | B6 | §7-B6 | Liron's away-car scenario is a complete micro-road-story, not fast travel | SCENE |
| 229 | B6 | §7-B6 | Car story elements: old car, fuel decision, radio/static, food stop and route uncertainty | MECHANIC |
| 230 | B6 | §7-B6 | Car dialogue about the old Gate 7 score network and how information has changed | BEAT |
| 231 | B6 | §7-B6 | A disagreement can make Pogi continue by bus/foot or stay in the car | BRANCH |
| 232 | B6 | §7-B6 | The return journey changes with the result and with Pogi's army deadline | BRANCH |
| 233 | B6 | §7-B6 | Missed curfew can unlock `punished`, closing a later event while opening another relationship | STATE |
| 234 | B6 | §7-B6 | Confirmed 1990s travel memories are authored side chapters whose availability depends on money, trust and transport | RULE |
| 235 | B6 | §7-B6 | Nazareth: only about ten supporters are going to a Toto Cup match, so no organized bus leaves | SCENE |
| 236 | B6 | §7-B6 | Nazareth: Pogi hitchhikes all the way | BEAT |
| 237 | B6 | §7-B6 | Nazareth: the journey—not the match score—is the dramatic core: uncertainty, successive rides, clock pressure and the strange intimacy of an almost empty away following | RULE |
| 238 | B6 | §7-B6 | Nazareth: do not invent drivers or danger as user biography; those details may exist only in clearly fictional branches | RULE |
| 239 | B6 | §7-B6 | Forgotten pickup: a supporter promises Pogi a ride and forgets him | SCENE |
| 240 | B6 | §7-B6 | Forgotten pickup: supporters already in the stand collect money for a taxi, allowing him to reach the match | BEAT |
| 241 | B6 | §7-B6 | The forgotten pickup must become a community mechanic: earlier reliability and bonds change who notices he is missing | MECHANIC |
| 242 | B6 | §7-B6 | The confirmed oral-history version preserves the forgotten ride, the collection and the taxi arrival | RULE |
| 243 | B6 | §7-B6 | These stories establish that supporter culture is a material network of seats, calls, coins and people noticing absence | RULE |
| 244 | B6 | §7-B6 | They must echo later in the organizational and supporter-ownership arcs | RULE |

---

## B7 — "גם האולם יכול לרדת" · 1996/97–1997/98

| # | Unit | Section | Requirement | Type |
|---|---|---|---|---|
| 245 | B7 | §6 | B7 = 1996/97–1997/98, anchor: basketball relegation and return | ANCHOR |
| 246 | B7 | §6 | Primary dramatic question: "Does returning erase what ownership taught you?" | RULE |
| 247 | B7 | §7-B7 | Chapter title "גם האולם יכול לרדת" | SCENE |
| 248 | B7 | §7-B7 | The basketball relegation of 1996/97 is not a side note | ANCHOR |
| 249 | B7 | §7-B7 | It happens while football is also near relegation, producing a club-wide sense that both homes can disappear | RULE |
| 250 | B7 | §7-B7 | Football and basketball obligations collide with army leave | MECHANIC |
| 251 | B7 | §7-B7 | Shachor and Limor need practical help at Ussishkin | SCENE |
| 252 | B7 | §7-B7 | Freddy connects funding/ownership questions without delivering a lecture | CHARACTER |
| 253 | B7 | §7-B7 | Pogi may choose one branch and hear the other result later | BRANCH |
| 254 | B7 | §7-B7 | The first relegation raises `ussishkinWound` and `supporterOwnershipSeed` | STATE |
| 255 | B7 | §7-B7 | The following promotion/return provides relief, not closure | RULE |
| 256 | B7 | §7-B7 | Dialogue must preserve suspicion: "עלינו" is not the same as "הבראנו" | RULE |
| 257 | B7 | §7-B7 | The player can be hopeful, sceptical or exhausted | CHOICE |

---

## B8 — "השרוכים" · 2.5.1998

| # | Unit | Section | Requirement | Type |
|---|---|---|---|---|
| 258 | B8 | §6 | B8 = 2.5.1998, anchor: championship trauma | ANCHOR |
| 259 | B8 | §6 | Primary dramatic question: "What do you do with rage when you cannot change the result?" | RULE |
| 260 | B8 | §7-B8 | Chapter title "השרוכים" | SCENE |
| 261 | B8 | §7-B8 | The championship loss is fixed | ANCHOR |
| 262 | B8 | §7-B8 | This is not one more famous match and not a short bridge into the 1999 Cup | RULE |
| 263 | B8 | §7-B8 | It is the decade's character forge: the moment Pogi discovers what he does when the world feels dishonest, everyone around him confirms the story he wants to believe and nothing he does can change the table | RULE |
| 264 | B8 | §7-B8 | Give B8 comparable dramatic weight to the entire B6 crisis | RULE |
| 265 | B8 | §7-B8 | Its consequences stay active through both Cup finals and the Double | STATE |
| 266 | B8 | §7-B8 | Do not create gameplay in which Pogi affects another match or confronts real players/officials as adjudicated villains | RULE |
| 267 | B8 | §7-B8 | The play is information, travel and aftermath | MECHANIC |
| 268 | B8 | §7-B8 | Pogi attends Hapoel's match, serves, works or listens elsewhere according to accumulated state | BRANCH |
| 269 | B8 | §7-B8 | Simultaneous information arrives with delay and contradiction, evolving the 1990 transistor grammar into pagers/phones/radio/people appropriate to 1998 | MECHANIC |
| 270 | B8 | §7-B8 | Nobody initially has a complete picture | RULE |
| 271 | B8 | §7-B8 | Anger spreads through the group faster than verification | RULE |
| 272 | B8 | §7-B8 | Soko becomes essential: what do we know, what did we hear, what are we inventing? | CHARACTER |
| 273 | B8 | §7-B8a | Open at home with the 1990 promotion memory and the 1993 Galil wound available | SCENE |
| 274 | B8 | §7-B8a | Kobi is careful; younger friends speak with certainty | BEAT |
| 275 | B8 | §7-B8a | Pogi can calculate, celebrate early, refuse superstition or hide fear | CHOICE |
| 276 | B8 | §7-B8a | Army/work/gate history determines who travels with him and which promise is at risk | BRANCH |
| 277 | B8 | §7-B8a | The Sinai rupture supplies subtext: Pogi already knows love can survive disillusionment, but not yet what to do with total powerlessness | RULE |
| 278 | B8 | §7-B8b | Evolve B1's transistor design into period-correct radio, phone, pager and human relays | MECHANIC |
| 279 | B8 | §7-B8b | Hapoel's match is lived directly according to the presence route | BRANCH |
| 280 | B8 | §7-B8b | Beit She'an–Beitar reaches Pogi only through delayed, attributed reports | MECHANIC |
| 281 | B8 | §7-B8b | A trusted friend can relay an incomplete or wrong detail without becoming a liar | RULE |
| 282 | B8 | §7-B8b | At the decisive change, remove explanatory UI; use sound, faces, repeated questions and the delay before the crowd understands | ART |
| 283 | B8 | §7-B8c | Create a pressure-cooker free-roam aftermath: ten minutes with no objective marker | SCENE |
| 284 | B8 | §7-B8c | NPCs shout, cry, verify, freeze, search for friends, want confrontation or want to leave | MECHANIC |
| 285 | B8 | §7-B8c | Behaviour derives from relationships and gate identity | RULE |
| 286 | B8 | §7-B8c | The player chooses a human action under pressure, not an abstract ideology | RULE |
| 287 | B8 | §7-B8c | Choice: stay with a devastated friend | CHOICE |
| 288 | B8 | §7-B8c | Choice: chase confrontation and be pulled back or face consequences | CHOICE |
| 289 | B8 | §7-B8c | Choice: go home to Kobi | CHOICE |
| 290 | B8 | §7-B8c | Choice: help preserve evidence/newspapers with Soko | CHOICE |
| 291 | B8 | §7-B8c | Choice: return to Ussishkin because another branch still needs people | CHOICE |
| 292 | B8 | §7-B8d | After the Beit She'an incident, an Arabic teacher says "טייב" | SCENE |
| 293 | B8 | §7-B8d | Pogi hears it through the wound, thinks she is mocking him by invoking Eitan Tayeb, and becomes upset | BEAT |
| 294 | B8 | §7-B8d | The scene must preserve the misunderstanding rather than make the teacher malicious | RULE |
| 295 | B8 | §7-B8d | Give Pogi choices to react, ask what she meant, leave, snap, remain silent or understand only later | CHOICE |
| 296 | B8 | §7-B8d | Earlier knowledge, impulsiveness and trust determine whether the misunderstanding is repaired | BRANCH |
| 297 | B8 | §7-B8d | The point: the match has changed how he hears an ordinary word | RULE |
| 298 | B8 | §7-B8e | `LacesResponse` = 'witness' \| 'protector' \| 'organizer' \| 'avenger' \| 'withdrawn' \| 'unresolved' | STATE |
| 299 | B8 | §7-B8e | Not a bonus class; it changes how Pogi responds to later ownership crises, apparent injustice and protest | RULE |
| 300 | B8 | §7-B8e | In 1999 it changes what "closing a circle" means | BRANCH |
| 301 | B8 | §7-B8e | In 2000 it changes whether he can enjoy certainty or waits for it to be taken away | BRANCH |
| 302 | B8 | §7-B8e | No cathartic violence | RULE |
| 303 | B8 | §7-B8e | High protest escalation may fracture trust, army standing or safety | RULE |
| 304 | B8 | §7-B8e | Quiet care must be as playable and consequential as shouting | RULE |
| 305 | B8 | §7-B8 | שלום תקוה and שביט אלימלך must be visible football anchors in this movement, experienced from supporter distance | CHARACTER |
| 306 | B8 | §7-B8 | Elimelech's steadiness makes the collapse feel more impossible | CHARACTER |
| 307 | B8 | §7-B8 | תקוה embodies the beauty and vulnerability Pogi fears the sport can erase | CHARACTER |
| 308 | B8 | §7-B8 | Do not fabricate private access | RULE |

---

## B9 — "זה לא נגמר כשעולים" · 1998/99

| # | Unit | Section | Requirement | Type |
|---|---|---|---|---|
| 309 | B9 | §6 | B9 = 1998/99, anchor: second basketball relegation / organizing | ANCHOR |
| 310 | B9 | §6 | Primary dramatic question: "Can a supporter imagine owning responsibility, not just anger?" | RULE |
| 311 | B9 | §7-B9 | Chapter title "זה לא נגמר כשעולים" | SCENE |
| 312 | B9 | §7-B9 | Basketball's second relegation makes the rupture continuous | ANCHOR |
| 313 | B9 | §7-B9 | Shaul Eisenberg becomes, from Pogi's subjective supporter viewpoint, an institutional "enemy" | CHARACTER |
| 314 | B9 | §7-B9 | Narration must distinguish perspective from proven biography: characters can accuse, argue and distrust; the archive layer states only verified ownership and sporting facts | RULE |
| 315 | B9 | §7-B9 | Thread 1 — Ussishkin wound: poor stability, queues and practical labour; Shachor/Limor anchor it | SCENE |
| 316 | B9 | §7-B9 | Thread 2 — Future seed: Freddy discusses structures, Soko preserves records | MECHANIC |
| 317 | B9 | §7-B9 | Thread 2 — Pogi can begin lists of people/resources/principles | MECHANIC |
| 318 | B9 | §7-B9 | Thread 2 is the emotional and organizational prehistory of Hapoel Ussishkin, not its premature founding | RULE |
| 319 | B9 | §7-B9 | Thread 3 — Gate 5 culture: Asaf coordinates, Melamed creates, Michel connects transport, Dudu and Omer add ordinary social life | CHARACTER |
| 320 | B9 | §7-B9 | Organization is work before it becomes iconography | RULE |
| 321 | B9 | §7-B9 | The emerging Ultras culture in 1999 may be represented through fictionalized supporter labour and verified public facts | RULE |
| 322 | B9 | §7-B9 | Do not assign unverified founding acts or quotations to real memorial characters | RULE |

---

## B10 — "שש־עשרה שנה" · 19.5.1999

| # | Unit | Section | Requirement | Type |
|---|---|---|---|---|
| 323 | B10 | §6 | B10 = 19.5.1999, anchor: Cup final vs Beitar | ANCHOR |
| 324 | B10 | §6 | Primary dramatic question: "Can the divided group celebrate together again?" | RULE |
| 325 | B10 | §7-B10 | Chapter title "שש־עשרה שנה" | SCENE |
| 326 | B10 | §7-B10 | Historical anchor: football State Cup final against Beitar Jerusalem | ANCHOR |
| 327 | B10 | §7-B10 | Anchor: 1:1 after 120 minutes | ANCHOR |
| 328 | B10 | §7-B10 | Anchor: Hapoel wins the shootout 3:1 | ANCHOR |
| 329 | B10 | §7-B10 | Anchor: Shimon Gershon scores the decisive penalty | ANCHOR |
| 330 | B10 | §7-B10 | Anchor: שלום תקוה scores Hapoel's equalizer | ANCHOR |
| 331 | B10 | §7-B10 | Anchor: שביט אלימלך saves two penalties | ANCHOR |
| 332 | B10 | §7-B10 | These fixed actions need buildup, crowd reaction and aftermath—not a result-card mention | RULE |
| 333 | B10 | §7-B10 | This is the first convergence checkpoint after the decade's fractures | RULE |
| 334 | B10 | §7-B10 | Getting there depends on army/work, money, transport and prior reliability | MECHANIC |
| 335 | B10 | §7-B10 | Gate 7 and Gate 5 companions may arrive separately | BRANCH |
| 336 | B10 | §7-B10 | Basketball-first friends have reasons to be hurt or distant | BRANCH |
| 337 | B10 | §7-B10 | Liron/Michel/Ofir routes provide different journeys, not cosmetic skins | BRANCH |
| 338 | B10 | §7-B10 | Pogi may carry an object or promise from 1993 | ITEM |
| 339 | B10 | §7-B10 | During penalties, player input controls breath, looking, holding a friend's shoulder or turning away—not the kicks | MECHANIC |
| 340 | B10 | §7-B10 | After victory, the group may reunite, remain divided or share one temporary embrace | BRANCH |
| 341 | B10 | §7-B10 | Do not force reconciliation merely because a trophy was won | RULE |

---

## B11 — "ארבעה ימים" · 13–17.5.2000

| # | Unit | Section | Requirement | Type |
|---|---|---|---|---|
| 342 | B11 | §6 | B11 = 13–17.5.2000, anchor: championship + Cup / Double | ANCHOR |
| 343 | B11 | §6 | Primary dramatic question: "Who have you become, and who is still beside you?" | RULE |
| 344 | B11 | §7-B11 | Chapter title "ארבעה ימים" | SCENE |
| 345 | B11 | §7-B11 | A two-part playable final exam with persistent exhaustion, money, promises and relationships across four days | MECHANIC |
| 346 | B11 | §7-B11-I | Historical anchor: Bnei Yehuda 1, Hapoel Tel Aviv 1 at Shkhunat Hatikva; the draw clinches the championship | ANCHOR |
| 347 | B11 | §7-B11-I | Pogi can arrive through different routes or miss it because an earlier army/work debt finally matures | BRANCH |
| 348 | B11 | §7-B11-I | Remote routes remain full scenes | RULE |
| 349 | B11 | §7-B11-I | Emotional check: who stands beside Pogi | RULE |
| 350 | B11 | §7-B11-I | Emotional check: whether Kobi is present and whether an embrace is earned | RULE |
| 351 | B11 | §7-B11-I | Emotional check: whether Pogi looks for football friends, basketball friends or both | RULE |
| 352 | B11 | §7-B11-I | Emotional check: how the 1998 trauma changes the ability to believe the news | RULE |
| 353 | B11 | §7-B11-I | Emotional check: whether celebration becomes care, excess, responsibility or lonely observation | RULE |
| 354 | B11 | §7-B11-I | Do not roll credits. The Cup final is four days away | RULE |
| 355 | B11 | §7-Interlude | No montage-only skip; give the player a compact schedule | MECHANIC |
| 356 | B11 | §7-Interlude | Interlude activity: sleep/recover | CHOICE |
| 357 | B11 | §7-Interlude | Interlude activity: work or earn money | CHOICE |
| 358 | B11 | §7-Interlude | Interlude activity: repair a family/army promise | CHOICE |
| 359 | B11 | §7-Interlude | Interlude activity: help Gate 5 preparations | CHOICE |
| 360 | B11 | §7-Interlude | Interlude activity: help an Ussishkin friend despite football glory | CHOICE |
| 361 | B11 | §7-Interlude | Interlude activity: secure transport/ticket | CHOICE |
| 362 | B11 | §7-Interlude | Interlude activity: visit the Red Box | CHOICE |
| 363 | B11 | §7-Interlude | The player cannot maximize everything | RULE |
| 364 | B11 | §7-Interlude | Exhaustion from the championship must affect the final | MECHANIC |
| 365 | B11 | §7-B11-II | Historical anchor: Hapoel 2, Beitar Jerusalem 2 after extra time; Hapoel wins 4:2 on penalties and completes the Double | ANCHOR |
| 366 | B11 | §7-B11-II | Input never changes a kick; gameplay controls presence, attention, support and conduct | MECHANIC |
| 367 | B11 | §7-B11-II | Callback: 1993 — joy followed by loss | BEAT |
| 368 | B11 | §7-B11-II | Callback: 1996/97 — when survival itself felt impossible | BEAT |
| 369 | B11 | §7-B11-II | Callback: 1998 — the fear that certainty is a trap | BEAT |
| 370 | B11 | §7-B11-II | Callback: 1999 — the first cup and first partial reunion | BEAT |
| 371 | B11 | §7-B11-II | Callback: the chosen gate and everyone left on the other side | BEAT |
| 372 | B11 | §7-B11-II | Callback: matches missed because of army, work or promises | BEAT |
| 373 | B11 | §7-B11-II | שלום תקוה supplies the extra-time assist for Hapoel's second goal and joins the trophy lift | ANCHOR |
| 374 | B11 | §7-B11-II | שביט אלימלך carries the accumulated shootout trust from 1999 and the 2000 semifinal into the final | CHARACTER |
| 375 | B11 | §7-B11-II | Keep all access within Pogi's supporter viewpoint; do not invent private locker-room speeches | RULE |
| 376 | B11 | §7-Final walk | End outside the stadium or on the journey home, not on a statistics screen | SCENE |
| 377 | B11 | §7-Final walk | Create outcome families, not good/bad endings | RULE |
| 378 | B11 | §7-Final walk | Ending — Inherited and chosen: Kobi bond and new-group bond both survive, with visible tension | ENDING |
| 379 | B11 | §7-Final walk | Ending — Gate 5 builder: high organization/community, real fatigue and an unresolved family cost | ENDING |
| 380 | B11 | §7-Final walk | Ending — Gate 7 keeper: strong continuity/history, awareness of what changed without Pogi | ENDING |
| 381 | B11 | §7-Final walk | Ending — Two halls, one life: basketball wound/community seed remain central during football glory | ENDING |
| 382 | B11 | §7-Final walk | Ending — Always travelling: rich shared history, low stability, people remember both rescues and broken promises | ENDING |
| 383 | B11 | §7-Final walk | Ending — Heard from elsewhere: major events missed, but reliability or care built a different adult | ENDING |
| 384 | B11 | §7-Final walk | Ending — Alone in the crowd: high devotion with damaged bonds; the Double is joyous and still lonely | ENDING |
| 385 | B11 | §7-Final walk | Every finale includes the Double; what changes is its human meaning | RULE |

---

## §4 — The persistent systems Stage B requires

| # | Unit | Section | Requirement | Type |
|---|---|---|---|---|
| 386 | ALL | §4 | Do not encode the decade as hundreds of isolated flags; add typed, migratable state surfaces and derive dialogue from them | RULE |
| 387 | ALL | §4.1 | `type GateIdentity = 'gate7' \| 'gate5' \| 'between' \| 'outside'` | STATE |
| 388 | ALL | §4.1 | `type GateHistoryEntry = { from: GateIdentity; to: GateIdentity; year: number; reason }` | STATE |
| 389 | ALL | §4.1 | `reason` ∈ 'family' \| 'friends' \| 'closure' \| 'culture' \| 'conflict' \| 'safety' \| 'return' | STATE |
| 390 | ALL | §4.1 | The 1990s split must force a side | RULE |
| 391 | ALL | §4.1 | `between` is a temporary state, not a consequence-free permanent answer | RULE |
| 392 | ALL | §4.1 | A player may later enter Gate 5, leave Gate 5 or return toward an older gate in a later decade — therefore store history, not only a Boolean | RULE |
| 393 | ALL | §4.1 | Neither gate is the moral-good route | RULE |
| 394 | ALL | §4.1 | Gate 7 can mean Kobi, continuity, restraint and memory; it can also become rigidity or refusal to see that a generation has changed | RULE |
| 395 | ALL | §4.1 | Gate 5 can mean invention, organized support, risk and a chosen family; it can also demand time, conformity and escalation | RULE |
| 396 | ALL | §4.1 | `outside` is valid after fear, exhaustion or alienation, but creates loneliness and different access—not a game-over | RULE |
| 397 | ALL | §4.2 | `type ArmyRoute = 'trusted' \| 'negotiator' \| 'rebellious' \| 'punished' \| 'detached'` | STATE |
| 398 | ALL | §4.2 | `type ArmyState = { route; commanderTrust; leaveDebt; fatigue; missedAnchors: string[]; coveredForOthers }` | STATE |
| 399 | ALL | §4.2 | Army service can materially change routes | MECHANIC |
| 400 | ALL | §4.2 | Getting to one match may consume trust needed for the next | MECHANIC |
| 401 | ALL | §4.2 | Lying can work once and close a later door | MECHANIC |
| 402 | ALL | §4.2 | Covering a shift for a squadmate may cause a missed match but earn help in a more important chapter | MECHANIC |
| 403 | ALL | §4.2 | There must be no "perfect attendance" route that also maximizes army trust, energy, family and money | RULE |
| 404 | ALL | §4.3 | Track distinct institutional positions; do not collapse them into generic loyalty | RULE |
| 405 | ALL | §4.3 | `InstitutionState.sinai` = 'defending' \| 'doubting' \| 'broken' \| 'reconciled-memory' | STATE |
| 406 | ALL | §4.3 | `footballOwnershipTrust: number` | STATE |
| 407 | ALL | §4.3 | `basketballOwnershipTrust: number` | STATE |
| 408 | ALL | §4.3 | `protestEscalation: number` | STATE |
| 409 | ALL | §4.3 | `legalUnderstanding: number` | STATE |
| 410 | ALL | §4.3 | `ussishkinWound: number` | STATE |
| 411 | ALL | §4.3 | `supporterOwnershipSeed: number` | STATE |
| 412 | ALL | §4.3 | `supporterOwnershipSeed` is the beginning of the future Hapoel Ussishkin arc; it may become strong in 1996/97 and 1998/99 | RULE |
| 413 | ALL | §4.3 | The club is not founded in this stage; do not move the real founding backward in time | RULE |
| 414 | ALL | §4.3 | Stage B creates the memory, relationships, arguments, lists and convictions that will make the later act believable | RULE |
| 415 | ALL | §4.4 | `type PresenceMode = 'inside' \| 'late' \| 'outside' \| 'radio' \| 'television' \| 'army' \| 'working' \| 'heard-from-friend' \| 'archive-later'` | STATE |
| 416 | ALL | §4.4 | Store a presence mode for every anchor | STATE |
| 417 | ALL | §4.4 | Every mode needs its own scene and memory; "missed" is a route, not empty content | RULE |
| 418 | ALL | §4.5 | Major choices must touch at least two systems | RULE |
| 419 | ALL | §4.5 | Defend Sinai: Kobi bond rises at first, young-fan respect may fall, later regret can deepen | BRANCH |
| 420 | ALL | §4.5 | Move to Gate 5: Asaf/Melamed access rises, Kobi tension rises, army leave pressure grows | BRANCH |
| 421 | ALL | §4.5 | Attend basketball during a football crisis: basketball belonging rises, football friends may remember the absence | BRANCH |
| 422 | ALL | §4.5 | Join a protest: institutional awareness and group respect may rise while safety, army trust or family trust fall | BRANCH |
| 423 | ALL | §4.5 | Miss the 1999 Cup because of a promise: reliability rises, regret rises, the Double reunion can become more powerful | BRANCH |

---

## §5 — Cast routing for the decade

| # | Unit | Section | Requirement | Type |
|---|---|---|---|---|
| 424 | ALL | §5 | Use `docs/life/CHARACTER-BIBLE.md` as the voice source; this table assigns dramatic jobs, not new biography | RULE |
| 425 | ALL | §5 | Kobi — Gate 7, inheritance, home truth; turning point: Pogi must disagree with him without erasing love | CHARACTER |
| 426 | ALL | §5 | Rachel — time, money, army aftermath, practical reality; turning point: detects the cost before Pogi admits it | CHARACTER |
| 427 | ALL | §5 | Ofir — street, away travel, risk; turning point: absence or loyalty accumulates across years | CHARACTER |
| 428 | ALL | §5 | Amit — facts, tables, scepticism; turning point: distinguishes rumour from evidence during crises | CHARACTER |
| 429 | ALL | §5 | Efi — first basketball bridge; turning point: opens the 1991–93 Ussishkin path; may later drift naturally | CHARACTER |
| 430 | ALL | §5 | Barry — terrace continuity; turning point: recognizes Pogi as an adult only after a concrete act | CHARACTER |
| 431 | ALL | §5 | Melamed — songs and cultural creation; turning point: a small rhythm choice returns from a full stand years later | CHARACTER |
| 432 | ALL | §5 | Asaf — Gate 5 organization; turning point: offers belonging that demands labour and discipline | CHARACTER |
| 433 | ALL | §5 | Michel Bar-Khalifa — human transport/network; turning point: solves access through people, never magic fast travel | CHARACTER |
| 434 | ALL | §5 | Soko — archive and accuracy; turning point: preserves what others mythologize; challenges a false memory | CHARACTER |
| 435 | ALL | §5 | Shachor — practical Ussishkin organization; turning point: turns grief into tasks, lists and material responsibility | CHARACTER |
| 436 | ALL | §5 | Omer Hermesh — ordinary warmth and culture; turning point: late-90s friendship scene with records, humour or travel | CHARACTER |
| 437 | ALL | §5 | Freddy — legal/institutional argument; turning point: separates legitimate protest from dangerous escalation | CHARACTER |
| 438 | ALL | §5 | Liron — continuity and car route; turning point: drives Pogi to one authored away day with a full return journey | CHARACTER |
| 439 | ALL | §5 | Yaron — army peer and inherited public identity; turning point: can protect or exploit access; wants to be more than "the son" | CHARACTER |
| 440 | ALL | §5 | Dudu — loud away-bus energy; turning point: comedy that becomes care when someone is stranded | CHARACTER |
| 441 | ALL | §5 | Limor — Ussishkin queue intelligence; turning point: makes entry logistics playable and exposes unprepared bravado | CHARACTER |
| 442 | ALL | §5 | שלום תקוה — returning football artist, continuity and hope; turning point: bridges the bad years, 1999 Cup and Double | CHARACTER |
| 443 | ALL | §5 | שביט אלימלך — goalkeeper and calm under pressure; turning point: turns shootouts into breath, trust and accumulated belief | CHARACTER |
| 444 | ALL | §5 | Yosef, Batya, Uli, Melanie, Dor and later-decade ensemble characters do not enter this stage | RULE |

---

## §8 — Branch collision examples

| # | Unit | Section | Requirement | Type |
|---|---|---|---|---|
| 445 | B5/B6 | §8.1 | Early defence of Sinai makes staying with Kobi emotionally easier and Gate 5 entry harder | BRANCH |
| 446 | B5/B6 | §8.1 | A late rupture can be more powerful but may arrive after friends stopped asking Pogi to join | BRANCH |
| 447 | B6 | §8.1 | Moving to Gate 5 only to follow anger produces less trust than doing the work Asaf assigns | BRANCH |
| 448 | B11 | §8.1 | Preserving love for Sinai the player unlocks a mature 2000 callback without reversing judgment | BRANCH |
| 449 | B6/B8/B10 | §8.2 | Fight for leave in B6 and succeed → higher chance of punishment/denial in B8 or B10 | BRANCH |
| 450 | B6/B11 | §8.2 | Cover a squadmate's shift → miss a match but gain reciprocal help for 17.5.2000 | BRANCH |
| 451 | B6 | §8.2 | Abuse Yaron's family connection → short-term access, reduced respect and a later refusal | BRANCH |
| 452 | B6 | §8.2 | Accept missing an event honestly → regret rises; commander trust and relationship reliability may create a stronger later route | BRANCH |
| 453 | B7 | §8.3 | Choose Ussishkin during a football crisis → Gate friends remember absence; Shachor remembers help | BRANCH |
| 454 | B9 | §8.3 | Abandon basketball after promotion → second relegation lands as guilt rather than shared grief | BRANCH |
| 455 | ALL | §8.3 | Keep both branches alive → more collisions, exhaustion and expense; never a free "balanced" route | BRANCH |
| 456 | B9 | §8.3 | High supporter-ownership seed changes later-decade dialogue but does not found a club in 1999 | BRANCH |
| 457 | B6 | §8.4 | Legal route with Freddy can preserve access but frustrate action-first Asaf | BRANCH |
| 458 | B6/B9 | §8.4 | Direct lawful organizing builds group respect but consumes time and money | BRANCH |
| 459 | ALL | §8.4 | Reckless escalation can close army, family or stadium routes and must never be the optimal content farm | RULE |
| 460 | ALL | §8.4 | Refusing escalation is not cowardice by default; motive and prior courage matter | RULE |

---

## §9 — Dialogue rules

| # | Unit | Section | Requirement | Type |
|---|---|---|---|---|
| 461 | ALL | §9 | Choices contain 2–4 spoken or physical responses. No abstract "+loyalty" labels | RULE |
| 462 | ALL | §9 | Nobody recites Wikipedia. Facts emerge because someone needs to decide what to do | RULE |
| 463 | ALL | §9 | Use era-correct information technology and language; research slang before shipping it | RULE |
| 464 | ALL | §9 | Sinai dialogue must preserve the pain of loving the former player | RULE |
| 465 | ALL | §9 | Kobi is not automatically right and Gate 5 is not automatically youthful truth | RULE |
| 466 | ALL | §9 | Freddy's arguments are sharp and interruptible; provide "cut him off," "ask for the practical point" and "let him finish" when appropriate | RULE |
| 467 | ALL | §9 | Melamed creates with rhythm and a darbuka. Never give him a guitar | RULE |
| 468 | ALL | §9 | Soko corrects details but can be socially exhausting; accuracy is not omniscience | RULE |
| 469 | ALL | §9 | Omer and Michel receive ordinary jokes, silence, inconvenience and warmth. No memorial coding | RULE |
| 470 | ALL | §9 | Shaul Eisenberg is discussed through supporter experience and verified institutional events; "enemy" is Pogi's viewpoint, not omniscient narration | RULE |

---

## §10 — World, navigation and sensory direction

| # | Unit | Section | Requirement | Type |
|---|---|---|---|---|
| 471 | ALL | §10 | Required space: the same home/bedroom/kitchen aging through the decade | ART |
| 472 | ALL | §10 | Required space: neighbourhood street and Rafi's kiosk | ART |
| 473 | ALL | §10 | Required space: Bloomfield exterior, Gate 7 approach, Gate 5 approach, inside-stand variants | ART |
| 474 | ALL | §10 | Required space: Ussishkin exterior, queue, hall, edge/corridor and quiet after-game state | ART |
| 475 | ALL | §10 | Required space: school/classroom for early decade | ART |
| 476 | ALL | §10 | Required space: army room/gate/telephone area, minimal but fully interactive | ART |
| 477 | ALL | §10 | Required space: Liron's car and road/stop fragments | ART |
| 478 | ALL | §10 | Required space: bus/train/away approach as reusable travel grammar | ART |
| 479 | ALL | §10 | Required space: workplace/shift fragment for 1999–2000 | ART |
| 480 | ALL | §10 | Required space: Ramat Gan Stadium approach and interior for both Cup finals | ART |
| 481 | ALL | §10 | Required space: Shkhunat Hatikva approach for 13.5.2000 | ART |
| 482 | ALL | §10 | Do not build a decade by swapping title cards over one unchanged street | RULE |
| 483 | ALL | §10 | Geometry may recur, but vehicles, signs, clothes, audio, objects, lighting and available doors must age | ART |
| 484 | ALL | §10 | Audio: transistor static evolves into radio/phone/pager-era information | AUDIO |
| 485 | ALL | §10 | Audio: Ussishkin has hard, immediate reflections and intimate crowd pressure | AUDIO |
| 486 | ALL | §10 | Audio: Gate 5 songs begin in small, imperfect clusters before returning at scale | AUDIO |
| 487 | ALL | §10 | Audio: use silence after Galil, relegations and 1998; do not wallpaper grief with music | AUDIO |
| 488 | ALL | §10 | Audio: the Double finale recalls earlier motifs without turning into a sentimental trailer | AUDIO |

---

## §11 — Economy, time and failure

| # | Unit | Section | Requirement | Type |
|---|---|---|---|---|
| 489 | ALL | §11 | Every major unit needs at least one resource conflict | MECHANIC |
| 490 | ALL | §11 | Resource conflict: fare versus ticket/food | MECHANIC |
| 491 | ALL | §11 | Resource conflict: army leave versus future trust | MECHANIC |
| 492 | ALL | §11 | Resource conflict: sleep versus preparation | MECHANIC |
| 493 | ALL | §11 | Resource conflict: work shift versus attendance | MECHANIC |
| 494 | ALL | §11 | Resource conflict: helping people versus securing position | MECHANIC |
| 495 | ALL | §11 | Resource conflict: keeping a promise versus following the crowd | MECHANIC |
| 496 | ALL | §11 | No dead end because Pogi lacks money; offer work, walking, radio, help-with-a-price or a different companion route | RULE |
| 497 | ALL | §11 | No instant reset after missed curfew, lost ticket, argument or missed match | RULE |
| 498 | ALL | §11 | Consequence appears later through behaviour: someone does not call, saves a place, refuses a ride, trusts Pogi with money or tells him last | RULE |
| 499 | ALL | §11 | Random encounters may complicate a route but must be seeded and QA-reproducible | RULE |

---

## §12 — Red Box memories

| # | Unit | Section | Requirement | Type |
|---|---|---|---|---|
| 500 | ALL | §12 | Add period, physical objects—not RPG loot | RULE |
| 501 | B2 | §12 | 1991 Ussishkin stub / handwritten entrance note | ITEM |
| 502 | B3 | §12 | 1993 Cup stub or red paper strip | ITEM |
| 503 | B4 | §12 | 1993 finals travel note / newspaper fragment | ITEM |
| 504 | B5 | §12 | Worn Sinai image or clipping, with choice to store, fold away or leave on wall | ITEM |
| 505 | B6 | §12 | Army leave form fragment without sensitive personal data | ITEM |
| 506 | B6 | §12 | Gate 7 or Gate 5 hand-made material | ITEM |
| 507 | B6 | §12 | 1996 deficit/sale newspaper clipping | ITEM |
| 508 | B7/B9 | §12 | Basketball relegation stub | ITEM |
| 509 | B8 | §12 | 1998 newspaper/radio note | ITEM |
| 510 | B10 | §12 | 1999 Cup stub | ITEM |
| 511 | B11 | §12 | 2000 championship and Cup objects | ITEM |
| 512 | ALL | §12 | The box must allow contradictory memories side by side | RULE |
| 513 | ALL | §12 | Do not force the player to discard the Cup because the championship was lost, or Sinai's player image because the managerial bond broke | RULE |

---

## §13 — Content architecture

| # | Unit | Section | Requirement | Type |
|---|---|---|---|---|
| 514 | ALL | §13 | Do not continue growing one `WorldScene.ts` switch | RULE |
| 515 | ALL | §13 | Introduce an `EraDefinition`/chapter registry keyed by stable chapter IDs | MECHANIC |
| 516 | ALL | §13 | Register content, schedules, encounters, maps, palettes, portraits and anchors by unit | MECHANIC |
| 517 | ALL | §13 | Make chapter transitions data-driven | MECHANIC |
| 518 | ALL | §13 | Preserve all existing persisted event and item IDs | RULE |
| 519 | ALL | §13 | Add schema migration/default folding for new Stage B state | MECHANIC |
| 520 | ALL | §13 | Keep historical anchor resolution outside fictional dialogue | RULE |
| 521 | ALL | §13 | Let presence modes select authored scene variants | MECHANIC |
| 522 | ALL | §13 | Keep unavailable art behind honest fallbacks; never reference missing asset keys | RULE |
| 523 | ALL | §13 | Suggested chapter IDs: `1990-promotion`, `1991-ussishkin`, `1993-basketball-cup`, `1993-galil-finals`, `1994-1996-sinai`, `1996-army-gate-split`, `1997-survival-purchase`, `1997-basketball-relegation`, `1998-laces`, `1999-basketball-relegation`, `1999-football-cup`, `2000-championship`, `2000-cup-double` | MECHANIC |
| 524 | ALL | §13 | Do not use calendar year alone as the persisted chapter key; several years contain multiple units | RULE |

---

## §14 — Historical anchors and verification ledger

| # | Unit | Section | Requirement / Anchor (verification status) | Type |
|---|---|---|---|---|
| 525 | ALL | §14 | All exact facts must enter through canonical anchor data with source notes | RULE |
| 526 | ALL | §14 | Before shipping, verify dates, venue, score orientation, competition and stage from at least one authoritative record and, for disputed/sensitive events, a second independent source | RULE |
| 527 | B3 | §14 | `basketball-cup-1993` — 19.4.1993, Hapoel TA 71–65 Hapoel Givatayim (status: fixed fact; verify against authoritative record) | ANCHOR |
| 528 | B4 | §14 | `basketball-finals-1993-g1` — Galil wins at Ussishkin, 88–73 (status: fixed fact; resolve score orientation in archive) | ANCHOR |
| 529 | B4 | §14 | `basketball-finals-1993-series` — Galil Elyon wins series 3–1 (status: fixed fact) | ANCHOR |
| 530 | B5 | §14 | `football-cup-final-1994` — derby Cup-final loss, 0–2 (status: fixed fact) | ANCHOR |
| 531 | B5 | §14 | `football-zimbru-1996` — European qualifying elimination; **verify legs/date before dialogue** (status: verification required) | ANCHOR |
| 532 | B6 | §14 | `football-deficit-1996` — supervised accounting amid reported deficits; **amounts require sourced anchor** (status: partially unverified) | ANCHOR |
| 533 | B6 | §14 | `sinai-departure-1997` — Sinai leaves during last-place crisis; Kashtan succeeds him (status: fixed fact) | ANCHOR |
| 534 | B6 | §14 | `football-private-sale-1997` — Histadrut sale to Sagol/Teomim/Orenstein/Agiv group (status: fixed fact) | ANCHOR |
| 535 | B7 | §14 | `basketball-relegation-1997` — first top-flight relegation (status: fixed fact) | ANCHOR |
| 536 | B8 | §14 | `football-laces-1998` — 2.5.1998 championship-loss context (status: fixed fact) | ANCHOR |
| 537 | B9 | §14 | `basketball-relegation-1999` — second relegation in the continuing crisis (status: fixed fact) | ANCHOR |
| 538 | B10 | §14 | `football-cup-1999` — 1:1 after 120, shootout 3:1 vs Beitar; Gershon decisive (status: fixed fact) | ANCHOR |
| 539 | B11 | §14 | `football-title-2000` — 13.5.2000, 1:1 at Bnei Yehuda, title clinched (status: fixed fact) | ANCHOR |
| 540 | B11 | §14 | `football-cup-2000` — 17.5.2000, 2:2, shootout 4:2 vs Beitar; Double completed (status: fixed fact) | ANCHOR |
| 541 | ALL | §14 | Research caution: older result pages sometimes display the score column in winner-first order even when the home team is listed first | RULE |
| 542 | ALL | §14 | Resolve orientation in the server archive, test it and write Hebrew narration from the normalized anchor | RULE |

---

## §15 — Implementation order

| # | Unit | Section | Requirement | Type |
|---|---|---|---|---|
| 543 | ALL | §15 Pass 1 | Add chapter registry and state migrations | MECHANIC |
| 544 | ALL | §15 Pass 1 | Implement `GateIdentity`, `ArmyState`, `InstitutionState`, `PresenceMode` | STATE |
| 545 | B1 | §15 Pass 1 | Make current B1 transition into a registered next unit | MECHANIC |
| 546 | ALL | §15 Pass 1 | Unit-test save replay from an existing 1986/1990 log | RULE |
| 547 | B2–B4 | §15 Pass 2 | B2–B4 maps, schedules, dialogue, travel and alternate presence routes | SCENE |
| 548 | B3/B4 | §15 Pass 2 | Anchors for Givatayim and Galil | ANCHOR |
| 549 | B2–B4 | §15 Pass 2 | Ussishkin relationships, memory objects and branch collision tests | MECHANIC |
| 550 | B5/B6 | §15 Pass 3 | B5–B6 with defence/doubt/rupture continuity | BRANCH |
| 551 | B6 | §15 Pass 3 | Army schedule/leave debt | MECHANIC |
| 552 | B6 | §15 Pass 3 | Forced Gate choice with history entry | STATE |
| 553 | B6 | §15 Pass 3 | Liron car scenario | SCENE |
| 554 | B6 | §15 Pass 3 | Financial danger, sale and survival anchors | ANCHOR |
| 555 | B7/B9 | §15 Pass 4 | Both basketball relegations and supporter-ownership seed | STATE |
| 556 | B8 | §15 Pass 4 | B8 delayed-information system | MECHANIC |
| 557 | B6/B8 | §15 Pass 4 | Safe protest consequence routes | BRANCH |
| 558 | B8/B9 | §15 Pass 4 | Soko/Shachor/Freddy/Asaf integration | CHARACTER |
| 559 | B10 | §15 Pass 5 | B10 convergence | SCENE |
| 560 | B11 | §15 Pass 5 | B11 four-day persistent finale | SCENE |
| 561 | B11 | §15 Pass 5 | Personalized final walk and Stage C handoff only after 17.5.2000 | ENDING |
| 562 | ALL | §15 Pass 6 | Request only assets named by implemented scenes | ART |
| 563 | ALL | §15 Pass 6 | Ensure age-correct portraits and walking/close-up/emotion sets | ART |
| 564 | ALL | §15 Pass 6 | Test every presence mode and each Gate path | RULE |
| 565 | ALL | §15 Pass 6 | Test that Yosef never appears before the 2000s | RULE |
| 566 | ALL | §15 Pass 6 | Test that `gabi` produces no registry/content result except a migration alias to `liron` if old saves require it | RULE |

---

## §16 — Acceptance tests (verbatim)

| # | Unit | Section | Requirement | Type |
|---|---|---|---|---|
| 567 | ALL | §16 | Stage B is not complete unless all statements below are true | RULE |
| 568 | B1/B2 | §16 | "A completed Stage A save reaches B1, and B1 reaches B2 without a 'coming soon' dead end." | RULE |
| 569 | B1 | §16 | "Existing B1 saves still replay correctly." | RULE |
| 570 | B3/B4 | §16 | "The player experiences both 1993 basketball peaks: Givatayim Cup joy and Galil championship loss." | RULE |
| 571 | B5 | §16 | "Sinai begins as a defensible childhood hero; the rupture is gradual and remembered." | RULE |
| 572 | B6 | §16 | "A real forced Gate 7/Gate 5/outside split occurs and changes access and relationships." | RULE |
| 573 | B6 | §16 | "The gate choice is stored as history so a later decade can author a move into or out of Gate 5." | RULE |
| 574 | B6 | §16 | "Army service can genuinely close one route and open another." | RULE |
| 575 | ALL | §16 | "There is no route that attends everything without paying time, trust, money or relationship cost." | RULE |
| 576 | B6 | §16 | "Football's near-relegation, financial danger, purchase and survival are playable lived events." | RULE |
| 577 | B7/B9 | §16 | "Both basketball relegations form a continuing rupture; the return between them does not reset it." | RULE |
| 578 | B9 | §16 | "The future Hapoel Ussishkin story is seeded but not founded early." | RULE |
| 579 | B9 | §16 | "Shaul Eisenberg as 'enemy' is clearly Pogi/supporter perspective rather than omniscient allegation." | RULE |
| 580 | B8 | §16 | "The 1998 trauma uses uncertainty and aftermath, not violence or counterfactual intervention." | RULE |
| 581 | B10 | §16 | "The 1999 Cup ends 1:1/3:1 and can converge—but not automatically heal—the divided group." | RULE |
| 582 | B11 | §16 | "Stage B does not end on 13.5.2000." | RULE |
| 583 | B11 | §16 | "The 17.5.2000 Cup final is fully playable and the Double is fixed in every route." | RULE |
| 584 | B11 | §16 | "The ending changes who is present and what it means, never whether Hapoel won." | RULE |
| 585 | ALL | §16 | "Michel Bar-Khalifa and Omer Hermesh are ordinary living characters with no memorial foreshadowing." | RULE |
| 586 | ALL | §16 | "Melamed uses a darbuka, never a guitar." | RULE |
| 587 | ALL | §16 | "Gabi does not exist as a separate character; Gabi is Liron." | RULE |
| 588 | ALL | §16 | "Yosef has zero Stage B spawns, dialogue nodes, schedules or random encounters." | RULE |

---

## §17 — Definition of emotional success

| # | Unit | Section | Requirement | Type |
|---|---|---|---|---|
| 589 | ALL | §17 | By the final whistle on 17.5.2000 the player should be able to remember not only trophies but the items below | RULE |
| 590 | B2 | §17 | The first time Ussishkin felt like another home | BEAT |
| 591 | B4 | §17 | The person beside them when Galil won | BEAT |
| 592 | B5 | §17 | The last argument in which they still defended Sinai | BEAT |
| 593 | B6 | §17 | The exact human cost of choosing a gate | BEAT |
| 594 | B6 | §17 | A match heard from an army room instead of seen | BEAT |
| 595 | B6 | §17 | A ride in Liron's car and what was said on the way back | BEAT |
| 596 | B7 | §17 | Why one basketball promotion failed to heal the first relegation | BEAT |
| 597 | B9 | §17 | Who began imagining that supporters might one day carry the club themselves | BEAT |
| 598 | B11 | §17 | Who did—or did not—stand beside them for the Double | BEAT |
| 599 | B11 | §17 | The player must finish happy | RULE |
| 600 | B11 | §17 | The player must not finish untouched | RULE |

---

## §18 — Research starting points (verification leads, not permission to copy prose)

| # | Unit | Section | Requirement | Type |
|---|---|---|---|---|
| 601 | ALL | §18 | These are verification leads, not permission to copy prose | RULE |
| 602 | B3 | §18 | Israeli Basketball League season data, Hapoel Tel Aviv 1992/93: `https://basket.co.il/team.asp?TeamId=399&sType=p2` | ANCHOR |
| 603 | B3 | §18 | Israeli basketball historical book entry for the 19.4.1993 Cup final (71:65): `https://pubhtml5.com/tajb/nosq/basic/151-200` | ANCHOR |
| 604 | B6 | §18 | Contemporary Globes report, 4.11.1996, on supervised accounting and deficits: `https://www.globes.co.il/news/article.aspx?did=131551` | ANCHOR |
| 605 | B6 | §18 | Ynet retrospective on the 1989–2017 top-flight period and the 1996/97 purchase: `https://www.ynet.co.il/articles/0,7340,L-4958060,00.html` | ANCHOR |
| 606 | B6 | §18 | Israel Football Association historical/research PDF mentioning the 1996/97 acquisition: `https://www.football.org.il/files/researches/fox.pdf` | ANCHOR |
| 607 | B10 | §18 | 1999 Cup sequence and broader club history: `https://wiki.red-fans.com/index.php?title=הפועל_תל_אביב_(כדורגל)/היסטוריה` | ANCHOR |
| 608 | B11 | §18 | 17.5.2000 Cup-final record: `https://wiki.red-fans.com/index.php?title=עונת_1999/00_(כדורגל)_גביע_המדינה_גמר` | ANCHOR |
| 609 | ALL | §18 | Supporter wikis are valuable for supporter memory and leads but are not neutral authority; mark subjective language as viewpoint and corroborate sensitive claims before converting them into canonical anchors | RULE |

---

## §19 — Personal oral-history layer

| # | Unit | Section | Requirement | Type |
|---|---|---|---|---|
| 610 | ALL | §19 | The user requires one personal story in every decade beginning with the 1990s | RULE |
| 611 | ALL | §19 | Keep oral history separate from verified sporting history and from fictional branches | RULE |
| 612 | B6 | §19 | 1990s / confirmed: refused the Beitar supporters' bus from Tel Aviv Central Bus Station and arrived two hours late to base — implementation point: B6 army route | ANCHOR |
| 613 | B8 | §19 | 1990s / confirmed: heard the Arabic teacher say "טייב" after Beit She'an, understood it as an Eitan Tayeb taunt and became upset — implementation point: B8 aftermath/classroom | ANCHOR |
| 614 | B5/B6 | §19 | 1990s / confirmed, exact date pending: hitchhiked to Nazareth for a Toto Cup match because only about ten supporters went and no bus left — implementation point: B5/B6 travel side chapter | ANCHOR |
| 615 | B6 | §19 | 1990s / confirmed, match/date pending: promised pickup was forgotten; stand supporters collected taxi money so he reached the match — implementation point: B6 community side chapter | ANCHOR |
| 616 | — | §19 | 2000s memory: not yet recovered/confirmed — empty, do not invent; future Stage C | RULE |
| 617 | — | §19 | 2010s memory: not yet recovered/confirmed — empty, do not invent; future stage | RULE |
| 618 | — | §19 | 2020s memory: not yet recovered/confirmed — empty, do not invent; future stage | RULE |
| 619 | — | §19 | Confirmed personal fact awaiting decade placement: the user painted his whole room red | ITEM |
| 620 | — | §19 | Confirmed personal fact awaiting decade placement: he has five Hapoel tattoos including the crest | ITEM |
| 621 | — | §19 | Do not assign dates to those two facts or turn them into scenes until the user identifies when each occurred | RULE |
| 622 | ALL | §19 | For each later memory capture: who was present, approximate year, origin/destination, what physically happened, immediate consequence, one sensory detail, and why the user still remembers it | RULE |
| 623 | ALL | §19 | Preserve the user's factual core and label connective dramatization as fiction | RULE |

---

**Totals:** 623 requirements. Global canon 70 · B1 22 · B2 15 · B3 18 · B4 25 · B5 24 · B6 70 · B7 13 · B8 51 · B9 14 · B10 19 · B11 44 · §4 systems 38 · §5 cast 21 · §8 collisions 16 · §9 dialogue 10 · §10 world 18 · §11 economy 11 · §12 Red Box 14 · §13 architecture 11 · §14 anchors 18 · §15 order 24 · §16 acceptance 22 · §17 emotional success 12 · §18 research 9 · §19 oral history 14.

Heaviest units are B6 (70 rows — the brief itself calls it the longest unit) and B8 (51 rows, with five sub-scenes B8a–B8e). Fourteen `ANCHOR` IDs are named in §14; two of them (`football-zimbru-1996`, `football-deficit-1996`) carry explicit unresolved verification status and must not enter dialogue until sourced.
