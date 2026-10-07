/** Research files the control room reads with fs; the admin page and its API must ship the same dataset. */
export const RESEARCH_FILES = ['./research-data/**/*', './research-profiles/**/*', './research-staging/**/*']

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@electric-sql/pglite'], cpus: 2,
    // the control room reads research files at runtime (fs, not imports): ship them with the routes that read them.
    // Keys are picomatch globs matched against the route id, so the catch-all's brackets MUST be escaped —
    // an unescaped '[...action]' is a character class and matched nothing (audit F03, 7.10.2026).
    outputFileTracingIncludes: {
      '/master/admin': RESEARCH_FILES,
      '/api/master/\\[...action\\]': RESEARCH_FILES,
    },
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
