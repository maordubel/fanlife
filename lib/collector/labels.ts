import { t, type MessageKey } from '@/lib/i18n'

import type { AuthenticityClaim, CollectorError, CollectorLabel, Condition, Currency, ItemType, Size } from './types'

/**
 * מילים לערכים — מקום אחד, כדי שהארון, השוק והמכירה הפומבית יקראו לדבר אחד באותו שם.
 * המפתחות כתובים במלואם (כלל 32: מפתח שנבנה בזמן ריצה הוא מפתח שאף בדיקה לא רואה).
 */
const SIZE: Record<Size, MessageKey> = {
  kids: 'collector.size.kids',
  xs: 'collector.size.xs',
  s: 'collector.size.s',
  m: 'collector.size.m',
  l: 'collector.size.l',
  xl: 'collector.size.xl',
  xxl: 'collector.size.xxl',
  xxxl: 'collector.size.xxxl',
}
const CONDITION: Record<Condition, MessageKey> = {
  mint: 'collector.condition.mint',
  excellent: 'collector.condition.excellent',
  good: 'collector.condition.good',
  worn: 'collector.condition.worn',
  damaged: 'collector.condition.damaged',
}
const TYPE: Record<ItemType, MessageKey> = {
  original_period: 'collector.type.original_period',
  official_reissue: 'collector.type.official_reissue',
  replica: 'collector.type.replica',
  fan_reproduction: 'collector.type.fan_reproduction',
  unknown: 'collector.type.unknown',
}
const CLAIM: Record<AuthenticityClaim, MessageKey> = {
  original: 'collector.claim.original',
  match_worn: 'collector.claim.match_worn',
  unsure: 'collector.claim.unsure',
  replica: 'collector.claim.replica',
}
const ERROR: Partial<Record<CollectorError, MessageKey>> = {
  auth_required: 'collector.error.auth_required',
  network: 'collector.error.network',
  off: 'collector.error.off',
  slow_down: 'collector.error.slow_down',
  details_required: 'collector.error.details_required',
  price_required: 'collector.error.price_required',
  replica_claim: 'collector.error.replica_claim',
  photos_required: 'collector.error.photos_required',
  not_available: 'collector.error.not_available',
  busy: 'collector.error.busy',
  closed: 'collector.error.closed',
}

export const sizeLabel = (size: Size) => t(SIZE[size])
export const conditionLabel = (condition: Condition) => t(CONDITION[condition])
export const typeLabel = (type: ItemType) => t(TYPE[type])
export const claimLabel = (claim: AuthenticityClaim) => t(CLAIM[claim])
/** A refusal, as one sentence. Codes without a sentence of their own get the generic one. */
export const errorLabel = (error: CollectorError) => t(ERROR[error] ?? 'collector.error.generic')

/** A replica or fan reproduction is never shown without saying so (spec §24). */
export const isReproduction = (type: ItemType) => type === 'replica' || type === 'fan_reproduction'

export function handleLabel(label: Pick<CollectorLabel, 'handle' | 'nickname'>): string {
  return label.nickname ?? t('collector.handle', { n: String(label.handle) })
}

export function formatPrice(amount: number, currency: Currency): string {
  try {
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency, maximumFractionDigits: amount % 1 === 0 ? 0 : 2 }).format(amount)
  } catch {
    return `${amount} ${currency}`
  }
}
