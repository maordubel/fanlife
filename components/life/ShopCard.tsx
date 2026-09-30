'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'

import { KitShirt } from '@/components/kit/KitShirt'
import { Chip, Plate } from '@/components/life/Plate'
import { useDialog } from '@/components/ui/useDialog'
import { t } from '@/lib/i18n'
import { formatMoney } from '@/lib/life/money'
import type { LifeBusEvents } from '@/lib/life/runtime/bus'
import { chapterFor } from '@/lib/life/content/chapters'
import {
  affordable,
  isNewThisChapter,
  onSale,
  owns,
  shirtFlag,
  shopShelves,
  wornIn,
  type Shelf,
  type ShelfId,
  type Shirt,
} from '@/lib/life/shirts'
import {
  SETS,
  albumTotals,
  newSetsIn,
  packetShekels,
  setSoldIn,
  stickersIn,
  packetQuote,
  stuckIn,
} from '@/lib/life/stickers'
import type { LifeState } from '@/lib/life/types'
import { meets } from '@/lib/life/world/types'
import { SourceNote } from '@/components/ui/SourceNote'

/**
 * חנות האוהדים — the rail, the counter, and the two things you leave a shop holding.
 *
 * The shop was a location for exactly one delta: a 360° panorama Maor sent, reprojected
 * into a room, with a shirt hung on the wall. His verdict on the screenshot settled it —
 * "נראית נורא ואיום… שווה לעשות חנות כפיצ׳ר פנימי, ולא כחלל" — and he was right on both
 * counts. An empty room with one object in it is worse than no room; and buying a shirt is
 * not a thing you walk about doing, it is a thing you do at a rail with your money in your
 * hand.
 *
 * On 16.9.2026 he asked for the next thing: *"תעשה את חנות האוהדים יותר נכון, יותר מרשימה,
 * יותר כייפית"*, and *"תעשה מקום ברור לקניית סופרגול"*. What was here answered neither.
 * It was two flat grids of hangers in the order the archive generator happened to emit
 * its rows — oldest season first — so the kit the club is wearing THIS season, the one
 * thing a supporter walks in for, was at the bottom of the second screen. And a shop that
 * sells the two objects this game is about sold exactly one of them: stickers were bought
 * through a dialogue choice at a kiosk and the shop did not mention them.
 *
 * So, three changes and each one is a decision rather than a coat of paint:
 *
 * · **The rail is ordered, and the order is a shop's.** `shopShelves` (in `shirts.ts`,
 *   pure and tested) gives back three shelves — what arrived this chapter, the rest of the
 *   rail, and the back of the rail where your own wardrobe hangs — each newest season
 *   first. Nobody scrolls past their own drawer to find the new kit.
 * · **The rail is filterable by SPORT**, because `Shirt.kind` has always known and nothing
 *   ever asked. Two vests among forty kits are invisible in a mixed grid, and this club
 *   has two teams.
 * · **דוכן הסופרגול is the first thing under the sign.** Not a tab, not behind anything:
 *   the counter, what it is selling this year, how far into that page you are, what a
 *   packet costs in this decade's money, and a way in.
 *
 * **Rule 33, and the one number this file changed.** This was `z-[95]` with no
 * `role="dialog"` at all — so it was outside the guard that keeps modals above the
 * navigation, and it was above things that are supposed to be above IT. `PacketCard` is
 * `z-[62]` and `ShirtCard` is `z-[95]` rendered EARLIER in `LifeStage`, so at 95 the shop
 * painted over both: the shirt reveal a purchase fires here was already landing behind
 * this screen, and a packet opened from the counter would have done the same the day the
 * button existed. It is a sheet, it is now `role="dialog"` at the sheet's own `z-[60]`
 * like the album it links to, and both cards land on top of it where they belong.
 * `useDialog` comes with that: Escape puts down whatever is in your hand — the shirt you
 * are holding up first, the shop after (rule 42: leaving is always allowed).
 */
