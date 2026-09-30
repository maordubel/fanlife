# THE WORKER LIFE — Stage B, 1990–2000

Status: canonical narrative and implementation brief for Claude and all future contributors.  
Language of implementation: TypeScript; player-facing language: Hebrew.  
Scope: from the promotion day already implemented on 12.5.1990 through completion of the Double on 17.5.2000.  
Last updated: 2026-09-04.

## 0. Direct order to Claude

Expand Stage B into a complete playable decade. Do not replace the working 12.5.1990 chapter;
preserve it as B1 and build forward from its state and memories. Implement the decade as lived
days, journeys, rooms, queues, arguments, missed events and consequences—not as a history menu,
quiz, slideshow or sequence of match summaries.

The fixed historical spine is:

1. promotion day, 12.5.1990;
2. deepening bond with Ussishkin and the two sporting branches;
3. the 1992/93 basketball Cup win over Hapoel Givatayim;
4. the 1993 basketball championship loss to Hapoel Galil Elyon;
5. the long bad football years and Pogi's tragic rupture with childhood hero Moshe Sinai;
6. the Gate 7 / Gate 5 generational split;
7. army service that can materially alter routes and attendance;
8. football's financial crisis, relegation danger, Sinai's departure and private acquisition;
9. basketball's 1996/97 relegation, brief return and 1998/99 relegation as one continuing wound;
10. the 2.5.1998 championship trauma;
11. the 1999 Cup;
12. the 1999/00 championship and the 17.5.2000 Cup final—the complete Double—as the finale.

Historical results never branch. Pogi's presence, knowledge, companions, conduct, memory and
relationships do. A player who misses a canonical event must receive authored alternate play:
radio, guard duty, a phone call, a drive, a late arrival, the next morning or later archive—not
a punishment screen and not a missing chapter.

**Opening lock:** Stage B begins with the promotion match on 12.5.1990. It does not begin in
1991, with the army, with Sinai's managerial crisis or with a retrospective montage. Every normal
new game and migrated save enters the decade through B1.

## 1. What exists now

The repository currently implements only the opening movement of Stage B:

- `lib/life/content/chapter1990.ts`: passage from 1986, kitchen-table arithmetic, objectives and
  three endings for 12–13 May 1990;
- `dialogue1990.ts`, `opportunities1990.ts`, `encounters1990.ts`, `schedules1990.ts`: the lived day;
- `runtime/match1990.ts`: the transistor information network, rumour latency and parallel score;
- `runtime/scenes/PassageScene.ts`: the four-year transition through objects rather than a menu;
- `finale.ts`: the first movement's personalized ending;
- `dialogueUssishkin.ts`: a prepared Ussishkin doorway, not yet a decade-long basketball plot.

This opening is good and must survive. Its central idea—history reaches a child through incomplete
information—is the grammar the rest of the decade should evolve, not discard.

At present the next-morning line points toward Ussishkin but the game then announces that the next
movement is “coming soon.” Replace that dead end with B2 after B2 is genuinely playable. Until then,
do not fake completion.

## 2. Non-negotiable canon

### 2.1 Pogi's age

Pogi was born in 1978:

| Year | Age | Life state |
|---|---:|---|
| 1990 | 12 | child becoming independent |
| 1993 | 15 | adolescent; emotion before perspective |
| 1996 | 18 | conscript |
| 1997 | 19 | army constraints and adult supporter choices |
| 1998 | 20 | young adult, still serving or newly released according to route |
| 1999 | 21 | work, money, organization and travel |
| 2000 | 22 | Stage B final form—not final form for life |

Do not put army mechanics into 1990. Do not write 1996 Pogi like a child or 2000 Pogi like a
settled middle-aged narrator.

### 2.2 Results are fixed; lives branch

- No choice changes a score, table, appointment, ownership event or trophy.
- The simulation may change whether Pogi attends, arrives late, hears, misunderstands, helps,
  protests, leaves, reconciles or keeps an object.
- Do not let a skill check score a goal, save a penalty or prevent relegation.
- Never imply that Pogi caused a real historical event.

### 2.3 The Double completes Stage B

An older draft ended Stage B on 13.5.2000 and pushed the Cup final into the next decade. That is
superseded. Stage B ends only after the second fully playable finale on 17.5.2000:

- championship clinched at Bnei Yehuda, 13.5.2000;
- Cup final against Beitar Jerusalem, 2:2 after extra time and 4:2 on penalties, 17.5.2000;
- personalized aftermath, Red Box placement and decade summary only after the Cup is won.

### 2.4 Character corrections that must not regress

- `Gabi` / גבי is retired. The same character is `liron` / לירון. Tell every migration and
  content pass explicitly: **Gabi became Liron; never create both.**
- Liron returns in the 1990s and drives Pogi to an away match in a dedicated authored route.
- מאור הראל maps to יוסף, but Yosef enters only at the beginning of the 2000s. He must not appear
  in Stage B, including the May 2000 finale.
- אסי והבה maps to אסף; אייל מלמד maps to מלמד.
- `shopkeeper` is רפי מהקיוסק; `neighbour` is אילן השכן.
- Real memorial characters are alive, ordinary and unshadowed in this decade. No halos, ghosts,
  premonitions or lines that exploit what the audience knows about their later deaths.
- The player's name is **שלום תקוה**. This spelling is binding: תקוה, not תקווה. Claude must
  correct the two-vav spelling (תקווה) wherever it refers to this player. Do not globally replace תקווה, because
  names such as אבי תקווה and מכבי פתח תקווה are different.
- שביט אלימלך is not background roster data. He is a recurring historical football presence from
  the 1996/97 rescue through the 1998 title race, both Cup wins and the 2000 Double.

## 3. The dramatic thesis

Stage A asked: **Will you get there?**  
The 1990 opening asks: **Will you know in time?**  
The full Stage B asks: **Where do you stand when the people you love split apart?**

