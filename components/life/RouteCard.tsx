'use client'

import { t } from '@/lib/i18n'
import { evidenceTitleHe } from '@/lib/life/content/routes'
import { artUrl, EMBLEM_OF_ROUTE } from '@/lib/life/runtime/art'
import {
  ROUTE_STAGES,
  routeById,
  tierOf,
  type RouteGap,
  type RouteId,
  type RouteInvitation,
  type RouteStage,
} from '@/lib/life/routes'

/**
 * כרטיס המסלול — הזמנה, לא קידום.
 *
 * Three decisions are baked into this card and each one is a sentence from the life spec
 * rather than a taste in layout.
 *
 * **אין מספר אחד.** No percentage, no bar, no total. The spec forbids *"ציון יחיד שמגדיר
 * מי אוהד ראוי"* and this is the screen that would grow one first: a route with a
 * threshold is a progress bar waiting to happen, and a progress bar is an instruction to
 * optimise. So a capability is printed as a WORD on a five-step ladder
 * (`life.route.near.*`) and only the things that are genuinely countable — missions,
 * people, works, commitments — are printed as counts, the way the album prints a page.
 * `ProfileCard` made the same decision about the Red Heart first and it was right there
 * too.
 *
 * **תמיד יש "לא עכשיו".** The refusal is not a secondary button and it costs nothing:
 * `declineEvents` writes no flag, so the offer can come back and the same conversation
 * can be walked into again. A card whose only exit is "accept" is a promotion with a
 * confirmation dialogue on it.
 *
 * **שלב אחד בכל פעם.** The card can only ever show one, because the model only ever
 * hands back one (`nextStage`). *"אין קפיצה אוטומטית דרך שלוש כותרות באותו טוסט"* is
 * therefore not something this component has to remember to do — it could not do
 * otherwise if it tried, which is where that rule belongs.
 *
 * Every word it prints comes from the content layer or from the model. The chrome reads
 * through `t()` like every other screen — the `life.route.*` keys live in
 * `messages/he.life.json`, and the staging shim they were written against is gone.
 */

/** how far off, in five words — never in a figure */
function nearnessKey(have: number, want: number) {
  if (want <= 0) return 'life.route.near.touching'
  const left = Math.max(0, want - have)
  const share = left / want
  if (share <= 0.1) return 'life.route.near.touching'
  if (share <= 0.3) return 'life.route.near.close'
  if (share <= 0.6) return 'life.route.near.someWay'
  if (share <= 0.85) return 'life.route.near.far'
  return 'life.route.near.veryFar'
}

/**
 * One gap, as a person would say it.
 *
 * The distinction that matters: a COUNT of things done is printed ("two of four"),
 * because those are discrete events in a life and a person counts them the same way. A
 * capability or a standing is never printed, because those are the numbers this game has
 * spent three passes refusing to show.
 */
