import type { HistoricalAnchor } from '../anchors'
import type { ItemId, LocationId } from '../types'
import type { KitSpec } from '../../kit/spec'
import type { MechanicRequest } from '../activities'
import type { MechanicWindow } from '../../mechanics/types'

/**
 * הגשר — the one channel between the canvas and the DOM.
 *
 * Every word the player reads is rendered by React, not by Phaser. That is a deliberate
 * decision and not a shortcut: Hebrew in a WebGL canvas needs a loaded webfont, gets no
 * bidi handling, cannot be selected, cannot be read by a screen reader, and reflows
 * badly on a narrow phone. Text belongs to the DOM. The canvas draws the world.
 *
 * So the runtime speaks in intents — "show this dialogue", "the clock says this" — and
 * the shell decides what that looks like. It also means the shell can be restyled to
 * the brand without touching a scene, and that a scene can be tested without a browser.
 *
 * Deliberately tiny: a typed map of listener sets. A dependency to notify four
 * listeners is a dependency to maintain forever.
 */

export type PanoSpot = { yaw: number; pitch: number; labelHe: string; act: string }

export type DialogueLine = {
  /** speaker's display name, or null for narration */
  who: string | null
  text: string
  /** the face that fills the glass for this line — see `Say.closeUp` */
  closeUp?: string
  /** the speaker is not in the room — a phone or a screen (`Conversation.remote`) */
  via?: 'phone' | 'video'
}

export type DialogueChoice = {
  id: string
  text: string
  /** false renders it visibly unavailable — a choice you can see you cannot take */
  enabled?: boolean
  /** why it is unavailable, shown quietly next to it */
  noteHe?: string
}

export type HudState = {
  clock: string
  /** `24 במאי 1986` — the day this chapter is, written out; the year alone when the archive has no date */
  date: string
  agorot: number
  /** shown for a moment when it changes, then it goes away again (brief §15) */
  showMoney: boolean
  /**
   * הכוח — and the fact that it was never on the glass until 21.9.2026.
   *
   * `energy` is a cost on almost every choice in the game: a conversation charges it, a
   * shift charges it, running charges it, and `Condition` gates read it. The player could
   * see the money it cost them and not the tiring. It was visible in exactly one place —
   * `DebugPanel`, behind `NODE_ENV` — which is the same shape as the `Gauges` finding of
   * rule 46: a number the engine lives by that the person playing cannot see.
   *
   * `showEnergy` is deliberately NOT `energy > 0`, the way `showMoney` is `agorot > 0`:
   * a full tank is not news, and a bar that is always there stops being read. It appears
   * once the afternoon has actually cost something.
   */
  energy: number
  showEnergy: boolean
  place: string
  objective: string | null
  /** the year the life is in — the shell keys its type and texture off the decade */
  year: number
  /** the room, by id — the help sheet picks its sentence off it */
  scene: string
  /** "מה עליי לעשות?" — one plain sentence for the help sheet, never on the glass itself */
  hint: string
  /** what the DAY is waiting for, when the room itself has nothing left — `world/why.ts` */
  waitingOn?: string | null
  /**
   * ממתין — the one thing on the glass that says "nothing is broken".
   *
   * Maor, 5.9.2026: "במידה והמתמודד עשה הכל נכון עד כה וכעת נותר לו להמתין למשהו הבא באותו
   * מקום נא לציין את זה קבוע על המסך בזמן ההמתנה. למנוע חשד של המתמודד שמשהו נתקע במשחק."
   *
   * That is a real fault and it has a real cause: this game has stretches where the
   * correct move is to stand still — a match running, a father who has not come back yet,
   * a clock that has to reach a number. Every other game signals that with a spinner. This
   * one says it in words, permanently, for as long as it is true, and names WHAT is being
   * waited for. Null the rest of the time; a banner that is always there is wallpaper.
   */
  waitingHe: string | null
  /**
   * The story director's card (plan §2.2) — only for a DILEMMA: two destinations at the same
   * weight, no arrow, no right answer. Null the rest of the time.
   */
  /** (delta 93) the actor cue waiting for the glass — read by the dev overlay only */
  pendingCue?: string | null
  director?: {
    id: string
    mode: 'DILEMMA'
    titleHe: string
    footHe: string | null
    destinations: { labelHe: string; reasonHe: string; here: boolean }[]
  } | null
}

