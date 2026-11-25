/** LIFE · the game — the icons, drawn inline (no icon library). All 24×24, stroke or fill from currentColor. */
import type {ReactNode} from 'react'

export type IconName = 'talk' | 'sprint' | 'pause' | 'bag' | 'map' | 'pin' | 'coin' | 'eye' | 'close' | 'check' | 'chevron' | 'scarf' | 'ticket' | 'pass' | 'battery' | 'back' | 'lock'

const S = {fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round'} as const
const PATH: Record<IconName, ReactNode> = {
  talk: <path {...S} d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />,
  sprint: <g {...S}><circle cx="14.5" cy="4.5" r="1.8" /><path d="M7 21l3-6 3 1.5 1.5-4-3-2-3 2.5M13 9l3.5 2.5 3-1M10.5 15.5L9 21" /></g>,
  pause: <g fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2" /><rect x="14" y="5" width="4" height="14" rx="1.2" /></g>,
  bag: <g {...S}><path d="M6 8h12l1.2 12H4.8L6 8z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></g>,
  map: <g {...S}><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z" /><path d="M9 4v14M15 6v14" /></g>,
  pin: <g {...S}><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15 12 21 12 21z" /><circle cx="12" cy="10" r="2.4" /></g>,
  coin: <g {...S}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v9M9.5 9.5h4a1.6 1.6 0 0 1 0 3h-3a1.6 1.6 0 0 0 0 3h4" /></g>,
  eye: <g {...S}><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" /><circle cx="12" cy="12" r="2.8" /></g>,
  close: <path {...S} d="M6 6l12 12M18 6L6 18" />,
  check: <path {...S} strokeWidth={2.6} d="M5 12.5l4.5 4.5L19 7.5" />,
  chevron: <path {...S} d="M9 5l7 7-7 7" />,
  back: <path {...S} d="M15 5l-7 7 7 7" />,
  lock: <g {...S}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></g>,
  scarf: <g {...S}><path d="M5 6c3-2 11-2 14 0v3c-3 2-11 2-14 0V6z" /><path d="M9 10.5V20l3-1.5 3 1.5v-9.5" /><path d="M9 14h6M9 17h6" /></g>,
  ticket: <g {...S}><path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4V7z" /><path d="M15 7v10" strokeDasharray="2 2.4" /></g>,
  pass: <g {...S}><rect x="5" y="3" width="14" height="18" rx="2.2" /><circle cx="12" cy="10" r="2.6" /><path d="M8.5 16.5h7M10 3v2h4V3" /></g>,
  battery: <g {...S}><rect x="3" y="8" width="16" height="9" rx="2" /><path d="M21 11v3M8 12.5h5M10.5 10v5" /></g>,
}

export function Icon({n, label}: {n: IconName; label?: string}) {
  return <svg viewBox="0 0 24 24" aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label} focusable="false">{PATH[n]}</svg>
}
