'use client'
/** LIFE · the game — the kit bag: the supporter's figure, the wearing slot, the starter slots and what he carries, an item detail. */
import {useState} from 'react'
import type {BagId, BagItem} from '@/lib/life/hood/bag'
import type {CardThing} from '@/lib/life/hood/things'
import {Icon, type IconName} from './Icons'
import css from './hood.module.css'

type W = (k: string, extra?: Record<string, string>) => string
const ICON: Record<string, IconName> = {scarf: 'scarf', ticket: 'ticket', pass: 'pass', bag: 'bag', batteries: 'battery', 'dads-scarf': 'scarf', 'carry:battery': 'battery', 'keep:scarf': 'scarf', 'keep:ticket': 'ticket', 'keep:box': 'pass'}
/** a story thing: its own icon where there is one, a bag for what he carries, the ticket's half for what went in the Box */
const iconOf = (id: BagId): IconName => ICON[id] ?? (id.startsWith('carry:') ? 'bag' : id.startsWith('keep:') ? 'ticket' : 'bag')

/** the supporter, drawn: jacket, trousers, and the terrace scarf in the club's colours when it is worn */
function Figure({scarf, accent, second}: {scarf: boolean; accent: string; second: string}) {
  return (
    <svg viewBox="0 0 160 280" aria-hidden="true">
      <ellipse cx="80" cy="268" rx="46" ry="6" className={css.lgFShadow} opacity=".35" />
      <path d="M62 150h36l4 92H88l-8-60-8 60H58z" className={css.lgFPants} />
      <path d="M56 242h22v14H52zM82 242h22l4 14H82z" className={css.lgFShoe} />
      <path d="M46 86c0-12 10-20 22-20h24c12 0 22 8 22 20l6 70h-18l-2-44-2 50H62l-2-50-2 44H40z" className={css.lgFJacket} strokeOpacity=".25" strokeWidth="1.5" />
      <path d="M38 100l-8 56h14l8-50zM122 100l8 56h-14l-8-50z" className={css.lgFJacket} strokeOpacity=".2" />
      <circle cx="36" cy="160" r="7" className={css.lgFSkin2} /><circle cx="124" cy="160" r="7" className={css.lgFSkin2} />
      <rect x="71" y="52" width="18" height="18" rx="6" className={css.lgFSkin2} />
      <ellipse cx="80" cy="40" rx="20" ry="23" className={css.lgFSkin} />
      <path d="M59 36c0-16 10-24 21-24s21 8 21 24c-6-8-13-11-21-11s-15 3-21 11z" className={css.lgFHair} />
      <circle cx="73" cy="42" r="2" className={css.lgFHair} /><circle cx="87" cy="42" r="2" className={css.lgFHair} />
      <path d="M74 52q6 4 12 0" fill="none" className={css.lgFMouth} strokeWidth="1.6" strokeLinecap="round" />
      {scarf && <g>
        <path d="M60 64c12 8 28 8 40 0l3 14c-14 9-32 9-46 0z" fill={accent} />
        <path d="M68 68l-2 11M76 71l-1 12M84 71l1 12M92 68l2 11" stroke={second} strokeWidth="3" />
        <path d="M86 76h14l4 56h-16z" fill={accent} /><path d="M88 96h14M89 110h14M90 124h14" stroke={second} strokeWidth="3.5" />
      </g>}
    </svg>
  )
}