export type LifeBusEvents = {
  hud: HudState
  /**
   * `anchor` is WHERE the speaker is standing, as a fraction of the camera's view
   * (0 = the left edge of the picture, 1 = the right), or null when nobody is speaking
   * from a place — narration, or a voice the scene cannot locate. The balloon's tail
   * points at it. Sampled when the line is shown, not tracked: the world is paused for
   * the length of a conversation, so the only thing that can move under it is a shot
   * tween, and a tail that chases a tween is worse than one that is a few pixels off.
   */
  dialogue: { lines: DialogueLine[]; choices?: DialogueChoice[]; portrait?: string | null; anchor?: number | null; where?: string | null } | null
  /**
   * What the button will do, and to what.
   *
   * The old prompt said `לגעת`, which is not information. A verb plus a name — `דבר עם
   * קובי`, `צא לרחוב` — is the whole of the interaction language, and it is the same
   * string on a desktop key cap and on a phone's action button.
   */
  prompt: { verb: string; label: string; locked?: boolean } | null
  /** the one line of onboarding the game shows, or null once it is done */
  teach: { id: 'move' | 'act' } | null
  /** לפני שיוצאים — the pre-match wardrobe is open (plan §4); the world waits for `wear()` */
  ritual: { chapter: string; eventId: string; allowPlain: boolean } | null
  /**
   * A toast is a sentence — and since 4.9.2026 it can carry a thing: the art of the
   * object that just changed hands (`art`) and a one-word kicker over it ("לקופסה
   * האדומה", "קיבלת"). The shell draws a plain sentence as a strip and a sentence with
   * a thing as a ticket.
   */
  toast: { text: string; tone: 'plain' | 'red'; art?: string; kickerHe?: string } | null
  place: { id: LocationId; title: string; ambience?: string }
  /**
   * מבט — the world seen from the boy's eyes, for a moment. The shell draws
   * `Panorama`; the scene under it is paused until `closePano`.
   */
  pano: { key: string; titleHe: string; startYaw?: number; hotspots: PanoSpot[] } | null
  /** the tunnel, first person: the shell draws `TunnelWalk`; `finishTunnel` arrives */
  tunnel: { to: LocationId; spawn: string; variant?: 'bloomfield' | 'ussishkin' } | null
  /** the sound of the world — one-shots the shell's synthesiser plays; see `audio.ts` */
  sound:
    | { kind: 'step'; surface: 'floor' | 'street' | 'terrace' }
    | { kind: 'door' }
    | { kind: 'whistle'; blasts: number }
    | { kind: 'roar'; big?: number }
    | { kind: 'radio'; on: boolean }
    /** one rendered sound by name — see `SampleKey` in audio.ts */
    | { kind: 'sample'; key: import('./audio').SampleKey; level?: number; delayMs?: number }
    /** the crowd moves to a state — see `CrowdState` in audio.ts; the match director's voice */
    | { kind: 'crowd'; state: import('./audio').CrowdState }
    /**
     * דרבי או לא — said once, before the first minute, by the director running the match.
     *
     * The constant match bed plays at every fixture; the chant Maor sent is layered over
     * it only when this is true (6.9.2026). The audio never guesses which night it is.
     */
    | { kind: 'derby'; on: boolean }
    /**
     * כמה מהאצטדיון להשאיר — the mix inverts while somebody is listening to a radio in the
     * middle of a crowd (Mission 01 §24). 1 = an ordinary match, 0.3 = news from the other
     * ground, 0.05 = a penalty nobody in this stadium can see.
     */
    | { kind: 'listen'; weight: number }
  anchor: { anchor: HistoricalAnchor; showing: boolean }
  /**
   * הלוח — the scoreboard, while a match is actually happening in front of the child.
   *
   * The HUD has a clock on it and that clock says `שבת • 17:41`, which is the time of day
   * and not the thing anybody in the ground is looking at. During the final the shell
   * shows a second, different clock — two club names, a score, a minute — and it is the
   * only moment in the chapter that a number on screen means what a number on a
   * scoreboard means. `null` the rest of the time, which is most of the game.
   */
  match: {
    homeHe: string
    awayHe: string
    /** null when the archive holds the night as a season and not a score: the strip prints a dash */
    homeScore: number | null
    awayScore: number | null
    labelHe: string
    /** true from the goal until the whistle, so the strip can carry the moment */
    scored: boolean
    /** the whistle has gone: the board is now a fact, and the boy has somewhere to be */
    over?: boolean
  } | null
  /**
   * סוף שלב א' — the end of the stage, which is not the end of a scene.
   *
   * `ending` closes a Saturday. This closes a CHAPTER OF A LIFE: it carries the archive's
   * own record of the match, the ticket that got the child in, the next morning's front
   * pages, and the one sentence that says what he became. It exists as its own channel
   * because it is the only screen in the game a player is meant to sit with.
   */
  finale: {
    anchor: import('../anchors').HistoricalAnchor
    /** the chapter that ended — its plate is the hero of the card */
    chapter: string
    titleHe: string
    bodyHe: string
    becameHe: string
    keptTicket: boolean
    /**
     * The year the NEXT chapter is set in, resolved by the runtime rather than by the
     * card. Since 6.9.2026 a chapter can be conditional on the life (`chapterOpen`), so
     * "what comes next" depends on flags the card has no business holding.
     */
    nextYear: number | null
  } | null
  /**
   * סרט מהארכיון — the illustrated memory opening onto real film.
   *
   * Its own channel, and not a `doc` with a video in it, because it obeys a rule neither
   * of them does: while it is on screen the WORLD IS STOPPED. No clock, no schedule, no
   * dialogue, no thumb pad, no objective — the player is not in 1986 as a child for these
   * two minutes, they are watching what a child watched. `doc` holds a page up over a
   * world that is still running underneath.
   *
   * The payload is the configuration plus the card built from the anchor, so the shell
   * renders it without importing the archive. `null` closes it, and closing it is the
   * runtime's job: the shell reports how it ended and the scene decides what that means.
   */
  cutscene: {
    scene: import('../cutscenes').HistoricalCutscene
    card: import('../cutscenes').CutsceneCard
  } | null
  /**
   * מסמך — a real printed thing, held up over the world until the player puts it down.
   *
   * Not a dialogue portrait and not a prop: a scan of something that exists. It gets its
   * own channel because it obeys a different rule from every other picture in the game —
   * nothing may be written on it, nothing may be cropped out of it to make a point, and
   * the caption underneath says where it came from rather than what to think about it.
   */
  doc: { art: string; captionHe: string | null } | null
  /**
   * הפתק — scraps of what he has heard and the pencil columns he sorts them into
   * (`lib/life/noteBoards.ts`, implementation pass 27.9.2026). Plain data: the sheet never
   * reads the registry, and what comes back is only where each scrap was put.
   */
  board: import('../noteBoards').NoteBoardView | null
  /**
   * הקופסה האדומה פתוחה — 21.9.2026. אין כאן תוכן: מה שבקופסה הוא מה שבמצב, והמעטפת
   * קוראת אותו כשהיא נפתחת (`boxContents`), כדי שחפץ שנכנס לפני רגע כבר יהיה בה.
   */
  box: boolean
  /**
   * חוברת פתוחה — which booklet is being read, and on which page.
   *
   * Its own channel rather than a `doc` with a page number, because it obeys different
   * rules: it does not stop the world for a beat and then go away, it stays open for as
   * long as somebody is reading, and where they stopped is remembered.
   */
  book: { id: string; page: number } | null
  /**
   * כרטיס-ביסוס — a title over black, held for `ms`, then gone: `מאי 1990`,
   * `בלומפילד · 12 במאי 1990`. The first of the five tricks in the roadmap's grammar of
   * entering a scene. It says one thing and is never a menu.
   */
  /**
   * החולצה שקנית — held up big, with the year it was worn and where the collection
   * stands. A shirt is the only purchase in this game that gets a card of its own.
   */
  /**
   * מעברון — four seconds of Tel Aviv, 1989, over the black between two rooms.
   *
   * Not the archive film channel (`cutscene`), which stops the world and is a document.
   * This is a breath: it plays over a scene change that is happening anyway, cannot be
   * interacted with, and is gone before anybody decides whether to skip it.
   */
  film: { clip: string; captionHe: string } | null

  /**
   * כרטיס היכרות — the first time somebody walks into this life.
   *
   * Maor asked for "סרטון הכרות קצר" for every character, humorous and light. There is no
   * film here and there should not be: three lines revealed a tap at a time over the
   * figure at full height IS a title sequence — it has a beat and an edit — and it costs
   * writing instead of a shoot. It plays once per person, ever (`own:met:*`).
   */
  cast: {
    nameHe: string
    roleHe: string
    art: string
    linesHe: readonly string[]
    sinceHe: string
  } | null

  /**
   * חנות האוהדים — not a room, a counter.
   *
   * It WAS a room for one delta, cut out of a 360° panorama Maor sent, and his verdict on
   * the screenshot was the right one: "החנות שאתה מעלה בתמונות נראית נורא ואיום… אולי שווה
   * לעשות חנות כפיצ׳ר פנימי, ולא כחלל". He is right twice over. An empty room with one
   * shirt floating on a wall is worse than no room, and a shop is not a place you walk
   * about in — it is a rail you look along. So the door on the street opens THIS: the
   * whole collection, drawn, with what it costs and what you already own.
   */
  shop: { chapter: string } | null

  /**
   * הטוטו — a Toto slip is, in this game, five questions about the club.
   *
   * Maor asked for it in the shape it already exists in: the site's own trivia bank, five
   * questions a round, two shekels a correct answer. The questions arrive from the server
   * WITHOUT their answers and are graded there, exactly the way גשר 2 does it, so a boy
   * filling in a Toto slip cannot read the results off the page.
   */
  /**
   * `window` and `top` from 1990 on: the slip is cut to the life's year and pays a share of
   * B up to `top` shekels. Absent in 1984–86, where it is two shekels an answer, as it was.
   */
  toto: { seed: number; perAnswerHe: string; window?: MechanicWindow | null; top?: number | null } | null

  /**
   * פעילות — a gate game opened from this room (`lib/life/activities.ts`). The shell draws
   * the gate's own board over the paused world, settles the result through the ledger and
   * hands the room its reaction; null closes it.
   */
  mechanic: MechanicRequest | null

  /** התיק — the bag, opened from the bedroom rather than from ☰ (the same card) */
  bag: boolean

  /**
   * עץ או פלי — a half shekel, in the air, in the alley.
   *
   * A shekel in, five out. That is the bet the street offered and it is Maor's number.
   * The coin is his photograph of a half shekel: the lyre is עץ and the numeral is פלי.
   */
  coin: { stake: number; prize: number } | null

  /**
   * פנדלים — five real penalty kicks against a keeper, on the neighbourhood pitch,
   * played in three dimensions rather than painted (Maor, 6.9.2026).
   */
  penalty: { attempts: number; perGoal: number } | null

  /**
   * המגרש — a 3D football reconstruction, opened from inside the story.
   *
   * One channel for the whole engine, the same way `penalty` and `hoops` are one channel
   * each: the runtime says WHICH match and WHICH window, and `PitchCard` decides what that
   * looks like. Everything here is either an identity or a fact the archive already holds —
   * there is no scoreline in this payload that the caller invented.
   *
   * `showScore: false` is the honest state and it is not a placeholder: a reconstruction of
   * a day the archive does not hold a score for prints a dash on the board rather than a
   * number, because a scoreboard reading an unsourced score is a fabricated fact in a nice
   * typeface (CLAUDE.md rule 60).
   *
   * `awayYellow` is the one approved use of yellow in this product — it marks the OPPONENT,
   * and only the opponent (Maor, 7.9.2026). `lib/brand/yellowExemptions.ts` names the
   * surface and `awayMarkColour` refuses to hand the colour to the player's own side.
   */
  pitch: {
    matchId: string
    windowId: string
    mode: 'documentary' | 'replay'
    /** the two abbreviations the board prints — never a claim, just names */
    homeHe: string
    awayHe: string
    /** false when the archive does not hold a score for this moment; the board shows a dash */
    showScore?: boolean
    score?: { home: number; away: number }
    startMinute?: number
    era?: string
    awayYellow?: boolean
    quality?: 'low' | 'medium' | 'high'
  } | null

  /**
   * תחרות חיובים — five free throws at the schoolyard hoop, from the painted-on line,
   * played in three dimensions rather than painted (Maor, 6.9.2026).
   */
  hoops: { attempts: number; perBasket: number } | null

  /**
   * האלבום — the Supergoal album, open over a stopped world.
   *
   * Its own channel rather than a `doc`, for the same reason `book` has one: it is not
   * held up for a beat and put down, it is a thing the player goes into and comes out of,
   * and what is stuck in it is state rather than a picture.
   */
  album: { open: boolean } | null

  /**
   * מעטפה — three stickers coming out of a paper envelope.
   *
   * `before` is how many of each one was already in the album at the moment the packet
   * was bought, so the card can say `חדש` truthfully after the engine has already
   * counted them in.
   */
  packet: { ids: readonly string[]; before: Readonly<Record<string, number>> } | null
  /**
   * מהקופסה — the card that comes out of the red box when a page closes.
   *
   * A different channel from `packet` on purpose: a packet is bought and this is given,
   * and the two must not be able to open on top of each other. The stage queues it behind
   * whatever is already open.
   */
  kept: { ids: readonly string[] } | null
  /**
   * זמן פנוי — the day's next thing is waiting for the clock and nothing else (delta 90).
   *
   * Emitted by `WorldScene` every minute the plan changes (`world/timeAdvance.ts`): what is
   * coming, when and where, when to leave, and what fits before. React draws the chip and
   * the planner and paces them in real seconds (§30); it never moves the clock — it asks
   * `runtime.advanceTime(planId)` and the world moves itself.
   */
  freeTime: import('../world/timeAdvance').TimeAdvancePlan | null

  /**
   * המנוי יצא למכירה — the one card in this game that STOPS a chapter on its way in.
   *
   * Maor, 16.9.2026: *"תכניס ממש עצירה בין לבין עם פופ אפ של 'המנוי יצא למכירה'"*. Two
   * different moments arrive on one channel because they are the same object seen twice,
   * and keeping them apart is what stops the announcement and the counter drifting:
   *
   * · `onSale` — the interruption. Fired once per season by `WorldScene` on the first
   *   room of the chapter that opens it, beside `announceNewShirts`/`announceNewAlbums`.
   *   It sells nothing; it says a summer has arrived and where the window is.
   * · `counter` — the window itself, fired when the boy walks into the ticket office.
   *   This is the one with a button on it.
   *
   * Only the season ID crosses the bus. Everything printed — the price, the category, the
   * gate, the source line — is read from `lib/life/subscription.ts` by the card, because
   * a scene that carried a price would be a second copy of an archive row (rule 59).
   */
  season: { kind: 'onSale' | 'counter'; season: string } | null

  shirt: {
    /**
     * למה הכרטיס הזה פתוח — a purchase, or a new kit arriving on the rail.
     *
     * Maor, 5.9.2026: "בחנות אוהדים חולצות צריכות להתגלות רק מתי שמגיעים לעונה בה שיחקו
     * עם החולצה ולא לפני. גם המתמודד מקבל על זה פופ אפ שנכנסה חולצה חדשה לחנות." The
     * first half was already true (`onSale` gates on the season); the second half is this.
     */
    kind: 'bought' | 'arrived'
    /** a photograph — empty when the shirt is drawn from the archive's spec instead */
    art: string
    titleHe: string
    nameHe: string
    sponsorHe: string
    yearsHe: string
    noteHe: string
    have: number
    total: number
    /** the club's own kit spec, when this shirt came out of the archive */
    spec: KitSpec | null
    seasonHe: string | null
    sourceHe: string | null
  } | null

  card: {
    titleHe: string
    subHe: string | null
    ms: number
    /**
     * הלוח — a chapter cut is a title over a PICTURE (5.9.2026). `art` is a plate key
     * (`plate-1993-cup`) from `make-plates.py`; with it the card becomes the graded key
     * painting of the next chapter under bars and grain, and the title is a year that
     * rolls from `fromYear`. Without it the card is the word over black it always was.
     */
    art?: string
    fromYear?: number | null
    /** a wider sub line under the rule — the chapter's name */
    nameHe?: string
  } | null
  /**
   * החיים האחרים — the championship was missed, so the chapter does NOT end (Stage A §14).
   *
   * A separate channel from `ending` on purpose: an ending closes a Saturday and opens the
   * next thing, and this closes nothing. It shows what happened, shows the life Pogi would
   * have had if that were really the end of it, and hands back the morning.
   */
  retry: import('../content/retry1986').RetryScene | null
  /**
   * הקודה — the life as BUILT is over, and the game says so instead of promising.
   *
   * Emitted by the runtime when a chapter ends and the registry has no playable chapter
   * after it. The shell shows the frame of 2026 — the man in front of the new ground —
   * and the one honest line: this is as far as the life goes today. `null` closes it.
   */
  coda: { chapter: string } | null
  /**
   * המדדים זזים — what moved in the life on the last dispatch, for the pops.
   *
   * A batch, not a value: one dispatch of five events is one beat on screen, and the
   * shell decides how many of them to show. Computed by the runtime from the state
   * before and after (`lib/life/gauges.ts`), never authored by a scene — a scene cannot
   * announce a rise it did not cause.
   */
  gauge: import('../gauges').GaugeChange[]
  /** the love meter on the glass — the one number always visible */
  love: { value: number; bump: number }
  /**
   * מקום נחשף — a place went on the city map for the first time, and it is a moment.
   * The map zooms to it, the fog lifts, a red stamp lands. `null` closes it.
   */
  reveal: { place: import('../map').MapPlaceDef } | null
  /** the runtime asking the shell to show the closing card */
  ending: {
    titleHe: string
    bodyHe: string
    memoryHe: string
    /**
     * מה נכנס לקופסה — המזהה שנשמר, החפץ, והסוף. הכרטיס מצייר את החפץ לצד המשפט
     * (`BoxObject`), כי *"שמת את זה בקופסה האדומה"* בלי לראות מה זה הוא חצי מהרגע.
     */
    memory?: { id: string; item: ItemId; endingId: string; year: number }
    after?: { fromArt: string; toArt: string; lineHe: string }
    chapter?: string
    /**
     * איפה הוא היה — the ending's own `presence`, carried through because the card needs
     * it and can get it nowhere else.
     *
     * The card may hold up the real ticket from the night it is closing, and a ticket is
     * only true for somebody who was in the ground. Deriving it from flags in the shell
     * would be a second copy of a decision the chapter already made in its `EndingCard`
     * record, and two copies of that decision is how a man who listened on a radio ends
     * up being shown a stub.
     */
    presence?: import('../types').PresenceMode
  } | null
  /**
   * הזמנה למסלול — מה שאפשר להיות, ומי החליט על זה.
   *
   * A channel rather than a toast, and the difference is the whole design. The life spec
   * is explicit that reaching a threshold *"יוצרת הזמנה שניתן לדחות; אינה מבצעת החלטה"*
   * — so what crosses this channel is an OFFER, the shell draws it with a way to say no,
   * and nothing in the life changes until the player presses something. A toast would
   * announce a promotion that already happened, which is the one thing this may not be.
   *
   * It carries `gaps` as well as the offer because the same card does both jobs: opened
   * on a route he qualifies for, it asks; opened on one he does not, it says what is
   * still missing, in words. A door you can see you cannot open is information; the
   * absence of a door is a dead end (the same reason a greyed choice is drawn).
   *
   * `null` closes it. One at a time, always — the model hands back at most one stage per
   * route, so a man meeting every condition of all three is offered the first of them.
   */
  route: {
    invitation: import('../routes').RouteInvitation | null
    /** what is still missing, when this card is an explanation rather than an offer */
    gaps: readonly import('../routes').RouteGap[]
    /** the route being shown, for the case where there is no invitation to carry it */
    routeId: import('../routes').RouteId
    stage: import('../routes').RouteStage
    /** true when the stage's minimum age is above the last chapter that exists (rule 66) */
    outOfReach: boolean
  } | null
  /** touch controls only matter on a touch device; the runtime says when they help */
  controls: { visible: boolean }
  /** (delta 93) a beat takes the HUD off the glass for a moment and puts it back */
  hudVisible: { visible: boolean }
  saved: number
  /**
   * How tall the painting actually is on screen, in CSS pixels.
   *
   * On a phone held upright a room cannot fill the glass without losing its composition,
   * so the camera frames it and the rest of the canvas is empty. The shell needs to know
   * where the picture ends, because that is where the dialogue box belongs — not floating
   * over the painting, and not stranded at the bottom of a black field.
   */
  frame: { picture: number }
}

