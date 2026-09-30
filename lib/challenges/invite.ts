import { t } from '@/lib/i18n'
import { whatsappLine } from '@/lib/voice/select'

import type { Challenge, ChallengeResult } from './contract'
import { challengeLink } from './create'
import { figureOf } from './score'

/**
 * INVITE — the words that travel with the link (§29). Client-safe.
 *
 * Short and human, the gate's own line from the voice (`voice.g<N>.whatsapp`), then the
 * link on a line of its own so the chat draws the preview card. The only thing the line
 * may be filled with is what the RESULT counts — "זכרתי 9/12", "תפסתי ברמז 3" — never a
 * name, never the answer.
 */
export function inviteVars(result: ChallengeResult | undefined): Record<string, string> {
  if (!result) return {}
  switch (result.gate) {
    case 2:
    case 3:
      return { n: String(figureOf(result)?.value ?? 0) }
    case 10:
      return { n: String(result.hints) }
    case 13:
      return { n: String(figureOf(result)?.value ?? 0) }
    default:
      return {}
  }
}

/** The line alone — also the Open Graph title of the landing. */
export function inviteLine(challenge: Challenge, extra: Record<string, string> = {}): string {
  const vars = { ...inviteVars(challenge.result), ...extra }
  const r = challenge.result
  // two lines the gate's own voice cannot say truthfully: "תפסתי ברמז N" when he got
  // away, and "חיברתי ב-N צעדים" on the ORDER board, which has no steps
  if (r?.gate === 10 && r.status !== 'solved') return t('challenge.invite.bcAway', vars)
  if (challenge.gate === 13 && challenge.params.variant === 'order') {
    return r ? t('challenge.invite.order', { ...vars, total: String(r.gate === 13 && r.variant === 'order' ? r.marks.length : 10) }) : t('challenge.invite.orderPlain')
  }
  if (!r && challenge.gate !== 1) return t('challenge.invite.plain')
  return whatsappLine(challenge.gate, vars)
}

/** The whole WhatsApp body: the line, a blank line, the link. */
export function inviteText(challenge: Challenge, code: string, extra: Record<string, string> = {}): string {
  return `${inviteLine(challenge, extra)}\n\n${challengeLink(code)}`
}

export function whatsappInviteHref(challenge: Challenge, code: string, extra: Record<string, string> = {}): string {
  return `https://wa.me/?text=${encodeURIComponent(inviteText(challenge, code, extra))}`
}

export function telegramInviteHref(challenge: Challenge, code: string, extra: Record<string, string> = {}): string {
  return `https://t.me/share/url?url=${encodeURIComponent(challengeLink(code))}&text=${encodeURIComponent(inviteLine(challenge, extra))}`
}
