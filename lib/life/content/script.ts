import type { SampleKey } from '../runtime/audio'
import type {
  ArmyGauge,
  ArmyRoute,
  BondId,
  CharacterId,
  GateIdentity,
  GateReason,
  InstitutionGauge,
  ItemId,
  LacesResponse,
  LocationId,
  PersonalityId,
  PresenceMode,
  RedHeartId,
  RelationshipAxis,
  RelationshipMemory,
  ReputationAudience,
  SinaiStance,
  SkillId,
  TraitId,
  WellbeingId,
} from '../types'
import type { Condition } from '../world/types'
import type { PitchIntent } from '../football/door'

/**
 * הטקסט — the authored fiction, and the line it must not cross.
 *
 * Everything in `lib/life/content/` is INVENTED: a family, a friend, a kiosk, a
 * Saturday. None of it is history and none of it may pretend to be. The rule the whole
 * project runs on (rule 11, brief §24) applies here in its sharpest form, because
 * dialogue is exactly where a fabricated fact would slip in unnoticed — a scoreline in
 * a father's mouth reads as research.
 *
 * So the content layer states no date, no opponent, no result, no scorer and no
 * attendance. Where the game needs a fact it asks for the `HistoricalAnchor`, which came
 * from the canonical archive with its source attached. Kobi says there is a match. He
 * does not say who against, because nobody has told this project who against.
 *
 * A conversation and an interaction are the same structure on purpose: examining a
 * cupboard is a conversation with a cupboard, and building two systems for that would
 * be two systems to keep in step.
 */

export type Say = {
  /** null is narration — the child's own eyes, not a speaker */
  who: string | null
  text: string
  /**
   * קלוז-אפ — the face fills the glass for this one line (4.9.2026). An art key from
   * `CLOSE_UP` in `art.ts`; the box stays, the world behind it becomes the face. Used
   * on a handful of lines per chapter — "איפה היית?!", "נו?" — never on a whole
   * conversation, because a close-up that lasts is a portrait, not a beat.
   */
  closeUp?: string
}

