import type { NextConfig } from 'next'

const isProd = process.env.NODE_ENV === 'production'

const nextConfig: NextConfig = {
    // Solo en producción queremos estático y carpeta build
    ...(isProd ? { output: 'export', images: { unoptimized: true } } : {}),
    distDir: isProd ? 'build' : '.next',
    reactStrictMode: false,
    //experimental: { ppr: true },
    webpack: (config, { dev }) => {
        if (dev) {
            // por si queda cache: ignora cualquier carpeta build accidental
            config.watchOptions = { ...config.watchOptions, ignored: ['**/build/**'] }
        }
        return config
    },
}
export default nextConfig;