'use client'
/**
 * The tap chip — on a touch device the foot of the glass names the verb and the thing in reach, and is
 * itself the button (the Worker's TapChip). With nothing in reach it carries the one hint a first-time
 * supporter needs, and goes away.
 */
type Story = {lang?: string; dir?: 'ltr' | 'rtl'}
import styles from './life.module.css'

export function TapChip({verb, name, locked, hint, story, onAct}: {verb: string | null; name: string | null; locked: boolean; hint: string | null; story: Story; onAct: () => void}) {
  if (verb && name) {
    return (
      <button type="button" className={`${styles.tapChip} min-h-tap`} data-life="tap-chip" data-locked={locked ? 'true' : 'false'} onClick={onAct}>
        <span className={styles.tapVerb}>{verb}</span><span className={styles.tapName} {...story}><bdi>{name}</bdi></span><span className={styles.tapGo} aria-hidden="true">▸</span>
      </button>
    )
  }
  return hint ? <p className={styles.tapChip} data-hint="true" data-life="tap-hint" role="status"><span className={styles.tapName}>{hint}</span></p> : null
}