export type Effect =
  | { e: 'flag'; flag: string }
  | { e: 'money'; agorot: number; why: string }
  | { e: 'give'; item: ItemId; count?: number }
  | { e: 'take'; item: ItemId; count?: number }
  | { e: 'bond'; who: BondId; delta: number }
  | { e: 'trait'; trait: TraitId; delta: number }
  | { e: 'time'; minutes: number }
  | { e: 'toast'; text: string; tone?: 'plain' | 'red' }
  /**
   * a price, said out loud: a red line now (`text`), and — when `laterText` is given — a
   * second line `afterMinutes` later, kept in the state so it lands after a reload too
   */
  | { e: 'consequence'; id: string; text: string; laterText?: string; afterMinutes?: number }
  /** a cut to a painted place for a moment — a room the day has no walk in (the base, Liron's car); only a registered backdrop */
  | { e: 'plate'; art: string; titleHe: string; subHe?: string; ms?: number }
  /**
   * חולצה לארון — the one thing in this game that is kept for life.
   *
   * `own:shirt:<id>` survives every reset (see `personFlags`), so a shirt bought in 1985
   * is still in the collection in 2000. The card it raises is the moment, not a receipt:
   * the first one says so in as many words.
   */
  /** `giftHe`: the card names who gave it (delta 93 — the first shirt, from his father) */
  | { e: 'shirt'; id: string; giftHe?: string }
  /** the fan shop: the whole rail, drawn, as a screen rather than a room */
  | { e: 'shop' }
  /** a Toto slip: five questions from the site's own bank, two shekels each */
  | { e: 'toto' }
  /**
   * פעילות — a gate game, opened from inside this room (21.9.2026, `lib/life/activities.ts`).
   *
   * The runtime chooses WHAT to deal (a lineup, a goal, a shirt dated before this year, off
   * the save's own seed) and opens the gate's own board over the paused room; when it
   * closes, the room plays `act-<id>-after` and the person in it reacts to how it went. If
   * the archive holds nothing for this year the room offers the activity's ordinary
   * afternoon instead, or says why not — never an empty board.
   */
  | { e: 'mechanic'; activity: string }
  /** עץ או פלי in the alley: a shekel in, five out */
  | { e: 'coin' }
  /** פנדלים במגרש השכונתי — five real penalty kicks against a keeper, in three dimensions */
  | { e: 'penalty'; attempts: number; perGoal: number }
  /** תחרות חיובים בחצר — five free throws at the schoolyard hoop, in three dimensions */
  | { e: 'hoops'; attempts: number; perBasket: number }
  /**
   * המגרש — the 3D football match, opened from inside the world.
   *
   * The payload is the whole match definition, so one effect serves both the kickabout on
   * the neighbourhood pitch and, later, a historical window in documentary mode. See
   * `lib/life/football/door.ts` — nothing about the engine is spelled out here.
   */
  | { e: 'pitch'; intent: PitchIntent }
  /**
   * סופרגול — the album, and the three verbs it needs.
   *
   * `packet` is a purchase: it takes the packet price out of the pocket in the decade's
   * own money, rolls three stickers off the page the kiosk is selling, counts them in and
   * raises the envelope. `sticker` puts one named sticker in (or takes one out, with a
   * negative `count`) and is how a father hands over the one he kept and how a trade
   * settles. `album` just opens it.
   *
   * `packet` is the only one that spends money, and it deliberately spends the SAME money
   * the shirt costs — see `PACKET` in `prices.ts`.
   */
  | { e: 'packet' }
  /**
   * להחליף — a duplicate for the one you are missing, with a named child.
   *
   * The runtime decides three things this line cannot: WHICH sticker is missing (the
   * rarest gap on the page being collected), WHO is holding it (`holderOf` — whoever the
   * player has been worst to), and whether this particular child is that person. If he is
   * not, he says who is, because that is what children do.
   */
  | { e: 'swap'; who: BondId }
  | { e: 'sticker'; id: string; count?: number }
  | { e: 'album' }
  /** a sound from the library at the moment the choice lands */
  | { e: 'sfx'; key: SampleKey; level?: number; delayMs?: number }
  /**
   * Hold up a real document.
   *
   * The only verb in this vocabulary that shows the player something nobody in this
   * project drew: a ticket somebody kept, or a page of מעריב ספורט printed the morning
   * before the match. `art` is a key in `DOC` and the runtime will not accept anything
   * else, which is what stops this becoming a general-purpose image popup.
   */
  | { e: 'doc'; art: string; captionHe?: string }
  /** הקופסה האדומה נפתחת — מה שיש בה נקרא מהמצב, לא מהתוכן (`lib/life/redboxView.ts`) */
  | { e: 'box' }
  /**
   * לפתוח חוברת — a printed object with more than one page (`lib/life/books.ts`).
   *
   * `doc` holds ONE sheet up. A booklet is twenty-four of them and is read rather than
   * shown, so it gets its own effect and its own reader; the id is a book in the registry,
   * never a path.
   */
  | { e: 'book'; id: string }
  | { e: 'goto'; node: string }
  | { e: 'travel'; to: LocationId; spawn: string }
  /**
   * A minigame to play now: `football` is the two-a-side on the pitch, `chore:<gig>` is
   * one of the jobs in `lib/life/gigs.ts` played rather than agreed to (Maor, 5.9.2026:
   * "מיני־משחק אמיתי לשחק בו").
   */
  | { e: 'minigame'; id: string }
  | { e: 'memory'; item: ItemId; id: string }
  | { e: 'attend' }
  | { e: 'missed' }
  | { e: 'ending'; id: string }
  // --- the systems pass -------------------------------------------------------------
  // Everything below writes to a model that did not exist when this chapter was first
  // authored. The old verbs still work and still mean what they meant — `trait` routes
  // itself into personality or the Red Heart — so nothing had to be rewritten. These
  // exist for the lines that want to be precise: a father losing trust while the bond
  // holds, a supporter putting the terrace into a child's head, a promise somebody will
  // remember two hours later.
  | { e: 'wellbeing'; key: WellbeingId; delta: number }
  | { e: 'personality'; key: PersonalityId; delta: number }
  | { e: 'redheart'; key: RedHeartId; delta: number }
  | { e: 'rel'; who: CharacterId; axis: RelationshipAxis; delta: number }
  | { e: 'remember'; who: CharacterId; eventId: string; significance?: RelationshipMemory['significance'] }
  /** seize a window that is currently open; the engine applies its cost and its outcome */
  | { e: 'seize'; opportunity: string }
  /** roll what this Saturday leaves in the red box, out of what actually happened */
  | { e: 'keep' }
  | { e: 'flagValue'; flag: string; value: boolean | string | number }
  /**
   * הקופה והבגד — Stage A's economy, in two verbs.
   *
   * `save` moves agorot out of a pocket and into the tin under the bed, where a day
   * transition cannot spend them; `own` records a thing the boy keeps owning — the first
   * shirt, and whatever a later summer adds. Both exist because the difference between
   * "I have fifty agorot" and "I have been saving since June" is the difference between an
   * afternoon and a childhood (Stage A §9).
   */
  | { e: 'save'; agorot: number; why: string }
  /** the tin into the pocket — the day the saving is spent */
  | { e: 'withdraw'; agorot: number; why: string }
  | { e: 'own'; item: string }
  /** legs and lungs — a banner carried, a night stood through */
  | { e: 'energy'; delta: number }
  /**
   * העשור — Stage B's four surfaces, as verbs a line can speak (brief §4).
   *
   * A choice that moves him to Gate 5 says `gate`; a leave he argued for says `army`; a
   * line that stops defending Sinai says `sinai`; the way he was there for a match says
   * `presence`. None of these is a flag, so none of them can be forgotten by a day.
   */
  | { e: 'gate'; to: GateIdentity; reason: GateReason }
  | { e: 'armyRoute'; route: ArmyRoute }
  | { e: 'army'; key: ArmyGauge; delta: number }
  | { e: 'sinai'; stance: SinaiStance }
  | { e: 'institution'; key: InstitutionGauge; delta: number }
  | { e: 'presence'; mode: PresenceMode }
  | { e: 'laces'; response: LacesResponse }
  /**
   * שבעת המסלולים — seven verbs, and the shape of the set is the design (16.9.2026).
   *
   * The life spec's routes gate on two kinds of number that behave nothing like each
   * other, and the vocabulary below is built so that a content file CANNOT confuse them
   * however carelessly it is written:
   *
   *  · `skill` moves a capability, immediately, with nobody watching. That is the whole
   *    point of a skill — *"הכישור עצמו יכול להשתפר מיד"*.
   *  · `proof` records evidence AND queues the standing it earns. It does not move a
   *    standing. Nothing here does.
   *  · `heard` is what pays a queued claim out, and it exists as a separate verb because
   *    the moment the audience finds out is a moment in the fiction — a supplier saying
   *    your name at a counter, a song coming back at you from people you never met.
   *
   * **There is deliberately no verb that raises a reputation.** Not one. The only way up
   * is `proof` then `heard`, which is the spec's rule (*"REP_* עולה רק כשהקהל המוגדר
   * ראה/קיבל דיווח מאומת על הפעולה"*) expressed as a missing word rather than as a
   * comment somebody has to remember. `repLoss` goes the other way and only the other
   * way — its delta is forced negative in the runtime — because a breach that came out is
   * known by definition and has nobody to wait for.
   */
  | { e: 'skill'; skill: SkillId; delta: number; why: string }
  /**
   * ראיה — evidence, and the claim it earns.
   *
   * `proofId` may carry `{chapter}`, which the runtime substitutes. That is what lets one
   * authored mission be earned once per chapter and never twice in the same one, which is
   * exactly the shape *"ארבע משימות הוכחה בארבעה פרקים שונים"* describes. `audience` and
   * `delta` are optional: an action can leave evidence and earn nobody's opinion.
   */
  | {
      e: 'proof'
      kind: string
      proofId: string
      subjectHe?: string
      noteHe?: string
      audience?: ReputationAudience
      delta?: number
    }
  /** אירוע ידיעה — the audience found out; whatever was queued under this id is paid */
  | { e: 'heard'; proofId: string }
  /** the one direction a standing moves with no witness, because the harm is the witness */
  | { e: 'repLoss'; audience: ReputationAudience; delta: number; why: string }
  /** חוב — a supplier put off, a fare somebody covered. Not negative money. */
  | { e: 'debt'; agorot: number; why: string }
  /**
   * לקבל, לדחות או לעזוב שלב במסלול.
   *
   * `accept` is checked against the same eligibility the invitation was offered on, so a
   * branch cannot hand out a title by being reached; `decline` writes nothing at all, so
   * a refused offer can come back; `leave` keeps the history and stops the practice.
   */
  | { e: 'route'; route: string; stage: 'entry' | 'practice' | 'apex'; act: 'accept' | 'decline' | 'leave' }
  /** בעלים שהוא גם עיתונאי — which of the three doors he took, at the moment ownership lands */
  | { e: 'conflict'; choice: 'stop_covering' | 'personal_column' | 'disclose_and_pay' }

