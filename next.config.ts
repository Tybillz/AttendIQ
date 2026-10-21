import type { NextConfig } from "next";

const isCapacitor = process.env.CAPACITOR_BUILD === 'true';

const nextConfig: NextConfig = {
  output: isCapacitor ? 'export' : undefined,
  images: {
    unoptimized: true,
  },
  // Allow phone and tablet connections on local Wi-Fi network
  allowedDevOrigins: ['192.168.0.143', '192.168.0.*', 'localhost', '127.0.0.1'],
  serverExternalPackages: ['jspdf', 'canvg', 'jspdf-autotable'],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
