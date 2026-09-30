/**
 * ריק / שגיאה — the system's own language. A 2px frame, Miriam 700, one line of
 * explanation. Never a spinner, never a grey skeleton.
 */
export function EmptyState({
  title,
  body,
  tone = 'ink',
}: {
  title: string
  body: string
  tone?: 'ink' | 'red'
}) {
  return (
    <div
      className={`mt-stack border-rule p-3 ${tone === 'red' ? 'border-red' : 'border-ink'}`}
      role={tone === 'red' ? 'alert' : undefined}
    >
      <p
        className={`font-sign text-step-1 leading-none ${tone === 'red' ? 'text-red' : 'text-ink'}`}
      >
        {title}
      </p>
      <p className="mt-2 font-body text-step--1 text-muted">{body}</p>
    </div>
  )
}