This is a decade about inherited love becoming chosen identity. At twelve Pogi stands where Kobi
stands. By twenty-two he has been forced to choose between Gate 7 and Gate 5, football and
basketball obligations, hero and institution, army and attendance, protest and restraint, being
there and being reliable. The correct ending is not one faction. The correct ending is a life that
can explain what its choices cost.

Four emotional movements carry the decade:

1. **Inheritance (1990–1992):** father's gate, childhood friends, first independent routes.
2. **Joy with a crack in it (1993–1995):** Cup glory, Galil heartbreak, decline and denial.
3. **Choosing a side (1996–1998):** army, Sinai rupture, Gate split, financial danger, purchase,
   basketball relegation, survival, then championship trauma.
4. **Building after loss (1998–2000):** second basketball relegation, the seed of supporter-owned
   rebirth, organization, 1999 Cup and the Double.

## 4. The persistent systems Stage B requires

Do not encode the decade as hundreds of isolated flags. Add typed, migratable state surfaces and
derive dialogue from them.

### 4.1 Gate identity

```ts
type GateIdentity = 'gate7' | 'gate5' | 'between' | 'outside'

type GateHistoryEntry = {
  from: GateIdentity
  to: GateIdentity
  year: number
  reason: 'family' | 'friends' | 'closure' | 'culture' | 'conflict' | 'safety' | 'return'
}
```

The 1990s split must force a side. `between` is a temporary state, not a consequence-free permanent
answer. A player may later enter Gate 5, leave Gate 5 or return toward an older gate in a later
decade. Therefore store history, not only a Boolean.

Neither gate is the moral-good route:

- Gate 7 can mean Kobi, continuity, restraint and memory; it can also become rigidity or refusal
  to see that a generation has changed.
- Gate 5 can mean invention, organized support, risk and a chosen family; it can also demand time,
  conformity and escalation.
- `outside` is valid after fear, exhaustion or alienation, but creates loneliness and different
  access—not a game-over.

### 4.2 Army state

```ts
type ArmyRoute = 'trusted' | 'negotiator' | 'rebellious' | 'punished' | 'detached'

type ArmyState = {
  route: ArmyRoute
  commanderTrust: number
  leaveDebt: number
  fatigue: number
  missedAnchors: string[]
  coveredForOthers: number
}
```

Army service can materially change routes. Getting to one match may consume trust needed for the
next. Lying can work once and close a later door. Covering a shift for a squadmate may cause a
missed match but earn help in a more important chapter. There must be no “perfect attendance” route
that also maximizes army trust, energy, family and money.

### 4.3 Institutional attitudes

Track distinct positions; do not collapse them into generic loyalty:

```ts
type InstitutionState = {
  sinai: 'defending' | 'doubting' | 'broken' | 'reconciled-memory'
  footballOwnershipTrust: number
  basketballOwnershipTrust: number
  protestEscalation: number
  legalUnderstanding: number
  ussishkinWound: number
  supporterOwnershipSeed: number
}
```

`supporterOwnershipSeed` is the beginning of the future Hapoel Ussishkin arc. It may become strong
in 1996/97 and 1998/99, but the club is not founded in this stage. Do not move the real founding
backward in time. Stage B creates the memory, relationships, arguments, lists and convictions that
will make the later act believable.

### 4.4 Presence is not binary

For every anchor store:

```ts
type PresenceMode =
  | 'inside'
  | 'late'
  | 'outside'
  | 'radio'
  | 'television'
  | 'army'
  | 'working'
  | 'heard-from-friend'
  | 'archive-later'
```

Every mode needs its own scene and memory. “Missed” is a route, not empty content.

### 4.5 Conflict and convergence

Major choices must touch at least two systems. Examples:

- defend Sinai: Kobi bond rises at first, young-fan respect may fall, later regret can deepen;
- move to Gate 5: Asaf/Melamed access rises, Kobi tension rises, army leave pressure grows;
- attend basketball during a football crisis: basketball belonging rises, football friends may
  remember the absence;
- join a protest: institutional awareness and group respect may rise while safety, army trust or
  family trust fall;
- miss the 1999 Cup because of a promise: reliability rises, regret rises, the Double reunion can
  become more powerful.

## 5. Cast routing for the decade

Use `docs/life/CHARACTER-BIBLE.md` as the voice source. This table assigns dramatic jobs, not new
biography.

| Character | Stage B function | Required turning point |
|---|---|---|
| Kobi | Gate 7, inheritance, home truth | Pogi must disagree with him without erasing love |
| Rachel | time, money, army aftermath, practical reality | detects the cost before Pogi admits it |
| Ofir | street, away travel, risk | absence or loyalty accumulates across years |
| Amit | facts, tables, scepticism | distinguishes rumour from evidence during crises |
| Efi | first basketball bridge | opens the 1991–93 Ussishkin path; may later drift naturally |
| Barry | terrace continuity | recognizes Pogi as an adult only after a concrete act |
| Melamed | songs and cultural creation | a small rhythm choice returns from a full stand years later |
| Asaf | Gate 5 organization | offers belonging that demands labour and discipline |
| Michel Bar-Khalifa | human transport/network | solves access through people, never magic fast travel |
| Soko | archive and accuracy | preserves what others mythologize; challenges a false memory |
| Shachor | practical Ussishkin organization | turns grief into tasks, lists and material responsibility |
| Omer Hermesh | ordinary warmth and culture | late-90s friendship scene with records, humour or travel |
| Freddy | legal/institutional argument | separates legitimate protest from dangerous escalation |
| Liron | continuity and car route | drives Pogi to one authored away day with a full return journey |
| Yaron | army peer and inherited public identity | can protect or exploit access; wants to be more than “the son” |
| Dudu | loud away-bus energy | comedy that becomes care when someone is stranded |
| Limor | Ussishkin queue intelligence | makes entry logistics playable and exposes unprepared bravado |
| שלום תקוה | returning football artist, continuity and hope | bridges the bad years, 1999 Cup and Double |
| שביט אלימלך | goalkeeper and calm under pressure | turns shootouts into breath, trust and accumulated belief |

