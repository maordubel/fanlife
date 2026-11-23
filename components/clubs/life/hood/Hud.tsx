'use client'
/** LIFE · the game — the HUD over the street: glass panels, round minimap with a progress ring, objective pill, thumbs, prompt, banners. */
import type {MutableRefObject, PointerEvent as RPE} from 'react'
import {Icon} from './Icons'
import css from './hood.module.css'

type W = (k: string, extra?: Record<string, string>) => string
export type Banner = {id: number; kind: 'major' | 'minor'; title: string; sub?: string}
export type HudRefs = {arrow: MutableRefObject<HTMLElement | null>; dist: MutableRefObject<HTMLElement | null>; map: MutableRefObject<HTMLCanvasElement | null>; ring: MutableRefObject<SVGCircleElement | null>; clock: MutableRefObject<HTMLElement | null>}
export const RING_R = 47, RING_LEN = 2 * Math.PI * RING_R

export type HudProps = {
  w: W; refs: HudRefs; hidden: boolean; touch: boolean; cam: 'chase' | 'eyes'; sprintOn: boolean; ghost: boolean
  kicker: string; objective: string; free: boolean; hasTarget: boolean
  place: string | null; banner: Banner | null; near: string | null; cash: number
  stickAt: {x: number; y: number; dx: number; dy: number} | null
  onMap: () => void; onPause: () => void; onBag: () => void; onCam: () => void; onTalk: () => void; onSprint: (on: boolean) => void
  stick: {down: (e: RPE<HTMLDivElement>) => void; move: (e: RPE<HTMLDivElement>) => void; up: (e: RPE<HTMLDivElement>) => void}
}

export function Hud(p: HudProps) {
  const {w, refs} = p
  return (
    <div className={css.lgHud} data-hidden={p.hidden} data-life="hood-hud">
      <button type="button" className={css.lgMiniWrap} aria-label={w('hood.hud.map')} onClick={p.onMap}>
        <canvas ref={refs.map} width={224} height={224} aria-hidden="true" />
        <svg className={css.lgRing} viewBox="0 0 100 100" aria-hidden="true"><circle className={css.lgRingBg} cx="50" cy="50" r={RING_R} /><circle ref={refs.ring} className={css.lgRingFg} cx="50" cy="50" r={RING_R} strokeDasharray={RING_LEN} strokeDashoffset={RING_LEN} /></svg>
      </button>
      <div className={css.lgGlass + ' ' + css.lgObj} aria-live="polite" data-free={p.free} data-life="hood-job">
        <small>{p.kicker}</small>
        <b>{p.objective}</b>
        <span><i ref={refs.arrow} className={css.lgArrow} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 2l8 19-8-5-8 5z" /></svg></i><bdi ref={refs.dist} /></span>
      </div>
      <div className={css.lgChips2}>
        <span className={css.lgGlass + ' ' + css.lgPill} aria-label={w('hood.hud.time')}><Icon n="pin" /><b ref={refs.clock} style={{fontWeight: 400}}>17:40</b></span>
        <span className={css.lgGlass + ' ' + css.lgPill} aria-label={w('hood.hud.cash')}><Icon n="coin" />{p.cash}</span>
      </div>
      <div className={css.lgTopRight}>
        <button type="button" className={css.lgGlass + ' ' + css.lgIconBtn} aria-label={w('hood.hud.pause')} onClick={p.onPause}><Icon n="pause" /></button>
        <button type="button" className={css.lgGlass + ' ' + css.lgIconBtn} aria-label={w('hood.hud.bag')} onClick={p.onBag}><Icon n="bag" /></button>
      </div>
      {p.place && <div className={css.lgPlaceToast} key={p.place} data-life="hood-place"><div className={css.lgGlass}><small>{w('hood.hud.you')}</small><b>{p.place}</b></div></div>}
      {p.banner && <div className={css.lgBanner} key={p.banner.id} role="status" data-kind={p.banner.kind}><div><b>{p.banner.title}</b>{p.banner.sub && <span>{p.banner.sub}</span>}</div></div>}
      {p.near && <div className={css.lgPrompt} role="status"><div className={css.lgGlass}>{p.touch ? <Icon n="talk" /> : <kbd>E</kbd>}<span>{p.near}</span></div></div>}
      {p.touch ? (
        <>
          {p.ghost && <div className={css.lgStickGhost} aria-hidden="true"><i /><span>{w('hood.touch')}</span></div>}
          <div className={css.lgStickZone} onPointerDown={p.stick.down} onPointerMove={p.stick.move} onPointerUp={p.stick.up} onPointerCancel={p.stick.up} />
          {p.stickAt && <div className={css.lgStick} style={{insetBlockStart: p.stickAt.y, insetInlineStart: p.stickAt.x}}><i style={{transform: `translate(${p.stickAt.dx}px, ${p.stickAt.dy}px)`}} /></div>}
          <div className={css.lgPads}>
            <button type="button" className={css.lgPad} data-kind="cam" aria-pressed={p.cam === 'eyes'} aria-label={w('hood.hud.camera')} onClick={p.onCam}><Icon n="eye" /></button>
            <button type="button" className={css.lgPad} data-kind="talk" data-hot={!!p.near} aria-label={w('hood.hud.talk')} onPointerDown={e => { e.preventDefault(); p.onTalk() }}><Icon n="talk" />{w('hood.hud.talk')}</button>
            <button type="button" className={css.lgPad} data-kind="sprint" data-on={p.sprintOn} aria-label={w('hood.hud.hold')} aria-pressed={p.sprintOn} onPointerDown={e => { e.preventDefault(); p.onSprint(true) }} onPointerUp={() => p.onSprint(false)} onPointerLeave={() => p.onSprint(false)} onPointerCancel={() => p.onSprint(false)} onContextMenu={e => e.preventDefault()}><Icon n="sprint" />{w('hood.hud.sprint')}</button>
          </div>
        </>
      ) : <div className={css.lgKeys}><p className={css.lgGlass}>{w('hood.free.keys')}</p></div>}
    </div>
  )
}
