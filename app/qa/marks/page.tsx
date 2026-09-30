import { notFound } from 'next/navigation'

import { qaAllowed } from '@/lib/qa'

import { MakerMark, type MakerMarkId } from '@/components/kit/MakerMark'

/**
 * גיליון הסימנים — the maker marks side by side, at the size they print.
 *
 * Eight marks that have to be told apart on a 24px slot cannot be judged one at a time.
 * `notFound()` in production, like the story harness (rule 19) — and covered by the same
 * brand-guard exemption test.
 */
const SHEET: { id: MakerMarkId; maker: string }[] = [
  { id: 'strike', maker: 'NIKE' },
  { id: 'adio', maker: 'adidas · 1992+' },
  { id: 'classic', maker: 'adidas · 80s' },
  { id: 'blackdog', maker: 'PUMA' },
  { id: 'rombus', maker: 'umbro' },
  { id: 'micron', maker: 'MACRON' },
  { id: 'twin', maker: 'KAPPA' },
  { id: 'dia', maker: 'diadora' },
]

export default function MarksQaPage() {
  if (!qaAllowed()) notFound()
  return (
    <main data-marks="ready" className="bg-paper p-6">
      <ul className="grid grid-cols-8 gap-3">
        {SHEET.map((row) => (
          <li key={row.id} className="border-hair border-ink/30 bg-sheet p-3 text-center">
            <svg viewBox="-2 -2 28 32" className="mx-auto block h-20 w-auto">
              <MakerMark id={row.id} ink="rgb(var(--ink))" />
            </svg>
            <p className="mt-2 font-body text-[11px] font-bold text-ink">{row.maker}</p>
            <p className="font-mono text-[10px] text-muted">{row.id}</p>
          </li>
        ))}
      </ul>
    </main>
  )
}
