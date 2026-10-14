/**
 * A striped shirt, on a hanger or not, drawn in the page's inks (THE WEEKLY, rule 124). Decorative unless a `number`
 * is printed on it — the supporter's own number on the card. `id` names the clip path, so it must be unique per page.
 */
export function DrawnShirt({ id, className = '', stripe = 'var(--mag-vermilion)', ground = 'var(--mag-white)', hanger = true, number }: { id: string; className?: string; stripe?: string; ground?: string; hanger?: boolean; number?: number | null }) {
  const body = 'M38 30 L18 38 L4 60 L18 68 L26 60 L26 116 L94 116 L94 60 L102 68 L116 60 L102 38 L82 30 C78 40 70 44 60 44 C50 44 42 40 38 30 Z'
  return (
    <svg viewBox={hanger ? '0 0 120 120' : '0 26 120 94'} className={className} aria-hidden="true" focusable="false">
      {hanger ? <path d="M60 26 V20 a6 6 0 1 1 6 -6 M60 22 L34 34 M60 22 L86 34" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /> : null}
      <clipPath id={id}><path d={body} /></clipPath>
      <g clipPath={`url(#${id})`}>
        <rect width="120" height="120" fill={ground} />
        {[30, 48, 66, 84].map((x) => <rect key={x} x={x} width="9" height="120" fill={stripe} />)}
      </g>
      <path d={body} fill="none" stroke="var(--mag-ink)" strokeWidth="4.5" strokeLinejoin="round" />
      {number ? <text x="60" y="104" textAnchor="middle" className="wkc-shirt-no">{number}</text> : null}
    </svg>
  )
}
