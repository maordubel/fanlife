'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { readBeen, toggleBeen, writeBeen, type BeenLedger } from '@/lib/away-days/been'
import { onSignIn, pushBeen, syncBeen } from '@/lib/away-days/been-sync'

/**
 * "הייתי שם" state for the page (spec §30): the device ledger first, always; the account
 * merged in on mount and again whenever somebody signs in on this tab (guest → account —
 * `syncBeen` pulls, merges, writes the device, pushes). A tick is written to the device
 * before the network is asked anything, and the push of that one row is best-effort.
 */
export function useBeen() {
  const [ledger, setLedger] = useState<BeenLedger>({})
  const current = useRef<BeenLedger>({})

  useEffect(() => {
    const local = readBeen()
    current.current = local
    setLedger(local)
    let live = true
    const run = () => {
      void syncBeen().then((result) => {
        if (!live || result.state !== 'synced') return
        current.current = result.ledger
        setLedger(result.ledger)
      })
    }
    run()
    const off = onSignIn(run)
    return () => {
      live = false
      off()
    }
  }, [])

  const toggle = useCallback((visitId: string) => {
    const next = toggleBeen(current.current, visitId)
    current.current = next
    writeBeen(next)
    setLedger(next)
    const entry = next[visitId]
    if (entry) void pushBeen({ [visitId]: entry })
    return entry?.b === true
  }, [])

  return { ledger, toggle }
}
