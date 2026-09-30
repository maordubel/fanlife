/**
 * מסלול הבדיקה — THE WORKER LIFE, played by a script.
 *
 * Rule 29 in this repo says the acceptance claims are a script and not a memory. A game
 * makes claims a static sweep cannot check — "the prologue ends", "the child moves",
 * "the world has no yellow in it once it is RENDERED" — so this drives the actual build:
 * it opens the route at three widths, presses the buttons a player presses, screenshots
 * every beat, and scans the pixels that came out of the canvas.
 *
 * The yellow band is the same band as `lib/isYellow.ts` and `scripts/brand/qa-sweep.mjs`.
 * Antialiasing is off for the same reason it is off there: subpixel rendering invents
 * colour at glyph edges and the scan would be measuring the renderer.
 *
 *   node scripts/life/playthrough.mjs [http://127.0.0.1:3000]
 */
import { mkdirSync, writeFileSync } from 'node:fs'

import { chromium } from 'playwright'
import { PNG } from 'pngjs'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const OUT = 'data/life-shots'

const HUE_MIN = 38
const HUE_MAX = 70
const SAT_MIN = 0.35
const VAL_MIN = 0.35

/**
 * Four glasses, because "most people will play this on a phone" is not one phone.
 * `small` is the floor the console has to survive — a 360×640 Android, the narrowest
 * and shortest screen still in real use — and `phone` is the modern median. If the deck
 * fits both, everything between them is free.
 */
const SIZES = [
  { name: 'small', width: 360, height: 640, touch: true },
  { name: 'phone', width: 390, height: 844, touch: true },
  { name: 'tablet', width: 768, height: 1024, touch: false },
  { name: 'desktop', width: 1440, height: 900, touch: false },
]

function yellowPixels(buffer) {
  const png = PNG.sync.read(buffer)
  let count = 0
  let sample = ''
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i + 3] < 8) continue
    const r = png.data[i]
    const g = png.data[i + 1]
    const b = png.data[i + 2]
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min
    if (delta === 0) continue
    if (delta / max < SAT_MIN || max / 255 < VAL_MIN) continue
    let hue
    if (max === r) hue = 60 * (((g - b) / delta + 6) % 6)
    else if (max === g) hue = 60 * ((b - r) / delta + 2)
    else hue = 60 * ((r - g) / delta + 4)
    if (hue >= HUE_MIN && hue <= HUE_MAX) {
      count += 1
      if (!sample) sample = `rgb(${r} ${g} ${b})`
    }
  }
  return { count, sample, total: png.data.length / 4 }
}

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--disable-lcd-text', '--disable-font-subpixel-positioning', '--font-render-hinting=none'],
})

let faults = 0
const report = []

/**
 * `WORKER_TOUR_ONLY=1` skips the four viewport walkthroughs and runs the tour alone.
 *
 * The full run is four browsers playing a chapter at whatever frame rate the machine can
 * manage, which in this container is about twenty minutes. When what changed is a
 * backdrop or a piece of dressing, the tour is the part that answers, and waiting twenty
 * minutes to look at nine screenshots is how a verification step stops being run.
 */
const TOUR_ONLY = process.env.WORKER_TOUR_ONLY === '1'
/** WORKER_SIZES=small,phone — run a subset of the viewports */
const ONLY_SIZES = process.env.WORKER_SIZES?.split(',').filter(Boolean) ?? null