Yosef, Batya, Uli, Melanie, Dor and later-decade ensemble characters do not enter this stage.

## 6. Chapter map

Use 11 major playable units and short playable bridges. A “unit” can contain several scenes and
dates; it is not necessarily one continuous day.

| ID | Date / period | Anchor | Primary dramatic question |
|---|---|---|---|
| B1 | 12–13.5.1990 | football promotion | Did you know, and with whom did you arrive? |
| B2 | 11.3.1991 + season bridge | Ussishkin initiation | Can football inheritance make room for basketball love? |
| B3 | 19.4.1993 | basketball Cup vs Givatayim | Who gets to share a joy that feels finally complete? |
| B4 | 9–19.5.1993 | finals vs Galil Elyon | What remains when the expected championship disappears? |
| B5 | 1993–1996 | bad football years / Sinai | How long do you defend a hero? |
| B6 | 1996–spring 1997 | army, Gate split, crisis, purchase | Where do you stand when every institution shakes? |
| B7 | 1996/97–1997/98 | basketball relegation and return | Does returning erase what ownership taught you? |
| B8 | 2.5.1998 | championship trauma | What do you do with rage when you cannot change the result? |
| B9 | 1998/99 | second basketball relegation / organizing | Can a supporter imagine owning responsibility, not just anger? |
| B10 | 26.5.1999 | Cup final vs Beitar | Can the divided group celebrate together again? |
| B11 | 13–17.5.2000 | championship + Cup / Double | Who have you become, and who is still beside you? |

## 7. Detailed playable units

### B1 — “כמה צריך?” · 12.5.1990

Preserve the current implementation: kitchen arithmetic, Kobi waiting, transistor network,
friends route, rumours, late gate opening, possible missed attendance, search for Kobi and the
walk home. Preserve existing save/event IDs.

This is the opening of Stage B, not a prologue that normal play may skip. Its promotion is the
decade's baseline: in 1996/97, “survival” must feel like the possible loss of everything regained
here.

Required upgrade:

- Replace the post-chapter “coming soon” card only when B2 is wired.
- Carry `withKobi`, `withFriends`, radio decisions and the Red Box item into later callbacks.
- Introduce no army, Gate 5 conflict or adult supporter organization here.
- Liron may be recognized as the radio-repair continuity character if Stage A established him,
  but do not overwrite the current transistor mechanics.

Bridge: bedroom objects, changing voice, school notebook, Ussishkin invitation. Time passes through
interactions, not a year-selection screen.

### B2 — “יש עוד בית” · 11.3.1991 and the Ussishkin season

The player follows Efi's invitation from the current B1 morning-after scene. The first meaningful
action is logistical: money, route and queue. Limor knows the correct entrance; bluffing without
preparation can cost time. Ussishkin must feel physically unlike Bloomfield: close ceiling, sweat,
wood/paint, voices bouncing back immediately and no safe distance from emotion.

Core choices:

- go with Efi or keep a football/family promise;
- spend limited money on entry, food or preserving fare home;
- help Shachor with a practical problem or push toward the best standing place;
- admit ignorance about basketball or pretend;
- keep the first Ussishkin object in the Red Box.

Payoff: Pogi learns that loving another branch does not divide the heart neatly; it divides time.
This unit establishes the future collision system between simultaneous obligations.

### B3 — “הגביע אדום” · 19.4.1993

Historical anchor: Hapoel Tel Aviv defeats Hapoel Givatayim 71:65 in the basketball State Cup final
at Yad Eliyahu. The score and winner are immutable.

Gameplay begins before the hall:

- secure money and transport;
- choose Efi/Limor's planned route, an improvised friends route or family viewing;
- help carry a banner/materials and risk worse position/late entry;
- respond when somebody dismisses Givatayim before the game;
- decide whom to call or find after the win.

Do not write the match as inevitable domination just because the result is known. The player in
the stands does not experience the final score in advance. The emotional climax is the walk after
the trophy: noise and impossible optimism, followed by a tiny quiet warning that a league title is
still unfinished.

Memory variants: Cup ticket, red paper strip, handwritten route, a shared photo placeholder only
if art exists. The trophy itself is not loot.

### B4 — “הבית נשבר” · 9–19.5.1993

Historical anchor: Galil Elyon wins the final series 3:1. Hapoel loses Game 1 at Ussishkin 88:73,
loses Game 2, wins Game 3 90:63 and loses the decisive Game 4. Use canonical home/away ordering and
score orientation from the verified archive data layer; never type ambiguous scraped score columns
directly into dialogue.

This is one escalating mini-arc, not four full duplicate matches:

1. **Game 1, Ussishkin:** confidence from the Cup; player chooses position and companions. The home
   defeat creates disbelief.
2. **Game 2, away:** attendance competes with school/family/money. Radio/phone route is fully
   authored if missed.
3. **Game 3, Ussishkin:** the large win restores hope. A high-impulsiveness Pogi may promise too
   much about Game 4.
4. **Game 4, Galil:** travel is the main gameplay. Missing it, hearing it en route or being inside
   are equally authored states.

Aftermath occurs back at Ussishkin or the neighbourhood, not on a generic results card. Shachor
stacks or carries something. Limor reconstructs logistics. Efi can rage, go silent or avoid Pogi
based on earlier choices. Soko is introduced only if age/art continuity is correct, as the adult who
writes down what happened while everyone else argues.

The emotional sentence is: **the Cup was real; the loss is also real. One does not cancel the other.**

### B5 — “המספר שבע על הקיר” · 1993–1996

This unit turns Moshe Sinai from a poster/childhood hero into the decade's most personal conflict.
Pogi's canonical arc is **defence → doubt → rupture**, but the pace and social price branch.

Structure it as three playable slices:

#### B5a — Defence

