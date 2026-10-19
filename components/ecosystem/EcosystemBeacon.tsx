'use client'

import { useEffect } from 'react'

import { arrived, receiveHandoff, type SharedClient } from '@/ecosystem/sdk'
import { evaluationMode } from '@/lib/master/mode'
import { portalConfigured } from '@/lib/portal/env'
import { createClient } from '@/lib/supabase/client'

/**
 * The shared layer (ecosystem/contract.json, schema `shared`) — mounted once in the root layout.
 * On the first load it counts a handoff that brought the visitor here (`?eh=`, removed from the
 * address bar); once a real, non-anonymous session exists it says "I use FAN LIFE" and claims the
 * kept handoff — once per user per page load. A no-op in local evaluation and without Supabase keys.
 * Every SDK call returns a value and never throws: this can never be the reason a page breaks.
 */
let received = false
let arrivedFor: string | null = null

type MaybeUser = { id: string; is_anonymous?: boolean } | null | undefined

async function arrive(client: SharedClient, user: MaybeUser) {
  if (!user || user.is_anonymous || arrivedFor === user.id) return
  arrivedFor = user.id
  await arrived(client, 'fanlife')
}

export function EcosystemBeacon() {
  useEffect(() => {
    if (evaluationMode() || !portalConfigured()) return
    let unsubscribe: (() => void) | undefined
    try {
      const supabase = createClient()
      const shared = supabase as unknown as SharedClient
      if (!received) {
        received = true
        void receiveHandoff(shared)
      }
      void supabase.auth.getSession().then(({ data }) => arrive(shared, data.session?.user as MaybeUser)).catch(() => undefined)
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') void arrive(shared, session?.user as MaybeUser)
      })
      unsubscribe = () => data.subscription.unsubscribe()
    } catch {
      return undefined
    }
    return unsubscribe
  }, [])
  return null
}
