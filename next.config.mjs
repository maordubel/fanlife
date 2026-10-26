/** Research files the control room reads with fs; the admin page and its API must ship the same dataset. */
export const RESEARCH_FILES = ['./research-data/**/*', './research-profiles/**/*', './research-staging/**/*']

/** Evaluation mode boots an in-process Postgres at runtime from these files (fs, not imports). */
export const EVALUATION_FILES = ['./scripts/master/local-bootstrap.sql', './supabase/migrations/*.sql']

/** @type {import('next').NextConfig} */
const nextConfig = {
  // FAN LEAGUE became LEGENDS MANAGER (owner, 12.10.2026); its test careers were cleared, so every old link lands at the new door
  async redirects() { return [{ source: '/all-football/fan-league/:path*', destination: '/all-football/legends', permanent: false }, { source: '/all-football/fan-league', destination: '/all-football/legends', permanent: false }] },
  // Static art is large and names are not versioned: a day in the browser, a week stale-while-revalidate (a replaced file shows within a day).
  async headers() {
    const art = [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }]
    const fonts = [{ key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=604800' }]
    return [
      ...['life', 'kits', 'brand', 'legends', 'away', 'kit-archive', 'highlights', 'art', 'club-kits', 'crests', 'video', 'uss'].map((d) => ({ source: `/${d}/:path*`, headers: art })),
      { source: '/fonts/:path*', headers: fonts },
    ]
  },
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@electric-sql/pglite'], cpus: 2,
    // the control room reads research files at runtime (fs, not imports): ship them with the routes that read them.
    // Keys are picomatch globs matched against the route id, so the catch-all's brackets MUST be escaped —
    // an unescaped '[...action]' is a character class and matched nothing (audit F03, 7.10.2026).
    outputFileTracingIncludes: {
      // the social plan's tick draws the kit picture with the vendored renderer (scripts/marketing/kit) and sharp
      '/api/marketing/tick': ['./scripts/marketing/kit/**', './content/manual/kit-photos.json', './content/generated/kit-master.json', './public/kits/*.webp', './node_modules/sharp/**', './node_modules/@img/**'],
      '/api/telegram/welcome-card': ['./app/magazine.css', './lib/og/fonts/archivo-latin-800.ttf', './public/brand/fanlife/logo-192.png', './public/brand/weekly/plates/cheer-line.webp'],
      '/master/admin': RESEARCH_FILES,
      '/api/master/\\[...action\\]': RESEARCH_FILES,
      '/api/evaluation/db': EVALUATION_FILES,
      '/api/evaluation/files': EVALUATION_FILES,
      '/api/track': EVALUATION_FILES,
      // pre-compiled club packs (lib/clubs/precompiled.ts): every route that may load a club reads them with fs
      '/**': ['./content/compiled/*.json'],
    },
  },
  // The static kit archives live in public/kit-archive/<club>/index.html; Next serves exact file paths only, so the folder URLs are rewritten to their index.
  async rewrites() {
    return [
      { source: '/kit-archive', destination: '/kit-archive/index.html' },
      { source: '/kit-archive/:club', destination: '/kit-archive/:club/index.html' },
      { source: '/aek-kit-archive', destination: '/aek-kit-archive/index.html' },
    ]
  },
  poweredByHeader: false,
  images: { formats: ['image/avif', 'image/webp'] },

  // ESLint runs in CI (`npm run lint`), not inside `next build`.
  //
  // Why: Vercel's sandboxed install blocks postinstall scripts, and
  // eslint-config-next depends on `unrs-resolver`, whose postinstall places a native
  // binary. Without it ESLint throws during the build — which is exactly the package
  // the deploy log warns about. The lint gate is not weakened, it just runs where its
  // dependencies actually install.
  eslint: { ignoreDuringBuilds: true },

  typescript: { ignoreBuildErrors: false },
}

export default nextConfig
