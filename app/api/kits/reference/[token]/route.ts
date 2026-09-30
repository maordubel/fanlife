/**
 * TOMBSTONE — the reference route is gone (21.9.2026).
 *
 * It served the archive photograph for a Gate 4 part token BEFORE submit, which is the answer
 * (brief §15, rule 4). The photograph is shown only in the Reveal, as evidence. The file stays,
 * importing nothing, so a web upload that never deletes cannot leave a live handler behind
 * (rule 26); every request is answered 410 Gone.
 */
export function GET() {
  return new Response(null, { status: 410 })
}