export type ChoiceDef = {
  id: string
  text: string
  /** when this fails the choice is shown greyed with `noteHe`, never hidden — a door you
      can see you cannot open is information; a door that is not drawn is a dead end */
  when?: Condition
  noteHe?: string
  /**
   * The one exception to "never hidden": a choice that is the SAME sentence as another
   * one with a different price (1998: "לקום" is one line; what it costs depends on who
   * you were at the ten-year-olds). Two copies of a line, one greyed, is a bug, not
   * information — so a `hidden` choice that fails its condition is not drawn at all.
   */
  hidden?: boolean
  then: Effect[]
}

/**
 * הבמאי כנתונים — how a conversation is SHOT, described beside what is said.
 *
 * Every conversation used to be framed the same way, which is why every conversation
 * felt the same. Cinematography written per scene would be worse: eleven places to fix
 * one mistake. So a beat is data — who the camera is on, how close, and for how long —
 * and one controller in the runtime executes it for every conversation in the game.
 */
export type ConversationShot = {
  focus: CharacterId | 'player' | 'both'
  framing: 'close' | 'medium' | 'ots' | 'wide'
  duration?: number
  gesture?: string
  /** how far the world's own sound steps back, 0..1 — never to silence */
  ambienceDuck?: number
}

export type Branch = {
  when?: Condition
  lines: Say[]
  /** the framing this branch is played in; absent means the world's default two-shot */
  shot?: ConversationShot
  choices?: ChoiceDef[]
  /** applied when the branch's lines finish and there are no choices */
  then?: Effect[]
}

