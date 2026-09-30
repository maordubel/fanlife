'use client'

/**
 * הלוחיות — the life's chrome, in the site's own three devices (brand spec §0).
 *
 * Until this pass every plate on the glass was a `border-hair bg-sheet/95` box in Heebo,
 * which is a wireframe and not the product. The site's screens are built from the sign
 * plate of Ussishkin (enamel, a double border, a concrete arm), the stamp, and the red
 * cloth — so the HUD, the chips and the objective line are now those same objects at
 * HUD size, and the overlays' headers are sign plates. One vocabulary, two surfaces.
 *
 *  · `Plate`  — the enamel sign: plate border, inner hairline, sheet ground.
 *  · `Chip`   — a Plate that is a button: sign face, red when pressed.
 *  · `Cloth`  — the red supporters' cloth, cut on the bias, for the one line that tells
 *               the player the shape of the day.
 *  · `Arm`    — the concrete bracket a sign hangs off.
 *  · `SheetHead` — an overlay's header: a sign plate on an arm, the close mark beside it.
 */
export function Plate({
  children,
  className = '',
  tone = 'sheet',
  as: Tag = 'div',
  ...rest
}: {
  children: React.ReactNode
  className?: string
  tone?: 'sheet' | 'ink' | 'red'
  as?: 'div' | 'span' | 'p'
} & Record<string, unknown>) {
  const ground = tone === 'ink' ? 'border-sheet bg-ink text-sheet' : tone === 'red' ? 'border-ink bg-red text-sheet' : 'border-ink bg-sheet text-ink'
  const inner = tone === 'sheet' ? 'border-ink/40' : 'border-sheet/40'
  return (
    <Tag className={`relative border-rule ${ground} ${className}`} {...rest}>
      <span aria-hidden="true" className={`pointer-events-none absolute inset-[2px] border-hair ${inner}`} />
      <span className="relative block">{children}</span>
    </Tag>
  )
}

export function Chip({
  children,
  onClick,
  live,
  className = '',
  ...rest
}: {
  children: React.ReactNode
  onClick?: () => void
  /** pressed / active: red plate */
  live?: boolean
  className?: string
} & Record<string, unknown>) {
  return (
    <button type="button" onClick={onClick} className={`group flex min-h-tap min-w-tap items-start justify-center ${className}`} {...rest}>
      <span
        className={`relative mt-2 block border-rule transition-colors duration-press motion-reduce:transition-none ${
          live ? 'border-ink bg-red text-sheet' : 'border-ink bg-sheet text-ink group-active:bg-red group-active:text-sheet'
        }`}
      >
        <span aria-hidden="true" className={`pointer-events-none absolute inset-[2px] border-hair ${live ? 'border-sheet/40' : 'border-ink/40 group-active:border-sheet/40'}`} />
        <span className="relative flex items-center gap-1.5 px-2.5 py-1.5 font-sign text-[12px] leading-none">{children}</span>
      </span>
    </button>
  )
}

/** the red cloth — one short line, cut on the bias, textured like the banners */
export function Cloth({ children, className = '', ...rest }: { children: React.ReactNode; className?: string } & Record<string, unknown>) {
  return (
    <div className={`cloth relative bg-red px-3 pb-2.5 pt-1.5 ${className}`} {...rest}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: 'repeating-linear-gradient(96deg, rgb(var(--ink)/.09) 0 1px, transparent 1px 15px)' }}
      />
      <span className="relative block font-sign text-[12px] leading-tight text-sheet">{children}</span>
    </div>
  )
}

export function Arm({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`block w-[7px] shrink-0 self-stretch bg-concrete ${className}`} />
}

/** an overlay's header: a sign plate on its arm, the title in the sign face, ✕ at the end */
export function SheetHead({ title, onClose, closeLabel, kicker }: { title: string; onClose: () => void; closeLabel: string; kicker?: string }) {
  return (
    <div className="flex items-stretch border-b-rule border-ink bg-paper">
      <Arm />
      <div className="relative my-1.5 ms-1.5 border-plate border-ink bg-sheet px-3 pb-1.5 pt-1">
        <span aria-hidden="true" className="pointer-events-none absolute inset-[3px] border-hair border-ink/45" />
        <p className="relative font-sign text-[17px] leading-none text-ink">{title}</p>
        {kicker && <p className="relative mt-0.5 font-body text-[10px] leading-none text-sign">{kicker}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="ms-auto flex min-h-tap min-w-tap items-center justify-center font-mono tabular-nums text-[18px] text-ink transition-colors duration-press active:bg-red active:text-sheet motion-reduce:transition-none"
        aria-label={closeLabel}
      >
        ✕
      </button>
    </div>
  )
}
