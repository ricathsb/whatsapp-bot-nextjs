// next.config.ts

const nextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  trailingSlash: true,
  experimental: {
    turbo: false,
  },
}

export default nextConfig
