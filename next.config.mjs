/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { serverComponentsExternalPackages: ['@electric-sql/pglite'], cpus: 2 },
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
