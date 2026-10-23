'use client'
import { useEffect, useRef, type CSSProperties } from 'react'

import { Dialogue } from '@/components/clubs/life/Dialogue'
import { Hud } from '@/components/clubs/life/Hud'
import { MiniGame } from '@/components/clubs/life/MiniGame'
import { TapChip } from '@/components/clubs/life/TapChip'
import type { TypedHandle } from '@/components/clubs/life/Typed'
import styles from '@/components/clubs/life/life.module.css'

/** QA only: LIFE's chrome on a plain night ground, so every piece of paper can be photographed without the 3D world. */
export function Preview({ style, club, initials, show, copy }: { style: CSSProperties; club: string; initials: string; show: string; copy: Record<string, string> }) {
  const handle = useRef<TypedHandle | null>(null), sheet = useRef<HTMLElement | null>(null), primary = useRef<HTMLButtonElement | null>(null), armed = useRef(false), plate = useRef<HTMLElement | null>(null)
  // the shell measures the HUD and aims the balloon's tail at the speaker; here both are set by hand
  useEffect(() => { const el = sheet.current; if (el && show !== 'narr') { el.dataset.tail = 'on'; el.style.setProperty('--tail', show === 'me' ? '.6' : '.45') } }, [show])
  const talking = ['speech', 'narr', 'me', 'choices'].includes(show)
  const line = {
    speech: { who: 'dad', speaker: 'Dad', me: false, text: 'QA sample — Quarter to. Bring the radio, the good one with the aerial.' },
    narr: { who: null, speaker: null, me: false, text: 'QA sample — The street smells of oranges and diesel. Somewhere a radio is already on.' },
    me: { who: 'me', speaker: 'You', me: true, text: 'QA sample — I am coming. Wait for me at the corner.' },
    choices: { who: 'ofir', speaker: 'Ofir', me: false, text: 'QA sample — So are you in, or are you staying with your mum?' },
  }[show as 'speech'] ?? null
  return (
    <div className={styles.life} style={{ ...style, '--l-hud': '128px' } as CSSProperties} data-phase="play" data-life="qa-ui">
      <div className={styles.stage} />
      <Hud plateRef={plate} initials={initials} serial={`№ 01 · ${copy['me.age'] ?? 'Age'} 6`} place="QA sample — The living room" objective="QA sample — Bring Dad the radio" coins={12} saved={3} energy={20} standing={44} talking={talking} copy={copy} story={{}} onMeter={() => {}} onMap={() => {}} onMenu={() => {}} />
      {show === 'tap' && <div style={{ '--l-foot': '24px' } as CSSProperties}><TapChip verb="Talk" name="QA sample — Dad" locked={false} hint={null} story={{}} onAct={() => {}} /></div>}
      {show === 'notes' && (
        <div className={styles.notes} data-life="notes">
          <div className={styles.place}><small>{club}</small><b>QA sample — The corner kiosk</b></div>
          <ul className={styles.deltas}><li data-tone="up">+2 Standing</li><li data-tone="down">−4 Coins</li><li>Ofir remembers</li></ul>
        </div>
      )}
      {line && (
        <Dialogue
          text={line.text} who={line.who} speaker={line.speaker} me={line.me} asking={show === 'choices'} serial={`qa:${show}`} story={{}}
          choices={show === 'choices' ? [{ id: 'a', t: 'QA sample — I am in. Save me a place.' }, { id: 'b', t: 'QA sample — Not tonight.' }, { id: 'c', t: 'QA sample — Ask me after dinner.' }] : []}
          handle={handle} sheetRef={sheet} primaryRef={primary} armedRef={armed} copy={copy} typed onAdvance={() => {}} onChoose={() => {}} onLeave={() => {}} onTyped={() => {}}
        />
      )}
      {(show === 'menu' || show === 'card') && (
        <section className={`${styles.cover} z-[60]`} role="dialog" aria-modal="true" aria-labelledby="qa-title" data-life={show === 'menu' ? 'menu' : 'chapter-card'}>
          <div className={styles.ticket} data-kind={show === 'card' ? 'archive' : undefined}>
            <p className={styles.serial}>{show === 'card' ? copy.archive : club}</p>
            <h2 id="qa-title" className={styles.cardTitle}>{show === 'menu' ? copy.menuTitle : 'QA sample — The night the lights went out'}</h2>
            {show === 'menu' ? (
              <div className={styles.menuList}>
                <button type="button" className={`${styles.button} min-h-tap`}>{copy.resume}<small>{copy['menu.pausedNote']}</small></button>
                <button type="button" className={`${styles.row} min-h-tap`}>{copy['menu.map']}</button>
                <button type="button" className={`${styles.row} min-h-tap`}>{copy['menu.me']}</button>
                <button type="button" className={`${styles.row} min-h-tap`} aria-pressed>{copy.soundOn}</button>
                <button type="button" className={`${styles.row} min-h-tap`}>{copy.restartChapter}<small>{copy.restartChapterNote}</small></button>
                <button type="button" className={`${styles.row} min-h-tap`}>{copy.startOver}</button>
              </div>
            ) : (
              <>
                <p className={styles.lede}>QA sample — a card out of the archive, set as a page of the weekly.</p>
                <dl className={styles.stub}><div><dt>Chapter</dt><dd>3</dd></div><div><dt>Age</dt><dd>16</dd></div><div><dt>Place</dt><dd>The stand</dd></div></dl>
                <div className={styles.actions}><button type="button" className={`${styles.quiet} min-h-tap`}>{copy.no}</button><button type="button" className={`${styles.button} min-h-tap`} data-life="card-next">{copy.next}</button></div>
              </>
            )}
          </div>
        </section>
      )}
      {show === 'game' && (
        <div className={`${styles.cover} z-[60]`} data-clear="true" data-life="game">
          <MiniGame game="kick" id="qa-kick" amount={3} copy={copy} reduced={false} cue={() => {}} onDone={() => {}} />
        </div>
      )}
    </div>
  )
}
