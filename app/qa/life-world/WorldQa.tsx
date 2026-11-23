'use client'
import { HoodHost, type HoodHostProps } from '@/components/clubs/life/hood/HoodHost'

/** the stand's only job: the host, with the run exposed to a probe (`window.__hood`) */
export function WorldQa(props: Omit<HoodHostProps, 'probe' | 'reduced'>) {
  return <HoodHost {...props} reduced={false} probe />
}