export type Conversation = {
  id: string
  /** the name in the box; a prop has none */
  nameHe?: string | null
  /** first matching branch wins, so order is the priority order */
  branches: Branch[]
  /**
   * מי **לא בחדר** — ובאיזה קו הוא מדבר (21.9.2026).
   *
   * שיחה עם קרן בטלפון ושיחה עם קרן במטבח נראו עד היום אותו דבר: שם, פרצוף, וזנב של בועה
   * שמחפש בחדר את מי שקוראים לו קרן ולא מוצא. `life:sync` (כלל 85) דורש שכל מי שמדבר
   * בשיחה שנפתחת בחדר יעמוד בו — **או** ייכתב כאן. המפתח הוא ה-`who` כפי שהוא כתוב בשורה
   * (`PARTNER` כולל), והתיבה מציירת ליד השם את סמל הטלפון (`iconPhone`) ולא מושכת זנב.
   */
  remote?: Readonly<Record<string, 'phone' | 'video'>>
  /**
   * **איפה זה קורה, כשזה לא החדר** — *"ניקוסיה"*, *"טדי"*. יש ערבים שהסיפור קורה בהם
   * במקום שאין לו ציור, והשיחה נפתחת מביט של שעון בכל חדר שבו פוגי עומד. בלי זה, החדר
   * משקר: אנשים שמדברים על אצטדיון בקפריסין מופיעים לידו במטבח. עם זה, התיבה מציירת תג
   * מקום מעל הבועה, ואף אחד לא נכנס לחדר בשביל השיחה (`WorldScene.summonSpeakers`).
   */
  where?: string
}
