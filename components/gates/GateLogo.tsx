import { t } from '@/lib/i18n'

/**
 * The two arena logos (Maor's artwork, 29.9.2026), background removed (real alpha). Used INSIDE
 * gates 9 and 10 only — never on the gate wall. Placed on the ink stage: the cream lettering is
 * designed for a dark ground. `<img>`, not the Next optimizer — a re-encode is how yellow gets
 * reinvented (rules 8 and 61); the bytes on the wire are the bytes that were measured.
 */
export type ArenaLogo = 'blind-cow' | 'royal-rumble'

const SIZE: Record<ArenaLogo, { w: number; h: number; alt: 'gate.logo.blindcow' | 'gate.logo.rumble' }> = {
  'blind-cow': { w: 1200, h: 400, alt: 'gate.logo.blindcow' },
  'royal-rumble': { w: 1200, h: 675, alt: 'gate.logo.rumble' },
}

export function GateLogo({ logo, className = '', decorative = false }: { logo: ArenaLogo; className?: string; decorative?: boolean }) {
  const s = SIZE[logo]
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/brand/gates/${logo}.webp`}
      width={s.w}
      height={s.h}
      alt={decorative ? '' : t(s.alt)}
      aria-hidden={decorative || undefined}
      draggable={false}
      data-gate-logo={logo}
      className={`select-none ${className}`}
    />
  )
}
