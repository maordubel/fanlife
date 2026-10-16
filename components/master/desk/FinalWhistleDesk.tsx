'use client'
import {useCallback, useEffect, useState} from 'react'

type Job = {id: string; clubId: string; kind: string; state: string; dryRun: boolean; createdAt: string; attempts: number; note: string | null; result: {home: string; away: string; homeScore: number; awayScore: number; finalStatus: string}}
type Status = {
  config: {enabled: boolean; dryRun: boolean; allClubs?: boolean; delivery?: 'morning' | 'live'; clubIds: string[]; bootstrapAt: string | null; deliveryConfigured: boolean; deliverySeenAt: string | null}
  linked: boolean; linkedAt: string | null
  lastRun: {at: string; clubs: number; watched: number; created: number; errors: string[]} | null
  jobs: Job[]
  watches: {total: number; byState: Record<string, number>; needsReview: Array<{clubId: string; providerEventId: string; note: string | null; home: string | null; away: string | null; status: string | null}>}
}
const WORDS: Record<string, string> = {ready: 'Waiting to render', rendering: 'Rendering', sending: 'Sending', sent: 'Done', retryable_failed: 'Failed — will retry', needs_review: 'Needs you', delivery_unknown: 'Unknown — check the chat', superseded: 'Replaced'}

/**
 * FINAL WHISTLE in the control room (spec §12). Off by default; starts as a dry run (everything is checked and drawn, nothing is
 * sent). The bot token and the chat are never shown here — only whether they are set up.
 */
