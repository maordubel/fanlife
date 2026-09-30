import { t } from '@/lib/i18n'

/**
 * הסימן של שער 10 — an original typographic mark, drawn from the shell's own parts: a
 * question mark in Suez One printed in the two plates (navy under, vermilion over, the
 * constant 3px misregistration), two short horns, and an ink blindfold across its eyes
 * with its knot trailing off. No character, no mascot, nothing borrowed — a "?" that
 * cannot see, which is the whole game.
 *
 * Sized by the caller in em (`text-[88px]`); every part is in em so it scales as one.
 * `peek` lifts the blindfold a little — the result screen, where the file is open.
 */
export function CowMark({ className = '', peek = false, dark = false }: { className?: string; peek?: boolean; dark?: boolean }) {
  // on the ink stage the horns and the blindfold print in the cream plate, or they vanish
  const cloth = dark ? 'bg-paper' : 'bg-ink'
  return (
    <span role="img" aria-label={t('blindcow.mark.label')} className={`relative inline-block pe-[0.3em] leading-none ${className}`}>
      {/* horns */}
      <span aria-hidden="true" className={`absolute start-[0.08em] top-[0.02em] h-[0.2em] w-[0.09em] -rotate-[28deg] ${cloth}`} />
      <span aria-hidden="true" className={`absolute end-[0.44em] top-[0.02em] h-[0.2em] w-[0.09em] rotate-[28deg] ${cloth}`} />
      <span aria-hidden="true" className="relative block ps-[0.12em] pt-[0.12em] font-display">
        <span className="plate-shift absolute start-[0.12em] top-[0.12em] text-sign">?</span>
        <span className="plate-top relative text-red">?</span>
      </span>
      {/* the blindfold and its knot */}
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 h-[0.15em] ${cloth} transition-transform duration-stamp ease-stamp motion-reduce:transition-none ${
          peek ? 'top-[0.2em] -rotate-[9deg]' : 'top-[0.36em] -rotate-[4deg]'
        }`}
      />
      <span aria-hidden="true" className={`absolute end-[0.02em] h-[0.07em] w-[0.26em] rotate-[24deg] ${cloth} ${peek ? 'top-[0.3em]' : 'top-[0.48em]'}`} />
      <span aria-hidden="true" className={`absolute end-[0.04em] h-[0.07em] w-[0.22em] rotate-[52deg] ${cloth} ${peek ? 'top-[0.36em]' : 'top-[0.55em]'}`} />
    </span>
  )
}
