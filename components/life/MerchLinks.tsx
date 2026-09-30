import { t } from '@/lib/i18n'
import { merchForShirt, type ShirtId } from '@/lib/merch'

/**
 * מצא רפליקה / חולצה רשמית — the shop links under one shirt, read from `lib/merch.ts`.
 *
 * Secondary on purpose: a small outlined list, never the card's main action. The club's own
 * store first, an independent shop only where the registry ties it to this shirt or season.
 * The disclosure is always printed beside each link — an independent replica is never
 * presented as official. Every link opens a new tab with `rel="noopener noreferrer"`.
 *
 * Tokens only (rule 8), logical properties only (rule 9). Renders nothing when there is
 * nothing to link.
 */
export function MerchLinks({
  shirtId,
  season = null,
  className = '',
  tone = 'light',
}: {
  /** `dark` for the wardrobe's ink drawer (delta 92): same links, inverted plates */
  tone?: 'light' | 'dark'
  shirtId: ShirtId
  /** the shirt's season (`'1985/86'`, `'1986'`) — matches the registry's `seasons` */
  season?: string | null
  className?: string
}) {
  const links = merchForShirt(shirtId, season)
  if (links.length === 0) return null

  return (
    <section aria-label={t('merch.title')} className={`mt-3 ${className}`} data-merch-links="">
      <h3 className={`font-body text-[12px] font-extrabold ${tone === 'dark' ? 'text-sheet' : 'text-ink'}`}>{t('merch.title')}</h3>
      <ul className="mt-1.5 flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.id} data-merch-link={link.kind}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('merch.open', { name: link.nameHe })}
              className="inline-flex min-h-tap items-center gap-2 border-rule border-ink bg-sheet px-3 font-body text-[12.5px] font-bold text-ink transition-transform duration-press ease-stamp focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red active:scale-[.97] motion-reduce:transition-none"
            >
              {/* (delta 93) the club store is a general shop — never "buy this shirt" */}
              <bdi>{link.kind === 'official-club' ? t('merch.cta.official') : t('merch.cta.replica')}</bdi>
              <span className={`font-body text-[10.5px] ${link.kind === 'official-club' ? 'text-red' : 'text-sign'}`}>
                {link.kind === 'official-club' ? t('credits.community.official') : `${link.nameHe} · ${t('credits.community.independent')}`}
              </span>
            </a>
            <p className={`mt-0.5 max-w-prose font-body text-[11.5px] leading-snug ${tone === 'dark' ? 'text-concrete' : 'text-muted'}`}>{link.disclosureHe}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
