/**
 * The ingestion report. Coverage, not just errors — "0 errors" hides the fact that
 * 135 of 350 players have no position. Someone has to read this file.
 */

import type { Conflict, UnresolvedRef } from './dedupe'
import type { BundleKey, Confidence, SourceRef } from './types'

export type RejectedRecord = {
  entity: BundleKey | 'page'
  key: string
  reason: string
}

export type SkippedRecord = RejectedRecord

export type LowConfidenceFact = {
  entity: BundleKey
  key: string
  confidence: Confidence
}

export type CoverageRow = {
  entity: BundleKey
  field: string
  present: number
  total: number
}

export class IngestReport {
  readonly startedAt = new Date().toISOString()
  readonly discovered = new Map<string, number>()
  readonly imported = new Map<BundleKey, number>()
  readonly skipped: SkippedRecord[] = []
  readonly rejected: RejectedRecord[] = []
  readonly unresolved: UnresolvedRef[] = []
  readonly conflicts: Conflict[] = []
  readonly lowConfidence: LowConfidenceFact[] = []
  readonly coverage: CoverageRow[] = []
  readonly sources = new Map<string, SourceRef>()
  readonly notes: string[] = []
  duplicatesMerged = 0

  constructor(readonly kind: string) {}

  countDiscovered(what: string, n: number): void {
    this.discovered.set(what, (this.discovered.get(what) ?? 0) + n)
  }

  countImported(entity: BundleKey, n: number): void {
    this.imported.set(entity, (this.imported.get(entity) ?? 0) + n)
  }

  addSource(source: SourceRef): void {
    this.sources.set(source.naturalKey, source)
  }

  note(text: string): void {
    this.notes.push(text)
  }

  get ok(): boolean {
    return this.rejected.length === 0 && this.unresolved.length === 0
  }

  toStats(): Record<string, number> {
    return {
      discovered: sum(this.discovered.values()),
      imported: sum(this.imported.values()),
      skipped: this.skipped.length,
      rejected: this.rejected.length,
      unresolved: this.unresolved.length,
      conflicts: this.conflicts.length,
      lowConfidence: this.lowConfidence.length,
      duplicatesMerged: this.duplicatesMerged,
      sources: this.sources.size,
    }
  }

  toMarkdown(): string {
    const lines: string[] = []
    const stats = this.toStats()

    lines.push(`# Ingestion report — ${this.kind}`)
    lines.push('')
    lines.push(`Started ${this.startedAt} · status **${this.ok ? 'OK' : 'NEEDS REVIEW'}**`)
    lines.push('')

    lines.push('## Totals')
    lines.push('')
    lines.push('| Metric | Count |')
    lines.push('|---|---:|')
    for (const [key, value] of Object.entries(stats)) {
      lines.push(`| ${key} | ${value} |`)
    }
    lines.push('')

    lines.push('## Discovered')
    lines.push('')
    lines.push(...table(['Source unit', 'Count'], [...this.discovered].map(([k, v]) => [k, String(v)])))

    lines.push('## Imported by entity')
    lines.push('')
    lines.push(...table(['Entity', 'Rows'], [...this.imported].map(([k, v]) => [k, String(v)])))

    lines.push('## Coverage')
    lines.push('')
    lines.push(
      ...table(
        ['Entity', 'Field', 'Present', 'Total', '%'],
        this.coverage.map((row) => [
          row.entity,
          row.field,
          String(row.present),
          String(row.total),
          row.total === 0 ? '—' : `${Math.round((row.present / row.total) * 100)}%`,
        ]),
      ),
    )

    lines.push('## Skipped')
    lines.push('')
    lines.push(
      ...table(
        ['Entity', 'Key', 'Reason'],
        this.skipped.map((row) => [row.entity, row.key, row.reason]),
      ),
    )

    lines.push('## Rejected')
    lines.push('')
    lines.push(
      ...table(
        ['Entity', 'Key', 'Reason'],
        this.rejected.map((row) => [row.entity, row.key, row.reason]),
      ),
    )

    lines.push('## Unresolved entities')
    lines.push('')
    lines.push(
      ...table(
        ['Entity', 'Key', 'Field', 'Missing value'],
        this.unresolved.map((row) => [row.entity, row.key, row.field, row.value]),
      ),
    )

    lines.push('## Conflicts')
    lines.push('')
    lines.push(
      ...table(
        ['Entity', 'Key', 'Field', 'Kept', 'Discarded', 'Reason'],
        this.conflicts.map((row) => [
          row.entity,
          row.key,
          row.field,
          String(row.kept),
          String(row.discarded),
          row.reason,
        ]),
      ),
    )

    lines.push('## Low-confidence facts (below the trivia floor)')
    lines.push('')
    lines.push(
      ...table(
        ['Entity', 'Key', 'Confidence'],
        this.lowConfidence.map((row) => [row.entity, row.key, String(row.confidence)]),
      ),
    )

    lines.push('## Sources')
    lines.push('')
    lines.push(
      ...table(
        ['Key', 'Kind', 'Title', 'URL', 'Revision', 'Retrieved'],
        [...this.sources.values()].map((source) => [
          source.naturalKey,
          source.kind,
          source.title,
          source.url ?? '—',
          source.revisionId === null ? '—' : String(source.revisionId),
          source.retrievedAt ?? '—',
        ]),
      ),
    )

    if (this.notes.length > 0) {
      lines.push('## Notes')
      lines.push('')
      for (const note of this.notes) lines.push(`- ${note}`)
      lines.push('')
    }

    return lines.join('\n')
  }
}

function sum(values: Iterable<number>): number {
  let total = 0
  for (const value of values) total += value
  return total
}

function table(headers: string[], rows: string[][]): string[] {
  if (rows.length === 0) return ['_none_', '']
  return [
    `| ${headers.join(' | ')} |`,
    `|${headers.map(() => '---').join('|')}|`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(' | ')} |`),
    '',
  ]
}

function escapeCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ')
}
