import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Genera .next/standalone + .next/static
    output: 'export',              // genera archivos estáticos
    distDir: 'build',              // cambia la carpeta de salida a /build
    images: { unoptimized: true }, // evita errores con next/image en modo export
};

export default nextConfig;