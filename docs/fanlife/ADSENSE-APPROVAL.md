# FAN LIFE — Google AdSense / Publisher Policy Instructions

Binding rules for any Claude/dev session touching FAN LIFE (`fanlife.dubelteam.com`) while Dubel Team seeks AdSense approval. Parent site: https://www.dubelteam.com (publisher `ca-pub-2094079368271424`, `ads.txt` at its root). Gateway: https://www.dubelteam.com/games.html · FAN LIFE page: https://www.dubelteam.com/fanlife.html

## 1. Why this exists
dubelteam.com was rejected for "Low value content". Google judges the whole domain family, so every subdomain game must look like a real, maintained, original product — never a thin shell, a login wall with nothing behind it, or an ad-stuffed page.

## 2. Hard rules
1. **Never** generate, request, simulate or buy traffic/clicks/impressions. No bots, no click exchanges, no asking users to click ads. Invalid traffic = permanent ban.
2. **No ads in the app UI during gameplay, auth, errors, loading, empty states, or evaluation mode.** Ads only on crawlable content pages (see §4) once the publisher account is approved.
3. Every page that can show ads must have substantial original text (≥300 words), a clear purpose and navigation. No ads on pages with little/no content.
4. Do not publish unverified football facts. Hapoel/club facts need a source and confidence level (see the canonical bible). Mark unverified items as such or leave them out.
5. No copyrighted club crests/photos presented as ours without the existing club-pack licence logic; no copied text from other sites.
6. No yellow in the brand palette. Keep branding intact; do not re-theme to chase approval.
7. Honest framing: FAN LIFE is an *evaluation release* until Supabase/production is live. Say so; never claim features, users or numbers that do not exist.

## 3. Required crawlable pages (server-rendered, public, no login)
Each needs a real `<title>`, one `<h1>`, meta description, canonical, and a link back to https://www.dubelteam.com/games.html:
- `/about` — what FAN LIFE is, how it works (13 gates, club packs, timeline), who makes it (Dubel Team), how it is maintained.
- `/privacy` — cookies, local storage, analytics, Google ads/cookies disclosure, contact, deletion requests.
- `/terms` — usage terms.
- `/contact` — working email.
- `/sitemap.xml` and `/robots.txt` (already generated from `app/sitemap.ts` / `app/robots.ts`) must list these pages and must NOT block `Mediapartners-Google` or Googlebot.
- Editorial hubs (optional but strongest signal): per-club history pages and Timeline entries as indexable text with sources.

## 4. Content standard
- Original, useful, human-reviewed text. No auto-generated filler, no doorway pages, no keyword stuffing.
- Football content pages: ≥400 words, sourced, dated ("last reviewed"), with internal links to the game feature they explain.
- Hebrew pages RTL (`dir="rtl"`, `lang="he"`); English pages `lang="en"`. Set `hreflang` where both exist.
- Do not scrape other sites' text into pages.

## 5. Technical checklist before requesting review
- [ ] Footer on every page: `BuiltByDubel` credit (links to dubelteam.com) + links to About, Privacy, Terms, Contact, and https://www.dubelteam.com/games.html
- [ ] No console errors, no broken links, no 404 on nav, mobile and desktop both usable
- [ ] Core Web Vitals sane (images sized, `next/image`, no layout shift)
- [ ] HTTPS only; no mixed content; no interstitials/popups covering content
- [ ] Consent: EEA/UK/CH users need a Google-certified CMP (set up in AdSense → Privacy & messaging). Do not load ad scripts before consent.
- [ ] Ad script (when approved) loaded only on §4 content routes, never in `/api`, `/auth`, gameplay screens
- [ ] `ads.txt` for the root domain is served at https://dubelteam.com/ads.txt: `google.com, pub-2094079368271424, DIRECT, f08c47fec0942fa0` (subdomains inherit nothing — do not add a competing file here unless Google asks)

## 6. Process
1. Make changes in small commits; never remove existing About/Privacy content.
2. After deploy, verify pages return 200 and are indexable (no `noindex`).
3. Owner submits sitemaps in Search Console and requests AdSense review (a few days after changes are live). Do not request repeatedly.
4. If AdSense replies with a new reason, update this file with the reason and fix.
