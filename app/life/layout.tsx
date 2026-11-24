import type {ReactNode} from 'react'
import {redirect} from 'next/navigation'
import {isOwner} from '@/lib/features-server'
import {LIFE_SOON_PATH} from '@/lib/life/lock/paths'

export const dynamic = 'force-dynamic'

/** LIFE is closed to the public (owner, 24.11.2026). The middleware shows Coming soon first; this is the server's own lock. */
export default function LifeLayout({children}: {children: ReactNode}) {
  if (!isOwner()) redirect(LIFE_SOON_PATH)
  return <>{children}</>
}
