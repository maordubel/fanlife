'use client'
// FAN LIFE: hand-written (not in the fork map) — moves the owner's older photos out of a path that carried their id.

import { useEffect, useRef, useState } from 'react'

import { migrateLegacyPhotos } from '@/lib/collector/api'
import { t } from '@/lib/fanlife/i18n'

/**
 * Runs once when the closet opens. Photos uploaded before the privacy change sit under
 * `<your id>/…`; each is re-encoded (which drops its metadata), put in an opaque slot and
 * repointed. Until then they are not shown publicly. Quiet when there is nothing to move.
 */
export function PhotoMigration({ onMoved }: { onMoved: () => void }) {
  const [working, setWorking] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    let live = true
    setWorking(true)
    void migrateLegacyPhotos()
      .then((out) => {
        if (live && out.moved > 0) onMoved()
      })
      .finally(() => {
        if (live) setWorking(false)
      })
    return () => {
      live = false
    }
  }, [onMoved])

  return working ? (
    <p role="status" className="font-body text-[11.5px] leading-snug text-muted">
      {t('collector.photos.moving')}
    </p>
  ) : null
}