for (const size of TOUR_ONLY ? [] : SIZES.filter((s) => !ONLY_SIZES || ONLY_SIZES.includes(s.name))) {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    hasTouch: size.touch,
    isMobile: size.touch,
  })
  const page = await context.newPage()
  // The ad and analytics hosts are refused by this sandbox; `networkidle` would wait on
  // them forever. Same line as `tap-probe.mjs`, for the same reason.
  await page.route('**://{pagead2.googlesyndication.com,www.googletagmanager.com,www.google.com,accounts.google.com}/**', (r) => r.abort())
  const errors = []
  const origin = new URL(BASE).origin
  page.on('requestfailed', (request) => {
    // a request the harness's own navigation cut short is not the product failing
    if (request.failure()?.errorText === 'net::ERR_ABORTED') return
    if (request.url().startsWith(origin)) errors.push(`request failed: ${request.url()}`)
  })
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    if (message.text().startsWith('Failed to load resource')) return
    // Next prefetches the landing page's links; the harness leaves that page for /life
    // before they land, and the router logs the cut-off fetch as an error and falls back
    // to a plain navigation. The harness's own navigation, like `net::ERR_ABORTED` above.
    if (message.text().startsWith('Failed to fetch RSC payload')) return
    errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(String(error)))

  const shot = async (label) => {
    const buffer = await page.screenshot()
    writeFileSync(`${OUT}/${size.name}-${label}.png`, buffer)
    const { count, sample, total } = yellowPixels(buffer)
    /**
     * Rule 8 is absolute about the colours the product USES, and every one of them is
     * checked where it is decided: `tests/life.test.ts` proves the palette holds no
     * yellow and that the shipped artwork holds not one yellow pixel, because
     * `build-art.py` rotates a band far wider than the scanner's out of the way.
     *
     * What a screenshot additionally contains is the browser's own bilinear resampling of
     * a painting: a warm wall pixel and a green shutter pixel next to it average to
     * something in the band that exists in no file. That is the renderer, not the
     * product — the same distinction `qa-sweep.mjs` draws between a page that threw and a
     * host this sandbox refused. So it is reported always and only fails above a rate no
     * resampler can reach, which is where a real yellow asset would land.
     */
    const rate = count / Math.max(1, total)
    if (count > 0) report.push(`hue     ${size.name}/${label}: ${count}px (${(rate * 100).toFixed(4)}%) ${sample}`)
    if (rate > 0.001) {
      faults += 1
      report.push(`YELLOW  ${size.name}/${label}: ${count}px is above the resampling allowance`)
    }
    return count
  }

  // A fresh life every run, or the second run opens a save and tests nothing.
  await page.goto(`${BASE}/life`, { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    try {
      window.localStorage.removeItem('the-worker:life')
    } catch {
      /* blocked */
    }
  })
  await page.reload({ waitUntil: 'networkidle' })

  await page.waitForSelector('canvas', { timeout: 20000 })

  /**
   * הפתיח — five pictures before anything, and the harness has to get past it.
   *
   * It is gated on `sessionStorage`, and every Playwright context is a fresh session, so
   * it plays on every run. That is exactly right for a test of an opening sequence and
   * exactly wrong for a test of a chapter: the overlay sits over the canvas for half a
   * minute while the prologue advances underneath it, unwatched. So: photograph it once,
   * then press the button a player presses.
   */
  await page.waitForTimeout(1600)
  await shot('00-opening')
  const skip = page.locator('[data-life="opening-skip"]')
  if ((await skip.count()) > 0) {
    await skip.click()
    await page.waitForTimeout(600)
  } else {
    faults += 1
    report.push(`NO OPENING ${size.name}: the sequence never appeared`)
  }

  await page.waitForTimeout(2500)
  await shot('01-prologue')

  /**
   * The prologue is nine lines. Press until it is over, rather than a fixed number of
   * times: on a cold server the first viewport waits on compilation and a fixed count
   * runs out halfway through 1972, which then reads as a broken bedroom for the rest of
   * the run. The box tells us when it is finished; the count was only ever a guess.
   */
  // (Director V3 §12, 25.9.2026) the memory has two gestures in it now — the grip and the
  // red thing on the concrete — which close the box and put a mark on the painting with a
  // prompt. E is the hand for those too, so the loop runs while there is a box OR a prompt.
  const inPrologue = async () =>
    (await page.locator('[data-life="dialogue"]').count()) > 0 || (await page.locator('[data-life="prompt"]').count()) > 0
  for (let i = 0; i < 60; i += 1) {
    await page.keyboard.press('e')
    await page.waitForTimeout(300)
    if (!(await inPrologue())) {
      await page.waitForTimeout(1400)
      if (!(await inPrologue())) break
    }
  }
  /**
   * 5.9.2026: a new life no longer lands in 1986 — it lands in the alley of 1984 (Stage A,
   * delta 20), which `newgame-probe.mjs` walks. The morning this harness plays "the way it
   * is locked" is the 1986 morning, so from here the run is SEEDED at the first minute of
   * 1986: the same flags a finished Stage A leaves, and nothing else.
   */
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    const events = [
      { t: 'flag.raised', flag: 'life:opening' }, { t: 'flag.raised', flag: 'prologue:done' },
      { t: 'chapter.entered', chapter: '1986' }, { t: 'moved', to: 'bedroom' },
    ]
    window.localStorage.setItem('the-worker:life', JSON.stringify({ version: 3, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1986, events, savedAt: new Date().toISOString() }))
    // The probe flag, like every chapter probe: the game picks its Canvas renderer under
    // it. Without it headless Chromium draws WebGL in software at a frame every few
    // hundred milliseconds — a 120ms key hold falls between two frames and the child
    // never moves, and the harness reported a door that works as a door it could not
    // find (5.9.2026: forty presses to cross the bedroom, none to cross the living room).
    window.localStorage.setItem('the-worker:life:probe', '1')
  })
  // `domcontentloaded`, not `networkidle`: a room with a running ambience keeps fetching
  // audio, and the idle the harness waited for never came (5.9.2026 — same as the tour).
  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas', { timeout: 20000 })
  await page.waitForTimeout(2600)

  /**
   * הכרטיס שנפתח עם הפרק — **וששת הליקויים שהוא ייצר במשך חודש** (21.9.2026).
   *
   * פרק נפתח בחדר עם כרטיס על כל הזכוכית: חולצה, אלבום או מנוי. הוא `<button>` שממלא
   * `inset-0` ב-`z-[95]`, ונסגר בנגיעה — מה ששחקן עושה בלי לחשוב. **המסלול הזה לחץ
   * רק מקשים**, ולכן הוא עמד מול הכרטיס ודיווח שאין קונסולה, אין דלת, אין את מי לדבר
   * איתו ואין שורת לימוד — ששה ליקויים בארבעה מסכים, כולם על משחק שעובד.
   *
   * זה בדיוק כלל 73 מהכיוון השני: כלי שלא יכול להיכשל אינו כלי, וכלי שנכשל על משחק
   * תקין גרוע ממנו — כי מודדים אותו ומאמינים לו. אומת מול `5e2a0e3`: אותם ליקויים
   * בדיוק, מילה במילה, כלומר הם מעולם לא היו על התוכן שנוסף אחרי.
   *
   * הסגירה היא בשם, ולא "ללחוץ במרכז המסך": כרטיס שיפסיק להיסגר כך יחזיר את הליקויים
   * במקום להיעלם בשקט.
   */
  const OPENING_CARDS = ['[data-life="shirt-card"]', '[data-life="album-card"]', '[data-life="ticket-card"]']
  for (let round = 0; round < 3; round += 1) {
    let closed = false
    for (const selector of OPENING_CARDS) {
      const card = page.locator(selector)
      if ((await card.count()) > 0 && (await card.first().isVisible())) {
        await card.first().click({ timeout: 2000 }).catch(() => {})
        await page.waitForTimeout(500)
        closed = true
      }
    }
    if (!closed) break
  }
  await page.waitForTimeout(600)
  await shot('02-bedroom')

  const clockNow = () =>
    page.evaluate(() => document.querySelector('[data-life="clock"]')?.textContent?.trim() ?? null)
  const placeNow = () =>
    page.evaluate(() => document.querySelector('[data-life="place"]')?.textContent?.trim() ?? null)

  const hold = async (key, ms) => {
    await page.keyboard.down(key)
    await page.waitForTimeout(ms)
    await page.keyboard.up(key)
    await page.waitForTimeout(140)
  }

  const clockInBedroom = await clockNow()

  // The teaching line must be on screen before the player has moved.
  // On a phone the line now says "touch a place and he walks" (3.9.2026); on a desktop it
  // still names the keys.
  if ((await page.locator('text=/לזוז|גרור|ילך לשם/').count()) === 0) {
    faults += 1
    report.push(`NO TEACH ${size.name}: the movement line never appeared`)
  }

  // The touch chip prints the button's glyph before its label, so its TEXT is `Aלך לסלון`
  // and `isDoor` below never saw the door; its `aria-label` is the label alone.
  const promptNow = () =>
    page.evaluate(() => {
      const el = document.querySelector('[data-life="prompt"]')
      return el?.getAttribute('aria-label') ?? el?.textContent?.trim() ?? null
    })

  /**
   * A door says לך / היכנס / צא. Everything else is a person or a thing.
   *
   * No `\b` here, deliberately: JavaScript's word boundary is defined on ASCII word
   * characters, so `/^לך\b/` never matches `לך למטבח` — the ך is not a \w, so there is
   * no boundary to find. The first version of this harness used one, decided every door
   * was a person, pressed the button on all of them, and walked itself into the kitchen.
   */
  const isDoor = (text) => /^(לך|היכנס|צא)(\s|$)/.test(text ?? '')

  /**
   * Read the box to the end, and if it will not end, use the door.
   *
   * The X is not decoration: a branch whose choices the player no longer qualifies for
   * used to leave the box on screen with nothing to press, which is the softlock this
   * build was reported for. So the harness proves the way out works by relying on it —
   * press E to the end of the lines, and if a box is still there, press Escape and
   * require it to be gone.
   */
  const clearDialogue = async (max = 16) => {
    // (24.9.2026) the bag in the bedroom opens the life's card — a sheet with its own
    // "לסגור", not a conversation, and it opens a beat AFTER the line that announces it.
    // A player closes it; so does the harness, or it stands in front of a modal pressing
    // arrows and reports a room with no door.
    const closeCards = async () => {
      await page.waitForTimeout(350)
      // and the "נכנס לחיים שלך" card of a first meeting (Director v2): one tap per line
      for (let i = 0; i < 8; i += 1) {
        const cast = page.locator('[data-life="cast-card"]')
        if ((await cast.count()) === 0) break
        await cast.first().click().catch(() => {})
        await page.waitForTimeout(260)
      }
      for (let i = 0; i < 3; i += 1) {
        if ((await page.locator('[data-life="dialogue"]').count()) > 0) return
        const close = page.locator('[role="dialog"] button', { hasText: 'לסגור' })
        if ((await close.count()) === 0) return
        await close.first().click().catch(() => {})
        await page.waitForTimeout(300)
      }
    }
    await closeCards()
    for (let i = 0; i < max; i += 1) {
      if ((await page.locator('[data-life="dialogue"]').count()) === 0) {
        await closeCards()
        if ((await page.locator('[data-life="dialogue"]').count()) === 0) return true
        continue
      }
      // a ballot on screen: a player picks; the harness picks the first row (5.9.2026 —
      // Kobi's morning conversation ends in a choice, and eight presses of E never chose)
      const choice = page.locator('[data-life="choice"] button').first()
      if ((await choice.count()) > 0) {
        await choice.click().catch(() => {})
        await page.waitForTimeout(420)
        continue
      }
      await page.keyboard.press('e')
      await page.waitForTimeout(240)
    }
    if ((await page.locator('[data-life="dialogue"]').count()) === 0) return true
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    const stuck = (await page.locator('[data-life="dialogue"]').count()) > 0
    if (stuck) {
      faults += 1
      report.push(`SOFTLOCK ${size.name}: a conversation would not close, even on Escape`)
    }
    return !stuck
  }

  /**
   * THE MORNING, PLAYED THE WAY IT IS LOCKED.
   *
   * The first version of this walk held one key and demanded the street. That test passed
   * and the game it described had no game in it — you could cross the whole chapter
   * without saying a word to anybody. The doors have needs now: the front door wants the
   * key from the drawer, the road east wants a reason to walk it. So the harness plays
   * like a person who reads the prompt — hold left, and press the button on anything that
   * is not a door — and the claim under test is stronger than before: the chapter is
   * gated, and the gates are all openable with the one button, without a walkthrough.
   */
  const reachedStreet = () =>
    page.evaluate(() => {
      try {
        const raw = window.localStorage.getItem('the-worker:life')
        if (!raw) return false
        return (JSON.parse(raw).events ?? []).some(
          (event) => event.t === 'flag.raised' && event.flag === 'onboard:street',
        )
      } catch {
        return false
      }
    })

  const seen = []
  const clocks = []
  /** where in `clocks` the child first spoke to something — everything after is theirs */
  let firstTalkAt = -1
  const acted = new Set()
  const seenPrompts = new Set()
  let talked = false
  let baseline = clockInBedroom
  let heading = 'ArrowLeft'
  let stalled = 0
  // Two hundred rather than one hundred and twenty. The budget is in KEYPRESSES, but what
  // it has to buy is DISTANCE, and a frame-starved browser moves the child less per press
  // — so on a loaded machine the old budget ran out halfway across the living room and
  // reported a door that works as a door that cannot be found.
  for (let i = 0; i < 200; i += 1) {
    const place = await placeNow()
    if (place && seen[seen.length - 1] !== place) {
      seen.push(place)
      stalled = 0
      heading = 'ArrowLeft'
    }
    // Only walking steps are billed to the clock check below. A conversation is ALLOWED
    // to cost the day time — that is what `{ e: 'time' }` is for, and the veteran at the
    // gate charges twenty-two minutes of queue for letting a child in. The invariant
    // being tested is narrower and more useful: the clock does not run by itself while
    // the player is still learning to walk indoors.
    // The invariant is about the CLOCK'S OWN FLAG, not about a label on the HUD.
    //
    // `onboard:street` is the exact thing that starts time, and reading it settles two
    // questions the place label answers badly. A label lands a frame late, so a sample
    // taken across the front door carries the living room's name and the street's clock;
    // and a child who steps out and comes straight back in is INDOORS with a clock that
    // is now, correctly, running — which is a game working, and used to be reported as a
    // game broken. Once the flag is up, this walk has done its job: stop billing it.
    const outside = await reachedStreet()
    if (!talked && !outside) clocks.push([place, await clockNow(), baseline])
    if (firstTalkAt < 0 && acted.size > 0) firstTalkAt = clocks.length - 1
    // A conversation's cost commits when the box CLOSES, which is a frame or two after
    // the last keypress that closed it. Reading the new baseline immediately therefore
    // reads the clock from before the charge, and the very next sample looks like the
    // clock running on its own — a race in the harness reported as a bug in the game.
    // Half a second is longer than the box's close and shorter than a game minute.
    if (talked) {
      await page.waitForTimeout(520)
      baseline = await clockNow()
    }
    talked = false
    if (place === 'הרחוב' || outside) break
    const text = await promptNow()
    // WORKER_WALK_DEBUG=1 prints every step of the walk — the one way to see WHY a door was not found
    if (process.env.WORKER_WALK_DEBUG) console.log(`walk ${size.name} #${i} ${place} heading=${heading} stalled=${stalled} prompt=${text}`)
    // Passing something new is progress, even when the room has not changed.
    if (text && !seenPrompts.has(text)) {
      seenPrompts.add(text)
      stalled = 0
    }
    // Each thing is worth pressing once. A player who presses the same drawer forever is
    // not a player, and a harness that does it never reaches the front door.
    if (text && !isDoor(text) && !acted.has(text)) {
      acted.add(text)
      talked = true
      await page.keyboard.press('e')
      await page.waitForTimeout(420)
      await clearDialogue()
      continue
    }
    // Small steps, because the prompt is only read between them: a long stride on a wide
    // desktop can carry the child past the drawer entirely, and a harness that walks
    // faster than it looks is testing its own reflexes rather than the game's clarity.
    await hold(heading, 120)
    stalled += 1
    if (stalled > 45) {
      // A player who stops getting anywhere turns round. So does this. The window has to
      // be longer than it takes to cross the widest room at walking pace — a harness that
      // turns round every second and a half never reaches either wall, and then reports
      // the game as unfinishable when the only thing stuck is the test.
      heading = heading === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft'
      stalled = 0
    }
  }
  // A transition that began on the last sample still has to finish before we judge it.
  await page.waitForTimeout(1400)
  const settled = await placeNow()
  if (settled && seen[seen.length - 1] !== settled) seen.push(settled)
  await shot('03-out')

  if (!seen.includes('הסלון')) {
    faults += 1
    report.push(`NO EXIT  ${size.name}: never reached the living room (saw ${seen.join(' → ') || '—'})`)
  }
  if (!seen.includes('הרחוב')) {
    faults += 1
    report.push(`NO DOOR  ${size.name}: never reached the street (saw ${seen.join(' → ') || '—'})`)
  } else {
    report.push(`walk    ${size.name}: ${seen.join(' → ')}`)
  }

  // (Director V3 §11, 24.9.2026) there is no key lock any more: the living-room door opens
  // without the key on the string, and the walk above — which reached the street from a
  // save that never opened the drawer — is the proof. The old check here asserted the
  // opposite (a save with no key is refused), and it was retired with the lock.

  // Onboarding is not billed to the clock: walking around indoors moves nothing. The
  // baseline is re-read after every conversation, because a conversation is allowed to
  // cost the day time — that is a choice the player made, not the clock running on them.
  /**
   * Only the samples taken BEFORE the first conversation are billed here.
   *
   * A conversation is allowed to cost the day time — `{ e: 'time' }` exists, the veteran
   * at the gate charges twenty-two minutes of queue — and the charge commits when the box
   * closes, which is an unbounded number of frames after the keypress that closed it, and
   * can arrive through a choice, a chained `goto`, or an opportunity the harness accepted
   * on the player's behalf. No amount of settling makes that race safe, and every version
   * of trying reported a working game as a broken one on one viewport or another.
   *
   * So this checks the part it can actually see: from the first frame to the first thing
   * the child spoke to, the clock must not move at all. Everything after that is a player
   * spending their afternoon, which is the game. The narrower invariant — that the tick
   * itself is gated on `onboard:street` — is asserted on the source in `tests/life.test.ts`,
   * where it is exact and costs eight milliseconds.
   */
  const indoors = new Set(['החדר שלך', 'הסלון', 'המטבח'])
  for (const [place, clock, since] of clocks.slice(0, firstTalkAt < 0 ? clocks.length : firstTalkAt)) {
    if (!place || !indoors.has(place)) break
    if (clock !== since) {
      faults += 1
      report.push(`CLOCK    ${size.name}: ran indoors while walking (${since} → ${clock})`)
      break
    }
  }

  // …and now the day starts.
  //
  // Polled rather than timed. The walk above now stops on `onboard:street` itself, which
  // is raised while the street is still loading its textures, so a flat three-second wait
  // can spend most of itself on a scene that has not begun ticking yet and then report a
  // working clock as a stopped one. The invariant is "the day starts", not "the day
  // starts inside three seconds": poll for eight, and pass the moment it moves.
  let clockOutside = clockInBedroom
  for (let i = 0; i < 16 && clockOutside === clockInBedroom; i += 1) {
    await page.waitForTimeout(500)
    clockOutside = await clockNow()
  }
  if (seen.includes('הרחוב') && clockOutside === clockInBedroom) {
    faults += 1
    report.push(`CLOCK    ${size.name}: never started after reaching the street`)
  }
  await shot('04-street')

  // לוח ההפעלה — the console has to be on screen, whole, on every glass. A control the
  // player cannot see is the failure this whole pass exists to fix, so it is measured
  // rather than assumed: the deck's own box, against the viewport it was drawn in.
  const deck = await page.evaluate(() => {
    const node = document.querySelector('[data-life="deck"]')
    if (!node) return null
    const box = node.getBoundingClientRect()
    const targets = [...node.querySelectorAll('button, [role="application"]')].map((el) => {
      const b = el.getBoundingClientRect()
      return { w: Math.round(b.width), h: Math.round(b.height) }
    })
    return {
      top: Math.round(box.top),
      bottom: Math.round(box.bottom),
      left: Math.round(box.left),
      right: Math.round(box.right),
      targets,
    }
  })
  if (!deck) {
    faults += 1
    report.push(`NO DECK  ${size.name}: the control deck was not on screen`)
  } else {
    const off =
      deck.bottom > size.height + 1 || deck.top < 0 || deck.left < -1 || deck.right > size.width + 1
    if (off) {
      faults += 1
      report.push(
        `DECK     ${size.name}: off screen (${deck.left}..${deck.right} × ${deck.top}..${deck.bottom} in ${size.width}×${size.height})`,
      )
    }
    const small = deck.targets.filter((box) => box.w < 44 || box.h < 44)
    // Since the full-bleed pass the phone's default deck is the single TapChip — one
    // target that names the action and IS the button. The arcade pair is a menu toggle
    // away. So a touch layout needs at least one target, and none under 44px.
    if (size.touch && (deck.targets.length < 1 || small.length > 0)) {
      faults += 1
      report.push(
        `DECK     ${size.name}: ${deck.targets.length} touch targets, ${small.length} under 44px`,
      )
    } else {
      report.push(
        `deck    ${size.name}: ${deck.targets.length} targets, bottom ${deck.bottom}/${size.height}`,
      )
    }
  }

  // Ofir is a few steps along the pavement. Walk until somebody is in reach, then talk.
  // Doors are skipped on purpose: the prompt names what it will do, so the harness can
  // tell a person from a door exactly the way a player can.
  let spoke = false
  let sawPrompt = false
  let sawNoPrompt = false
  for (let i = 0; i < 46; i += 1) {
    const promptText = await page.evaluate(() => {
      const el = document.querySelector('[data-life="prompt"]')
      return el?.getAttribute('aria-label') ?? el?.textContent?.trim() ?? null
    })
    if (promptText) sawPrompt = true
    else sawNoPrompt = true
    // (25.9.2026) a PERSON, by the verb the prompt names: the street of 1986 also holds the
    // week's jobs and the things a boy picks up, and a box about a pile of newspapers is
    // not somebody spoken to — pressing it and then finding no face made this a lottery on
    // the seed of the job rotation
    if (promptText && promptText.includes('תדבר')) {
      await page.keyboard.press('e')
      await page.waitForTimeout(460)
      if ((await page.locator('[data-life="dialogue"] img').count()) > 0) {
        spoke = true
        break
      }
      for (let j = 0; j < 4; j += 1) {
        if ((await page.locator('[data-life="dialogue"]').count()) === 0) break
        await page.keyboard.press('e')
        await page.waitForTimeout(220)
      }
    }
    await hold('ArrowRight', 120)
  }
  // A box may have opened on the very last step; look once more before judging.
  if (!spoke) spoke = (await page.locator('[data-life="dialogue"] img').count()) > 0
  await shot('05-talk')
  if (!sawPrompt || !sawNoPrompt) {
    faults += 1
    report.push(`PROMPT   ${size.name}: the prompt never appeared and disappeared with range`)
  }
  if (!spoke) {
    faults += 1
    report.push(`NO TALK  ${size.name}: nobody in the street could be spoken to`)
  } else {
    for (let i = 0; i < 3; i += 1) {
      await page.keyboard.press('e')
      await page.waitForTimeout(300)
    }
    await shot('06-choice')
  }

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  if (overflow > 0) {
    faults += 1
    report.push(`OVERFLOW ${size.name}: ${overflow}px`)
  }

  const clock = await clockNow()
  if (!clock) {
    faults += 1
    report.push(`NO CLOCK ${size.name}: the HUD never rendered a time`)
  }

  if (errors.length > 0) {
    faults += errors.length
    for (const error of errors) report.push(`ERROR   ${size.name}: ${error}`)
  }

  report.push(
    `ok      ${size.name}: clock ${clock ?? '—'}, place ${(await placeNow()) ?? '—'}, overflow ${overflow}px, errors ${errors.length}`,
  )
  await context.close()
}


