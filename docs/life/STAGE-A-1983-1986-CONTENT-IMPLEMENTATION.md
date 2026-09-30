# THE WORKER LIFE — Stage A: 1983–1986

## Complete narrative, gameplay and implementation brief for Claude

Status: implementation directive built from the current repository, Maor's latest canon,
the uploaded Stage A summary and verified historical anchors.

Primary thesis:

> Pogi is born into Hapoel in 1983. On 24 May 1986, he chooses Hapoel for himself.

This document supersedes the old Stage A timeline wherever they conflict. In particular:

- Pogi is born in 1978, is five in the 1983 memory and eight in 1986.
- Stage A is eight key days, not one Saturday and not a continuous four-year calendar.
- The historical finale is mandatory. Missing it produces a route-specific failure scene and
  restarts championship morning; it does not advance to Stage B.
- Ussishkin is a substantial optional branch. It changes the biography but does not block the
  football story.
- The current working 1986 day remains valuable and must be extended, not discarded.

---

# 1. Product target

Stage A should take approximately 90–120 minutes on a first playthrough, with 60–75 minutes on
a direct replay and additional content visible only through different decisions.

It must feel like a real 2D adventure/life game:

- free movement through home, street, kiosk, pitch, route, Bloomfield and optional Ussishkin;
- physical actions instead of chains of menu choices;
- time, money and energy creating real conflicts;
- characters moving and leaving without waiting for Pogi;
- minigames, errands, exploration, listening, following, carrying and searching;
- historical events fixed, while Pogi's attendance and personal experience vary;
- consequences carried between days through relationships, memories, promises and objects.

Do not turn this into a visual novel, quest checklist or trivia sequence.

---

# 2. Current-code audit

## What already works and must be preserved

The repository currently contains a strong 1986 vertical slice:

- event-sourced life state and persistent relationship memories;
- movement, collisions, exits and contextual interaction verbs;
- home, kitchen, bedroom, street, kiosk, pitch, route and Bloomfield spaces;
- Kobi and Rachel relationship branches;
- bottles, coins, newspaper, football card, scarf and ticket objects;
- a street-football minigame;
- timed NPC schedules and missable opportunities;
- seeded random encounters;
- several believable ways into Bloomfield;
- the tunnel/reveal structure;
- the archival championship cutscene;
- physical search for Kobi after the match;
- endings derived from the life state rather than one fixed speech;
- Red Box memory storage;
- continuation infrastructure into the 1990 chapter.

## What is currently missing or too shallow

- 1983 is only a short narrated opening, not an interactive memory.
- There is almost no playable life between 1983 and championship day in 1986.
- The four childhood friends do not yet receive enough separate identity or development.
- The first Hapoel shirt, a locked Stage A milestone, is not implemented.
- Ussishkin exists visually/systemically but is not yet a substantial childhood branch.
- Barry, Liron and Aliza are not integrated into Stage A encounters.
- Rafi and Ilan still appear in dialogue under generic labels in places.
- The current chapter concentrates most relationship decisions into one afternoon.
- Money resets by year and cannot yet support a multi-day childhood saving arc.
- `year.entered` is too coarse for several key days inside 1984–1986.
- Current optional endings allow championship day to be missed and the life to continue; this
  conflicts with the newly locked mandatory Stage A finale.
- Current static money values and prices should remain provisional until historically verified.
- The Rachel dialogue contains a duplicated `text` property in the “לא עכשיו” choice; fix it.

## Do not rebuild

Extend the current engine and content architecture. Preserve stable IDs, existing saves where
possible, current art manifests, movement feel, cameras, mobile controls and working scenes.

---

# 3. Historical frame

Only verified history may be presented as objective fact. Fictional family and supporter scenes
may occur around verified events but must not manufacture match facts.

## Locked historical anchors

### 1 June 1983 — State Cup final

- Hapoel Tel Aviv beat Maccabi Tel Aviv 3–2.
- Hapoel scorers: Yaakov Eckhaus, Moshe Sinai and Gili Landau.
- This is Pogi's first stadium memory at age five.
- The memory is inherited: Kobi carries him into it.