export function ShopCard({
  shop,
  state,
  onBuy,
  onPacket,
  onAlbum,
  onClose,
}: {
  shop: NonNullable<LifeBusEvents['shop']>
  state: LifeState
  onBuy: (shirt: Shirt) => void
  /**
   * מעטפת סופרגול — the counter's way in, and it is a CALLBACK because the purchase is
   * the engine's.
   *
   * A component may not dispatch: money leaves the pocket, three stickers are counted in,
   * a page may close and turn the red box over — that whole transaction is
   * `{ e: 'packet' }` in `lib/life/runtime/dialogue.ts`, which is where it stays. This
   * prop is the wire, and `app/life/LifeStage.tsx` is what solders it.
   *
   * Optional on purpose: until it is wired the counter still stands and still says what
   * the album is and how far in you are — it simply does not offer a sale it cannot make.
   * A button that takes a tap and does nothing is worse than a shelf with no button.
   */
  onPacket?: () => void
  /** open the album from the counter — `bus.emit('album', { open: true })` on the shell */
  onAlbum?: () => void
  onClose: () => void
}) {
  const [look, setLook] = useState<Shirt | null>(null)
  const [kind, setKind] = useState<Shirt['kind'] | null>(null)
  const rail = useMemo(() => onSale(shop.chapter), [shop.chapter])
  const shelves = useMemo(
    () => shopShelves(state, shop.chapter, kind ?? undefined),
    [state, shop.chapter, kind],
  )
  const mine = useMemo(() => rail.filter((shirt) => owns(state, shirt.id)), [rail, state])
  const football = useMemo(() => rail.filter((shirt) => shirt.kind === 'football').length, [rail])
  const basket = rail.length - football

  /* Escape puts down the shirt you are holding up first, and the shop after — the same
     two-object rule the album follows, so one key never skips a step. */
  const dialogRef = useDialog<HTMLDivElement>(look ? () => setLook(null) : onClose)

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={t('life.shop.title')}
      className="pointer-events-auto absolute inset-0 z-[60] flex flex-col bg-paper outline-none"
      data-life="shop-card"
    >
      {/* ---------------------------------------------------------------- the sign -- */}
      {/**
       * המוט על הקיר — Maor's photograph of the rail, 6.9.2026, behind the shop's name.
       *
       * A shop that is a SCREEN and not a room has one problem: it has no walls, so it has
       * nowhere to be. This is the wall. The empty hangers are the point — the rail below
       * fills them in — and the name hangs on it as an enamel sign, which is the object
       * every other header in this game is made of. The wash is written in the ink TOKEN
       * rather than as three channels: rule 8's second guard exists because a component
       * once spelled the old vermilion out by hand and kept it through a brand change.
       */}
      <header
        className="relative shrink-0 border-b-rule border-red px-3 pb-3 pt-4"
        style={{
          backgroundImage:
            'linear-gradient(to bottom, rgb(var(--ink)/.55), rgb(var(--ink)/.92)), url(/life/art/shopHanger.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 38%',
        }}
      >
        <div className="flex items-end justify-between gap-2">
          <Plate className="px-2.5 pb-1.5 pt-1">
            <p className="font-sign text-[10px] uppercase tracking-[0.22em] text-red">
              {t('life.shop.kicker')}
            </p>
            <h2 className="font-poster text-[21px] leading-none text-ink">{t('life.shop.title')}</h2>
          </Plate>
          <div className="text-end">
            <p className="font-sign text-[10px] uppercase tracking-[0.2em] text-sheet/70">
              {t('life.shop.pocket')}
            </p>
            <p className="font-mono text-[17px] leading-none tabular-nums text-sheet">
              {formatMoney(state.agorot)}
            </p>
            <p className="mt-1 font-mono text-[11px] leading-none tabular-nums text-sheet/70">
              {mine.length}/{rail.length} {t('life.shirt.collection')}
            </p>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* ------------------------------------------------------ דוכן הסופרגול -- */}
        <Counter state={state} chapter={shop.chapter} onPacket={onPacket} onAlbum={onAlbum} />

        {/* ------------------------------------------------------------- the rail -- */}
        {rail.length === 0 ? (
          <p className="px-4 py-8 font-body text-[14px] text-ink">{t('life.shop.empty')}</p>
        ) : (
          <>
            {/* two teams, one club — and until now the vests were two rows in forty */}
            <div className="flex gap-1.5 px-3 pb-1 pt-3">
              <Chip live={kind === null} onClick={() => setKind(null)}>
                {t('life.shop.all')}
                <span className="font-mono text-[11px] tabular-nums">{rail.length}</span>
              </Chip>
              <Chip live={kind === 'football'} onClick={() => setKind('football')}>
                {t('life.shop.football')}
                <span className="font-mono text-[11px] tabular-nums">{football}</span>
              </Chip>
              {basket > 0 && (
                <Chip live={kind === 'basketball'} onClick={() => setKind('basketball')}>
                  {t('life.shop.basket')}
                  <span className="font-mono text-[11px] tabular-nums">{basket}</span>
                </Chip>
              )}
            </div>

            {shelves.length === 0 && (
              <p className="px-4 py-8 font-body text-[14px] text-ink">{t('life.shop.nothing')}</p>
            )}

            {shelves.map((shelf) => (
              <ShelfRow
                key={shelf.id}
                shelf={shelf}
                state={state}
                chapter={shop.chapter}
                onPick={setLook}
              />
            ))}
          </>
        )}
      </div>

      {/* --------------------------------------------------------------- the door -- */}
      <button
        type="button"
        onClick={onClose}
        className="min-h-tap w-full shrink-0 border-t-rule border-ink bg-ink px-4 py-3 font-sign text-[15px] leading-none text-sheet"
      >
        {t('life.shop.leave')}
      </button>

      {look && <Held shirt={look} state={state} onBuy={onBuy} onBack={() => setLook(null)} />}
    </div>
  )
}

