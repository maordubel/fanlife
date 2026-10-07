'use client'

import { useEffect, useState } from 'react'

import { BEEN_EVENT, beenKey, readBeen, setBeen } from '@/lib/fanlife/been'

/**
 * The "I was there" stamp on a match or a moment. One tap marks it on this device; it then shows in
 * Me → My story and in My file. Rendered unpressed on the server and read after mount.
 */
export function BeenThere({ club, id, label, on, copy }: { club: string; id: string; label: string; on: string | null; copy: { mark: string; marked: string; hint: string } }) {
  const [been, setState] = useState(false)
  useEffect(() => {
    const read = () => setState(!!readBeen()[beenKey(club, id)]?.b)
    read()
    window.addEventListener(BEEN_EVENT, read)
    window.addEventListener('storage', read)
    return () => { window.removeEventListener(BEEN_EVENT, read); window.removeEventListener('storage', read) }
  }, [club, id])
  return (
    <button type="button" className="mag-been min-h-tap" aria-pressed={been} title={copy.hint}
      onClick={() => { if (setBeen(club, id, label, on, !been)) setState(!been) }}>
      <span aria-hidden="true">{been ? '★' : '☆'}</span>{been ? copy.marked : copy.mark}
    </button>
  )
}