/**
 * הסיור — every place, through the real save file.
 *
 * The walkthrough above proves the chapter can be played; this proves every location
 * LOADS and looks like itself, which a linear run cannot reach in a minute. It gets there
 * the honest way: it writes a save into `localStorage` in exactly the shape
 * `lib/life/save.ts` writes, reloads, and lets the game restore into that room. So the
 * tour is also the strongest save/restore test in the project — if the format drifts, the
 * tour lands in the bedroom and the screenshots say so.
 */
/**
 * `[location, the title the HUD must show, flags to raise, filename]`.
 *
 * The last two stops are the same room twice, which is the point of the fourth field.
 * `bloomfield-inside` is a different PLACE before and after the whistle — empty terrace,
 * then sixteen people celebrating on it and a father somewhere among them — and the whole
 * ending depends on the second one looking right. Two saves, two screenshots, one room.
 *
 * `saw:reveal` is raised on both for the same class of reason as the cutscene flag, and
 * it was found by this harness photographing the same picture twice: without it the scene
 * opens on its 5.2-second arrival card, and on a 2 FPS software renderer that card is
 * still on screen when the shutter goes. Two byte-identical screenshots of a card is not
 * a test of a terrace.
 *
 * `cutscene:1986-championship` is raised on both, deliberately. The tour is a test of
 * SCENES, and with that flag down the terrace opens onto two minutes of archival YouTube
 * — which this sandbox cannot fetch, which is not what the stop is measuring, and which
 * would hide the HUD label the stop checks. The cutscene has its own harness at
 * `/qa/life-cutscene`, where it can be watched instead of stepped over.
 */