/**
 * כמה חסר — what `חסרים לך {n} ₪` has been claiming, and what it now actually says.
 *
 * The message is "you are {n} short" and every caller was handing it the PRICE, so a boy
 * with 25 ₪ standing in front of a 30 ₪ shirt was told he was thirty short. Rounded UP to
 * the next whole shekel, because the shop counts in shekels and being 40 agorot short is
 * still being a shekel short at the counter.
 */
const shortBy = (state: LifeState, shekels: number) =>
  Math.max(1, Math.ceil((shekels * 100 - state.agorot) / 100))

/** the words on a shelf's own label — a key, so `shirts.ts` never has to know Hebrew */
const SHELF_KEY: Record<ShelfId, 'life.shop.arrived' | 'life.shop.forSale' | 'life.shop.yours'> = {
  new: 'life.shop.arrived',
  rail: 'life.shop.forSale',
  wardrobe: 'life.shop.yours',
}

/** one shelf: a label with a rule under it, and the hangers below */
function ShelfRow({
  shelf,
  state,
  chapter,
  onPick,
}: {
  shelf: Shelf
  state: LifeState
  chapter: string
  onPick: (shirt: Shirt) => void
}) {
  return (
    <section className="px-3 pb-1 pt-3">
      <div className="mb-2 flex items-baseline gap-2 border-b-hair border-ink/25 pb-1">
        <p
          className={`font-sign text-[12px] uppercase tracking-[0.18em] ${
            shelf.id === 'new' ? 'text-red' : 'text-sign'
          }`}
        >
          {t(SHELF_KEY[shelf.id])}
        </p>
        <p className="font-mono text-[11px] tabular-nums text-ink/50">{shelf.shirts.length}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {shelf.shirts.map((shirt) => (
          <Hanger
            key={shirt.id}
            shirt={shirt}
            owned={shelf.id === 'wardrobe'}
            fresh={isNewThisChapter(shirt, chapter)}
            affordable={meets(state, affordable(shirt))}
            days={wornIn(state, shirt.id).length}
            onPick={() => onPick(shirt)}
          />
        ))}
      </div>
    </section>
  )
}

/**
 * דוכן הסופרגול — the clear place to buy one, which is what Maor asked for.
 *
 * Everything on it is read rather than declared: `setSoldIn` says which album this decade's
 * counter still has packets for, `stuckIn`/`stickersIn` say how far into that page you
 * are, `packetShekels` prices it in the money of the chapter's own decade, and
 * `newSetsIn` says whether a season landed on this counter since the last chapter.
 *
 * **The album it announces and the album it sells can differ, and that is the kiosk
 * rule, not a bug.** A counter sells the current page until it is finished and then the
 * next (`setSoldIn`), so the season that just arrived can be standing behind one you have
 * not closed yet. The stand says both things rather than one — the news line names what
 * came in, the counter names what is in the envelope today.
 *
 * **And when a decade printed nothing, it says so.** Every chapter from `2000-title` is in
 * the 2000s and no page in Maor's folder was sold then, so `setSoldIn` answers null. The
 * counter is drawn SHUT with a sentence instead of being hidden: a refusal is an answer
 * and gets stated (rule 11), and a section that silently vanishes teaches a player that
 * the feature is gone rather than that this year has none.
 */
