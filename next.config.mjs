/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  async redirects() {
    return [{ source: "/favicon.ico", destination: "/icon.svg", permanent: false }]
  },
}

export default nextConfig
