'use client'
import {useCallback, useEffect, useState} from 'react'

type Row = {id: string; day: string; revision: number; kind: string; state: string; mode: string; dryRun: boolean; notBefore: string; attempts: number; note: string | null; sentAt: string | null; coverage: string; fixtures: number; updatedAt: string; missingClubIds: string[]; missingCrests: string[]; excluded: number}
type Status = {config: {enabled: boolean; dryRun: boolean; allClubs: boolean; clubIds: string[]; allowMissingCrests: boolean; sendEmptyDay: boolean; sendPartial: boolean; sendHour: number}; jobs: Row[]}
const WORDS: Record<string, string> = {ready: 'Waiting for 05:00', rendering: 'Drawing', sending: 'Sending', sent: 'Done', retryable_failed: 'Failed — will retry', needs_review: 'Needs you', delivery_unknown: 'Unknown — check the chat', superseded: 'Set aside'}
const MODES: Record<string, string> = {images: 'Stories + posts', text: 'Text only', blocked: 'Nothing drawn'}

/**
 * TODAY'S FOOTBALL in the control room. Off by default and a dry run when first switched on (drawn and checked, never sent).
 * It sends to the same Telegram chat as Final Whistle; the bot token and chat are set up there and never shown here.
 */
export function MatchdayDesk({clubs}: {clubs: Array<{id: string; name: string; provider: boolean}>}) {
  const [s, setS] = useState<Status | null>(null), [msg, setMsg] = useState<string | null>(null), [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    try { const r = await fetch('/api/master/matchday/status', {cache: 'no-store'}); const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Could not load'); setS(j); setMsg(null) }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Could not load') }
  }, [])
  useEffect(() => { void load() }, [load])
  async function post(action: string, body: Record<string, unknown>) {
    setBusy(true); setMsg(null)
    try { const r = await fetch(`/api/master/matchday/${action}`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)}); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Could not save'); await load() }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Could not save') } finally { setBusy(false) }
  }
  if (!s) return <section className="desk-sub" id="matchday" aria-labelledby="md-h"><h2 id="md-h">Today’s Football</h2><p className="desk-state" role="status" data-state={msg ? 'error' : 'empty'}>{msg ?? 'Loading…'}</p></section>
  const c = s.config, chosen = new Set(c.clubIds)
  const mode = !c.enabled ? 'Off' : c.dryRun ? 'On · dry run (nothing is sent)' : 'On · sending to Telegram'
  const flag = (key: string, label: string, v: boolean) => <label className="min-h-tap"><input type="checkbox" checked={v} disabled={busy} onChange={() => post('config', {[key]: !v})}/> {label}</label>
  return <section className="desk-sub" id="matchday" aria-labelledby="md-h">
    <h2 id="md-h">Today’s Football</h2>
    <p className="desk-fine">Every morning at {String(c.sendHour).padStart(2, '0')}:00 (Athens) the day’s matches of your clubs are drawn as stories and posts and sent to the same Telegram chat as Final Whistle. A day is never called empty unless the provider confirmed it.</p>
    {msg && <p role="alert" className="desk-state" data-state="error">{msg}</p>}
    <p className="desk-fine"><b>{mode}</b></p>
    <p className="desk-actions">
      <button type="button" className="desk-btn min-h-tap" disabled={busy} onClick={() => post('config', {enabled: !c.enabled})}>{c.enabled ? 'Switch off' : 'Switch on'}</button>
      <button type="button" className="desk-btn ghost min-h-tap" disabled={busy} onClick={() => post('config', {dryRun: !c.dryRun})}>{c.dryRun ? 'Stop the dry run — start sending' : 'Back to dry run'}</button>
    </p>
    <p className="desk-actions">{flag('allowMissingCrests', 'Draw graphics even when a crest is missing', c.allowMissingCrests)}</p>
    <p className="desk-actions">{flag('sendEmptyDay', 'Send a note on days with no games', c.sendEmptyDay)}</p>
    <p className="desk-actions">{flag('sendPartial', 'Send even when some clubs could not be confirmed', c.sendPartial)}</p>
    <h3>Clubs</h3>
    <p className="desk-actions">{flag('allClubs', 'All my clubs', c.allClubs)}</p>
    {!c.allClubs && <ul className="desk-rows">{clubs.map(k => <li key={k.id}><label className="min-h-tap"><input type="checkbox" checked={chosen.has(k.id)} disabled={busy || !k.provider} onChange={() => post('config', {clubIds: chosen.has(k.id) ? c.clubIds.filter(x => x !== k.id) : [...c.clubIds, k.id]})}/> <bdi>{k.name}</bdi></label>{!k.provider && <span className="desk-fine"> · no schedule source</span>}</li>)}</ul>}
    <h3>Latest days</h3>
    {s.jobs.length === 0 ? <p className="desk-fine">None yet. Run “Today’s Football” in GitHub Actions once with the dry-run option to see the first one.</p> : <ul className="desk-rows">{s.jobs.map(j => <li key={j.id}>
      <span className="desk-stamp" data-ok={j.state === 'sent' || undefined}>{WORDS[j.state] ?? j.state}</span>
      <div><b>{j.day}</b> <span className="desk-fine">{j.kind === 'UPDATED' ? 'updated schedule · ' : ''}{j.dryRun ? 'dry run · ' : ''}{MODES[j.mode] ?? j.mode} · {j.fixtures} {j.fixtures === 1 ? 'match' : 'matches'} · coverage {j.coverage}</span>
        {j.note && <p className="desk-fine">{j.note}</p>}
        {j.missingClubIds.length > 0 && <p className="desk-fine">Not confirmed: {j.missingClubIds.join(', ')}</p>}
        <p className="desk-actions">
          {['retryable_failed', 'needs_review', 'delivery_unknown'].includes(j.state) && <><button type="button" className="desk-btn ghost min-h-tap" disabled={busy} onClick={() => post('retry', {jobId: j.id})}>{j.state === 'delivery_unknown' ? 'Send again (may duplicate)' : 'Try again'}</button><button type="button" className="desk-btn ghost min-h-tap" disabled={busy} onClick={() => post('dismiss', {jobId: j.id})}>Set aside</button></>}
          {j.state === 'sent' && !j.dryRun && <button type="button" className="desk-btn ghost min-h-tap" disabled={busy} onClick={() => post('revise', {jobId: j.id})}>Send an updated schedule</button>}
        </p>
      </div></li>)}</ul>}
  </section>
}
