import { redirect } from 'next/navigation'

/**
 * TOMBSTONE — retired 1.9.2026. Maor cut the crest game as unnecessary, and gate 7 is
 * now the polls wing. Anyone holding a link lands on the gate wall rather than a 404.
 *
 * The crest data stays: it dresses every shirt in its own era's badge (rule 25).
 */
export default function RetiredCrestPage() {
  redirect('/')
}
