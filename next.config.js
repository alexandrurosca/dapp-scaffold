/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production'

const nextConfig = {
  assetPrefix: isProd ? '/dapp-scaffold/' : '',
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
