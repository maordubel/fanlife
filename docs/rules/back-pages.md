# The Back Pages answer a real question and end at a door (14.11.2026)

Owner, marketing plan v8: FAN LIFE publishes articles at `/back-pages/<slug>` (`lib/back-pages/posts.tsx`), built from his research file of questions supporters ask.

- A post answers in its first paragraph, states only what the product does today, and ends at a door that plays it (`cta`). A feature that is not live is not promised.
- Every post carries Article + BreadcrumbList JSON-LD, a canonical URL and its own `updated` date, which is the date the sitemap prints for it.
- After each production deploy `indexnow.yml` reports the Back Pages to IndexNow; on Sundays it reports the whole sitemap. The key file in `public/` must match the workflow (`tests/back-pages.test.ts`).
- At most one post a day; quality before quantity (Google's scaled-content policy).
