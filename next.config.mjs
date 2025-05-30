/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Fix for the "Module not found" errors
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      child_process: false,
      zlib: false, // Use false instead of require.resolve
      stream: false,
      path: false,
      crypto: false,
    };
    
    // Ignore specific node modules that might cause issues
    config.externals = [...(config.externals || []), 'canvas', 'jsdom'];
    
    return config;
  },
}

export default nextConfig
