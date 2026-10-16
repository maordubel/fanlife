# Telegram experience · first upgrade

The Mini App uses the site's existing Weekly plates, seal, club crests, livery and rival-color rules. Live/playable filtering and the three canonical game pages are unchanged.

## Included

- Weekly cover, responsive crest cards and club-colored game entry.
- Local return card for the last registered club and supported game. Only schema version, club ID and game key are stored under `fanlife.telegram.visit.v1`; no Telegram identity, phone, answers or account tokens. Storage failure leaves games usable. The fan can forget the preference or explicitly choose another club. The server's current playable list determines which saved links may appear.
- The last-game link opens the existing game; it does not promise exact round restoration or cross-device/account synchronization.
- Compact connection label, optional user-triggered full screen and home-screen shortcut on supported Telegram clients. These controls do not authenticate an account.
- `/start` replies with a public 1200×720 PNG and native Open FanLife / Choose Your Club buttons. `/help` stays a text fallback. `/link CODE` remains the existing Final Whistle owner-linking path.
- Public photo route `/api/telegram/welcome-card?v=1` renders the original artwork, seal and Weekly ink tokens. No generated football facts, new dependencies or new image assets. Footer: `FanLife.DubelTeam.com`.

## Verification

1. Open `/telegram` at 390px and 1440px: no sideways scroll; club crests and controls readable.
2. Choose a club, open a game, then use FAN LIFE to return: the return card offers that club and game.
3. Forget the preference: the card disappears. Explicit Choose Your Club opens the picker. A saved paused/unplayable club must not be offered.
4. Confirm storage denial does not prevent choosing/playing.
5. Fetch the welcome photo: public `image/png`, 1200×720, visible footer and existing Fan Life artwork.
6. After deployment, send a fresh `/start` to the real bot: receive the image and two working native app buttons. `/help` must still reply with text; `/link` behavior must be unchanged.
7. On a supported physical Telegram client, test full-screen and add-to-home-screen prompts, native Back, closing confirmation and share links.

Targeted tests cover bounded/authenticated webhook responses, local storage validation/failure and existing live-club guards. The CI outage browser sweep additionally checks mobile/desktop width, actual selection/game/return/forget behavior and public PNG availability. Local HTTP checks cannot substitute for receiving the photo in Telegram on a real device.

## Deployment

Existing Production Telegram secrets, webhook URL and menu URL remain in use. No webhook re-registration is required for this code update. Ensure the public photo route returns 200 after deployment before testing the new `/start` response. Guest preferences stay local; account linking, additional gates and user notification subscriptions are separate future work. No new paid service is provisioned.
