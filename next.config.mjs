/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BASE_API_URL: process.env.BASE_API_URL,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns']
  }
};

export default nextConfig;
