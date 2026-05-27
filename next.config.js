/** @type {import('next').NextConfig} */
const nextConfig = {
  // クライアントのみのアプリなのでSSGプリレンダリングを無効化
  output: 'standalone',
  experimental: {
    // ビルド時の静的生成をスキップ
  },
}
module.exports = nextConfig
