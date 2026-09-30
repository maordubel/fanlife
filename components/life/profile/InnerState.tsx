'use client'

import { t } from '@/lib/i18n'
import { EMBLEM_OF_SKILL, artUrl } from '@/lib/life/runtime/art'
import type { LifeProfile, SkillReading } from '@/lib/life/profile'

import css from './personal.module.css'

/**
 * מה עובר עליי — how he is, what he is like, what he can do, and what this afternoon held.
 *
 * The four sections that used to be the bottom half of the old "אני" leaf, kept word for
 * word (`profile.ts` still says every one of them), and moved one tap in so the overview
 * can be an overview. Words, never figures (rule 46): a skill is an emblem and a word, a
 * state is a sentence, the day is two lists.
 */

function Part({ titleHe, children, delay }: { titleHe: string; children: React.ReactNode; delay: number }) {
  return (
    <section className={`${css.drawer} border-t-hair border-concrete/25 pt-3`} style={{ animationDelay: `${delay}ms` }}>
      <h3 className="font-mono tabular-nums text-[10px] uppercase tracking-[0.18em] text-concrete">
        <bdi>{titleHe}</bdi>
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  )
}

export function InnerState({ profile, skills, taken, missed }: { profile: LifeProfile; skills: SkillReading[]; taken: string[]; missed: string[] }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(16px,env(safe-area-inset-bottom))] md:px-6" data-life="me-inner">
      <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-x-8">
        <Part titleHe={t('life.profile.state')} delay={0}>
          <p className="font-display text-[17px] leading-snug text-sheet">
            <bdi>{profile.wellbeing.length > 0 ? profile.wellbeing.join(' · ') : t('life.profile.none')}</bdi>
          </p>
        </Part>
        <Part titleHe={t('life.profile.who')} delay={60}>
          <p className="font-body text-[14px] leading-relaxed text-sheet">
            <bdi>{profile.personality.length > 0 ? profile.personality.join(' · ') : t('life.profile.whoNone')}</bdi>
          </p>
        </Part>
        <Part titleHe={t('life90h.me.love')} delay={120}>
          <p className="font-body text-[13px] leading-relaxed text-sheet">
            <bdi>{profile.pureLove.readingHe}</bdi>
          </p>
          {profile.pureLove.evidenceHe.length > 0 ? (
            <p className="mt-1 font-mono tabular-nums text-[10px] leading-relaxed text-concrete">
              <bdi>{profile.pureLove.evidenceHe.join(' · ')}</bdi>
            </p>
          ) : null}
        </Part>
        <Part titleHe={t('life.profile.skills')} delay={180}>
          {skills.length === 0 ? (
            <p className="font-body text-[13px] leading-relaxed text-concrete">
              <bdi>{t('life.profile.skillsNone')}</bdi>
            </p>
          ) : (
            <div className="divide-y divide-concrete/15" data-life="profile-skills">
              {skills.map((skill) => (
                <div key={skill.id} className="flex items-center gap-2.5 py-1.5">
                  {EMBLEM_OF_SKILL[skill.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={artUrl(EMBLEM_OF_SKILL[skill.id]!)} alt="" aria-hidden="true" className="h-[22px] w-[22px] shrink-0 object-contain" />
                  ) : (
                    <span aria-hidden="true" className="h-[22px] w-[22px] shrink-0" />
                  )}
                  <p className="min-w-0 flex-1 font-display text-[14px] leading-none text-sheet">
                    <bdi>{skill.nameHe}</bdi>
                  </p>
                  <p className="font-body text-[11px] leading-none text-concrete">
                    <bdi>{skill.readingHe}</bdi>
                  </p>
                </div>
              ))}
            </div>
          )}
        </Part>
        <Part titleHe={t('life.profile.day')} delay={240}>
          <dl className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2">
              <dt className="shrink-0 font-mono tabular-nums text-[10px] text-concrete">{t('life.profile.taken')}</dt>
              <dd className="font-body text-[13px] leading-snug text-sheet">
                <bdi>{taken.length > 0 ? taken.join(' · ') : t('life.profile.none')}</bdi>
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="shrink-0 font-mono tabular-nums text-[10px] text-concrete">{t('life.profile.missed')}</dt>
              <dd className="font-body text-[13px] leading-snug text-red">
                <bdi>{missed.length > 0 ? missed.join(' · ') : t('life.profile.none')}</bdi>
              </dd>
            </div>
          </dl>
        </Part>
      </div>
    </div>
  )
}