- A bad football day ends in an argument at the kiosk or gate.
- Younger supporters blame Sinai; Kobi remembers the player, not only the manager.
- Pogi defends him sincerely. This can strengthen Kobi/Barry bond and create tension with Ofir or
  emerging younger supporters.
- The game must make the defence emotionally reasonable, not foolish.

#### B5b — Doubt

- Repeated poor performances, derby humiliation and the 1994 Cup-final loss accumulate through
  newspaper, radio and lived fragments.
- Amit presents facts; Freddy explains responsibility and institutional cover; rumours contradict.
- Pogi may still defend the person while questioning the role.
- A player who refuses all evidence becomes more isolated; a player who turns instantly earns
  group access but may carry guilt.

#### B5c — Rupture

- The 1996 European disappointment and worsening conflict lead toward the last-place crisis.
- The final break is not “I hate Sinai.” It is “the person who taught me what this shirt means can
  no longer be the answer.”
- Preserve a possible later `reconciled-memory` state: affection for Sinai the player can coexist
  with judgment of the managerial period.

Never ask the player to place, threaten or approve a bomb. Extreme real-world threats may be
reported as frightening background only after historical/legal review; they are not gameplay,
spectacle or a rewarded protest route.

### B6 — “אין מקום אחד לעמוד בו” · 1996–spring 1997

This is Stage B's central crisis and should be the longest unit.

#### Opening: conscription

Pogi is eighteen. Build a compact army location and schedule system, not a military action game.
Yaron enters as a peer; his famous television-supporter father remains unnamed and unseen until the
user approves an exact identity. The first leave negotiation teaches the player that attendance now
spends institutional trust.

#### Personal oral history — “לא עולה על האוטובוס הזה”

This is confirmed user oral history, not invented flavour. At Tel Aviv Central Bus Station Pogi
must return to base. The bus that is supposed to get him there on time is a Beitar Jerusalem
supporters' bus. He refuses to board it and consequently arrives two hours late to base.

Preserve the factual core exactly:

- he has a real deadline to return to base;
- this bus would get him there on time;
- it is a Beitar bus;
- he knowingly does not board;
- the consequence is arriving two hours late to base.

Do not “improve” the memory by having the bus break down, by rewarding Pogi with a secret faster
ride or by making the army forgive him automatically. Until the user supplies more detail, do not
invent the route, base, match, commander, punishment, companions, exact dialogue or how the bus was
marked as Beitar.

Gameplay shape:

1. a visible clock and a genuinely viable bus establish that boarding is the responsible action;
2. the player can board, refuse openly, hesitate until it leaves or search for another route;
3. the canonical personal-memory route is refusal and lateness; other choices are fictional Pogi
   branches and must not be presented as what happened to the user;
4. the late arrival changes `commanderTrust`, `leaveDebt` and access to a later match;
5. Yaron, Kobi or a squadmate may later challenge whether this was loyalty, stubbornness or theatre;
6. the Double finale recalls the incident without forcing a moral verdict.

The humour is in the impossible seriousness of the decision, never in mocking military duty or
supporter identity. The consequence must land before the joke can become a cherished story.

#### The Gate split

The crowd splits around Gate 7, its closure/conflict history and the younger move toward Gate 5.
Kobi and legacy supporters pull one way; Asaf, Melamed and younger organization pull another.
Pogi must choose:

- stay with Gate 7 / Kobi;
- move to Gate 5 / the emerging group;
- walk away from the confrontation.

The third is `outside`, not a permanent neutral victory. A delayed choice later forces itself
through access and relationships. Record the reason and witnesses. The player may change side only
in a later decade or a deliberately authored later turning point—never by toggling a menu.

Required scenes:

- first approach to Gate 5, where Pogi is not automatically welcomed;
- Melamed tests a rhythm with a darbuka, never a guitar;
- Asaf assigns unglamorous work before offering status;
- Kobi responds according to shared history, not with one fixed speech;
- Barry can remain a bridge without resolving the dispute.

#### Financial danger and relegation threat

Use concrete lived signs: delayed payment rumours, missing supplies, a closed office window,
newspaper figures, a creditor conversation overheard, uncertainty about tickets and staff doing two
jobs. In November 1996 the club's deficits and supervised accounting make the danger tangible.
Freddy can explain what a deficit, Histadrut control and sale mean; Amit verifies; supporters still
disagree about what ownership will cost.

#### Sinai leaves; football is bought

Sinai's exit, Dror Kashtan's arrival, survival and the sale to the private group led by Sami Sagol
must occur historically. The buyers are Sami Sagol, Moshe/Moshik Teomim, Moti Orenstein and Rafi
Agiv. Treat the purchase as rescue mixed with uncertainty, not a magical happy ending.

The player can:

- help a lawful protest or choose distance;
- use Freddy's legal/institutional route;
- follow Asaf's direct-action logistics within safe gameplay boundaries;
- prioritize an army promise and experience the turning point remotely;
- arrive through Liron's car route if its prerequisites were built.

#### Liron's required away-car scenario

This is a complete micro-road-story, not fast travel:

- old car, fuel decision, radio/static, food stop and route uncertainty;
- dialogue about the old Gate 7 score network and how information has changed;
- a disagreement that can make Pogi continue by bus/foot or stay in the car;
- return journey changes with the result and with Pogi's army deadline;
- missed curfew can unlock `punished`, closing a later event while opening another relationship.

#### Additional confirmed 1990s travel memories

Use these as authored side chapters whose availability depends on money, trust and transport:

- **The road to Nazareth:** only about ten supporters are going to a Toto Cup match, so no
  organized bus leaves. Pogi hitchhikes all the way to Nazareth. The journey—not the match score—is
  the dramatic core: uncertainty, successive rides, clock pressure and the strange intimacy of an
  almost empty away following. Do not invent drivers or danger as user biography; those details may
  exist only in clearly fictional branches.
