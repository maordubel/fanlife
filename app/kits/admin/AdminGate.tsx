'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { useAuctionApi } from '@/components/auction/AuctionApi'
import { SignPlate } from '@/components/ui/SignPlate'
import { t } from '@/lib/i18n'

import { AdminConsole } from './AdminConsole'

/** 404 for everyone but an admin — the same page `app/not-found.tsx` prints. */
export function AdminGate() {
  const api = useAuctionApi()
  const [admin, setAdmin] = useState<boolean | null>(null)
  useEffect(() => {
    let live = true
    void api.adminWhoami().then((result) => {
      if (live) setAdmin(result.ok && result.admin)
    })
    return () => {
      live = false
    }
  }, [api])
  if (admin === null) {
    return <main id="main" className="mx-auto min-h-dvh max-w-5xl px-gutter py-16" aria-busy="true" />
  }
  // one plate per screen (tests/brand.test.ts): the 404 wears the home plate, the console its own
  return (
    <main
      id="main"
      className={admin ? 'mx-auto max-w-6xl px-gutter pb-16 pt-5 md:pt-10' : 'mx-auto max-w-5xl px-gutter py-16'}
      data-admin={admin ? 'yes' : 'no'}
    >
      <SignPlate
        title={admin ? t('screen.admin.title') : t('screen.home.title')}
        sub={admin ? t('screen.admin.sub') : t('screen.home.sub')}
      />
      {admin ? (
        <AdminConsole />
      ) : (
        <>
          <p className="mt-stack font-mono text-step-5 tabular-nums text-red">404</p>
          <p className="mt-2 font-body text-step-0 text-muted">{t('notFound.body')}</p>
          <Link href="/" className="mt-stack inline-flex min-h-tap items-center bg-ink px-4 font-body text-step-1 font-extrabold text-sheet">
            {t('tab.ground')}
          </Link>
        </>
      )}
    </main>
  )
}