function Counter({
  state,
  chapter,
  onPacket,
  onAlbum,
}: {
  state: LifeState
  chapter: string
  onPacket?: () => void
  onAlbum?: () => void
}) {
  const id = setSoldIn(state)
  const set = id ? SETS[id] : null
  const page = id ? stickersIn(id) : []
  const totals = albumTotals(state)
  const price = packetShekels(chapter)
  // the §21.4 card: every refusal is known — and said — before a shekel moves
  const quote = packetQuote(state)
  const canPay = quote.status === 'ok' || quote.status === 'pending'
  const arrived = newSetsIn(chapter)

  return (
    <section className="border-b-rule border-ink bg-sheet px-3 py-3" data-life="shop-supergoal">
      <div className="flex items-start gap-3">
        {/* the packet itself, shut — the same red envelope `PacketCard` tears open */}
        <Plate tone="red" className="flex aspect-[3/4] w-[74px] shrink-0 items-center justify-center">
          <span className="flex flex-col items-center px-1 py-2 text-center">
            <span className="font-poster text-[17px] leading-none tracking-[0.03em]">
              {t('life.packet.name')}
            </span>
            <span className="pt-1 font-sign text-[9px] leading-tight opacity-90">
              <bdi>{set?.shortHe ?? ''}</bdi>
            </span>
          </span>
        </Plate>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="font-sign text-[12px] uppercase tracking-[0.18em] text-sign">
              {t('life.shop.sgTitle')}
            </p>
            <p className="font-mono text-[11px] tabular-nums text-ink/60">
              {totals.have}/{totals.total}
            </p>
          </div>

          {set ? (
            <>
              <p className="mt-0.5 font-poster text-[17px] leading-tight text-ink">
                <bdi>{set.titleHe}</bdi>
              </p>
              <p className="mt-0.5 font-mono text-[11px] tabular-nums text-ink/70">
                {t('life.shop.sgPage', {
                  have: String(id ? stuckIn(state, id) : 0),
                  total: String(page.length),
                })}
              </p>
              <p className="mt-1 font-body text-[11px] leading-snug text-ink/70">
                {t('life.shop.sgLead')}
              </p>
              {/* המחיר והכיס, זה ליד זה — before the button, never after it */}
              <p className="mt-1 flex flex-wrap items-baseline gap-x-3 font-mono text-[12px] tabular-nums text-ink" data-life="shop-sg-quote">
                <span>
                  {t('life90b.packet.price')} <bdi>{formatMoney(quote.price)}</bdi>
                </span>
                <span className="text-ink/70">
                  {t('life90b.packet.wallet')} <bdi>{formatMoney(quote.wallet)}</bdi>
                </span>
              </p>
              {quote.sayHe && quote.status !== 'none' && (
                <p className="mt-1 border-s-rule border-sign ps-2 font-body text-[12px] leading-snug text-sign" data-life="shop-sg-refusal" role="status">
                  <bdi>{quote.sayHe}</bdi>
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 font-body text-[12px] leading-snug text-ink/70">
              {t('life.shop.sgShut')}
            </p>
          )}
        </div>
      </div>

      {/* עונה חדשה נכנסה — the announcement this file could not make until `StickerSet`
          grew a `from`. It is a LINE and not a one-shot card on purpose: the card the
          scene holds up is seen once, and a player who was not looking then still has to
          be able to find out that a season landed. */}
      {arrived.length > 0 && (
        <p
          className="mt-2 flex items-center gap-2 border-s-stamp border-red bg-red/10 px-2 py-1.5"
          data-life="shop-sg-news"
        >
          <span className="font-sign text-[10px] uppercase tracking-[0.18em] text-red">
            {t('life.shop.new')}
          </span>
          <span className="min-w-0 font-body text-[12px] leading-snug text-ink">
            {t('life.shop.sgNew')}
            <span className="px-1.5 text-red">·</span>
            <bdi>{arrived.map((one) => one.titleHe).join(' · ')}</bdi>
          </span>
        </p>
      )}

      {/* nothing is wired yet → no row at all, rather than an empty strip of margin */}
      {((set && onPacket) || onAlbum) && (
      <div className="mt-2 flex gap-2">
        {set && onPacket && (
          <button
            type="button"
            disabled={!canPay}
            onClick={onPacket}
            data-life="shop-packet"
            className="min-h-tap flex-1 border-rule border-ink bg-red px-3 py-2 font-sign text-[14px] leading-none text-sheet disabled:border-ink/30 disabled:bg-transparent disabled:text-ink/45"
          >
            {canPay
              ? t('life.shop.sgBuy', { n: String(price) })
              : quote.status === 'short'
                ? t('life.shop.short', { n: String(shortBy(state, price)) })
                : t('life90b.packet.emptyBtn')}
          </button>
        )}
        {onAlbum && (
          <button
            type="button"
            onClick={onAlbum}
            data-life="shop-album"
            className="min-h-tap border-rule border-ink px-3 py-2 font-sign text-[14px] leading-none text-ink"
          >
            {t('life.shop.sgAlbum')}
          </button>
        )}
      </div>
      )}
    </section>
  )
}

/**
 * חולצה אחת, מורמת — the card that is worth opening.
 *
 * What a shop card owes a shirt: what it is, what season, who paid to be on the chest,
 * which sport, where the row came from, what it costs, and — the only one of those that
 * is about the player rather than the garment — which days of his life he wore it to.
 * `sourceHe` is PRINTED (rule 16): thirty-three of the forty-one rows come out of the
 * club's own kit archive with a source attached, and a shirt that can say where it is
 * from says so on its card rather than in a comment.
 */
function Held({
  shirt,
  state,
  onBuy,
  onBack,
}: {
  shirt: Shirt
  state: LifeState
  onBuy: (shirt: Shirt) => void
  onBack: () => void
}) {
  const owned = owns(state, shirt.id)
  const canPay = meets(state, affordable(shirt))
  return (
    <div className="absolute inset-0 z-[10] flex flex-col bg-paper px-4 py-4" data-life="shop-held">
      <div className="min-h-0 flex-1 overflow-y-auto text-center">
        <div className="mx-auto flex aspect-square w-[min(62vw,280px)] items-center justify-center">
          <Draw shirt={shirt} />
        </div>

        <p className="mt-2 font-poster text-[20px] leading-tight text-ink">
          <bdi>{shirt.nameHe}</bdi>
        </p>

        {/* the specification, as a shop card writes one: label above, value under it */}
        <dl className="mx-auto mt-3 grid max-w-[34ch] grid-cols-2 gap-x-3 gap-y-2 text-start">
          <Spec label={t('life.shop.season')} value={shirt.seasonLabel ?? shirt.yearsHe} />
          <Spec label={t('life.shop.sponsor')} value={shirt.sponsorHe} />
        </dl>

        <p className="mx-auto mt-3 max-w-[34ch] font-body text-[13px] leading-relaxed text-ink/80">
          {shirt.noteHe}
        </p>

        {/* the shirt's source is on /credits (spec §0.3, 22.9.2026); the card says it has one */}
        {shirt.sourceHe && (
          <p className="mx-auto mt-2 max-w-[34ch] border-t-hair border-ink/20 pt-1">
            <SourceNote newTab />
          </p>
        )}

        {/*
          איפה היית איתה — the line that turns a wardrobe into a biography.

          A price makes a shirt an object. "לבשת אותה ב־19.5.1999 · שש־עשרה שנה" makes
          it the day itself, and it is printed here for as long as the save lives.
        */}
        <Worn state={state} shirt={shirt} />
      </div>

      <div className="mt-3 flex shrink-0 gap-2">
        {owned ? (
          <p className="min-h-tap flex flex-1 items-center justify-center border-rule border-red px-4 font-sign text-[14px] text-red">
            {t('life.shop.owned')}
          </p>
        ) : (
          <button
            type="button"
            disabled={!canPay}
            onClick={() => {
              onBuy(shirt)
              onBack()
            }}
            className="min-h-tap flex-1 border-rule border-ink bg-red px-4 py-3 font-sign text-[15px] leading-none text-sheet disabled:border-ink/30 disabled:bg-transparent disabled:text-ink/45"
          >
            {canPay
              ? t('life.shop.buy', { n: String(shirt.price) })
              : t('life.shop.short', { n: String(shortBy(state, shirt.price)) })}
          </button>
        )}
        <button
          type="button"
          onClick={onBack}
          className="min-h-tap border-rule border-ink px-4 py-3 font-sign text-[14px] text-ink"
        >
          {t('life.shop.back')}
        </button>
      </div>
    </div>
  )
}

/** one row of the specification: the label small over the value */
function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-sign text-[9px] uppercase tracking-[0.18em] text-sign">{label}</dt>
      <dd className="font-body text-[13px] leading-tight text-ink">
        <bdi>{value}</bdi>
      </dd>
    </div>
  )
}