- **The forgotten pickup:** a supporter promises Pogi a ride and forgets him. Supporters already in
  the stand collect money for a taxi, allowing him to reach the match. This must become a community
  mechanic: earlier reliability and bonds change who notices he is missing, but the confirmed oral-
  history version preserves the forgotten ride, collection and taxi arrival.

These stories establish that supporter culture is a material network of seats, calls, coins and
people noticing absence. They must echo later in the organizational and supporter-ownership arcs.

### B7 — “גם האולם יכול לרדת” · 1996/97–1997/98

The basketball relegation of 1996/97 is not a side note. It happens while football is also near
relegation, producing a club-wide sense that both homes can disappear.

Playable core:

- football and basketball obligations collide with army leave;
- Shachor and Limor need practical help at Ussishkin;
- Freddy connects funding/ownership questions without delivering a lecture;
- Pogi may choose one branch and hear the other result later;
- the first relegation raises `ussishkinWound` and `supporterOwnershipSeed`.

The following promotion/return provides relief, not closure. Dialogue must preserve suspicion:
“עלינו” is not the same as “הבראנו.” The player can be hopeful, sceptical or exhausted.

### B8 — “השרוכים” · 2.5.1998

The championship loss is fixed. This is not one more famous match and not a short bridge into the
1999 Cup. It is the decade's character forge: the moment Pogi discovers what he does when the world
feels dishonest, everyone around him confirms the story he wants to believe and nothing he does can
change the table. Give B8 comparable dramatic weight to the entire B6 crisis. Its consequences stay
active through both Cup finals and the Double. Do not create gameplay in which Pogi affects another
match or confronts real players/officials as adjudicated villains.

The play is information, travel and aftermath:

- Pogi attends Hapoel's match, serves, works or listens elsewhere according to accumulated state;
- simultaneous information arrives with delay and contradiction, evolving the 1990 transistor
  grammar into pagers/phones/radio/people appropriate to 1998;
- nobody initially has a complete picture;
- anger spreads through the group faster than verification;
- Soko becomes essential: what do we know, what did we hear, what are we inventing?

#### B8a — Before the matches

- Open at home with the 1990 promotion memory and the 1993 Galil wound available.
- Kobi is careful; younger friends speak with certainty. Pogi can calculate, celebrate early,
  refuse superstition or hide fear.
- Army/work/gate history determines who travels with him and which promise is at risk.
- The Sinai rupture supplies subtext: Pogi already knows love can survive disillusionment, but not
  yet what to do with total powerlessness.

#### B8b — Two matches, one broken information network

- Evolve B1's transistor design into period-correct radio, phone, pager and human relays.
- Hapoel's match is lived directly according to the presence route. Beit She'an–Beitar reaches
  Pogi only through delayed, attributed reports.
- A trusted friend can relay an incomplete or wrong detail without becoming a liar.
- At the decisive change, remove explanatory UI. Use sound, faces, repeated questions and the
  delay before the crowd understands.

#### B8c — Ten minutes with no objective marker

Create a pressure-cooker free-roam aftermath. NPCs shout, cry, verify, freeze, search for friends,
want confrontation or want to leave. Behaviour derives from relationships and gate identity. The
player chooses a human action under pressure, not an abstract ideology.

Choice space after the result:

- stay with a devastated friend;
- chase confrontation and be pulled back or face consequences;
- go home to Kobi;
- help preserve evidence/newspapers with Soko;
- return to Ussishkin because another branch still needs people.

#### B8d — The story follows him into class

Use the user's confirmed personal memory as the final blow. After the Beit She'an incident, an
Arabic teacher says **“טייב”**. Pogi hears it through the wound, thinks she is mocking him by
invoking Eitan Tayeb, and becomes upset.

The scene must preserve the misunderstanding rather than make the teacher malicious. Give Pogi
choices to react, ask what she meant, leave, snap, remain silent or understand only later. Earlier
knowledge, impulsiveness and trust determine whether the misunderstanding is repaired. This is the
point: the match has changed how he hears an ordinary word.

#### B8e — A permanent character mark

```ts
type LacesResponse =
  | 'witness'
  | 'protector'
  | 'organizer'
  | 'avenger'
  | 'withdrawn'
  | 'unresolved'
```

This is not a bonus class. It changes how Pogi responds to later ownership crises, apparent
injustice and protest. In 1999 it changes what “closing a circle” means; in 2000 it changes whether
he can enjoy certainty or waits for it to be taken away.

No cathartic violence. High protest escalation may fracture trust, army standing or safety. Quiet
care must be as playable and consequential as shouting.

שלום תקוה and שביט אלימלך must be visible football anchors in this movement, experienced from
supporter distance. Elimelech's steadiness makes the collapse feel more impossible; תקוה embodies
the beauty and vulnerability Pogi fears the sport can erase. Do not fabricate private access.

### B9 — “זה לא נגמר כשעולים” · 1998/99

Basketball's second relegation makes the rupture continuous. This is where Shaul Eisenberg becomes,
from Pogi's subjective supporter viewpoint, an institutional “enemy.” The narration must distinguish
perspective from proven biography: characters can accuse, argue and distrust; the archive layer
states only verified ownership and sporting facts.

Three parallel threads:

1. **Ussishkin wound:** poor stability, queues and practical labour; Shachor/Limor anchor it.
2. **Future seed:** Freddy discusses structures, Soko preserves records, Pogi can begin lists of
   people/resources/principles. This is the emotional and organizational prehistory of Hapoel
   Ussishkin, not its premature founding.
3. **Gate 5 culture:** Asaf coordinates, Melamed creates, Michel connects transport, Dudu and Omer
   add ordinary social life. Organization is work before it becomes iconography.

The emerging Ultras culture in 1999 may be represented through fictionalized supporter labour and
verified public facts. Do not assign unverified founding acts or quotations to real memorial
characters.

### B10 — “שש־עשרה שנה” · 26.5.1999

Historical anchor: football State Cup final against Beitar Jerusalem. It is 1:1 after 120 minutes;
Hapoel wins the shootout 3:1, with Shimon Gershon scoring the decisive penalty.

