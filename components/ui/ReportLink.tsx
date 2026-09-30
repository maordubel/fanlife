import { t } from '@/lib/i18n'

/**
 * דיווח על טעות — present on every screen that states a fact.
 * It is the product's credibility valve, so it is never hidden behind a menu.
 */
export function ReportLink() {
  return (
    <a
      href="mailto:archive@dubelteam.com?subject=The%20Worker%20-%20data%20issue"
      className="mt-stack inline-flex min-h-tap items-center font-body text-step--1 font-extrabold text-sign underline decoration-2 underline-offset-4"
    >
      {t('report.cta')}
    </a>
  )
}