const TOUR = [
  ['street', 'הרחוב', [], 'street'],
  ['kitchen', 'המטבח', [], 'kitchen'],
  ['kiosk', 'הקיוסק', [], 'kiosk'],
  ['pitch', 'המגרש', [], 'pitch'],
  // החדר נקרא "דרום תל אביב" ב-`scenes.ts`, והטבלה הזאת עוד נשאה את השם הקודם — כלומר
  // הסיור דיווח שהוא "הלך לאיבוד" בחדר הנכון. אותו פגם של כלל 48: כלי שמסכים עם עצמו
  // על שם שהעולם כבר שינה. (אומת מול 5e2a0e3 ב-21.9.2026 — אותו LOST בדיוק.)
  ['route', 'דרום תל אביב', ['kobi:left'], 'route'],
  ['bloomfield-outside', 'בלומפילד — מבחוץ', ['kobi:left', 'entry:granted'], 'bloomfield-outside'],
  ['bloomfield-tunnel', 'המנהרה', ['kobi:left', 'entry:granted'], 'bloomfield-tunnel'],
  [
    'bloomfield-inside',
    'בלומפילד',
    ['kobi:left', 'entry:granted', 'saw:reveal', 'cutscene:1986-championship'],
    'bloomfield-inside',
  ],
  // …and the same terrace after the whistle: the crowd is up, the paper is down, and the
  // last thing the chapter asks for is somewhere in it.
  [
    'bloomfield-inside',
    'בלומפילד',
    [
      'kobi:left',
      'entry:granted',
      'saw:reveal',
      'cutscene:1986-championship',
      'match:started',
      'saw:goal',
      'match:over',
    ],
    'bloomfield-celebrating',
  ],
]