שלום תקוה scores Hapoel's equalizer and שביט אלימלך saves two penalties. These fixed actions need
buildup, crowd reaction and aftermath—not a result-card mention.

This is the first convergence checkpoint after the decade's fractures:

- getting there depends on army/work, money, transport and prior reliability;
- Gate 7 and Gate 5 companions may arrive separately;
- basketball-first friends have reasons to be hurt or distant;
- Liron/Michel/Ofir routes provide different journeys, not cosmetic skins;
- Pogi may carry an object or promise from 1993.

During penalties, player input controls breath, looking, holding a friend's shoulder or turning
away—not the kicks. After victory, the group may reunite, remain divided or share one temporary
embrace. Do not force reconciliation merely because a trophy was won.

### B11 — “ארבעה ימים” · 13–17.5.2000

This is a two-part playable final exam with persistent exhaustion, money, promises and relationships
across four days.

#### Part I — championship, 13.5.2000

Historical anchor: Bnei Yehuda 1, Hapoel Tel Aviv 1 at Shkhunat Hatikva; the draw clinches the
championship. Pogi can arrive through different routes or miss it because an earlier army/work debt
finally matures. Remote routes remain full scenes.

Required emotional checks:

- who stands beside Pogi;
- whether Kobi is present and whether an embrace is earned;
- whether Pogi looks for football friends, basketball friends or both;
- how the 1998 trauma changes the ability to believe the news;
- whether celebration becomes care, excess, responsibility or lonely observation.

Do not roll credits. The Cup final is four days away.

#### Interlude — four days of consequence

No montage-only skip. Give the player a compact schedule:

- sleep/recover;
- work or earn money;
- repair a family/army promise;
- help Gate 5 preparations;
- help an Ussishkin friend despite football glory;
- secure transport/ticket;
- visit the Red Box.

The player cannot maximize everything. Exhaustion from the championship must affect the final.

#### Part II — Cup final, 17.5.2000

Historical anchor: Hapoel 2, Beitar Jerusalem 2 after extra time; Hapoel wins 4:2 on penalties and
completes the Double.

Again, input never changes a kick. Gameplay controls presence, attention, support and conduct.
Callbacks should include:

- 1993: joy followed by loss;
- 1996/97: when survival itself felt impossible;
- 1998: the fear that certainty is a trap;
- 1999: the first cup and first partial reunion;
- the chosen gate and everyone left on the other side;
- matches missed because of army, work or promises.

שלום תקוה and שביט אלימלך complete distinct decade arcs here: תקוה supplies the extra-time assist
for Hapoel's second goal and joins the trophy lift; Elimelech carries the accumulated shootout trust
from 1999 and the 2000 semifinal into the final. Keep all access within Pogi's supporter viewpoint;
do not invent private locker-room speeches.

#### Final personalized walk

End outside the stadium or on the journey home, not on a statistics screen. Create outcome families,
not good/bad endings:

- **Inherited and chosen:** Kobi bond and new-group bond both survive, with visible tension.
- **Gate 5 builder:** high organization/community, real fatigue and an unresolved family cost.
- **Gate 7 keeper:** strong continuity/history, awareness of what changed without Pogi.
- **Two halls, one life:** basketball wound/community seed remain central during football glory.
- **Always travelling:** rich shared history, low stability, people remember both rescues and broken
  promises.
- **Heard from elsewhere:** major events missed, but reliability or care built a different adult.
- **Alone in the crowd:** high devotion with damaged bonds; the Double is joyous and still lonely.

Every finale includes the Double. What changes is its human meaning.

## 8. Branch collision examples

### 8.1 Sinai × gate

- Early defence of Sinai makes staying with Kobi emotionally easier and Gate 5 entry harder.
- A late rupture can be more powerful but may arrive after friends stopped asking Pogi to join.
- Moving to Gate 5 only to follow anger produces less trust than doing the work Asaf assigns.
- Preserving love for Sinai the player unlocks a mature 2000 callback without reversing judgment.

### 8.2 Army × presence

- Fight for leave in B6 and succeed → higher chance of punishment/denial in B8 or B10.
- Cover a squadmate's shift → miss a match but gain reciprocal help for 17.5.2000.
- Abuse Yaron's family connection → short-term access, reduced respect and a later refusal.
- Accept missing an event honestly → regret rises, commander trust and relationship reliability may
  create a stronger later route.

### 8.3 Football × basketball

- Choose Ussishkin during a football crisis → Gate friends remember absence; Shachor remembers help.
- Abandon basketball after promotion → second relegation lands as guilt rather than shared grief.
- Keep both branches alive → more collisions, exhaustion and expense; never a free “balanced” route.
- High supporter-ownership seed changes later-decade dialogue but does not found a club in 1999.

### 8.4 Protest × responsibility

- Legal route with Freddy can preserve access but frustrate action-first Asaf.
- Direct lawful organizing builds group respect but consumes time and money.
- Reckless escalation can close army, family or stadium routes and must never be the optimal content
  farm.
- Refusing escalation is not cowardice by default; motive and prior courage matter.

## 9. Dialogue rules

- Choices contain 2–4 spoken or physical responses. No abstract “+loyalty” labels.
- Nobody recites Wikipedia. Facts emerge because someone needs to decide what to do.
- Use era-correct information technology and language; research slang before shipping it.
- Sinai dialogue must preserve the pain of loving the former player.
- Kobi is not automatically right and Gate 5 is not automatically youthful truth.
- Freddy's arguments are sharp and interruptible. Provide “cut him off,” “ask for the practical
  point” and “let him finish” when appropriate.
- Melamed creates with rhythm and a darbuka. Never give him a guitar.
- Soko corrects details but can be socially exhausting; accuracy is not omniscience.
- Omer and Michel receive ordinary jokes, silence, inconvenience and warmth. No memorial coding.
- Shaul Eisenberg is discussed through supporter experience and verified institutional events. “Enemy”
  is Pogi's viewpoint, not omniscient narration.

