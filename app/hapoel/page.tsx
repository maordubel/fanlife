import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { PlayerFinder } from './PlayerFinder'
import { PlayerCensus } from '@/components/club/PlayerCensus'
import { playerCensus } from '@/lib/club/census'
import { archiveHref } from '@/lib/links'
import { todayInIsrael } from '@/lib/date/israel'
import { Num } from '@/components/ui/Num'
import { ReportLink } from '@/components/ui/ReportLink'
import { Screen } from '@/components/ui/Screen'
import { GATES, isOpen } from '@/lib/gates'
import { clubCounts, crestStages, honours, players, songbook } from '@/lib/club/wing'
import { t, type MessageKey } from '@/lib/i18n'
import { gateMetadata } from '@/lib/seo'

/**
 * ה-פועל — the club's own wing, and the third tab.
 *
 * Maor set the bottom bar as בלומפילד · אוסישקין · ה-פועל · המנוי שלך, and only three of
 * those existed. The ground is the gate plan, the hall is the memorial — and the CLUB
 * had no page at all. The 15.9.2026 audit named the same gap from the other end: the
 * archive is 1,604 sourced rows and the only way in was through a quiz.
 *
 * So this is the club, read rather than played, in four sections that answer the four
 * things a supporter asks:
 *
 *   · **הארון** — what we won, counted out of `trophies.json`, competition by
 *     competition, with the seasons printed rather than summarised. A runners-up line
 *     under each, because the finals we lost are part of the same record.
 *   · **הסמל** — nine documented stages of the badge, with Maor's own artwork where a
 *     variant exists and nothing at all where one does not. Rule 25: print it or leave
 *     the slot empty; a club crest is not a thing to approximate.
 *   · **השירים** — the terrace songs and the player songs, by title, tune and subject.
 *     No verse is printed anywhere (rule 12).
 *   · **השחקנים** — all 637, with the position/origin/decade filters Maor asked for,
 *     and an honest count of how few of them the archive can actually place.
 *
 * It ends by pointing at the gates, because the whole point of a front door is that it
 * leads somewhere: everything above is also something you can play.
 */

export const metadata: Metadata = gateMetadata('hapoel')

/** the exhibit of the day turns over at midnight in Tel Aviv, not in UTC */

function HallBar({ n, id, title, latin }: { n: number; id: string; title: string; latin: string }) {
  return (
    <div className="flex items-stretch border-rule border-ink bg-red text-paper">
      <span className="flex w-11 shrink-0 items-center justify-center bg-ink font-poster text-[26px] leading-none text-paper" aria-hidden="true">
        <Num>{n}</Num>
      </span>
      <h2 id={id} className="min-w-0 flex-1 px-3 py-2 font-display text-[22px] leading-tight">
        {title}
      </h2>
      <p className="flex shrink-0 items-center px-3 font-latin text-[9px] font-bold tracking-[0.24em] text-paper/85" dir="ltr">
        {latin}
      </p>
    </div>
  )
}

/** Which gates are about the club itself — the ones this page hands you on to. */
const PLAYABLE = ['/trivia', '/timeline', '/xi', '/kits', '/goal']

const HALLS = [
  { id: 'club-honours', key: 'hapoel.honours' as MessageKey },
  { id: 'club-badge', key: 'hapoel.crests' as MessageKey },
  { id: 'club-songs', key: 'hapoel.songs' as MessageKey },
  { id: 'club-players', key: 'hapoel.players' as MessageKey },
  { id: 'club-gates', key: 'hapoel.gates' as MessageKey },
]

const DOORS = ['players', 'honours', 'crest', 'songs'] as const
type Door = (typeof DOORS)[number]

