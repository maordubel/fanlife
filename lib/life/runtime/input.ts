/**
 * הכניסה — one input state, two sources, and they must not fight.
 *
 * A phone gives a thumb stick and a button; a desktop gives arrows and a key. Scenes must
 * not know which, or every scene grows two code paths and one of them rots.
 *
 * The first version let both write the same pair of numbers and the keyboard could only
 * clear them "if they were already near zero" — so releasing an arrow key left the axis
 * where it was and the child walked into a wall forever. The fix is not a smarter guard,
 * it is separate channels: each source owns its own vector and the reader takes the pad
 * when the pad is being touched and the keys otherwise. Neither can strand the other.
 *
 * `actionPressed` is edge-triggered on purpose. A held key that re-fires an interaction
 * every frame is how a dialogue skips itself — invisible on a desktop and constant on a
 * touchscreen.
 *
 * RUN has the same two sources and had the same defect, six months after the axis was
 * fixed: `setRun` was written by the arcade B button AND by the Shift key, into one field.
 * So a thumb holding the stick in its run ring and a hand that then touched Shift were one
 * boolean, and whichever let go first stopped the child running for both. Separate
 * channels here too — `run` is the OR of them, and neither can strand the other.
 */
export type LifeInput = {
  readonly x: number
  readonly y: number
  readonly action: boolean
  readonly actionPressed: boolean
  readonly run: boolean
}

export class InputState implements LifeInput {
  private padX = 0
  private padY = 0
  private keyX = 0
  private keyY = 0
  private padAction = false
  private keyAction = false
  private padRun = false
  private keyRun = false

  private wasAction = false
  private consumed = true

  private _pressed = false

  /**
   * לחיצה קצרה מפריים — a press that came and went between two frames.
   *
   * `beginFrame` samples the button once a frame, so a tap whose down AND up both landed
   * inside one frame (a fast thumb on the chip, a quick E, the harness's `press`) was never
   * seen at all: the drawer did not open and Kobi did not answer, and the player pressed
   * again, harder. The down is therefore remembered until the next frame reads it — one
   * press, one action, however short.
   */
  private latched = false

  /** the pad wins while it is being held, because a thumb is a deliberate act */
  get x(): number {
    return this.padX !== 0 || this.padY !== 0 ? this.padX : this.keyX
  }

  get y(): number {
    return this.padX !== 0 || this.padY !== 0 ? this.padY : this.keyY
  }

  get action(): boolean {
    return this.padAction || this.keyAction
  }

  get actionPressed(): boolean {
    return this._pressed
  }

  get run(): boolean {
    return this.padRun || this.keyRun
  }

  /** touch: the joystick writes a raw vector; this normalises it */
  setAxis(x: number, y: number) {
    const [nx, ny] = normalise(x, y)
    this.padX = nx
    this.padY = ny
  }

  /** keyboard: called every frame with the raw -1/0/1 pair, zero included */
  setKeys(x: number, y: number) {
    const [nx, ny] = normalise(x, y)
    this.keyX = nx
    this.keyY = ny
  }

  setAction(down: boolean) {
    this.padAction = down
    if (down) this.latched = true
  }

  setKeyAction(down: boolean) {
    this.keyAction = down
    if (down) this.latched = true
  }

  /** touch: the stick's outer ring, or the B button where a mini-game still has one */
  setRun(down: boolean) {
    this.padRun = down
  }

  /** keyboard: Shift, called every frame with what the document says is held */
  setKeyRun(down: boolean) {
    this.keyRun = down
  }

  /** Called once per frame by the scene, at the top of update. */
  beginFrame() {
    const down = this.action || this.latched
    this.latched = false
    if (down && !this.wasAction) this.consumed = false
    // what is HELD going into the next frame is the real button, not the remembered tap —
    // or the second of two quick presses would be read as the first one still held
    this.wasAction = this.action
    this._pressed = !this.consumed
    this.consumed = true
  }

  /**
   * הלחיצה הזאת כבר שימשה — the key that closed a dialogue must not also act.
   *
   * E advances a line in the shell AND is the game's action key. The press that closed
   * the last line therefore arrived at the scene as a fresh edge on the very next frame,
   * with the world unpaused and the person you were talking to still in reach — and the
   * conversation started again. Every keyboard player saw it; the browser harness talked
   * to Rachel four times in a row before anybody read the log. Swallowing the edge is the
   * fix: the held key is remembered as already-down, so no press is reported until it is
   * released and pressed again.
   */
  swallow() {
    this.wasAction = true
    this.consumed = true
    this._pressed = false
    this.latched = false
  }

  reset() {
    this.padX = 0
    this.padY = 0
    this.keyX = 0
    this.keyY = 0
    this.padAction = false
    this.keyAction = false
    this.padRun = false
    this.keyRun = false
    this.wasAction = false
    this.consumed = true
    this._pressed = false
    this.latched = false
  }
}

/** A diagonal must not be faster than a straight line. */
function normalise(x: number, y: number): [number, number] {
  const length = Math.hypot(x, y)
  if (length <= 0.0001) return [0, 0]
  const scale = Math.min(1, length) / length
  return [x * scale, y * scale]
}