Source: [Red-Fans match list, 1982/83](https://wiki.red-fans.com/index.php?title=%D7%9C%D7%95%D7%97_%D7%9E%D7%A9%D7%97%D7%A7%D7%99%D7%9D_%D7%9E%D7%9C%D7%90_%28%D7%9B%D7%93%D7%95%D7%A8%D7%92%D7%9C%29_1982%2F83).

### 1983/84 — optional Ussishkin anchor

- Hapoel basketball won the State Cup, its first title in fifteen years.
- The final was a 79–73 win over Hapoel Ramat Gan.
- The branch may build toward this title through Ussishkin and supporter life.

Source: [Red-Fans basketball history](https://wiki.red-fans.com/index.php?title=%D7%94%D7%A4%D7%95%D7%A2%D7%9C_%D7%AA%D7%9C_%D7%90%D7%91%D7%99%D7%91_%28%D7%9B%D7%93%D7%95%D7%A8%D7%A1%D7%9C%29%2F%D7%94%D7%99%D7%A1%D7%98%D7%95%D7%A8%D7%99%D7%94).

### 28 September 1985 — championship-season early home win

- Hapoel beat Maccabi Yavne 3–0.
- Moshe Sinai scored twice; Yaakov Eckhaus scored once.
- This works as Pogi's first match in his own shirt without stealing weight from the finale.

### 17 May 1986 — one week before the finale

- Hapoel won 2–1 away to Hapoel Be'er Sheva.
- The day should be experienced mainly through radio, rumours and adults doing calculations.

### 24 May 1986 — championship finale

- Bloomfield, final league round: Hapoel Tel Aviv beat Maccabi Haifa 1–0.
- Gili Landau scored in the 86th minute.
- Hapoel became champion.
- The supplied full archival match-summary video plays after Pogi gets inside.
- After the video, control returns and the player physically searches for Kobi.

Source: [Red-Fans match list, 1985/86](https://wiki.red-fans.com/index.php?title=%D7%9C%D7%95%D7%97_%D7%9E%D7%A9%D7%97%D7%A7%D7%99%D7%9D_%28%D7%9B%D7%93%D7%95%D7%A8%D7%92%D7%9C%29_1985%2F86).

---

# 4. Stage-wide structure

Stage A contains eight key days. Time jumps occur through physical memory transitions, not a
plain “three months later” panel whenever possible.

| Day | Date/period | Age | Core dramatic function | Main system taught |
|---|---|---:|---|---|
| A1 | 1.6.1983 | 5 | Hapoel is inherited | sensory interaction and following Kobi |
| A2 | spring 1984 | 6 | the neighbourhood becomes playable | friends, errands and time conflict |
| A3 | 1983/84 basketball climax | 6 | discover “also Hapoel” | optional Ussishkin branch |
| A4 | summer 1985 | 7 | earn the first shirt | multi-day saving, work and sacrifice |
| A5 | 28.9.1985 | 7 | wear the choice publicly | first personally prepared matchday |
| A6 | winter 1985/86 | 7–8 | loyalty survives an ordinary hard day | radio, disappointment and friendship |
| A7 | 17–23.5.1986 | 8 | pressure, promises and the family rupture | convergence and consequence preview |
| A8 | 24.5.1986 | 8 | choose Hapoel independently | Stage A master event |

Each day should have:

- one visible personal want;
- one historical or period anchor;
- one system focus;
- at least two worthwhile activities that cannot both be completed perfectly;
- one object, promise or relationship beat that can return later;
- a short night/Red Box resolution or an intentional hard cut.

---

# 5. Persistent Stage A state

Add a day-level transition without abusing `year.entered`.

Recommended event:

```ts
{ t: 'day.entered'; dayId: StageADayId; year: number; month?: number; day?: number; weekday: number; minute: number }
```

The transition resets only day-local state:

- clock and available time;
- energy;
- temporary carried items where appropriate;
- active schedules and opportunities;
- scene-local flags.

It preserves:

- bonds and every relationship axis;
- relationship memories;
- personality and Red Heart;
- long-term money saved in Pogi's tin;
- owned clothing;
- Red Box items;
- known routes and learned facts;
- promises, lies and important failures;
- injuries or trouble that logically last into the next day.

## Required new state concepts

- `stageADayId`
- `childSavingsAgorot` or a period-safe savings container distinct from pocket cash
- `ownedClothing` including the first shirt
- `dayOutcome`
- `mandatoryMilestones`
- `promiseFlags` that survive day transitions
- `relationshipMemory` callbacks by day

Do not store story meaning only as anonymous numbers. “Helped Rachel when it cost the match in
the alley” must survive as a memory row, not only `responsibility +6`.

---

# 6. Day A1 — 1 June 1983: The memory that carries you

## Purpose

Establish inherited love, Kobi's physical protection and the difference between remembering a
crowd and understanding it.

## Format

Default assumption pending Maor's confirmation: a 5–8 minute interactive prologue, not a full
open-world day and not a passive movie.

## Opening

- Black screen; crowd heard before seen.
- Pogi is on Kobi's shoulders or holding his hand in a compressed stadium approach.
- The camera sits lower and closer than in 1986.
- Adults block most sightlines. Pogi perceives backs, smoke, concrete, cloth, hands and noise.
- Minimal UI: move/look/hold only.

## Playable beats

1. **Do not lose Kobi:** the player can look around but cannot move freely through adults.
2. **Copy the crowd:** clap, raise hands or cover ears. These are emotional gestures, not QTE
   success checks.
3. **Dropped object:** an adult drops a small red paper/cloth item. Pogi can notice it or miss it.
4. **The goal/cup eruption:** use the verified match anchor and archival treatment. Do not make
   Pogi understand the hand controversy or narrate adult history.
5. **Fear becomes laughter:** Pogi cries from the shock, then laughs because Kobi and everyone
   around him laugh.

## Branches

- **Clings to Kobi:** starts with higher family security/familiarity.
- **Reaches toward the crowd:** starts with higher curiosity/terrace attraction.
- **Covers ears:** starts with higher caution but no penalty to Hapoel love.
- **Keeps the dropped object:** creates the first Red Box candidate later.

## Ending transition

Kobi carries sleeping Pogi home. A sensory object fills the frame—red cloth, ticket edge or
newspaper—then becomes the same colour/object in 1984.

No “achievement unlocked.” Closing narration may retain:

> זה הזיכרון הראשון שלך. לא בחרת בו.

---

# 7. Day A2 — Spring 1984: The whole street knows your name

## Purpose

Turn inherited identity into a lived neighbourhood. Properly introduce Ofir, Amit, Efi and
Keren, plus Rachel, Rafi, Ilan, Liron and Aliza.

## Initial want

Pogi wants to join the alley football match before teams are full.

## Immediate conflict

Rachel needs bottles returned and one small household errand completed. The football match will
start without Pogi. Rafi closes early. Amit has a newspaper only briefly. Efi will leave.

## Physical quest web

- Carry three glass bottles carefully to Rafi. Running risks dropping one.
- Ilan blocks/complicates the stairway with a request or warning.
- Ofir calls from the wall: “אתה בא?”
- Amit is reading a sports page and can teach Pogi how to find the lineup/table.
- Efi carries a basketball rather than kicking it and mentions the hall.
- Keren is fixing or tying a red piece of cloth and refuses to do Pogi's work for him.
- Liron repairs a radio with its back open and asks Pogi to hold a wire or fetch a battery.
- Aliza recognises the 1983 scrap if Pogi kept it and explains that objects remember only when
  somebody remembers with them.

## Main activities that conflict

- Finish Rachel's errand before Rafi closes.
- Play the full alley football match.
- Read with Amit before the page disappears.
- Help Liron repair the radio.
- Sit with Keren long enough to learn something outside match talk.

The player may touch all threads but cannot finish all of them.

## Street-football upgrade

- Three-on-three to three goals.
- Run, pass, shoot and basic tackle.
- Teammates react to selfishness, passing and giving up.
- If Pogi knows Sinai, a contextual feint becomes available through animation and timing, not a
  magical ability button.
- Losing remains fun and changes the after-match banter.

## Consequences

- Rachel remembers whether Pogi kept the promise.
- Ofir remembers whether Pogi chose the game or abandoned the team midway.
- Amit becomes the later information route.
- Efi's invitation is recorded even if ignored.
- Keren remembers whether Pogi listened or only asked for the red cloth.
- Liron may become a route for radio knowledge in A6/A7. He later returns in the 1990s and
  drives Pogi to an away match in a dedicated authored scenario.
- Aliza may safeguard a future ticket/object.

---

# 8. Day A3 — 1984: The other red home

## Purpose

Make Ussishkin a deep optional discovery. The emotional idea is not “basketball tutorial”; it is:

> Bloomfield makes Pogi tiny inside something huge. Ussishkin pulls him inside a family room.

## Access

The branch opens only if Pogi engaged meaningfully with Efi in A2. It must remain optional.

On the same day, Ofir offers a football/neighbourhood alternative and Keren offers a cultural or
street-life alternative. Choosing Ussishkin means missing something real; declining means Efi
goes without Pogi and later remembers that too.

## Journey

- Walk/bus with Efi and possibly Efi's father.
- Carry a small bag or folded banner.
- Hear the hall before entering.
- Exterior transition into cramped corridors, smells and familiar greetings.

## Ussishkin play

- Navigate the compact hall.
- Help pass an item toward the stand or kiosk.
- Meet ordinary supporters who know one another.
- Feel the cheap grill/kiosk smell and physical closeness.
- See that the locker room sits under the hardcore stand without turning it into exposition.
- Participate in a simple rhythm/noise mechanic different from football.
- The historical 1983/84 cup success may frame the climax through a verified anchor; the player
  affects only attendance, place and companionship.

## Characters

- Efi leads but is not a quest marker.
- Kobi may know the place but is not necessarily present.
- Liron or Aliza can appear naturally, not both automatically.
- Do not introduce Shachor early unless Maor later approves an 1980s appearance; his current
  canonical entry is in the 1990s.

## Rewards

- `basketballLove`, `community` and bond with Efi.
- One physical Ussishkin memory object.
- A later line in A8 showing Pogi understands there is more than one red home.

## If skipped

Do not mark failure. Later, Efi tells one vivid detail that Pogi missed. The world happened.

---

# 9. Day A4 — Summer 1985: The first shirt

## Purpose

Turn money, chores and desire into ownership. This is the midpoint of Stage A.

## Core rule

The shirt must feel earned. Default implementation combines saving and relationships:

- Pogi saves most of the cost through bottles, errands and restraint.
- If Kobi or Rachel trust him, one of them may quietly complete the last part.
- A player who saved enough can refuse help and buy it independently.
- A player who spent earlier money needs a harder task or must wait longer.

## Saving montage as gameplay

Do not show a montage cutscene that grants the shirt. Use one playable summer day whose objects
represent weeks of accumulated choices:

- return bottles to Rafi;
- help Liron with a delivery/repair;
- carry groceries for Aliza;
- choose between a snack, football card, newspaper and savings;
- find a questionable shortcut with Ofir;
- accept or refuse Rachel's extra household job;
- tell Kobi honestly how much is missing or hide it.

## Shirt source

Until the exact commercially available 1985 shirt is historically verified, describe it as a
period-appropriate red Hapoel supporter/football shirt and bind final art to the canonical kit
archive. Do not invent a sponsor, manufacturer, number or shop price.

## Outcome variants

- **Self-funded:** independence/responsibility; parents quietly impressed.
- **Rachel completes it:** secret intimacy; Kobi may incorrectly assume Pogi saved all of it.
- **Kobi completes it:** father passes the tradition forward but demands care for the shirt.
- **Cannot afford yet:** not permanent failure; Pogi carries the unfinished saving into A5 and
  may obtain a simpler shirt through extra sacrifice.

## Physical ownership

The player must:

1. receive/buy it in-world;
2. carry it home;
3. place it on the bed;
4. choose whether to wear it immediately or save it for the next match;
5. see it persist in the bedroom and clothing state.

---

# 10. Day A5 — 28 September 1985: Your own red

## Historical frame

Hapoel–Maccabi Yavne, 3–0; two goals by Moshe Sinai and one by Yaakov Eckhaus.

## Purpose

Pogi attends a match not merely as Kobi's carried child but as someone who prepared, chose
clothes, packed an object and understands parts of the ritual.

## Opening

- Choose/wear the first shirt.
- Kobi notices how Pogi treats it.
- Rachel establishes return time and food.
- Amit brings a fact/newspaper.
- Ofir wants to change the route.
- Aliza offers to keep an object safe or warns against ruining the shirt.

## Route conflict

- Stay with Kobi: safe, deeper father familiarity, less street autonomy.
- Walk partway with Ofir: adventure, risk of lateness.
- Stop for Amit's lineup: knowledge at a time cost.
- Help a supporter with a dropped bundle: community at a time cost.

## Match presentation

Do not recreate full football gameplay. Use stadium exploration, partial views, crowd rhythm,
radio/commentary fragments and short verified archival beats. Pogi's interactive objective is to
remain oriented in Gate 7 and return to Kobi after moving for a better view.

## Emotional result

The victory should be joyful but not staged like the championship. Its job is to create a normal
happy match memory and make the final day feel like a transformed version of something familiar.

---

# 11. Day A6 — Winter 1985/86: Not every Saturday becomes a story

## Purpose

Show ordinary loyalty, imperfect days and life outside trophies. This day should be selected from
a verified winter match context but avoid hardcoding match detail until the canonical anchor is
available.

## Opening situation

Rain or cold changes the street and movement. Money is short. Kobi may not be going, or may choose
radio over travel. Friends want different things.

## Conflicting paths

- Listen to the match with Kobi and learn how he reacts when Hapoel struggles.
- Join Ofir outside despite weather.
- Read/track the table with Amit and Liron's repaired radio.
- Keep a promise to Rachel that ends before the result.
- Follow Efi toward basketball if the Ussishkin branch is open.
- Spend time with Keren on something not related to Hapoel.

## Core mechanic — Radio Mode

- The player remains free to move in the room/street while commentary continues.
- Reception varies by position and by the radio's condition.
- Other radios through windows create delayed, conflicting information.
- Amit can help interpret; Liron can improve reception; Kobi reacts before explaining.
- The player may miss a goal while doing something physically important.

## Outcome

No grand reward. The memory is who Pogi was with and what he chose while the match happened.
This day supplies relationship pressure that resurfaces in A7.

---

# 12. Day A7 — 17–23 May 1986: The promise

## Purpose

Converge all Stage A relationships and make the championship refusal feel like the result of a
life, not a plot switch.

## Part I — 17 May, away result through fragments

Hapoel's 2–1 away win over Hapoel Be'er Sheva is experienced through radio, neighbours and table
calculations. Pogi does not control the result.

- Amit works through what the final round means.
- Liron's radio becomes socially important.
- Rafi's kiosk becomes an information hub.
- Ilan repeats information incorrectly and creates a small comic correction chain.
- Barry appears briefly and naturally as a recognised Gate 7 presence.
- Aliza already knows which old ticket Pogi should keep and which paper can be thrown away.

## Part II — the week before the final

Use short playable vignettes rather than exposition:

- school concentration slips;
- children argue over who will score;
- the shirt is washed/drying and Pogi worries it will not be ready;
- Kobi and adults discuss crowds/tickets in half-sentences;
- Rachel notices Pogi is building a plan;
- friends form incompatible matchday plans.

## The refusal

Default reason: there is no ticket for Pogi and Kobi genuinely fears losing an eight-year-old in
the enormous championship crowd. He is not cruel and the game must not make his concern foolish.

Past choices change the scene:

- high trust: Kobi explains and asks for a painful promise;
- low trust: he is shorter and checks whether Pogi is lying;
- repeated reliability: Kobi almost changes his mind, then cannot solve the ticket/crowd issue;
- prior trouble/injury: fear dominates;
- strong Rachel trust: she understands Pogi may go and forces him to tell the truth;
- weak Rachel trust: she believes or pretends to believe the Ofir excuse, creating later regret.

Kobi must still leave without Pogi. This is the fixed dramatic gate.

## Silent room

Preserve the best current design decision: after the door closes, do not immediately display
“Go to Bloomfield.” Return control in silence. The player may sit, count money, look at the shirt,
talk to Rachel, find Ofir or remain home.

The objective appears only after Pogi commits through action—putting on the shirt, taking the key,
opening the outside door or explicitly telling Rachel.

---

# 13. Day A8 — 24 May 1986: The choice

## Master-event premise

All systems learned earlier return:

- movement and route reading;
- money and saved resources;
- promises and truth;
- friends and supporter network;
- knowledge from newspapers/radio;
- energy and time;
- street football confidence;
- optional Ussishkin community identity;
- objects and clothing;
- navigating crowds without quest arrows.

## Morning

The current 1986 opening should be expanded, not replaced:

- bedroom: shirt, poster, key and Red Box;
- home: Kobi with the real newspaper;
- kitchen: Rachel and bottles/food;
- street: schedules visibly begin before Pogi engages;
- Rafi, Ilan, Ofir, Amit, Keren, Liron, Aliza and Barry appear only where their prior relationship
  supports it; do not line them up as helpers.

## Pre-departure conflicts

The player cannot complete all of these:

- keep Rachel's final errand/promise;
- play one last short alley match;
- read the table with Amit;
- follow Ofir's faster route;
- help Liron carry/repair the radio;
- recover the shirt if it was left drying or hidden after the argument;
- buy food or preserve money for entry;
- wait for Kobi to reconsider, losing valuable time.

## Commitment routes

- Tell Rachel the truth.
- Lie that Pogi is going to Ofir.
- Leave without speaking.
- Ask Ofir to come.
- Follow the red crowd alone.

No route is morally labelled. Each alters fear, trust, available help and the reunion.

## Journey to Bloomfield

Use “follow the reds,” crowd density, architecture and sound rather than GPS arrows.

The route escalates:

1. familiar street;
2. first isolated supporter;
3. buses/cars and open windows;
4. food smoke and vendors;
5. larger red groups;
6. first stadium glimpse;
7. compressed exterior crowd.

Story-safe obstacles:

- wrong turn caused by following the wrong group;
- dropped coins or torn pocket;
- helping another child or continuing alone;
- traffic crossing with an adult supporter;
- crowd surge that costs time/energy;
- a vendor offering food Pogi cannot comfortably afford;
- somebody recognising Kobi's name.

Never teach a real security bypass.

## Entry solution families

Preserve multiple valid paths:

1. **Ticket:** accumulated money/resources allow legitimate purchase if the canonical price is
   verified; otherwise use abstract affordability without claiming a historic price.
2. **Ofir/network:** available only if their relationship and timing support it; fictional and
   story-safe.
3. **Known by Kobi's people:** Barry or the veteran recognises Pogi through accumulated community
   ties and takes responsibility for him.
4. **Adult kindness fallback:** always available but costs substantial time and creates a
   relationship memory. It must never feel like a free dialogue button.

## Tunnel and reveal

Preserve this exact emotional rhythm:

1. outside pressure;
2. narrow concrete darkness;
3. muffled sound;
4. light ahead;
5. crowd sound opens;
6. camera reveals the full stadium;
7. UI disappears for several seconds;
8. Pogi remains visually tiny.

## Archival match cutscene

After successful entry, play the supplied full match-summary video naturally as Pogi's experience
of the match. On completion set:

```text
historical_cutscene:1986_championship = completed
goal:landau = witnessed
match:1986_championship = completed
```

Then activate only:

```text
למצוא את אבא.
```

Do not teleport Pogi to Kobi. Do not let the finale card appear before the search.

## Goal reaction

- layered crowd motion;
- strangers embrace Pogi;
- flags and paper;
- controlled camera shake;
- a short loss of direct movement caused by the celebration;
- audio surge, then subjective muffling/breath;
- Pogi regains orientation and remembers Kobi.

## Find Kobi gameplay

- Search through Gate 7 using visual landmarks and remembered descriptions.
- People respond differently if Pogi knows Barry/community figures.
- The shirt makes him recognisable.
- The player may climb briefly for a view, ask, listen for Kobi or follow a chain of supporters.
- No exact waypoint until accessibility assistance is explicitly enabled.

## Reunion variants

The current branches are strong and should be retained/refined:

- Rachel knew and Kobi has been searching.
- Pogi promised to wait and broke the promise.
- somebody at the gate used Kobi's name and word reached him.
- Pogi lied to Rachel.
- default disbelief/anger/fear/relief.

Kobi must not deliver a sentimental “you became a man” speech. His first concern is physical
safety. Humour may arrive only after relief.

## Walk home

Make this briefly playable:

- Kobi and Pogi walk side by side;
- Pogi can speak or remain quiet;
- street aftermath replaces matchday buildup;
- discarded paper and distant singing remain;
- Kobi adjusts pace to Pogi rather than dragging him;
- the final line changes with trust, promise and entry route.

## Rachel at the door

Rachel's response reflects what she knew:

- truth route: anger plus acknowledgement that Pogi told her;
- lie route: quiet disappointment sharper than shouting;
- secret-help route: a brief shared look, not absolution;
- no-contact route: visible fear before anger.

## Final bedroom

Pogi places one earned object in the Red Box:

- ticket stub if legitimately obtained;
- folded paper if helped in;
- shirt-related object if that path dominates;
- scarf if community carried him;
- the 1983 object beside the new 1986 object if retained.

The final idea is not “Independence +10.” It is the visual proof that inherited memory now sits
beside chosen memory.

---

# 14. Failure and checkpoint design

The championship is mandatory for progression to Stage B.

## Failure triggers

- stay home until the match is irretrievably over;
- reach Bloomfield too late to experience the archival match;
- exhaust every safe entry path through time/resource misuse;
- abandon the route and deliberately return home;
- critical route soft-lock detected by the game.

## Failure scene must reflect the route

- **Stayed home:** radio carries the eruption; Kobi returns changed and Pogi cannot enter the
  story everyone tells.
- **Arrived late:** supporters pour out celebrating while Pogi moves against them.
- **No entry:** the goal is heard through concrete; Pogi knows exactly how close he was.
- **Returned home:** Rachel sees the shirt come back clean.

Then:

> היום הזה נגמר. אבל עוד לא ככה.

Restart championship morning from a clean day checkpoint while preserving only player knowledge
and accessibility settings—not story flags, money exploits or failed-run relationship changes.

Do not make the player replay A1–A7.

---

# 15. Character deployment in Stage A

| Character | Required use |
|---|---|
| Pogi | player; five in A1, eight by A8 |
| Kobi | inheritance, match ritual, trust, refusal and reunion |
| Rachel | home reality, responsibility, money, truth and consequence |
| Ofir | adventure, street courage and alternate route |
| Amit | newspaper, table, facts and interpretation |
| Efi | optional Ussishkin/basketball gateway |
| Keren | culture, empathy and life outside football; never automatic romance |
| Rafi from the kiosk | economy, bottles, gossip and remembered debts |
| Ilan the neighbour | inhabited building, warnings and incomplete gossip |
| Barry | brief authentic Gate 7 continuity; never a quest dispenser |
| Liron | 1980s radio repair and information network; future 1990s away-car continuity |
| Aliza | tickets, saved objects and quiet inclusion of children |
| veteran supporter | community entry fallback and road safety |

Do not use Yosef, Soko, Michel, Shachor, Melamed, Asaf, Freddy, Uli, Yaron, Batya, Omer,
Yonatan, Melanie or Dor in Stage A unless their canonical entry era is explicitly changed later.

Historical players such as Sinai, Eckhaus and Landau appear through verified photographs,
posters, radio, newspapers, archive cards and match footage—not invented face-to-face dialogue.

---

# 16. Branch collision matrix

Branches should collide through time and relationships, then reunite at the fixed historical
event.

| Earlier decision | Immediate benefit | Later cost or return |
|---|---|---|
| help Rachel | trust and savings | miss part of alley match |
| choose Ofir | courage and shortcut knowledge | Rachel/teammate promise may break |
| read with Amit | historical knowledge | event elsewhere expires |
| follow Efi | Ussishkin, community | miss football/culture encounter |
| spend at Rafi | joy/object now | shirt/entry savings become harder |
| help Liron | radio route improves | costs precious time |
| trust Aliza with object | object protected | must return/remember to collect it |
| lie to Rachel | leave faster | trust damage and harsher reunion |
| promise Kobi | trust now | breaking it transforms finale dialogue |
| buy ticket | independent legitimate entry | fewer resources for food/help |
| accept supporter help | community entry | slower arrival and less control |

Convergence does not erase consequences. Everyone reaches the same historical result; they do
not reach the same emotional ending.

---

# 17. Side-content pool

Each can appear once or move between days depending on schedules:

- repair Liron's transistor antenna;
- retrieve a ball from a balcony without unsafe imitation instructions;
- carry Rafi's empty bottle crate;
- locate Ilan's missing newspaper page;
- help Aliza identify/date a ticket from visual clues;
- choose who gets the last football card in a trade;
- keep or return a flattened street coin;
- buy a snack or save for the shirt;
- help Keren repair a cassette/record sleeve or create a hand-made item;
- accompany Efi part of the way without entering Ussishkin;
- listen to two radios reporting the same match out of sync;
- find a safe adult for a younger lost child;
- protect the clean first shirt during street football;
- collect matchday paper after the crowd without treating litter as generic currency;
- draw a Hapoel symbol at home and decide whether to admit who marked the table/wall.

No repeatable task may generate unlimited money, bond or personality points.

---

# 18. Dialogue rules

- Keep exchanges short while movement is active.
- Use close-ups only when emotional state changes.
- Let characters interrupt, leave, misunderstand and resume later.
- Children speak like children, not miniature historians.
- Adults do not explain the whole club to someone who grew up in the household.
- Historical facts enter through newspapers, radio, objects and archive surfaces.
- Every branch must have a physical or relational consequence; cosmetic choice spam is forbidden.
- Avoid modern slang unless explicitly period-neutral.
- Profanity can exist naturally around adults but should be filtered through a child's hearing and
  never become the sole source of authenticity.

---

# 19. World evolution across eight days

Reuse hubs while changing them visibly:

- laundry, cars, posters and shop stock;
- weather and light;
- newspaper headlines;
- Pogi's height and clothing;
- the state of Liron's radio;
- Rafi's remembered debt marks;
- football marks on the wall;
- shirt/souvenirs in the bedroom;
- Kobi's newspaper and ritual objects;
- Rachel's household workload;
- children changing positions, confidence and alliances.

The same street becoming familiar is more emotionally valuable than eight unrelated backgrounds.

---

# 20. Audio plan

- home room tone, kitchen details and distant street radios;
- distinctive footsteps by surface;
- glass bottle weight/rattle;
- plastic ball impacts;
- transistor tuning/static as a playable sound layer;
- increasing supporter density toward Bloomfield;
- Ussishkin close, dry, physically compressed acoustics;
- Bloomfield broad exterior wash and tunnel occlusion;
- goal eruption with temporary subjective muffling;
- post-match distant singing on the walk home.

Do not use copyrighted songs or chants unless rights are cleared. Build original period-credible
rhythm and crowd layers around approved material.

---

# 21. UI and accessibility

- Maintain mobile-first controls and responsive safe areas.
- The fixed status surface may show time, pocket money, energy and relevant carried object, but
  never expose hidden relationship percentages.
- Use a compact diary/status line for the day's broad situation, not a checklist.
- Optional accessibility navigation can add stronger exit glow and directional sound assistance.
- Archival video must provide controls, captions where available, fallback messaging and a
  reliable completion path if embedding fails.
- Failure retry should be immediate and clearly return to championship morning.

---

# 22. Implementation sequence for Claude

## Pass 1 — content-safe architecture

1. Add `StageADayId` and `day.entered` transition.
2. Define preservation/reset rules and migration-safe defaults.
3. Add day manifests with date, start location, start time, schedules and historical anchor ID.
4. Add milestone resolver separate from visible objectives.
5. Add childhood savings and owned-shirt persistence.
6. Add deterministic route/checkpoint tests.

## Pass 2 — correct current content

1. Rename generic dialogue labels to רפי מהקיוסק and אילן השכן.
2. Fix the duplicated Rachel choice property.
3. Keep current 1986 paths but change the finale-miss behaviour to retry.
4. Ensure historical video completes before `find:kobi` becomes active.
5. Keep `portraitSet` absent for characters whose art does not yet exist.

## Pass 3 — build A1–A4

1. Interactive 1983 prologue.
2. 1984 neighbourhood day and full friend introductions.
3. Optional Ussishkin branch.
4. First-shirt saving day and persistent bedroom result.

## Pass 4 — build A5–A7

1. First-shirt matchday.
2. Winter radio day.
3. Final-week convergence, refusal and silence.

## Pass 5 — deepen A8

1. Expand character schedules and callbacks.
2. Add route variations and safe entry families.
3. Polish tunnel/reveal/video/search/reunion/walk-home chain.
4. Add failure variants and same-day checkpoint.

## Pass 6 — presentation and QA

1. Art placeholders that never impersonate another named character.
2. Sound, camera, crowd layers and mobile presentation.
3. Full branch matrix tests.
4. Two complete human playthroughs: direct and exploratory.

---

# 23. Acceptance tests

Stage A is not complete unless all are true:

- Pogi is consistently five in 1983 and eight in 1986.
- Eight key days exist and advance without resetting biography state.
- Ofir, Amit, Efi and Keren each receive an individual meaningful encounter.
- Rachel and Kobi each remember at least three distinct player behaviours.
- The bottle task, money choices and first shirt form one understandable economy arc.
- Ussishkin can be meaningfully explored and meaningfully missed.
- Barry, Liron and Aliza appear naturally in period-appropriate roles.
- Rafi and Ilan display their canonical names everywhere.
- At least three earlier decisions change championship morning.
- At least three safe entry solution families work.
- No player can soft-lock the finale.
- Missing the championship returns to championship morning with a tailored failure scene.
- The full archival match video completes before the physical Kobi search begins.
- Kobi is never found by teleport or automatic cut.
- The reunion changes according to truth, promise, network and trust.
- The 1983 inherited object and 1986 chosen object can coexist in the Red Box.
- Stage B unlocks only after the successful reunion and Stage A completion event.
- No yellow appears in newly produced character art.
- No unverified historical claim is written as fact.
- Mobile play can finish every required route.

---

# 24. Three editable assumptions

Maor did not select answers in the final clarification form, so this brief uses these defaults:

1. 1983 is a short interactive prologue.
2. The first shirt is mostly earned through Pogi's savings; a parent may complete the amount as
   an earned relationship consequence.
3. Kobi refuses primarily because there is no child ticket and he fears the championship crowd;
   previous promises and conflict alter his tone.

Changing one of these must update the relevant day and tests, but does not require redesigning the
whole stage.

---

# 25. Final instruction

Implement Stage A as one connected childhood biography, not eight isolated episodes. Preserve the
current working game, deepen it incrementally, and make every historical event serve a personal
choice. The final championship result never changes. What changes is who Pogi became on the way
there, who helped him, who he disappointed, what he carried, and what his father sees when he
finally turns around in Gate 7.
