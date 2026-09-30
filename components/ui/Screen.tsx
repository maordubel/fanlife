import Link from 'next/link'
import type { ReactNode } from 'react'

import { AdSlot } from '@/components/ads/AdSlot'
import { BuiltByDubel } from '@/components/ui/BuiltByDubel'
import { adsAllowed } from '@/lib/ads'
import { Floodlights } from '@/components/ui/Floodlights'
import { HelpChip } from '@/components/ui/HelpChip'
import { SignPlate } from '@/components/ui/SignPlate'
import { PickFxLayer } from '@/components/stage/PickFx'
import { StageHeader } from '@/components/stage/StageHeader'
import { TabBar } from '@/components/ui/TabBar'
import { SITE_LABEL } from '@/lib/brand'
import { CREDITS_PATH } from '@/lib/credits/groups'
import { t } from '@/lib/i18n'

/**
 * The screen shell.
 *
 * Mobile is full-bleed — no max-width, no side rules — because a bordered card inside a
 * phone viewport reads as a floating panel rather than as the wall. The framed sheet
 * appears from `md` up, where there is room around it.
 *
 * The bottom of the page reserves exactly the height of the fixed tab bar plus the home
 * indicator, so nothing ever sits underneath it.
 */
export function Screen({
  title,
  sub,
  night = false,
  /**
   * A game screen runs `chrome={false}`: no sign plate, no badge, no footer.
   * A masthead is for a page you are reading. During a run the screen belongs to the
   * run — on a 390×844 phone the header and footer were eating a third of the glass,
   * and a third of the glass is the difference between a game and a document with
   * buttons on it.
   */
  chrome = true,
  fullBleed = false,
  /**
   * במת השער (delta 87) — on a phone the gate is ONE screen: a 48px `StageHeader`, the
   * gate's own field filling what is left, and nothing under it (no footer, no ad, no
   * page scroll; secondary content goes into slide sheets). From md up the screen is the
   * desktop design, unchanged. Children fill the stage through `.stage-fill`.
   */
  stage = false,
  /** stage only — what the gate shows in the header's corner (a score, a counter) */
  stageAside,
  children,
}: {
  title: string
  sub: string
  night?: boolean
  chrome?: boolean
  fullBleed?: boolean
  stage?: boolean
  stageAside?: ReactNode
  children: ReactNode
}) {
  return (
    <div className={`min-h-dvh ${night ? 'bg-ink' : ''} ${stage ? 'stage-screen' : ''}`}>
      {/* A full-bleed screen is a game whose picture IS the glass (rule 52): it takes the
          whole window on every width. The 1024px column with its side rules is the
          reading sheet, and on a 1280px laptop it left 130px of ink either side of a room
          — a letterbox on a screen whose one rule is "no letterbox" (delta 91). */}
      <div
        className={`flex min-h-dvh flex-col ${fullBleed ? 'w-full' : 'mx-auto max-w-5xl md:border-x-rule md:border-ink'} ${
          night ? 'bg-ink' : ''
        } ${stage ? 'max-md:h-full max-md:min-h-0' : ''}`}
      >
        <main
          id="main"
          className={`relative flex-1 ${
            fullBleed
              ? 'p-0'
              : stage
                ? `stage-main px-3 pt-1 md:px-gutter md:pb-stack ${chrome ? 'md:pt-10' : 'md:pt-2'}`
                : `px-gutter pb-stack ${chrome ? 'pt-5 md:pt-10' : 'pt-2'}`
          }`}
        >
          <PickFxLayer />
          {/* The lights come on over a night screen. On a paper screen the sun is
              already up and there is nothing to switch on. */}
          {night && <Floodlights />}
          {chrome && stage ? (
            <>
              <div className="md:hidden">
                <StageHeader title={title} sub={sub} aside={stageAside} night={night} />
              </div>
              <div className="hidden md:block">
                <SignPlate title={title} sub={sub} />
                <HelpChip />
              </div>
            </>
          ) : chrome ? (
            <>
              <SignPlate title={title} sub={sub} />
              {/* The "?" — one per gate, described in lib/help.ts. It renders only
                  here, so it only ever appears where `chrome` is on; see the long
                  comment in HelpChip.tsx for why that split is deliberate rather than
                  an oversight (rule 21/28: the glass belongs to the run). */}
              <HelpChip />
            </>
          ) : (
            <h1 className="sr-only">{title}</h1>
          )}
          {stage ? <div className="stage-fill">{children}</div> : children}
        </main>

        {/*
          Ads appear only where `chrome` is on — that is, on the pages a person reads
          rather than plays. `adsAllowed()` is the single place that decision lives, so
          a screen cannot quietly opt itself in.
        */}
        {adsAllowed(chrome) && (
          <div className={`px-gutter ${stage ? 'max-md:hidden' : ''}`}>
            <AdSlot placement="reading" />
          </div>
        )}

        {/*
          פס הקרדיט — the strip at the foot of the ground.

          It used to be one grey line of metadata with the build credit beside it at the
          same weight, which said nothing about what this is or who made it. It is now
          the colophon of a printed sheet: the name in the poster face, the club and the
          address under it, a vermilion rule across the top, and the build credit on its
          own line at the bottom with the emblem. Three tiers instead of one.
        */}
        {chrome && (
        <footer className={`mt-stack bg-ink px-gutter pb-6 pt-5 ${stage ? 'max-md:hidden' : ''}`}>
          <div className="h-[6px] w-full bg-red" aria-hidden="true" />
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="font-poster text-[30px] leading-none text-paper" dir="ltr">
                THE WORKER
              </p>
              <p className="mt-1.5 font-body text-[12px] leading-snug text-concrete">
                <bdi>{t('brand.sub')}</bdi>
              </p>
              <p className="mt-0.5 font-latin text-[10px] font-bold tracking-[0.16em] text-red" dir="ltr">
                {SITE_LABEL.toUpperCase()}
              </p>
              {/* המקורות — the one place every source and credit is printed (spec §0.3,
                  22.9.2026). It sits with the colophon, not with the build credit:
                  whose facts these are and who built the page are two different claims. */}
              <Link
                href={CREDITS_PATH}
                prefetch={false}
                className="mt-2 inline-flex min-h-tap items-center font-body text-[12px] font-bold text-paper underline decoration-red decoration-2 underline-offset-4"
                data-footer-credits=""
              >
                {t('footer.credits')}
              </Link>
            </div>
            <div className="flex flex-col items-start gap-2 border-t-hair border-concrete/30 pt-3 md:items-end md:border-t-0 md:pt-0">
              <BuiltByDubel />
              {/* כל הזכויות שמורות — the orphaned key, printed under the credit rather
                  than beside it: a copyright line and a build credit are two different
                  claims, and stacking them keeps BuiltByDubel's own row exactly as it
                  was rather than crowding a second line into it. */}
              <p className="font-body text-[10px] tracking-wide text-concrete/70">
                <bdi>{t('footer.rights')}</bdi>
              </p>
            </div>
          </div>
        </footer>
        )}

        {!fullBleed && (
          /* Space for the fixed bar + the iOS home indicator. */
          <div
            aria-hidden="true"
            className={`h-[calc(var(--tap)+1.25rem+env(safe-area-inset-bottom))] ${stage ? 'max-md:hidden' : ''}`}
          />
        )}
      </div>

      {!fullBleed && <TabBar />}
    </div>
  )
}
