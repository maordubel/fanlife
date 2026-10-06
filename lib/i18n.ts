import he from '@/messages/he.json'
import heLife from '@/messages/he.life.json'
import heArchive from '@/messages/he.gates.archive.json'
import heCard from '@/messages/he.gates.card.json'
import heChallenge from '@/messages/he.gates.challenge.json'
import heCore from '@/messages/he.gates.core.json'
import heKits from '@/messages/he.gates.kits.json'
import hePlayers from '@/messages/he.gates.players.json'
import heReplay from '@/messages/he.gates.replay.json'
import heCollector from '@/messages/he.collector.json'
import heMarket from '@/messages/he.market.json'
import heAuction from '@/messages/he.auction.json'
import heCredits from '@/messages/he.credits.json'
// delta 87 — the phone stage. One file for the shared stage, one per gate cluster, so the
// four clusters written in parallel never edit the same catalogue (the he.gates.* rule).
import heStage from '@/messages/he.stage.json'
import heStagePlayers from '@/messages/he.stage.players.json'
import heStageKits from '@/messages/he.stage.kits.json'
import heStagePlay from '@/messages/he.stage.play.json'
import heStageWings from '@/messages/he.stage.wings.json'
import heStagePick from '@/messages/he.stage.pick.json'
import heStageGoal88 from '@/messages/he.stage.goal88.json'
import heStageBlindcow from '@/messages/he.stage.blindcow.json'
import heStageAway from '@/messages/he.stage.away.json'
import heStageWings88 from '@/messages/he.stage.wings88.json'
import heStageConnect from '@/messages/he.stage.connect.json'
import heStageLife89 from '@/messages/he.stage.life89.json'
import heStageAway89 from '@/messages/he.stage.away89.json'
import heStageLife90a from '@/messages/he.stage.life90a.json'
import heStageLife90b from '@/messages/he.stage.life90b.json'
import heStageLife90c from '@/messages/he.stage.life90c.json'
import heStageLife90d from '@/messages/he.stage.life90d.json'
import heStageLife90e from '@/messages/he.stage.life90e.json'
import heStageLife90f from '@/messages/he.stage.life90f.json'
import heStageLife90g from '@/messages/he.stage.life90g.json'
import heStageLife90h from '@/messages/he.stage.life90h.json'
// delta 91 — the supporter's workbench (`craft.*`): one file for one mechanic, so the bench
// and the missions that open it never edit the same catalogue.
import heStageCraft from '@/messages/he.stage.craft.json'
import heStageLife91m from '@/messages/he.stage.life91m.json'
// delta 92 — the story director, the first-mission cues and the pre-match wardrobe
import heStageLife92 from '@/messages/he.stage.life92.json'
import heStageLife98a from '@/messages/he.stage.life98a.json'
// 28.9.2026 — Stage B pass: the note board (`components/life/NoteBoardSheet.tsx`)
import heStageLifeB28 from '@/messages/he.stage.lifeB28.json'
// 28.9.2026 — gate 7 split: הכרטיס שלי / הוויכוח של היציע (`terrace.*`, ONE RED WORLD §16)
import heStageTerrace from '@/messages/he.stage.terrace.json'
// 28.9.2026 — the Red Voice (`lib/voice`, docs/19-red-voice.md): every gate's intro, result
// and micro-feedback lines, and the shared "שלח ליציע". One file, so the voice has one home.
import heVoice from '@/messages/he.voice.json'
// 28.9.2026 — wave 2, gates 7–13: the Cross Gate Router (`router.*`), the LIFE bridge
// (`bridge.*`) and gate 8's key-mismatch words (`goalMiss.*`). One file, so the parallel
// gate agents never append to the same catalogue.
import heStageRouter from '@/messages/he.stage.router.json'
// 28.9.2026 — היום בהפועל and the home "now" layer (`lib/daily`, ONE RED WORLD §7, §55)
import heDaily from '@/messages/he.daily.json'
// 28.9.2026 — Share V2 and the challenge layer (`lib/share`, `lib/challenges`): the
// artefact cards, the invite lines and the comparison (`challenge.*`, `compare.*`, `artefact.*`).
import heShare from '@/messages/he.share.json'
// 28.9.2026 — "היציע שלי" (`lib/stand`, ONE RED WORLD §8, §30–§35): friend stands, the group
// daily, the group debate, the week and the pairs. One file, so the personal-area agent never
// appends to the same catalogue.
import heStand from '@/messages/he.stand.json'
// 28.9.2026 — the personal area: אני / התיק שלי, the memory map, the memories, the public
// identity (`personal.*`, docs/21-personal-area.md). One file, so the area has one home.
import hePersonal from '@/messages/he.personal.json'
// 28.9.2026 — the last ONE RED WORLD pass: LIFE payoffs (§10, §11, §15, §18, §19) and songs in
// context (§3) — `redworld.*`. One file, so this pass never appends to another catalogue.
import heRedWorld from '@/messages/he.stage.redworld.json'