export function FinalWhistleDesk({clubs}: {clubs: Array<{id: string; name: string; live: boolean; provider: boolean}>}) {
  const [s, setS] = useState<Status | null>(null), [msg, setMsg] = useState<string | null>(null), [busy, setBusy] = useState(false), [code, setCode] = useState<string | null>(null)
  const load = useCallback(async () => {
    try { const r = await fetch('/api/master/final-whistle/status', {cache: 'no-store'}); const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Could not load'); setS(j); setMsg(null) }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Could not load') }
  }, [])
  useEffect(() => { void load() }, [load])
  async function post(action: string, body: Record<string, unknown>) {
    setBusy(true); setMsg(null)
    try { const r = await fetch(`/api/master/final-whistle/${action}`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)}); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Could not save'); await load() }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Could not save') } finally { setBusy(false) }
  }
  if (!s) return <section className="desk-sub" id="final-whistle" aria-labelledby="fw-h"><h2 id="fw-h">Final Whistle</h2><p className="desk-state" role="status" data-state={msg ? 'error' : 'empty'}>{msg ?? 'Loading…'}</p></section>
  const c = s.config
  const all = c.allClubs !== false, delivery = c.delivery ?? 'morning'
  const chosen = new Set(c.clubIds)
  const toggle = (id: string) => post('config', {clubIds: chosen.has(id) ? c.clubIds.filter(x => x !== id) : [...c.clubIds, id]})
  const mode = !c.enabled ? 'Off' : c.dryRun ? 'On · dry run (nothing is sent)' : 'On · sending to Telegram'
  return <section className="desk-sub" id="final-whistle" aria-labelledby="fw-h">
    <h2 id="fw-h">Final Whistle</h2>
    <p className="desk-fine">After a real match of any of your clubs ends and the result is confirmed twice, five minutes apart, the story card is drawn and sent to your Telegram — {delivery === 'live' ? 'right away' : 'every morning at 06:00 (Athens) with yesterday’s results'}. Status: <b>{mode}</b>.</p>
    {msg && <p role="alert" className="desk-state" data-state="error">{msg}</p>}
    <ul className="desk-rows">
      <li><span className="desk-stamp" data-ok={s.linked || undefined}>{s.linked ? 'Linked' : 'Not linked'}</span><div><b>Your Telegram chat</b><p className="desk-fine">{s.linked ? 'Results go to your private chat.' : 'Press “Link Telegram”, then send the code to the bot as /link CODE.'}</p>{code && <p className="desk-fine">Send this to @FanLife_appbot within 15 minutes: <b><bdi>/link {code}</bdi></b></p>}</div></li>
      <li><span className="desk-stamp" data-ok={c.deliveryConfigured || undefined}>{c.deliveryConfigured ? 'Set up' : 'Not seen'}</span><div><b>Bot token in GitHub</b><p className="desk-fine">{c.deliverySeenAt ? `Last reported ${new Date(c.deliverySeenAt).toLocaleString('en-GB')}.` : 'Reported by the next scheduled run.'}</p></div></li>
    </ul>
    <p className="desk-actions">
      <button type="button" className="desk-btn ghost min-h-tap" disabled={busy} onClick={async () => { setBusy(true); try { const r = await fetch('/api/master/final-whistle/link-code', {method: 'POST'}); const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Could not make a code'); setCode(j.code); setMsg(null) } catch (e) { setMsg(e instanceof Error ? e.message : 'Could not make a code') } finally { setBusy(false) } }}>{s.linked ? 'Link a different chat' : 'Link Telegram'}</button>
      <button type="button" className="desk-btn ghost min-h-tap" disabled={busy} onClick={() => post('config', {delivery: delivery === 'morning' ? 'live' : 'morning'})}>{delivery === 'morning' ? 'Send at the whistle instead' : 'Send at 06:00 instead'}</button>
      <button type="button" className="desk-btn min-h-tap" disabled={busy} onClick={() => post('config', {enabled: !c.enabled})}>{c.enabled ? 'Switch off' : 'Switch on'}</button>
      <button type="button" className="desk-btn ghost min-h-tap" disabled={busy || (!c.dryRun && false)} onClick={() => post('config', {dryRun: !c.dryRun})}>{c.dryRun ? 'Stop the dry run — start sending' : 'Back to dry run'}</button>
    </p>
    {!c.dryRun && (!s.linked || !c.deliveryConfigured) && <p className="desk-state" data-state="error" role="status">Sending is on, but delivery is not fully set up — results will wait and retry.</p>}
    <h3>Clubs to watch</h3>
    <p className="desk-actions"><label className="min-h-tap"><input type="checkbox" checked={all} disabled={busy} onChange={() => post('config', {allClubs: !all})}/> All my clubs, published or not</label></p>
    <ul className="desk-rows">{clubs.map(k => <li key={k.id}><label className="min-h-tap"><input type="checkbox" checked={all ? k.provider : chosen.has(k.id)} disabled={busy || all || !k.provider} onChange={() => toggle(k.id)}/> <bdi>{k.name}</bdi></label>{!k.provider ? <span className="desk-fine"> · the results provider does not know this club</span> : !k.live ? <span className="desk-fine"> · not published (still watched)</span> : null}</li>)}</ul>
    {s.lastRun && <p className="desk-fine">Last look {new Date(s.lastRun.at).toLocaleString('en-GB')}: {s.lastRun.clubs} clubs, {s.lastRun.watched} finals seen, {s.lastRun.created} new jobs{s.lastRun.errors.length ? `, ${s.lastRun.errors.length} problem${s.lastRun.errors.length === 1 ? '' : 's'}: ${s.lastRun.errors.slice(0, 3).join(' · ')}` : ''}.</p>}
    {s.watches.needsReview.length > 0 && <><h3>Results that wait for you</h3><ul className="desk-rows">{s.watches.needsReview.map(w => <li key={w.clubId + w.providerEventId}><span className="desk-stamp">Check</span><div><b><bdi>{w.home} – {w.away}</bdi></b><p className="desk-fine">{w.note} · provider status “{w.status}”</p></div></li>)}</ul></>}
    <h3>Latest jobs</h3>
    {s.jobs.length === 0 ? <p className="desk-fine">None yet. A job appears when a confirmed final is found.</p> : <ul className="desk-rows">{s.jobs.map(j => <li key={j.id}>
      <span className="desk-stamp" data-ok={j.state === 'sent' || undefined}>{WORDS[j.state] ?? j.state}</span>
      <div><b><bdi>{j.result.home} {j.result.homeScore}–{j.result.awayScore} {j.result.away}</bdi></b> <span className="desk-fine">{j.kind === 'CORRECTED' ? 'corrected result · ' : ''}{j.dryRun ? 'dry run · ' : ''}{j.result.finalStatus}</span>
        {j.note && <p className="desk-fine">{j.note}</p>}
        {['retryable_failed', 'needs_review', 'delivery_unknown'].includes(j.state) && <p className="desk-actions"><button type="button" className="desk-btn ghost min-h-tap" disabled={busy} onClick={() => post('retry', {jobId: j.id})}>{j.state === 'delivery_unknown' ? 'Resend (may duplicate)' : 'Try again'}</button><button type="button" className="desk-btn ghost min-h-tap" disabled={busy} onClick={() => post('dismiss', {jobId: j.id})}>Dismiss</button></p>}
      </div></li>)}</ul>}
  </section>
}
