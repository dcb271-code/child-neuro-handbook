/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',          // fully static — works on Vercel, Netlify, or plain hosting
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