type Handler<K extends keyof LifeBusEvents> = (payload: LifeBusEvents[K]) => void

export class LifeBus {
  private handlers: { [K in keyof LifeBusEvents]?: Set<Handler<K>> } = {}
  /** last value per channel, so a component that mounts late is not blank */
  private last: { [K in keyof LifeBusEvents]?: LifeBusEvents[K] } = {}

  on<K extends keyof LifeBusEvents>(key: K, handler: Handler<K>): () => void {
    // The store is keyed by channel and each channel has its own payload type, which a
    // generic index cannot prove to the compiler. The cast is confined to these two
    // lines; every caller of `on`/`emit` stays fully typed.
    const store = this.handlers as Record<string, Set<Handler<K>>>
    const set = (store[key] ??= new Set<Handler<K>>())
    set.add(handler)
    if (key in this.last) handler(this.last[key] as LifeBusEvents[K])
    return () => {
      set.delete(handler)
    }
  }

  emit<K extends keyof LifeBusEvents>(key: K, payload: LifeBusEvents[K]): void {
    this.last[key] = payload
    const set = this.handlers[key] as Set<Handler<K>> | undefined
    if (!set) return
    for (const handler of set) handler(payload)
  }

  clear() {
    this.handlers = {}
    this.last = {}
  }
}