export default function HapoelPage({ searchParams }: { searchParams?: { door?: string } }) {
  const door: Door | null = DOORS.find((d) => d === searchParams?.door) ?? null
  // each shelf leads to its newest cup in the archive — only where the graph resolves it
  const cupboard = honours().map((line) => {
    const newest = line.won.at(-1)
    return { ...line, href: newest ? archiveHref(`trophy:${line.slug}:${newest}`) : null }
  })
  const crests = crestStages()
  const songs = songbook()
  const roster = players()
  const counts = clubCounts()
  const census = playerCensus()
  // the exhibit of the day: one dated man, chosen by the Israeli calendar day — the same all day
  const dated = roster.all.filter((row) => row.fromYear !== null && row.fromYear !== undefined)
  const day = Math.floor(Date.parse(`${todayInIsrael()}T00:00:00Z`) / 86_400_000)
  const pick = dated.length > 0 ? dated[day % dated.length] : undefined
  const featuredHref = pick ? (archiveHref(pick.id) ?? archiveHref(pick.slug)) : null
  const featured =
    pick && featuredHref
      ? {
          name: pick.nameHe,
          href: featuredHref,
          years: pick.toYear && pick.toYear !== pick.fromYear ? `${pick.fromYear}—${pick.toYear}` : String(pick.fromYear),
        }
      : null
  // A gate with no route is not in this row at all: this is a list of places to go,
  // and gate 9 is on the wall precisely because it is not one yet.
  const gates = GATES.filter(isOpen).filter((gate) => PLAYABLE.includes(gate.href.split('?')[0] ?? ''))

  return (
    <Screen title={t('screen.hapoel.title')} sub={t('screen.hapoel.sub')}>
      {/* the museum's door: what this is, then the number that opens it */}
      <p className="mt-stack max-w-prose font-body text-step-0 leading-relaxed text-ink">
        {t('hapoel.lede')}
      </p>

      {door === null && <div className="mt-3">
        <PlayerCensus census={census} />
      </div>}

      {/* the four other numbers, all counted — plaques under the big one */}
      {door === null && <dl className="mt-2 grid grid-cols-4 border-rule border-ink">
        {[
          { k: 'hapoel.count.trophies' as MessageKey, v: counts.trophies },
          { k: 'hapoel.count.kits' as MessageKey, v: counts.kits },
          { k: 'hapoel.count.songs' as MessageKey, v: counts.songs },
          { k: 'hapoel.count.crests' as MessageKey, v: crests.length },
        ].map((stat, index) => (
          <div key={stat.k} className={`bg-sheet px-2 py-2.5 ${index > 0 ? 'border-s-hair border-ink/25' : ''}`}>
            <dd className="font-poster text-[24px] leading-none text-red">
              <Num>{stat.v}</Num>
            </dd>
            <dt className="mt-1 font-body text-[10.5px] leading-tight text-muted">{t(stat.k)}</dt>
          </div>
        ))}
      </dl>}

      {/* the front door: four doors, each with a small look inside, and the archive as the main one */}
      {door === null && (
        <>
          <Link href="/archive" className="mt-3 flex min-h-tap flex-col justify-center border-rule border-ink bg-ink px-3 py-3 text-paper">
            <span className="font-body text-[11px] font-extrabold tracking-[0.1em] text-concrete">{t('hapoel.archiveDoor.kicker')}</span>
            <span className="mt-0.5 font-display text-[24px] leading-tight">{t('hapoel.archiveDoor')}</span>
            <span className="mt-1 font-body text-[13px] font-extrabold text-paper">{t('hapoel.archiveDoor.go')} ←</span>
          </Link>
          <nav aria-label={t('hapoel.halls')} className="mt-2">
            <ul className="grid grid-cols-2 gap-2">
              {DOORS.map((d) => (
                <li key={d}>
                  <Link href={`/hapoel?door=${d}`} data-hapoel-door={d} className="flex h-full min-h-tap flex-col border-rule border-ink bg-sheet p-3">
                    <span className="font-display text-[20px] leading-tight text-ink">{t(`hapoel.door.${d}` as MessageKey)}</span>
                    <span className="mt-1 font-body text-[12px] leading-snug text-muted">
                      {d === 'players' && <>{t('hapoel.preview.players', { n: String(roster.all.length) })}</>}
                      {d === 'honours' && cupboard[0] && <bdi>{cupboard[0].nameHe} · {cupboard[0].won.length}</bdi>}
                      {d === 'crest' && crests.length > 0 && <bdi>{t('hapoel.preview.crest', { n: String(crests.length) })}</bdi>}
                      {d === 'songs' && songs.terrace[0] && <bdi>{songs.terrace[0].titleHe}</bdi>}
                    </span>
                    <span className="mt-auto pt-2 font-body text-[12.5px] font-extrabold text-red">{t('hapoel.door.go')} ←</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}
      {door !== null && (
        <Link href="/hapoel" className="mt-3 flex min-h-tap items-center border-hair border-ink/50 bg-sheet px-3 font-body text-[13px] font-extrabold text-ink">
          → {t('hapoel.door.back')}
        </Link>
      )}

      {/* the exhibit of the day, and the door to the whole archive */}
      {door === null && (
      <section aria-label={t('hapoel.featured')} className="mt-2">
        {featured && (
          <Link href={featured.href} data-hapoel="featured" className="flex min-h-tap flex-col justify-center border-rule border-ink bg-sheet px-3 py-3">
            <span className="font-body text-[11px] font-extrabold tracking-[0.1em] text-red">{t('hapoel.featured')}</span>
            <span className="mt-0.5 font-display text-[24px] leading-tight text-ink">
              <bdi>{featured.name}</bdi>
            </span>
            {featured.years && (
              <span className="font-mono text-[12px] tabular-nums text-muted">
                <Num>{featured.years}</Num>
              </span>
            )}
            <span className="mt-1 font-body text-[13px] font-extrabold text-red">{t('hapoel.inArchive')} ←</span>
          </Link>
        )}
      </section>
      )}

      {/* ---------------------------------------------------------------- the cupboard */}
      {door === 'honours' && (
      <section className="mt-stack scroll-mt-4" aria-labelledby="club-honours">
        <HallBar n={1} id="club-honours" title={t('hapoel.honours')} latin="HONOURS" />
        <p className="mt-2 max-w-prose font-body text-step--1 leading-relaxed text-muted">
          {t('hapoel.honoursLede')}
        </p>

        <ul className="mt-3">
          {cupboard.map((line) => (
            <li key={line.slug} className="border-b-hair border-ink/25 py-3">
              <div className="flex items-baseline gap-3">
                <span className="min-w-[2.4rem] shrink-0 font-poster text-[30px] leading-none text-red">
                  <Num>{line.won.length}</Num>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-sign text-step-1 leading-tight text-ink">{line.nameHe}</p>
                  {line.won.length > 0 && (
                    <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted">
                      <bdi>{line.won.join(' · ')}</bdi>
                    </p>
                  )}
                  {line.href && (
                    <Link href={line.href} className="mt-1 inline-flex min-h-tap items-center font-body text-[12.5px] font-extrabold text-red underline underline-offset-4">
                      {t('hapoel.inArchive')} ←
                    </Link>
                  )}
                  {line.runnerUp.length > 0 && (
                    <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted">
                      <span className="font-body font-extrabold text-sign">
                        {t('hapoel.runnerUp')}
                      </span>{' '}
                      <bdi>{line.runnerUp.join(' · ')}</bdi>
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
      )}

      {/* ------------------------------------------------------------------- the badge */}
      {door === 'crest' && (
      <section className="mt-stack scroll-mt-4" aria-labelledby="club-badge">
        <HallBar n={2} id="club-badge" title={t('hapoel.crests')} latin="THE BADGE" />
        <p className="mt-2 max-w-prose font-body text-step--1 leading-relaxed text-muted">
          {t('hapoel.crestsLede')}
        </p>

        <ol className="mt-3 grid gap-2 sm:grid-cols-2">
          {crests.map((crest) => (
            <li
              key={`${crest.fromYear}-${crest.nameHe}`}
              className="flex gap-3 border-rule border-ink bg-sheet p-3"
            >
              <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center border-hair border-ink/30 bg-paper">
                {crest.imageKey ? (
                  // `unoptimized` for the same reason the badge is (rule 8): Next's
                  // re-encode subsamples chroma, and these are red marks on cream.
                  <Image
                    src={`/brand/crests/${crest.imageKey}.png`}
                    alt=""
                    aria-hidden="true"
                    width={50}
                    height={50}
                    unoptimized
                    className="max-h-[50px] w-auto"
                  />
                ) : (
                  <span className="font-mono text-[9px] leading-tight text-muted">
                    {t('hapoel.crestNone')}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[11px] tabular-nums text-red">
                  <Num>{crest.toYear === null ? `${crest.fromYear}—` : `${crest.fromYear}—${crest.toYear}`}</Num>
                </p>
                <p className="mt-0.5 font-sign text-step-0 leading-tight text-ink">
                  {crest.nameHe}
                </p>
                {crest.changeHe && (
                  <p className="mt-1 font-body text-[11.5px] leading-snug text-muted">
                    {crest.changeHe}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
        <Link href="/archive?show=kits" className="mt-3 flex min-h-tap items-center justify-between border-rule border-ink bg-sheet px-3 font-body text-[14px] font-extrabold text-ink">
          <span>{t('hapoel.kitsDoor', { n: String(counts.kits) })}</span>
          <span aria-hidden="true" className="text-red">←</span>
        </Link>
      </section>
      )}

      {/* ------------------------------------------------------------------- the songs */}
      {door === 'songs' && (
      <section className="mt-stack scroll-mt-4" aria-labelledby="club-songs">
        <HallBar n={3} id="club-songs" title={t('hapoel.songs')} latin="THE SONGBOOK" />
        <p className="mt-2 max-w-prose font-body text-step--1 leading-relaxed text-muted">
          {t('hapoel.songsLede')}
        </p>

        {[
          { rows: songs.terrace, key: 'hapoel.songType.terrace' as MessageKey },
          { rows: songs.player, key: 'hapoel.songType.player' as MessageKey },
        ].map((group) =>
          group.rows.length === 0 ? null : (
            <div key={group.key} className="mt-3">
              <h3 className="font-body text-[11px] font-extrabold tracking-widest text-red">
                {t(group.key)} <span className="font-mono text-muted"><Num>{group.rows.length}</Num></span>
              </h3>
              <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
                {group.rows.map((song) => {
                  // A player song is often TITLED after the tune it borrows, so
                  // printing both read as the same words twice: "16 מלאו לנער ·
                  // ביברס נאתכו · על הלחן של 16 מלאו לנער". The tune line appears
                  // only when it says something the title does not.
                  const tune =
                    song.originalTitle && !song.titleHe.includes(song.originalTitle)
                      ? song.originalTitle
                      : null
                  return (
                    <li key={song.slug} className="border-b-hair border-ink/20 py-1.5">
                      <p className="font-body text-step--1 leading-snug text-ink">
                        <bdi>{song.titleHe}</bdi>
                      </p>
                      {(song.personNameHe || tune) && (
                        <p className="font-mono text-[10.5px] leading-snug text-muted">
                          {song.personNameHe && <bdi>{song.personNameHe}</bdi>}
                          {song.personNameHe && tune && ' · '}
                          {tune && (
                            <>
                              {t('hapoel.songTune')} <bdi>{tune}</bdi>
                            </>
                          )}
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ),
        )}
      </section>
      )}

      {/* ----------------------------------------------------------------- the players */}
      {door === 'players' && (
      <section className="mt-stack scroll-mt-4" aria-labelledby="club-players">
        <HallBar n={4} id="club-players" title={t('hapoel.players')} latin="EVERY NAME" />
        <PlayerFinder roster={roster} />
      </section>
      )}

      {/* ------------------------------------------------------------------- the gates */}
      {door === null && (
      <section className="mt-stack scroll-mt-4" aria-labelledby="club-gates">
        <HallBar n={5} id="club-gates" title={t('hapoel.gates')} latin="PLAY IT" />
        <p className="mt-2 max-w-prose font-body text-step--1 leading-relaxed text-muted">
          {t('hapoel.gatesLede')}
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {gates.map((gate) => (
            <li key={gate.number}>
              <Link
                href={gate.href}
                className="flex min-h-tap flex-col justify-between border-rule border-ink bg-ink p-3 transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none"
              >
                <span className="font-poster text-[26px] leading-none text-red">
                  <Num>{gate.number}</Num>
                </span>
                <span className="mt-2 font-display text-[14px] leading-tight text-paper">
                  {t(gate.title)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      )}

      <ReportLink />
    </Screen>
  )
}
