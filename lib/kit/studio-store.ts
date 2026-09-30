'use client'

import type { KitBodyTemplateId } from './body-templates'
import type { KitSpec } from './spec'
import type { KitBriefId, StudioMetrics } from './studio'

const KEY = 'worker.kitStudio.v1'

export type SavedKitDesign = {
  id: string
  createdOn: string
  updatedOn: string
  briefId: KitBriefId
  spec: KitSpec
  dnaKeys: string[]
  metrics: StudioMetrics
  stamp: boolean
  bodyTemplateId?: KitBodyTemplateId
}

export interface StudioStore {
  readonly remote: boolean
  read(): Promise<SavedKitDesign[]>
  save(design: Omit<SavedKitDesign, 'id' | 'createdOn' | 'updatedOn'> & { id?: string }): Promise<SavedKitDesign>
  remove(id: string): Promise<void>
}

export class LocalStudioStore implements StudioStore {
  readonly remote = false

  async read(): Promise<SavedKitDesign[]> {
    try {
      const raw = window.localStorage.getItem(KEY)
      if (!raw) return []
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed as SavedKitDesign[] : []
    } catch {
      return []
    }
  }

  async save(design: Omit<SavedKitDesign, 'id' | 'createdOn' | 'updatedOn'> & { id?: string }): Promise<SavedKitDesign> {
    const rows = await this.read()
    const existing = design.id ? rows.find((row) => row.id === design.id) : undefined
    const now = new Date().toISOString()
    const saved: SavedKitDesign = {
      ...design,
      id: existing?.id ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      createdOn: existing?.createdOn ?? now,
      updatedOn: now,
    }
    try {
      const next = existing ? rows.map((row) => row.id === saved.id ? saved : row) : [saved, ...rows]
      window.localStorage.setItem(KEY, JSON.stringify(next.slice(0, 30)))
    } catch {}
    return saved
  }

  async remove(id: string): Promise<void> {
    try {
      const rows = await this.read()
      window.localStorage.setItem(KEY, JSON.stringify(rows.filter((row) => row.id !== id)))
    } catch {}
  }
}

export function activeStudioStore(): StudioStore {
  return new LocalStudioStore()
}