## 10. World, navigation and sensory direction

Required recurring spaces:

- the same home/bedroom/kitchen aging through the decade;
- neighbourhood street and Rafi's kiosk;
- Bloomfield exterior, Gate 7 approach, Gate 5 approach, inside-stand variants;
- Ussishkin exterior, queue, hall, edge/corridor and quiet after-game state;
- school/classroom for early decade;
- army room/gate/telephone area, minimal but fully interactive;
- Liron's car and road/stop fragments;
- bus/train/away approach as reusable travel grammar;
- workplace/shift fragment for 1999–2000;
- Ramat Gan Stadium approach and interior for both Cup finals;
- Shkhunat Hatikva approach for 13.5.2000.

Do not build a decade by swapping title cards over one unchanged street. Geometry may recur, but
vehicles, signs, clothes, audio, objects, lighting and available doors must age.

Audio priorities:

- transistor static evolves into radio/phone/pager-era information;
- Ussishkin has hard, immediate reflections and intimate crowd pressure;
- Gate 5 songs begin in small, imperfect clusters before returning at scale;
- use silence after Galil, relegations and 1998; do not wallpaper grief with music;
- the Double finale recalls earlier motifs without turning into a sentimental trailer.

## 11. Economy, time and failure

Every major unit needs at least one resource conflict:

- fare versus ticket/food;
- army leave versus future trust;
- sleep versus preparation;
- work shift versus attendance;
- helping people versus securing position;
- keeping a promise versus following the crowd.

Failure rules:

- No dead end because Pogi lacks money. Offer work, walking, radio, help-with-a-price or a different
  companion route.
- No instant reset after missed curfew, lost ticket, argument or missed match.
- Consequence appears later through behaviour: someone does not call, saves a place, refuses a ride,
  trusts Pogi with money or tells him last.
- Random encounters may complicate a route but must be seeded and QA-reproducible.

## 12. Red Box memories

Add period, physical objects—not RPG loot:

- 1991 Ussishkin stub/handwritten entrance note;
- 1993 Cup stub or red paper strip;
- 1993 finals travel note/newspaper fragment;
- worn Sinai image or clipping, with choice to store, fold away or leave on wall;
- army leave form fragment without sensitive personal data;
- Gate 7 or Gate 5 hand-made material;
- 1996 deficit/sale newspaper clipping;
- basketball relegation stub;
- 1998 newspaper/radio note;
- 1999 Cup stub;
- 2000 championship and Cup objects.

The box must allow contradictory memories side by side. Do not force the player to discard the Cup
because the championship was lost, or Sinai's player image because the managerial bond broke.

## 13. Content architecture

Do not continue growing one `WorldScene.ts` switch. Before adding the decade:

1. introduce an `EraDefinition`/chapter registry keyed by stable chapter IDs;
2. register content, schedules, encounters, maps, palettes, portraits and anchors by unit;
3. make chapter transitions data-driven;
4. preserve all existing persisted event and item IDs;
5. add schema migration/default folding for new Stage B state;
6. keep historical anchor resolution outside fictional dialogue;
7. let presence modes select authored scene variants;
8. keep unavailable art behind honest fallbacks; never reference missing asset keys.

Suggested IDs:

```text
1990-promotion
1991-ussishkin
1993-basketball-cup
1993-galil-finals
1994-1996-sinai
1996-army-gate-split
1997-survival-purchase
1997-basketball-relegation
1998-laces
1999-basketball-relegation
1999-football-cup
2000-championship
2000-cup-double
```

Do not use calendar year alone as the persisted chapter key; several years contain multiple units.

## 14. Historical anchors and verification ledger

All exact facts must enter through canonical anchor data with source notes. Before shipping, verify
dates, venue, score orientation, competition and stage from at least one authoritative record and,
for disputed/sensitive events, a second independent source.

Minimum anchors:

| Anchor ID | Fixed fact |
|---|---|
| `basketball-cup-1993` | 19.4.1993, Hapoel TA 71–65 Hapoel Givatayim |
| `basketball-finals-1993-g1` | Galil wins at Ussishkin, 88–73 |
| `basketball-finals-1993-series` | Galil Elyon wins series 3–1 |
| `football-cup-final-1994` | derby Cup-final loss, 0–2 |
| `football-zimbru-1996` | European qualifying elimination; verify legs/date before dialogue |
| `football-deficit-1996` | supervised accounting amid reported deficits; amounts require sourced anchor |
| `sinai-departure-1997` | Sinai leaves during last-place crisis; Kashtan succeeds him |
| `football-private-sale-1997` | Histadrut sale to Sagol/Teomim/Orenstein/Agiv group |
| `basketball-relegation-1997` | first top-flight relegation |
| `football-laces-1998` | 2.5.1998 championship-loss context |
| `basketball-relegation-1999` | second relegation in the continuing crisis |
| `football-cup-1999` | 1:1 after 120, shootout 3:1 vs Beitar; Gershon decisive |
| `football-title-2000` | 13.5.2000, 1:1 at Bnei Yehuda, title clinched |
| `football-cup-2000` | 17.5.2000, 2:2, shootout 4:2 vs Beitar; Double completed |

Research caution: older result pages sometimes display the score column in winner-first order even
when the home team is listed first. Resolve orientation in the server archive, test it and write
Hebrew narration from the normalized anchor.

## 15. Implementation order

### Pass 1 — foundation

- add chapter registry and state migrations;
- implement `GateIdentity`, `ArmyState`, `InstitutionState`, `PresenceMode`;
- make current B1 transition into a registered next unit;
- unit-test save replay from an existing 1986/1990 log.

### Pass 2 — 1991–1993 basketball arc

- B2–B4 maps, schedules, dialogue, travel and alternate presence routes;
- anchors for Givatayim and Galil;
- Ussishkin relationships, memory objects and branch collision tests.

### Pass 3 — Sinai, army and Gate split