function gapLine(gap: RouteGap): string {
/**
 * שני מפתחות דינמיים, ושתי טבלאות שמחזירות אותם לבדיקת טיפוסים.
 *
 * `t()` is typed `keyof typeof he`, so a key built by interpolation is a `string` and
 * TypeScript can say nothing about it — which is exactly the hole rule 32 exists in.
 * A `Record` keyed on the union makes the compiler do the work instead: add a capability
 * or an audience to `routes.ts` and this file stops compiling until its word exists.
 */
const CAPABILITY_KEY = {
  organization: 'life.route.capability.organization',
  communication: 'life.route.capability.communication',
  business: 'life.route.capability.business',
  creativity: 'life.route.capability.creativity',
  streetSmarts: 'life.route.capability.streetSmarts',
  knowledge: 'life.route.capability.knowledge',
} as const

const AUDIENCE_KEY = {
  gate7: 'life.route.audience.gate7',
  gate5: 'life.route.audience.gate5',
  ussishkin: 'life.route.audience.ussishkin',
  public: 'life.route.audience.public',
  work: 'life.route.audience.work',
  international: 'life.route.audience.international',
} as const

  switch (gap.kind) {
    case 'ladder':
      return t('life.route.gap.ladder')
    case 'age':
      return t('life.route.gap.age')
    case 'capability':
    case 'alsoCapability': {
      const what = t(CAPABILITY_KEY[gap.capability ?? 'organization'])
      const near = t(nearnessKey(gap.have, gap.want))
      const key = gap.kind === 'capability' ? 'life.route.gap.capability' : 'life.route.gap.alsoCapability'
      return `${t(key, { what })} · ${near}`
    }
    case 'audience': {
      const who = t(AUDIENCE_KEY[gap.audience ?? 'public'])
      return `${t('life.route.gap.audience', { who })} · ${t(nearnessKey(gap.have, gap.want))}`
    }
    case 'proofs':
      return t('life.route.gap.proofs', { have: String(gap.have), want: String(gap.want) })
    case 'chapters':
      return t('life.route.gap.chapters')
    /**
     * הראיה החסרה, בשמה.
     *
     * `missingKinds` היה על האובייקט מההתחלה והכרטיס זרק אותו: אדם ששני אחר־צהריים
     * מכניסת העיתונאי קיבל בדיוק את אותה שורה כמו אדם שחמישה, ובאותן מילים. השם נלקח
     * מהתוכן שמייצר את הראיה (`evidenceTitleHe`) ולא מטבלת תרגום שנייה, ולכן ראיה
     * שתיכתב מחר תקבל את שמה כאן בלי שורה נוספת.
     *
     * זה עדיין אינו מספר ואינו מפה: **מה** ולא **איפה**. המדף בקיוסק והמחברת על המיטה
     * נמצאים בעולם ומוצאים אותם בהליכה, וכרטיס שהיה מציין את החדר היה הופך את המסלולים
     * לרשימת משימות — בדיוק מה שהם נכתבו לא להיות.
     */
    case 'evidence': {
      const named = (gap.missingKinds ?? [])
        .map((kind) => evidenceTitleHe(kind))
        .filter((title): title is string => title !== null)
      if (named.length === 0) return t('life.route.gap.evidence')
      return t('life.route.gap.evidenceNamed', { what: named.join(' · ') })
    }
    case 'people':
      return t('life.route.gap.people', { have: String(gap.have), want: String(gap.want) })
    case 'subjects':
      return t('life.route.gap.subjects')
    case 'debt':
      return t('life.route.gap.debt')
    case 'works':
      return t('life.route.gap.works', { have: String(gap.have), want: String(gap.want) })
    case 'journeys':
      return t('life.route.gap.journeys')
    case 'founding':
      return t('life.route.gap.founding', { have: String(gap.have), want: String(gap.want) })
    case 'window':
      return t('life.route.gap.window')
    default:
      return t('life.route.missing')
  }
}

