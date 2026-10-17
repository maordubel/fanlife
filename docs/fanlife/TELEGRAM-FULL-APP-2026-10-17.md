# Telegram · the full Fan Life entrance

The Mini App previously exposed only Trivia, People's Choice and All-time XI. Its launcher now discovers all thirteen gates from `SHARED_GATES`, using the original English titles, Weekly cover components, groupings and club-specific wall numbers. A gate is linked only when the club is live, the gate is switched on, and its archive is playable. Closed covers remain visible with the existing unavailable stamp.

## Shared screens

- Twelve gates invoke the canonical shared gate page. Timeline invokes its dedicated canonical page, preserving chronology, thread and chronicle query parameters. LIFE invokes the canonical club LIFE page after an explicit live-club check; the original page still validates pack readiness.
- The contents menu uses Fan Life's existing `Contents`, club sections, corner and club directory. It contains all thirteen gates for the selected club. Club home/history, market and item details, closet, profile/file, auctions, shirt catalogue and All Football use their original routes, layouts, actions and stores in the same WebView.
- The original Legends Manager banner is streamed when its existing feature and roster readiness checks permit it. Its career, draft and friendly screens remain the original pages.
- Our Games is a permanent doorway to the original LIFE/Legends chooser. The launcher and its contents menu list All Football only when its public feature switch is on; a disabled area must not become a new 404 link. The original LIFE menu anchor opens Our Games inside Telegram.
- Our Games and All Football/Legends use the Fan Life root locale and publication scope, including after a reload; pausing the legacy Hapoel gates must not close these multi-club pages.
- Telegram context lives in the root layout. A lazy bridge survives anchor navigation, `router.push` and server-action redirects. A tab-local versioned flag restores the bridge after a same-origin reload. Ordinary website visits do not load the SDK; staff, API and authentication surfaces do not mount the bridge.
- Native Back has a deterministic parent even after a cold launch; selecting a club enables Back to the chooser. Closing confirmation and swipe protection apply to games/LIFE/careers. Existing menus and links still run their own close handlers. Canonical club/home navigation is no longer rewritten back into the limited launcher.
- Telegram safe insets apply to original pages and their fixed mastheads/tab bars. The launcher retains the optional full-screen, shortcut and invitation controls.
- `/help` and the welcome artwork describe the expanded entrance. The welcome photo uses `?v=2`; bot credentials, webhook registration and the Final Whistle `/link` handler are unchanged.

## Persistence and identity

This introduces no second game engine, account database or save format. Original device saves remain device saves. Account features retain Fan Life's current authentication. Verified Telegram launch data indicates a Telegram connection; it does not automatically sign into a Fan Life account or synchronize browser and Telegram saves. LIFE resumes through its original save system; the lobby's remembered-game link still records the thirteen gates only.

## Acceptance

1. At 390px and 1440px, inspect launcher, selected club and all thirteen covers without sideways scrolling. Confirm club/rival inks, original artwork and numbers.
2. Open each available gate and Timeline's three modes. Inspect locked gates and test paused/unpublished/switched-off rejection.
3. Open LIFE and the available Legends banner; use the original saves and return controls.
4. From Telegram, enter the original club home/history, market and personal areas; reload, then use native Back. The bridge should survive while original menus still close when selected.
5. Confirm an ordinary website tab and staff/auth pages do not acquire Telegram controls.
6. Test a physical Telegram client for native Back, closing confirmation, safe areas, full-screen, shortcuts, invitations and `/start` photo delivery. A synthetic SDK/browser check cannot establish physical-client acceptance.

`tests/telegram` covers the expanded dispatch, public fallback and gate policy, launch validation, context isolation, native parent mapping, existing verification and `/link`. `scripts/qa/outage-sweep.mjs` also checks the thirteen covers plus a synthetic native guest moving launcher → market → reload → Back and launcher → Timeline → Back with the write store unavailable.