export function BagScreen({w, items, cards = [], cardsAll = 0, accent, second, onWear, onClose, onTab}: {w: W; items: BagItem[]; /** THE ALBUM's stickers found in the street */ cards?: CardThing[]; cardsAll?: number; accent: string; second: string; onWear: (on: boolean) => void; onClose: () => void; onTab: () => void}) {
  const [sel, setSel] = useState<BagId>('scarf')
  const it = items.find(i => i.id === sel) ?? items[0]!
  const wearing = items.find(i => i.id === 'scarf')?.worn ?? false
  const stateWord = it.state === 'locked' ? w('hood.bag.locked') : it.state === 'empty' ? w('hood.bag.empty') : it.state === 'carried' ? w('hood.bag.carrying') : it.worn ? w('hood.bag.worn') : ''
  return (
    <section className={css.lgScreen + ' ' + css.lgBagPage} data-solid="true" aria-label={w('hood.bag.title')} data-life="hood-bag">
      <div className={css.lgBar}>
        <span className={css.lgBrandMark}>{w('hood.brand')}</span>
        <div className={css.lgTabs}><button type="button" className={css.lgTab} onClick={onTab}>{w('hood.pause.map')}</button><button type="button" className={css.lgTab} aria-current="true">{w('hood.pause.bag')}</button></div>
        <button type="button" className={css.lgIconBtn} aria-label={w('hood.close')} onClick={onClose}><Icon n="close" /></button>
      </div>
      <div><p className={css.lgKicker}>{w('hood.bag.kicker')}</p><h1 className={css.lgH1}>{w('hood.bag.title')}</h1></div>
      <div className={css.lgBagBody}>
        <div className={css.lgPortrait}><Figure scarf={wearing} accent={accent} second={second} /><small>{w('hood.bag.portrait')}{wearing ? ` · ${w('hood.bag.wearing')}: ${w('hood.bag.scarf')}` : ''}</small></div>
        <div className={css.lgSide}>
          <div className={css.lgSlots} role="group" aria-label={w('hood.bag.carrying')}>
            {items.map(i => (
              <button key={i.id} type="button" className={css.lgSlot + ' min-h-tap'} data-state={i.state} aria-pressed={sel === i.id} onClick={() => setSel(i.id)}>
                {i.worn && <span className={css.lgSlotWorn} aria-hidden="true" />}
                {i.count > 1 && <span className={css.lgSlotCount}>{w('hood.bag.count', {n: String(i.count)})}</span>}
                {i.art && i.state !== 'locked' ? <img className={css.lgSlotArt} src={i.art} alt="" decoding="async" /> : <Icon n={i.state === 'locked' ? 'lock' : iconOf(i.id)} />}
                <span>{w(i.nameKey)}</span>
              </button>
            ))}
          </div>
          <div className={css.lgInfo + ' ' + css.lgDetail} aria-live="polite">
            {stateWord && <span className={css.lgInfoFlag}>{stateWord}</span>}
            {it.art && it.state !== 'locked' && <img className={css.lgDetailArt} src={it.art} alt="" decoding="async" />}
            <h2>{w(it.nameKey)}</h2>
            {it.note && <p className={css.lgInfoNote}>{it.note}</p>}
            <p>{w(it.descKey)}</p>
            {it.wearable && <button type="button" className={css.lgBtn} data-primary={!it.worn} onClick={() => onWear(!it.worn)}>{it.worn ? w('hood.bag.takeoff') : w('hood.bag.wear')}<Icon n="scarf" /></button>}
          </div>
          {cardsAll > 0 && (
            <div className={css.lgCards} aria-label={w('hood.bag.cards', {n: String(cards.length), all: String(cardsAll)})}>
              <div className={css.lgCardsHead}><b>{w('hood.bag.cards', {n: String(cards.length), all: String(cardsAll)})}</b><a className={css.lgCardsLink + ' min-h-tap'} href="/album">{w('hood.bag.album')}<Icon n="chevron" /></a></div>
              {cards.length === 0 ? <p className={css.lgCardsNone}>{w('hood.bag.cards.none')}</p> : (
                <ul className={css.lgCardsRow}>
                  {cards.map(c => <li key={c.id} className={css.lgCard}>{c.src ? <img src={c.src} alt="" loading="lazy" decoding="async" /> : c.kit ? <img src={c.kit} alt="" data-kit="true" loading="lazy" decoding="async" /> : <span aria-hidden="true" />}<b>{c.name}</b><small>{c.code}</small></li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
