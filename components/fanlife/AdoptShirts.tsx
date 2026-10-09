'use client'

import { adoptShirts } from '@/lib/fanlife/world'

/**
 * Hands the page's shirt catalogue to the world-shirt registry, so a copy from a club outside the archive
 * (see lib/fanlife/world.ts) resolves through the same `shirts[slug]` lookup as every other copy.
 */
export function AdoptShirts({ shirts }: { shirts: Readonly<Record<string, unknown>> }) {
  adoptShirts(shirts)
  return null
}