/**
 * Minimal i18n. No dependency: one locale ships today, the shape is ready for more.
 * Swap for next-intl only when a second locale is actually required.
 *
 * **Two files, one catalogue, and the split is about people rather than about code.**
 * Every `life.*` key — the whole of THE WORKER LIFE, 476 strings — lives in
 * `messages/he.life.json`; everything the gates say lives in `messages/he.json`. The
 * merge here is the catalogue, so nothing downstream can tell the difference: `t()` and
 * `MessageKey` cover both files, and a key is still a key wherever it sits.
 *
 * The reason is that this repository is written in two chats at once — the gates in one,
 * LIFE in the other — and a single catalogue file made the one file both of them had to
 * touch. Two deliveries that append a line each to the same tail of the same JSON is a
 * merge conflict every single time, on work that never actually disagreed.
 *
 * **A key belongs to the file that owns its screen, and a duplicate is a build error
 * rather than a silent winner** (`tests/i18n.test.ts`) — because "merged last wins" is
 * exactly the kind of quiet rule that decides a sentence on a screen months later.
 */

/**
 * **ושבעה קבצי שערים — אותה סיבה, בקנה מידה של סבב אחד (21.9.2026).** שדרוג השערים של
 * 21.9 נכתב בכמה ידיים במקביל — אשכול שחקנים, חולצות, אתגרים, שחזור, ארכיון, כרטיס,
 * והשכבה המשותפת — וכל אחד מהם היה מוסיף שורות לאותו זנב של `he.json`. מפתח חדש של
 * שער שודרג נכתב בקובץ של האשכול שלו; מפתח ישן נשאר איפה שהוא (כלל 32 — לא מזיזים,
 * לא ממיינים). הכפילות עדיין שגיאת בנייה, בכל זוג קבצים.
 */
/**
 * **וארבעה קבצים של הארון והשוק (22.9.2026)** — אותה סיבה שוב: מפרט האספנות נבנה בכמה
 * ידיים במקביל. `he.collector.json` הוא הארון ו"יש לי / מחפש", `he.market.json` הוא שוק
 * האדומים והשיחות, `he.auction.json` הוא המכירה הפומבית והניהול, `he.credits.json` הוא
 * עמוד המקורות והקרדיטים — המקום היחיד שבו מקורות מודפסים (מפרט §0.3).
 */
export const CATALOGUE_FILES = {
  he,
  heLife,
  heCore,
  hePlayers,
  heKits,
  heChallenge,
  heReplay,
  heArchive,
  heCard,
  heCollector,
  heMarket,
  heAuction,
  heCredits,
  heStage,
  heStagePlayers,
  heStageKits,
  heStagePlay,
  heStageWings,
  heStagePick,
  heStageGoal88,
  heStageBlindcow,
  heStageAway,
  heStageWings88,
  heStageConnect,
  heStageLife89,
  heStageAway89,
  heStageLife90a,
  heStageLife90b,
  heStageLife90c,
  heStageLife90d,
  heStageLife90e,
  heStageLife90f,
  heStageLife90g,
  heStageLife90h,
  heStageCraft,
  heStageLife91m,
  heStageLife92,
  heStageLife98a,
  heStageLifeB28,
  heStageTerrace,
  heVoice,
  heStageRouter,
  heDaily,
  heShare,
  heStand,
  hePersonal,
  heRedWorld,
} as const

const catalogue = {
  ...he,
  ...heLife,
  ...heCore,
  ...hePlayers,
  ...heKits,
  ...heChallenge,
  ...heReplay,
  ...heArchive,
  ...heCard,
  ...heCollector,
  ...heMarket,
  ...heAuction,
  ...heCredits,
  ...heStage,
  ...heStagePlayers,
  ...heStageKits,
  ...heStagePlay,
  ...heStageWings,
  ...heStagePick,
  ...heStageGoal88,
  ...heStageBlindcow,
  ...heStageAway,
  ...heStageWings88,
  ...heStageConnect,
  ...heStageLife89,
  ...heStageAway89,
  ...heStageLife90a,
  ...heStageLife90b,
  ...heStageLife90c,
  ...heStageLife90d,
  ...heStageLife90e,
  ...heStageLife90f,
  ...heStageLife90g,
  ...heStageLife90h,
  ...heStageCraft,
  ...heStageLife91m,
  ...heStageLife92,
  ...heStageLife98a,
  ...heStageLifeB28,
  ...heStageTerrace,
  ...heVoice,
  ...heStageRouter,
  ...heDaily,
  ...heShare,
  ...heStand,
  ...hePersonal,
  ...heRedWorld,
}

export type MessageKey = keyof typeof catalogue

const messages = catalogue as Record<MessageKey, string>

/** The merged catalogue, for the tests that read the catalogue itself. */
export const MESSAGES: Record<string, string> = catalogue

export function t(key: MessageKey, vars?: Record<string, string>): string {
  const raw = messages[key]
  if (!vars) return raw
  return Object.entries(vars).reduce(
    (out, [name, value]) => out.replaceAll(`{${name}}`, value),
    raw,
  )
}

export const LOCALE = 'he' as const
export const DIRECTION = 'rtl' as const
