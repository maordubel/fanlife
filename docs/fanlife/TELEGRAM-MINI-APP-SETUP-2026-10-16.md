# FAN LIFE · Telegram Mini App · first release

Bot: [@FanLife_appbot](https://t.me/FanLife_appbot). Target URL **after deployment**: https://fanlife.dubelteam.com/telegram.

## What this change does

- A magazine-styled English club picker at /telegram.
- Trivia, People's Choice / Terrace Vote and All-time XI for live clubs with playable approved content.
- Mini App routes call the **existing canonical club gate page**. No duplicate game engine, database or content feed.
- Telegram SDK is loaded only inside the /telegram layout. Safe-area padding, native back button, close confirmation and gesture handling stay inside that layout.
- Deep-link vocabulary: clubId__gate, optionally clubId__gate__seed__cursor. It is navigation only; server-side club access still applies.
- Server-side HMAC validation of raw initData, bounded request sizes, constant-time hash comparison and a one-hour launch freshness limit. No Telegram name, ID or phone is printed in the public UI.
- No added package, paid API, subscription or separate server.
- Third-party analytics and top/promo ad loading are excluded from the Telegram routes. Raw Telegram launch data must not be forwarded to analytics.

## Explicit limits — do not describe these as finished

This version verifies a Telegram launch. It **does not sign the user into Supabase, link a Fan Life account, or synchronize a guest's progress across the website and Telegram**. Existing device-local saves remain in their own browser storage. It creates no Telegram auth cookie and grants no admin permission.

Account linking needs a separate, explicit authenticated linking flow using the existing Fan Life account, with conflict/merge handling. Never merge accounts by display name, Telegram username or phone. Existing Fan Life account sign-in/sync still needs validation in a real Telegram WebView before it can be advertised as supported.

The invite links require the bot's **Main Mini App** to be enabled in BotFather. Merely setting the menu button does not finish that configuration. The mini app does not send match notifications or create a Telegram webhook. It does not implement the separate Final Whistle automation spec.

## Owner setup

1. Add TELEGRAM_BOT_TOKEN as a **server-only secret** in the existing hosting project's environment settings. Use the actual token privately, not in source code, NEXT_PUBLIC variables, screenshots, an issue or a PR. If an earlier token was revoked, use the replacement.
2. Deploy this code through the repository's existing deployment process. Do not configure the bot to point at a route that has not been deployed.
3. Open https://fanlife.dubelteam.com/telegram in a browser. Confirm the public club picker renders and the three selected gates open for the expected clubs. Browser preview mode is expected outside Telegram.
4. In BotFather: /mybots → @FanLife_appbot → Bot Settings → Configure Mini App. Enable/configure the **Main Mini App** with URL https://fanlife.dubelteam.com/telegram. Menu wording may vary with Telegram client version.
5. Configure the bot's menu button as Play FAN LIFE with that URL. Do this in BotFather, or run the optional configure script below after deploying.
6. Open the bot in Telegram and press Start, then Play FAN LIFE / Launch App.
7. Verify the status becomes Telegram connection verified. Without the server secret, it deliberately remains guest rather than claiming success. An old launch may need closing and reopening.
8. Play one complete trivia round, one player-choice run and create an XI. Test replay and native back. Check iOS and Android; desktop Telegram is an additional check.
9. Share an invitation and open it from another Telegram account. The link must reach the same club/game. Game invitations do not include the original player's private identity.

### Optional menu configuration script

Run from a secure environment with TELEGRAM_BOT_TOKEN already set; do not put its plaintext value into a command that will be copied into logs or documentation:

```sh
node scripts/telegram/configure.mjs
```

The script first checks getMe against FanLife_appbot and checks the production route returns success. It then sets only the menu button. It does not alter webhooks, publish unsolicited messages, enable paid broadcasts or configure billing. Main Mini App configuration in BotFather is still required.

## Synchronization contract

| Change in the main feature | Telegram behavior |
| --- | --- |
| Shared game component/rules | Same code after deployment; an already open app may need a reload |
| Shared club data/approved content | Same loader and caches; no separate Telegram copy |
| Paused club or closed gate | Refused on the Telegram route as well; no evaluation-mode bypass |
| New game not in the selected set | Requires intentional addition to lib/telegram/routes.ts |
| Personal saved progress | Not cross-device linked in this release |
| Bot profile/menu configuration | Separate Telegram configuration; a website deployment does not change it automatically |

## Cost controls

This change uses the current hosting, database configuration and existing game code. Telegram ordinary bot access does not require a new paid service, but visits consume the site's existing hosting traffic/compute allowance. No claim of unlimited free infrastructure is made. Check the current hosting plan's usage and spending controls before launching publicly. Nothing in this patch purchases or upgrades a service.

## Verification commands

```sh
npm ci --no-audit --no-fund
npx vitest run tests/telegram tests/top-ad.test.ts
NODE_OPTIONS=--max-old-space-size=6144 npm run typecheck
npx next lint --file components/telegram/TelegramBridge.tsx --file app/telegram/page.tsx --file app/telegram/layout.tsx --file 'app/telegram/[club]/[gate]/page.tsx'
```

Tests use synthetic credentials only. Do not use the live bot token in automated tests.

## Remaining release gate

Real Telegram device validation, production secret setup, deployment and BotFather Main Mini App configuration are required. A localhost/test result does not prove the live bot is connected. Keep the change unmerged until the intended checks are reviewed.

### Evidence from this implementation session

- Targeted automated tests cover signature validation, freshness, duplicate fields, invalid identities, request bounds, server-only verification, fixed launch routing and ad exclusions.
- Full TypeScript check passed with a 6 GiB Node heap; the default 2 GiB run exhausted memory before completing.
- ESLint on the added implementation files passed; repository hygiene and diff whitespace checks passed.
- Local HTTP checks: /telegram 200; selected club lobby 200; /telegram/hapoel-tel-aviv/xi 200 using the original gate; unknown club 404. Returned pages contained no top-ad loader or token.
- Browser/device visual checks were not completed: Chromium download returned an invalid archive in this environment. No real Telegram SDK/device login or production deployment is claimed by these local checks.
- Local verification used the seed/published club state, not a read of the live production control room.

Official references checked 16 October 2026:
- https://core.telegram.org/bots/webapps
- https://core.telegram.org/bots/tutorial
- https://core.telegram.org/bots/faq
