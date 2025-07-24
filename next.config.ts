// next.config.ts

const nextConfig = {
  basePath: "/blasting", // ⬅️ Tambahkan ini
  trailingSlash: true,   // ⬅️ Opsional, supaya semua URL diakhiri "/"
  experimental: {
    turbo: false, // ✅ Nonaktifkan Turbopack, pakai Webpack
  },
}

export default nextConfig