/** every day this shirt was worn to, with the date the archive gives that day */
function Worn({ state, shirt }: { state: LifeState; shirt: Shirt }) {
  const days = wornIn(state, shirt.id)
    .map((chapter) => chapterFor(chapter))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => a.year - b.year)
  if (days.length === 0) return null
  return (
    <div className="mx-auto mt-4 w-full max-w-[34ch] border-t-hair border-red/50 pt-3 text-start">
      <p className="font-sign text-[11px] uppercase tracking-[0.18em] text-red">{t('life.shop.worn')}</p>
      {days.map((day) => (
        <p key={day.id} className="mt-1 font-body text-[12px] leading-snug text-ink">
          <bdi>{day.dateHe}</bdi>
          <span className="px-2 text-ink/45">·</span>
          <bdi className="text-ink/70">{day.titleHe}</bdi>
        </p>
      ))}
    </div>
  )
}

/**
 * חולצה על קולב — one shirt, sized to read at 360px.
 *
 * A phone that narrow gives each cell about 164 points, which is enough for the garment,
 * two lines of name, a season and a price, and nothing else. So everything that is not
 * one of those five is a MARK rather than a sentence: `חדש` is a corner stamp, a row that
 * came out of the club's archive carries the archive tag (the full source is printed on
 * the card behind it, rule 16), and a shirt you have worn somewhere carries one red
 * square per day up to five.
 */
