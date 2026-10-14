/**
 * Photographs of the managed listings (owner, 14.10.2026) ship with the site instead of living in the storage bucket:
 * the five sellers are inert (`worker_market_managed`), so nobody can upload for them. The database still holds ordinary
 * opaque paths (`p/<32 hex>.webp`); `photoUrl()` serves these from `public/market/listings/`.
 * A path is added here together with its file and its row in `20261014140000_worker_market_managed_photos.sql`.
 */
export const SEED_PHOTOS: ReadonlySet<string> = new Set([
  'p/345fc078846b01778aae7ad863fd1396.webp', // St. Pauli third 2016/17
  'p/1b517731ce2191279135073a704f59c5.webp', // Celtic home 2019/20
  'p/d42d0bad57c42391856ee285d14ac12c.webp', // Celtic home 2013/14 — whole shirt
  'p/ae511a13e8e7a27c1e3b263e6e8f7787.webp', // Celtic home 2013/14 — sponsor close-up
  'p/a2d8c325ea2a89542f83121f02de4721.webp', // AEK Athens home 2022/23
  'p/11a84e8c0f1a22056c61ecee983760b6.webp', // Olympiacos 2016 — front
  'p/074fb11b46c983a9730530c40cbcb8de.webp', // Olympiacos 2016 — back, Bouchalakis 8
  'p/75ecfa91368e89a08812c8ec92c3d678.webp', // Olympiacos 2016 — close-up
])

/** the on-site URL of a seeded photograph, or null for every other path */
export const seedPhotoUrl = (path: string): string | null => (SEED_PHOTOS.has(path) ? `/market/listings/${path.slice(2)}` : null)