- B5–B6 with defence/doubt/rupture continuity;
- army schedule/leave debt;
- forced Gate choice with history entry;
- Liron car scenario;
- financial danger, sale and survival anchors.

### Pass 4 — continuing rupture and 1998

- both basketball relegations and supporter-ownership seed;
- B8 delayed-information system;
- safe protest consequence routes;
- Soko/Shachor/Freddy/Asaf integration.

### Pass 5 — Cups and Double

- B10 convergence;
- B11 four-day persistent finale;
- personalized final walk and Stage C handoff only after 17.5.2000.

### Pass 6 — art/audio/QA

- request only assets named by implemented scenes;
- ensure age-correct portraits and walking/close-up/emotion sets;
- test every presence mode and each Gate path;
- test that Yosef never appears before the 2000s;
- test `gabi` produces no registry/content result except a migration alias to `liron` if old saves
  require it.

## 16. Acceptance tests

Stage B is not complete unless all statements below are true:

- A completed Stage A save reaches B1, and B1 reaches B2 without a “coming soon” dead end.
- Existing B1 saves still replay correctly.
- The player experiences both 1993 basketball peaks: Givatayim Cup joy and Galil championship loss.
- Sinai begins as a defensible childhood hero; the rupture is gradual and remembered.
- A real forced Gate 7/Gate 5/outside split occurs and changes access and relationships.
- The gate choice is stored as history so a later decade can author a move into or out of Gate 5.
- Army service can genuinely close one route and open another.
- There is no route that attends everything without paying time, trust, money or relationship cost.
- Football's near-relegation, financial danger, purchase and survival are playable lived events.
- Both basketball relegations form a continuing rupture; the return between them does not reset it.
- The future Hapoel Ussishkin story is seeded but not founded early.
- Shaul Eisenberg as “enemy” is clearly Pogi/supporter perspective rather than omniscient allegation.
- The 1998 trauma uses uncertainty and aftermath, not violence or counterfactual intervention.
- The 1999 Cup ends 1:1/3:1 and can converge—but not automatically heal—the divided group.
- Stage B does not end on 13.5.2000.
- The 17.5.2000 Cup final is fully playable and the Double is fixed in every route.
- The ending changes who is present and what it means, never whether Hapoel won.
- Michel Bar-Khalifa and Omer Hermesh are ordinary living characters with no memorial foreshadowing.
- Melamed uses a darbuka, never a guitar.
- Gabi does not exist as a separate character; Gabi is Liron.
- Yosef has zero Stage B spawns, dialogue nodes, schedules or random encounters.

## 17. Definition of emotional success

By the final whistle on 17.5.2000 the player should be able to remember not only trophies but:

- the first time Ussishkin felt like another home;
- the person beside them when Galil won;
- the last argument in which they still defended Sinai;
- the exact human cost of choosing a gate;
- a match heard from an army room instead of seen;
- a ride in Liron's car and what was said on the way back;
- why one basketball promotion failed to heal the first relegation;
- who began imagining that supporters might one day carry the club themselves;
- who did—or did not—stand beside them for the Double.

The player must finish happy. The player must not finish untouched.

## 18. Research starting points

These are verification leads, not permission to copy prose:

- Israeli Basketball League season data, Hapoel Tel Aviv 1992/93:
  `https://basket.co.il/team.asp?TeamId=399&sType=p2`
- Israeli basketball historical book entry for the 19.4.1993 Cup final (71:65):
  `https://pubhtml5.com/tajb/nosq/basic/151-200`
- Contemporary Globes report, 4.11.1996, on supervised accounting and deficits:
  `https://www.globes.co.il/news/article.aspx?did=131551`
- Ynet retrospective on the 1989–2017 top-flight period and the 1996/97 purchase:
  `https://www.ynet.co.il/articles/0,7340,L-4958060,00.html`
- Israel Football Association historical/research PDF mentioning the 1996/97 acquisition:
  `https://www.football.org.il/files/researches/fox.pdf`
- 1999 Cup sequence and broader club history:
  `https://wiki.red-fans.com/index.php?title=הפועל_תל_אביב_(כדורגל)/היסטוריה`
- 17.5.2000 Cup-final record:
  `https://wiki.red-fans.com/index.php?title=עונת_1999/00_(כדורגל)_גביע_המדינה_גמר`

Supporter wikis are valuable for supporter memory and leads but are not neutral authority. Mark
subjective language as viewpoint and corroborate sensitive claims before converting them into
canonical anchors.

## 19. Personal oral-history layer

The user requires one personal story in every decade beginning with the 1990s. Keep oral history
separate from verified sporting history and from fictional branches.

| Decade | Canonical user memory | Status | Implementation point |
|---|---|---|---|
| 1990s | refused the Beitar supporters' bus from Tel Aviv Central Bus Station and arrived two hours late to base | confirmed | B6 army route |
| 1990s | heard the Arabic teacher say “טייב” after Beit She'an, understood it as an Eitan Tayeb taunt and became upset | confirmed | B8 aftermath/classroom |
| 1990s | hitchhiked to Nazareth for a Toto Cup match because only about ten supporters went and no bus left | confirmed; exact date pending | B5/B6 travel side chapter |
| 1990s | promised pickup was forgotten; stand supporters collected taxi money so he reached the match | confirmed; match/date pending | B6 community side chapter |
| 2000s | not yet recovered/confirmed | empty—do not invent | future Stage C |
| 2010s | not yet recovered/confirmed | empty—do not invent | future stage |
| 2020s | not yet recovered/confirmed | empty—do not invent | future stage |

Two further confirmed personal facts await decade placement: the user painted his whole room red,
and he has five Hapoel tattoos including the crest. Do not assign dates or turn them into scenes
until the user identifies when each occurred.

For each later memory capture: who was present, approximate year, origin/destination, what physically
happened, immediate consequence, one sensory detail, and why the user still remembers it. Preserve
the user's factual core and label connective dramatization as fiction.
