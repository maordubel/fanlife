'use client'
import { useState } from 'react'

import { RushHost, type RushHostProps } from '@/components/clubs/life/rush/RushHost'
import type { MissionResult } from '@/lib/life/rush/spec'

/** the stand's only job beyond the host: print what the host handed back, so a probe can read it */
export function RushQa(props: Omit<RushHostProps, 'onDone' | 'reduced'>) {
  const [result, setResult] = useState<MissionResult | null>(null)
  if (result) return <pre data-qa="rush-result">{JSON.stringify(result)}</pre>
  return <RushHost {...props} reduced={false} onDone={setResult} probe />
}
