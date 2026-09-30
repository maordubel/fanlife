'use client'

import { useDialog } from '@/components/ui/useDialog'
import { t } from '@/lib/i18n'
import { adDirector, adsEnabled, adsTestMode } from '@/lib/life/monetization'
import type { LifeRuntime, LifeSnapshot } from '@/lib/life/runtime/game'
import { formatMoney } from '@/lib/life/money'
import { conflictsOf, HISTORY_DAYS } from '@/lib/life/history'
import { direct } from '@/lib/life/story'

/**
 * לוח הפיתוח — the one screen allowed to show numbers, and it never ships.
 *
 * Rule 44 of the systems pass: developer-only, never in production. That is enforced by
 * the CALLER (`app/life/LifeStage.tsx` renders it only outside a production build), not
 * by a flag somebody can flip, because a debug panel behind a runtime toggle is a debug
 * panel that eventually gets toggled on by a query string.
 *
 * Everything it can DO goes through `runtime.debug`, which dispatches real events — so a
 * life that has been poked at is still a valid log, still reloads, and a bug reproduced
 * by jumping the clock is a bug that can be saved and sent to somebody.
 *
 * It is deliberately ugly. This is not a screen anybody should be tempted to keep.
 */

const PLACES = [
  'bedroom',
  'home',
  'kitchen',
  'street',
  'kiosk',
  'pitch',
  'route',
  'bloomfield-outside',
  'bloomfield-inside',
]

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t-hair border-concrete/20 py-1.5">
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-concrete">{label}</p>
      <div className="mt-1 font-mono text-[10px] leading-snug tabular-nums text-sheet">{children}</div>
    </div>
  )
}

function numbers(record: Record<string, number>): string {
  return Object.entries(record)
    .map(([key, value]) => `${key}=${Math.round(value)}`)
    .join('  ')
}