function Hanger({
  shirt,
  owned,
  fresh,
  affordable: canPay,
  days = 0,
  onPick,
}: {
  shirt: Shirt
  owned: boolean
  /** it reached the rail in this chapter — the front of the shop */
  fresh: boolean
  affordable: boolean
  /** how many days you wore it to — a shirt with a history is marked in the grid */
  days?: number
  onPick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={`min-h-tap relative flex flex-col items-center border-hair px-2 pb-2 pt-3 text-center transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none ${
        owned ? 'border-red/70 bg-red/10' : fresh ? 'border-red bg-sheet' : 'border-ink/25 bg-sheet'
      }`}
      data-shirt={shirt.id}
    >
      {fresh && !owned && (
        <span className="absolute start-0 top-0 bg-red px-1.5 py-0.5 font-sign text-[9px] uppercase leading-none tracking-[0.14em] text-sheet">
          {t('life.shop.new')}
        </span>
      )}

      <div className="flex aspect-square w-full items-center justify-center">
        <Draw shirt={shirt} />
      </div>

      <p className="mt-1 line-clamp-2 font-body text-[11px] leading-tight text-ink">
        <bdi>{shirt.nameHe}</bdi>
      </p>

      <p className="mt-0.5 font-mono text-[10px] leading-none tabular-nums text-ink/55">
        <bdi>{shirt.seasonLabel ?? shirt.yearsHe}</bdi>
      </p>

      <p
        className={`mt-1 font-mono text-[12px] leading-none tabular-nums ${
          owned ? 'text-red' : canPay ? 'text-ink' : 'text-ink/45'
        }`}
      >
        {owned ? t('life.shop.have') : `${shirt.price} ₪`}
      </p>

      <span className="mt-1 flex flex-wrap items-center justify-center gap-1">
        {shirt.kind === 'basketball' && (
          <span className="border-hair border-sign px-1 font-sign text-[9px] leading-tight text-sign">
            {t('life.shop.basket')}
          </span>
        )}
        {shirt.sourceHe && (
          <span className="border-hair border-ink/30 px-1 font-sign text-[9px] leading-tight text-ink/55">
            {t('life.shop.archive')}
          </span>
        )}
      </span>

      {days > 0 && (
        <p className="mt-1 flex items-center justify-center gap-1 font-mono text-[10px] leading-none tabular-nums text-red">
          {Array.from({ length: Math.min(days, 5) }, (_, i) => (
            <span key={i} aria-hidden className="inline-block h-1 w-1 bg-red" />
          ))}
          <span className="ps-1">
            {days === 1 ? t('life.shop.days.one') : t('life.shop.days', { n: String(days) })}
          </span>
        </p>
      )}
    </button>
  )
}

/** the two ways a shirt exists in this project: a photograph, or the club's own spec */
function Draw({ shirt }: { shirt: Shirt }) {
  if (shirt.spec) return <KitShirt spec={shirt.spec} className="h-full w-full" title={shirt.nameHe} />
  return (
    <div className="relative h-full w-full">
      <Image src={`/life/art/${shirt.art}.webp`} alt={shirt.nameHe} fill sizes="180px" className="object-contain" />
    </div>
  )
}

export { shirtFlag }