{
  const context = await browser.newContext({ viewport: { width: 1280, height: 820 } })
  const page = await context.newPage()
  // The ad and analytics hosts are refused by this sandbox; `networkidle` would wait on
  // them forever. Same line as `tap-probe.mjs`, for the same reason.
  await page.route('**://{pagead2.googlesyndication.com,www.googletagmanager.com,www.google.com,accounts.google.com}/**', (r) => r.abort())
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  await page.goto(`${BASE}/life`, { waitUntil: 'networkidle' })

  for (const [place, titleHe, flags, label] of TOUR) {
    // Park on a page with no game on it before writing the save.
    //
    // The tour reuses one tab, so when it wrote the next stop's save the PREVIOUS stop was
    // still running — and a running game autosaves. Between `setItem` and `reload` the
    // engine could put its own state back, and the tour would reload the stop it had just
    // left: intermittent on a fast machine, reliable on a slow one, and indistinguishable
    // from the game refusing to go somewhere. The origin is what owns localStorage, not
    // the route, so any page on it will do — as long as nothing on it is playing.
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
    await page.evaluate(
      ([where, raised]) => {
        /*
         * (delta 90) The chapter, said out loud. A save with no `chapter.entered` lands in
         * the chapter the engine defaults to — which since the prologue became playable is
         * not 1986 — and the terrace stop then waited for a scoreboard in a year with no
         * match (reported as LOST). The hour is the one the footage probe uses: before the
         * final, so the terrace stop can see the director start it.
         */
        const events = [
          { t: 'flag.raised', flag: 'prologue:done' },
          { t: 'year.entered', year: 1986, weekday: 6, minute: 15 * 60 + 56 },
          { t: 'chapter.entered', chapter: '1986' },
          // the shop's "new shirt" card belongs to a chapter's first room, not to a tour stop
          { t: 'flag.raised', flag: 'own:shopnews:1986' },
          { t: 'moved', to: where },
        ]
        for (const flag of raised) events.push({ t: 'flag.raised', flag })
        window.localStorage.setItem(
          'the-worker:life',
          JSON.stringify({
            // The save format, as the game reads it TODAY. This said `version: 1` for
            // three passes, and v1 has not been readable since the systems pass — so the
            // loader dropped every one of these saves, the tour never left the landing
            // page, and eight screenshots of the same photograph passed a yellow scan
            // eight times. A harness that cannot fail is not a harness, which is why the
            // landing assertion below now exists as well.
            version: 3,
            identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 },
            year: 1986,
            events,
            savedAt: new Date().toISOString(),
          }),
        )
      },
      [place, flags],
    )
    // `domcontentloaded`, not `networkidle` (5.9.2026): the game now warms a crowd of sound
    // files on its first gesture, and on a loaded box the network never goes idle in time.
    await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('canvas', { timeout: 20000 })
    // The opening plays on a fresh session, and every stop of the tour is one. It is not
    // what this loop is measuring, and it covers the whole screen while it runs.
    const skipOpening = page.locator('[data-life="opening-skip"]')
    if ((await skipOpening.count()) > 0) {
      await skipOpening.click()
      await page.waitForTimeout(400)
    }
    await page.waitForTimeout(place === 'bloomfield-inside' ? 9000 : 2600)
    /**
     * …and then wait for the game to agree it is there. A fixed wait is a guess about how
     * fast the machine is; on a loaded one the label still carries the PREVIOUS stop and
     * the run fails for being slow rather than for being wrong.
     *
     * TWO clocks, never both, and the tour has to know that. Inside Bloomfield during the
     * ninety minutes the shell replaces the HUD with the scoreboard — which is a feature,
     * and which means `[data-life="place"]` is legitimately absent on exactly the two
     * stops that matter most. A first version of this check asserted the label and
     * reported the terrace as LOST twice. So: the label when there is one, and the
     * scoreboard when the match has taken it away.
     */
    const arrived = async () =>
      page.evaluate(() => {
        const place = document.querySelector('[data-life="place"]')?.textContent?.trim()
        if (place) return place
        return document.querySelector('[data-life="scoreboard"]') ? '__scoreboard__' : null
      })
    const wanted = place === 'bloomfield-inside' ? '__scoreboard__' : titleHe
    /**
     * לוח התוצאות מחליף את ה-HUD רק **אחרי** ש-`beginMatch` רץ, וזה קורה כמה שניות אחרי
     * ההגעה. שש שניות הספיקו במחשב; במכולה הזאת, שמציירת בשני פריימים לשנייה (כלל 49),
     * הלוח הגיע אחרי שהסיור כבר עזב — והתחנה דווחה כ-LOST בזמן שהמשחק התחיל כסדרו.
     * זו לא הרפיה: הסיור ממשיך לדרוש את הלוח, הוא פשוט מחכה לו כמו שמחכים למשהו
     * שבאמת בדרך. עשרים וחמש שניות, ורק בתחנה שבה מחכים ללוח.
     */
    const patience = wanted === '__scoreboard__' ? 50 : 12
    for (let i = 0; i < patience; i += 1) {
      if ((await arrived()) === wanted) break
      await page.waitForTimeout(500)
    }
    const buffer = await page.screenshot()
    writeFileSync(`${OUT}/tour-${label}.png`, buffer)
    const { count, total } = yellowPixels(buffer)
    const landed = await arrived()
    const rate = count / Math.max(1, total)
    if (rate > 0.001) {
      faults += 1
      report.push(`YELLOW  tour/${label}: ${count}px`)
    }
    if (landed !== wanted) {
      faults += 1
      report.push(`LOST    tour/${label}: wanted "${wanted}", the game says "${landed ?? '—'}"`)
    }
    report.push(`tour    ${label.padEnd(24)} → ${landed ?? '—'}  hue ${count}px`)
  }

  if (errors.length > 0) {
    faults += errors.length
    for (const error of errors) report.push(`ERROR   tour: ${error}`)
  }
  await context.close()
}

await browser.close()
console.log(report.join('\n'))
console.log(faults === 0 ? '\nPASS — no yellow, no overflow, no page errors' : `\nFAIL — ${faults} fault(s)`)
process.exit(faults === 0 ? 0 : 1)
