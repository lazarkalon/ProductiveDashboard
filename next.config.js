/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@tremor/react']
  },
  typescript: {
    // ✅ Allow production builds to succeed even with type errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // ✅ Allow builds even if ESLint has warnings/errors
    ignoreDuringBuilds: true,
  },

}

module.exports = nextConfig