export function RouteCard({
  routeId,
  stage,
  invitation,
  gaps,
  outOfReach = false,
  onAccept,
  onDecline,
  onClose,
}: {
  routeId: RouteId
  stage: RouteStage
  /** present when he qualifies — the card is then an offer rather than an explanation */
  invitation: RouteInvitation | null
  gaps: readonly RouteGap[]
  /** the chapter this stage would be possible in does not exist yet (rule 66) */
  outOfReach?: boolean
  onAccept: () => void
  onDecline: () => void
  onClose: () => void
}) {
  const route = routeById(routeId)
  const index = ROUTE_STAGES.indexOf(stage)
  const routeArt = route ? EMBLEM_OF_ROUTE[route.id] : undefined
  const titleHe = invitation?.titleHe ?? route?.stageTitlesHe[stage] ?? ''
  const rewardHe = invitation?.rewardHe ?? route?.rewardsHe[index] ?? ''
  const offering = invitation !== null
  /**
   * הדרגה — where this life sits in Maor's own ordering, and the blank that stays blank.
   *
   * `tierOf` answers `null` for a route he has not placed, which today is `CREATOR` and
   * exactly `CREATOR`. The card says so (`life.route.tier.unplaced`) instead of hiding the
   * line or picking a rung: a difficulty ordering with a made-up entry in it is worse than
   * one with a gap, because the gap asks him a question and the invention answers it for
   * him. Printed as his WORD for the rung and never as a position — "one of six" is a
   * ranking, and a ranking on this card is the single score the whole screen refuses.
   */
  const tier = tierOf(routeId)

  return (
    // z-[60], because rule 33 is not a z-index preference: the tab bar is z-50 and a card
    // under it puts "לא עכשיו" inside a strip whose tap navigates away from the game.
    <div
      className="pointer-events-auto absolute inset-0 z-[60] flex items-center justify-center bg-ink/85 p-gutter"
      role="dialog"
      aria-modal="true"
      data-life="route"
    >
      <div className="max-h-full w-full max-w-md animate-paste-in overflow-y-auto border-rule border-sheet bg-ink">
        <div className="px-5 pb-5 pt-6">
          <div className="h-[6px] w-16 bg-red" aria-hidden="true" />

          <p className="mt-3 font-body text-[11px] uppercase tracking-wide text-concrete">
            <bdi>
              {offering ? t('life.route.offer') : t('life.route.missing')} ·{' '}
              {t(`life.route.stage.${stage}`)}
            </bdi>
          </p>

          <div className="mt-1 flex items-start gap-3">
            {/*
              סמל המסלול — ליד הכותרת, לא במקומה.
              `EMBLEM_OF_ROUTE` חלקית בכוונה, וכרטיס בלי סמל נראה בדיוק כמו קודם.
            */}
            {routeArt && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={artUrl(routeArt)}
                alt=""
                aria-hidden="true"
                data-life="route-emblem"
                className="mt-0.5 h-[38px] w-[38px] shrink-0 object-contain"
              />
            )}
            <div className="min-w-0">
              <h2 className="font-display text-step-3 leading-tight text-sheet">
                <bdi>{titleHe}</bdi>
              </h2>
              {route && (
                <p className="mt-1 font-sign text-[13px] leading-snug text-concrete">
                  <bdi>{route.titleHe}</bdi>
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 border-t-hair border-concrete/30 pt-3">
            <p className="font-body text-[11px] text-concrete">
              <bdi>{t('life.route.tier')}</bdi>
            </p>
            <p className="mt-1 font-body text-[14px] leading-relaxed text-sheet">
              <bdi>{tier ? tier.nameHe : t('life.route.tier.unplaced')}</bdi>
            </p>
          </div>

          {rewardHe && (
            <div className="mt-4 border-t-hair border-concrete/30 pt-3">
              <p className="font-body text-[11px] text-concrete">
                <bdi>{t('life.route.reward')}</bdi>
              </p>
              <p className="mt-1 font-body text-[15px] leading-relaxed text-sheet">
                <bdi>{rewardHe}</bdi>
              </p>
            </div>
          )}

          {/* The apex's one clause no counter decides: somebody says it out loud. */}
          {invitation?.explicitChoiceHe && (
            <div className="mt-4 border-t-hair border-concrete/30 pt-3">
              <p className="font-body text-[11px] text-concrete">
                <bdi>{t('life.route.choice')}</bdi>
              </p>
              <p className="mt-1 font-body text-[14px] leading-relaxed text-sheet">
                <bdi>{invitation.explicitChoiceHe}</bdi>
              </p>
            </div>
          )}

          {gaps.length > 0 && (
            <ul className="mt-4 space-y-1.5 border-t-hair border-concrete/30 pt-3">
              {gaps.map((gap, position) => (
                <li
                  key={`${gap.kind}-${gap.capability ?? gap.audience ?? position}`}
                  // The first gap is the one a person would lead with — "you are nineteen"
                  // beats "your organisation is fourteen" every time — so it is printed
                  // large and the rest sit under it.
                  className={
                    position === 0
                      ? 'font-body text-[15px] leading-relaxed text-sheet'
                      : 'font-body text-[13px] leading-relaxed text-concrete'
                  }
                >
                  <bdi>{gapLine(gap)}</bdi>
                </li>
              ))}
            </ul>
          )}

          {/*
            רול 66 על המסך. A stage whose minimum age is above the last chapter that
            exists is not broken and is not hidden: it is named, here, in the one place a
            player could otherwise spend a decade climbing towards nothing.
          */}
          {outOfReach && (
            <p className="mt-4 border-t-hair border-concrete/30 pt-3 font-body text-[13px] leading-relaxed text-concrete">
              <bdi>{t('life.route.outOfReach')}</bdi>
            </p>
          )}

          <div className="mt-5 flex gap-2">
            {offering ? (
              <>
                <button
                  type="button"
                  onClick={onAccept}
                  className="flex min-h-tap flex-1 items-center justify-center border-rule border-sheet bg-red px-4 transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none"
                >
                  <span className="font-display text-[15px] text-sheet">{t('life.route.accept')}</span>
                </button>
                {/*
                  Same height, same weight, no apology. The spec: *"הגעה לסף יוצרת הזמנה
                  שניתן לדחות"* — a refusal drawn as a link under a red button is not one
                  that can really be taken.
                */}
                <button
                  type="button"
                  onClick={onDecline}
                  className="flex min-h-tap flex-1 items-center justify-center border-rule border-sheet px-4 transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none"
                >
                  <span className="font-display text-[15px] text-sheet">{t('life.route.decline')}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="flex min-h-tap w-full items-center justify-center border-rule border-sheet px-4 transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none"
              >
                <span className="font-display text-[15px] text-sheet">{t('life.route.close')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