export function DebugPanel({
  snapshot,
  runtime,
  onClose,
}: {
  snapshot: LifeSnapshot
  runtime: LifeRuntime | null
  onClose: () => void
}) {
  const { state } = snapshot

  /** which documented day, if any, this chapter is — see `lib/life/history` */
  const historyOf = (chapter: string) =>
    chapter === '1990' ? HISTORY_DAYS['1990-05-12'] : chapter === '1998-laces' ? HISTORY_DAYS['1998-05-02'] : null

  const dialogRef = useDialog<HTMLDivElement>(onClose)

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      className="pointer-events-auto absolute inset-0 z-[60] flex items-stretch justify-center bg-ink/95 p-gutter outline-none"
      aria-modal="true"
      aria-label={t('life.debug.title')}
    >
      <div className="max-h-full w-full max-w-lg overflow-y-auto border-rule border-red bg-ink p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-mono text-[12px] uppercase tracking-[0.2em] text-red">
            {t('life.debug.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-tap items-center border-hair border-concrete/50 px-3 font-body text-[11px] text-sheet"
          >
            {t('life.debug.close')}
          </button>
        </div>

        {/*
          MONETIZATION — the plan (§18) asks for a panel that says why an ad did or did not
          happen. Everything here is read from the director's own session, so a placement
          that "should have fired" can be argued with rather than guessed at. Development
          only: this whole panel is behind the probe flag.
        */}
        <Row label="MONETIZATION">
          {(() => {
            const ads = adDirector().state()
            return `provider=${ads.provider}  enabled=${adsEnabled() ? '1' : '0'}  test=${adsTestMode() ? '1' : '0'}  lock=${ads.locked ? '1' : '0'}  shown=${ads.interstitials}/${ads.config.maxInterstitialsPerSession}  played=${Math.round(ads.playedSinceAd)}  last=${ads.lastResult ?? '—'}  point=${ads.lastSafePoint ?? '—'}`
          })()}
        </Row>
        {/*
          ההיסטוריה — what the archive holds about the day this chapter is, and what it
          refuses to hold. The conflicts line is the important one: it is the count of
          places where two sources disagree and the game has stored both instead of
          picking, which is the whole discipline in one number.
        */}
        {historyOf(state.chapter) ? (
          <Row label="HISTORY">
            {(() => {
              const day = historyOf(state.chapter)
              if (!day) return ''
              const venues = day.venues.map((v) => `${v.nameHe}=${v.finalHe ?? '—'}`).join('  ')
              return `${day.dateHe}  ${venues}  conflicts=${conflictsOf(day).length}  silence: ${day.silenceHe}`
            })()}
          </Row>
        ) : null}
        {/*
          STORY — מי מוביל את הרגע, מה הכוונה, ובאיזו דרגת הדרכה אנחנו. זאת השורה שעונה על
          השאלה של מאור — "אני יודע מה לעשות רק כי אני מכיר את התסריט" — כי היא מראה בדיוק
          מה המשחק חושב שהוא מבקש עכשיו.
        */}
        <Row label="STORY">
          {(() => {
            const story = direct({ state, chapter: state.chapter, quietFor: 0, busy: false })
            return `intent=${story.intent?.id ?? '—'}  control=${story.control}  lead=${story.leadHe ?? '—'}  guidance=${story.guidance}  now="${story.nowHe ?? '—'}"`
          })()}
        </Row>
        <Row label="CHECKPOINT">
          {(() => {
            const mark = snapshot.checkpoint
            if (!mark) return 'none open'
            return `${mark.chapter} @ ${mark.snapshot.clock}'  fired=${mark.snapshot.fired.length}  known=${mark.snapshot.known.length}  log=${mark.logLength}`
          })()}
        </Row>
        <Row label={t('life.debug.clock')}>
          {state.weekday} · {String(Math.floor(state.minute / 60)).padStart(2, '0')}:
          {String(state.minute % 60).padStart(2, '0')} · {state.location} · {state.chapter}
        </Row>
        <Row label={t('life.debug.seed')}>
          {state.rng.seed} @ {state.rng.cursor} · {t('life.debug.events')} {snapshot.events}
        </Row>
        <Row label={t('life.debug.resources')}>
          money={formatMoney(state.agorot)} energy={Math.round(state.energy)}{' '}
          {Object.entries(state.inventory)
            .map(([key, value]) => `${key}×${value}`)
            .join(' ')}
        </Row>
        <Row label={t('life.debug.wellbeing')}>{numbers(state.wellbeing)}</Row>
        <Row label={t('life.debug.personality')}>{numbers(state.personality)}</Row>
        <Row label={t('life.debug.heart')}>{numbers(state.redHeart)}</Row>
        <Row label={t('life.debug.relationships')}>
          {Object.entries(state.relationships)
            .map(
              ([who, rel]) =>
                `${who}: b${Math.round(rel.bond)} t${Math.round(rel.trust)} x${Math.round(rel.tension)} d${Math.round(rel.distance)}`,
            )
            .join('   ')}
        </Row>
        <Row label={t('life.debug.memories')}>
          {state.relationshipMemory.map((entry) => `${entry.characterId}/${entry.eventId}`).join('  ') || '—'}
        </Row>
        <Row label={t('life.debug.windows')}>
          {state.opportunities.map((entry) => `${entry.id}:${entry.status}`).join('  ') || '—'}
        </Row>
        <Row label={t('life.debug.flags')}>
          {Object.keys(state.flags).join('  ') || '—'}
        </Row>

        <div className="mt-3 flex flex-wrap gap-1.5 border-t-hair border-red/40 pt-3">
          {[15, 60, 180].map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => runtime?.debug.jump(minutes)}
              className="border-hair border-concrete/50 px-2 py-1 font-mono text-[10px] text-sheet"
            >
              +{minutes}m
            </button>
          ))}
          <button
            type="button"
            onClick={() => runtime?.debug.money(200)}
            className="border-hair border-concrete/50 px-2 py-1 font-mono text-[10px] text-sheet"
          >
            +200a
          </button>
          <button
            type="button"
            onClick={() => runtime?.debug.energy(50)}
            className="border-hair border-concrete/50 px-2 py-1 font-mono text-[10px] text-sheet"
          >
            +50e
          </button>
          <button
            type="button"
            onClick={() => runtime?.debug.reseed(`dev-${Math.floor(Math.random() * 9999)}`)}
            className="border-hair border-concrete/50 px-2 py-1 font-mono text-[10px] text-sheet"
          >
            reseed
          </button>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {PLACES.map((place) => (
            <button
              key={place}
              type="button"
              onClick={() => {
                runtime?.debug.goTo(place)
                onClose()
              }}
              className="border-hair border-concrete/50 px-2 py-1 font-mono text-[10px] text-sheet"
            >
              {place}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
