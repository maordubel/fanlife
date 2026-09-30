# THE WORKER LIFE — אני · התיק שלי · הסיפור שלי (delta 90-H, 25.9.2026)

Implementation of `THE-WORKER-LIFE-ME-BAG-UX-IMPLEMENTATION.md`. No game state, save shape, route or engine changed; the page state stays in React and is never saved.

## Architecture after the change

```
HUD  ☰ · אני · התיק · מפה · ?        LifeMenu: אני / התיק שלי        bedroom bag → התיק שלי
                 │
useLifeSheets: openMe() / openBag() / view + setView   (one snapshot, world paused)
                 │
components/life/ProfileCard.tsx  — router: which half, which page of each (kept while you turn), ShareSheet
   ├── profile/LifeIdentitySheet.tsx   אני: IdentityHero + 4 doors
   │      ├── LifePathMap.tsx          הדרך שלי
   │      ├── RelationshipMap.tsx      האנשים שלי
   │      ├── LifeStoryTimeline.tsx    הסיפור שלי
   │      └── InnerState.tsx           מה עובר עליי
   └── profile/LifeBagSheet.tsx        התיק שלי: BagOverview (4 compartments)
          ├── CurrentCarry.tsx         עליי עכשיו
          ├── WardrobeRail.tsx         הארון שלי (KitShirt / real photos)
          ├── MemoryDrawer.tsx         קופסת הזיכרונות (BoxObject, cardForMemory)
          └── MoneyAndSubscriptions.tsx כסף ומנויים
   shared: LifeSheetShell.tsx (+SectionBoundary), Motion.tsx (RevealText, MotionLine, DrawIn),
           PhysicalObject.tsx (Ticket/Note/Key/Bottle/SubscriptionCard/Carried objects), personal.module.css
```

## Readings

- **Reused, untouched:** `carriedReading`, `purseReading`, `wardrobeReading`, `redBoxReading`, `skillsReading`, `redHeartReading`, `relationshipReading`, `presenceReading` (profile.ts); `boxContents` (redboxView.ts); `subscriptionReading`, `seasonFor` (subscription.ts); routes/tracks predicates.
- **Added — `lib/life/personal.ts`** (a composition layer on top of `profile.ts`, which stays the one number→word translator; a sibling so the import graph stays a tree): `identitySummaryReading`, `selfPortrait`, `todayHe`, `lifeTrackVisualReading`, `distanceTierOf`, `relationshipVisualReading`, `livedChapters`, `personalStoryReading`, `subscriptionCardReading`, `memoryDrawerReading`, `wardrobeInOrder`, `bagOverviewReading`, `tiltOf`.
- `tracksReading` is no longer drawn (the path map replaces the list); it stays exported.

## State changes

`useLifeSheets`: `view: 'me' | 'bag'`, `openMe()`, `openBag()`, `setView`; `openProfile(withDebug, which = 'bag')` kept for the debug panel. Nothing in `LifeState`.

## UX decisions

- Two destinations, no tab. Each header has a quiet door to the other half; on a phone a horizontal swipe turns the page (8–16px slide, the red spine stays).
- Back = one level: page → overview → world (Escape does the same). "לסגור" kept verbatim (LIFE harness).
- אני overview = hero + 4 doors on one phone screen. Hero reveal 0/90/180/280ms from the right edge (RTL clip). Identity is milestone-keyed: when the milestone changed since the last opening in this session, the old sentence is struck through once.
- הדרך שלי: trunk "אוהד" + branches. Route offered → emerging (dashed, short), held → active, apex → strong (red), left → dormant; life tracks active/strong; a Red-Heart pull ≥ band 2 with no route yet → a lean. Unreached stages are unnamed hollow squares. Tap = highlight + the sentence of how it began + the people on it. A path new since the last opening opens selected with "משהו השתנה".
- האנשים שלי: constellation, five qualitative tiers (inner/close/present/distant/fractured), family above, friends beside/below, partner close; red line = a bond that holds, grey = ordinary, dashed = friction, broken = fracture; the era's portraits; nodes travel out from the centre on open. >8 people → "עוד אנשים". Adult with no partner → an empty dashed place with its sentence.
- הסיפור שלי: one row per lived chapter (never ahead), first-person presence ("הייתי שם / שמעתי ברדיו / פספסתי…"), what the day left; prologue first. Moved out of the bag.
- התיק שלי: four compartments of one bag (stitched hairline, offset paper layer, no card grid); drawers open with the drawer motion. Objects are real art where it exists, CSS/SVG objects where not; stable tilt −2…+2° from the id.

## Motion system

`personal.module.css`: `--motion-fast 160 / base 280 / medium 420 / slow 700`, `--ease-life`. Reveal, spine, turn, drawer, draw-rtl / draw-out (lines revealed along their direction — not a dash trick, because `non-scaling-stroke` measures dashes on screen), timeline line-down + staggered days (first 14), node travel, lift/lower. Nothing loops. Reduced motion is scoped to the sheet root; every animation starts from its visible state.

## Mobile / desktop

One screen per page on 360×640 · 390×844 · 430×932 (inner scroll only for the long timeline, the desk and the inner-state page); wardrobe is the one sideways rail (arrows + ← → as tap/keyboard alternatives). Desktop: identity column max 880px (hero | doors), bag max 1000px.

## Compatibility

Old saves read unchanged (all readings are pure over existing fields). `data-life="profile-open"` still opens the bag; the bag sheet keeps `data-life="profile"`; `share-memory` and `profile-skills` kept.

## Remaining optional polish

- §36 item-acquired flight to the HUD bag chip (needs a bus hook in LifeStage — not done, to keep LifeStage changes minimal).
- A "worn today" marker on the shirt (needs the event log in the snapshot).
