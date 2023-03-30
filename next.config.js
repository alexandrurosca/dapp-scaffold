/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production'

const nextConfig = {
  assetPrefix: isProd ? '/dapp-scaffold/' : '',
  reactStrictMode: true,
}

module.exports = nextConfig
