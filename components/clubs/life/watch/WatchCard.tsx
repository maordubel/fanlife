'use client'
/**
 * LIFE · the WATCH CARD — the viewing moment after a mission (owner, 23.11.2026; rule life-story-watch).
 *
 * What it shows, top to bottom on a phone (beside each other from 900px):
 *   1. the ARCHIVE SLATE — date, competition, result and title, each printed only when the archive row handed in
 *      holds it (`slateOf` in `lib/life/watch`); with no slate the card is a personal moment and prints no fact;
 *   2. the SCREEN — a drawn poster (no request leaves the page) → a tap loads the `youtube-nocookie.com` embed;
 *      under it "Watch on YouTube" and the footage line;
 *   3. OUR FILM — the FAN LIFE Football Stories film of this night or season, when the studio's record has one;
 *   4. CONTINUE — always there, always enabled: a film is a gift, never a gate.
 *
 * Self-contained: it reads no store and mounts nowhere by itself. The host passes what `watchFor()` returned.
 * Every word comes from `lib/life/watch/words.ts`; a recorded title is printed in its own language (`lang`).
 *
 * Props
 *   highlights   HighlightsMoment | null   the match film (from `watchFor`), or null
 *   more         HighlightsMoment[]        other recorded films of the same night (optional)
 *   ourFilm      OurFilmMoment | null      the studio's film (optional)
 *   ourFilmFit   'night' | 'season' | null which heading the film gets (optional; default 'night')
 *   slate        WatchSlate | null         the archive row's own facts (optional)
 *   accent       string                    the club accent AFTER the colour policy (optional; cream when absent)
 *   onContinue   () => void                the one way on
 *   onPlay       (moment) => void          told when a film is started (optional; for the save / the funnel)
 */
import {useState, type CSSProperties} from 'react'
import {embedUrl, slateDate, watchUrl, watchWord, type HighlightsMoment, type OurFilmMoment, type WatchSlate} from '@/lib/life/watch'
import css from './watch.module.css'

export type WatchCardProps = {
  highlights: HighlightsMoment | null
  more?: readonly HighlightsMoment[]
  ourFilm?: OurFilmMoment | null
  ourFilmFit?: 'night' | 'season' | null
  slate?: WatchSlate | null
  accent?: string
  onContinue: () => void
  onPlay?: (moment: HighlightsMoment | OurFilmMoment) => void
}

type Playing = HighlightsMoment | OurFilmMoment

function PlayMark() {
  return <svg className={css.wcMark} viewBox="0 0 48 48" aria-hidden="true" focusable="false"><circle cx="24" cy="24" r="22.5" /><path d="M19 14.5v19l15.5-9.5z" /></svg>
}

export function WatchCard({highlights, more = [], ourFilm = null, ourFilmFit = 'night', slate = null, accent, onContinue, onPlay}: WatchCardProps) {
  const [playing, setPlaying] = useState<Playing | null>(null)
  const first: Playing | null = highlights ?? ourFilm
  const src = playing ? embedUrl(playing) : null
  const start = (m: Playing) => { setPlaying(m); onPlay?.(m) }
  const style = accent ? ({'--wc-accent': accent} as CSSProperties) : undefined
  const filmHead = ourFilmFit === 'season' ? watchWord('watch.film.season') : watchWord('watch.film.night')
  const shown = playing ?? first
  const link = shown ? watchUrl(shown) : null

  return (
    <section className={css.wcRoot} style={style} aria-label={watchWord(slate ? 'watch.kicker' : 'watch.kicker.personal')}>
      <header className={css.wcSlate}>
        <p className={css.wcKicker}>{watchWord(slate ? 'watch.kicker' : 'watch.kicker.personal')}</p>
        {slate?.date ? <p className={css.wcDate}>{slateDate(slate.date)}</p> : null}
        {slate?.competition ? <p className={css.wcComp}>{slate.competition}</p> : null}
        {slate?.result ? <h2 className={css.wcResult}>{slate.result}</h2> : slate?.title ? <h2 className={css.wcResult} lang={slate.titleLocale ?? undefined} dir="auto">{slate.title}</h2> : null}
        {slate?.result && slate.title ? <p className={css.wcTitle} lang={slate.titleLocale ?? undefined} dir="auto">{slate.title}</p> : null}
        {slate?.publisher ? <p className={css.wcSource}>{watchWord('watch.source', {publisher: slate.publisher})}</p> : null}
      </header>

      <div className={css.wcStage}>
        {first ? (
          <div className={css.wcScreen}>
            {src && playing ? (
              <iframe className={css.wcFrame} src={src} title={watchWord('watch.frame', {title: playing.title})} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" loading="lazy" />
            ) : (
              <button type="button" className={`${css.wcPoster} min-h-tap`} onClick={() => start(first)}>
                <span className={css.wcPosterLines} aria-hidden="true" />
                <PlayMark />
                <span className={css.wcPosterLabel}>{watchWord(first.kind === 'highlights' ? 'watch.play' : 'watch.play.film')}</span>
                <span className={css.wcPosterTitle} lang={first.titleLocale} dir="auto">{first.title}</span>
              </button>
            )}
          </div>
        ) : <p className={css.wcNone}>{watchWord('watch.none')}</p>}

        {first ? (
          <div className={css.wcUnder}>
            {link ? <a className={`${css.wcLink} min-h-tap`} href={link} target="_blank" rel="noopener noreferrer">{watchWord('watch.youtube')}</a> : null}
            {playing ? <button type="button" className={`${css.wcGhost} min-h-tap`} onClick={() => setPlaying(null)}>{watchWord('watch.back')}</button> : null}
            <p className={css.wcHint}>{playing ? watchWord('watch.footage') : watchWord('watch.poster.hint')}</p>
          </div>
        ) : null}

        {more.length ? (
          <div className={css.wcMore}>
            <p className={css.wcKicker}>{watchWord('watch.more')}</p>
            <ul className={css.wcList}>
              {more.map(m => <li key={m.id}><button type="button" className={`${css.wcRow} min-h-tap`} onClick={() => start(m)} aria-pressed={playing?.id === m.id}><PlayMark /><span lang={m.titleLocale} dir="auto">{m.title}</span></button></li>)}
            </ul>
          </div>
        ) : null}

        {ourFilm && highlights ? (
          <div className={css.wcOurs}>
            <p className={css.wcKicker}>{filmHead}</p>
            <button type="button" className={`${css.wcRow} min-h-tap`} onClick={() => start(ourFilm)} aria-pressed={playing?.id === ourFilm.id}><PlayMark /><span>{ourFilm.title}</span></button>
            <p className={css.wcBy}>{watchWord('watch.film.by')}</p>
          </div>
        ) : ourFilm ? <div className={css.wcOurs}><p className={css.wcKicker}>{filmHead}</p><p className={css.wcBy}>{watchWord('watch.film.by')}</p></div> : null}
      </div>

      <footer className={css.wcFoot}>
        <button type="button" className={`${css.wcContinue} min-h-tap`} onClick={onContinue}>{watchWord('watch.continue')}</button>
      </footer>
    </section>
  )
}

export default WatchCard
