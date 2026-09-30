import type { ReactNode } from 'react'

/**
 * בד אוהדים — a section heading or a celebration.
 * Once per screen, 44–60px tall, five words at most. Never small text on the cloth.
 */
export function BannerCloth({ children }: { children: ReactNode }) {
  return (
    <div className="cloth relative bg-red px-4 pb-4 pt-2.5">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(96deg, rgb(var(--ink)/.09) 0 1px, transparent 1px 15px)',
        }}
        aria-hidden="true"
      />
      <p className="relative font-sign text-step-2 leading-none tracking-wide text-sheet">
        {children}
      </p>
    </div>
  )
}
