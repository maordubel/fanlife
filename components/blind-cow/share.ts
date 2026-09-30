'use client'

import { SITE_URL } from '@/lib/brand'

/**
 * Share order (spec §9): Web Share on the phone → copy the link. WhatsApp is its own chip
 * (`waHref`), the product's existing deep share. The text never names the man.
 */
export async function shareOut(text: string, url: string): Promise<'shared' | 'copied' | 'failed'> {
  const nav = typeof navigator === 'undefined' ? null : navigator
  if (nav?.share) {
    try {
      await nav.share({ text, url })
      return 'shared'
    } catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') return 'failed'
    }
  }
  try {
    await nav?.clipboard?.writeText(`${text}\n\n${url}`)
    return 'copied'
  } catch {
    return 'failed'
  }
}

export async function copyLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url)
    return true
  } catch {
    return false
  }
}

export function waHref(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`
}

export function gateUrl(query = ''): string {
  return `${SITE_URL}/blind-cow${query}`
}
