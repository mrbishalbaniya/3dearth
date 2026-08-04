import type { NextConfig } from "next";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.jsdelivr.net",
      },
      // NASA API domains
      {
        protocol: "https",
        hostname: "apod.nasa.gov",
      },
      {
        protocol: "https",
        hostname: "api.nasa.gov",
      },
      {
        protocol: "https",
        hostname: "mars.nasa.gov",
      },
      {
        protocol: "https",
        hostname: "mars.jpl.nasa.gov",
      },
      {
        protocol: "https",
        hostname: "images-api.nasa.gov",
      },
      {
        protocol: "https",
        hostname: "images-assets.nasa.gov",
      },
      {
        protocol: "https",
        hostname: "epic.gsfc.nasa.gov",
      },
      // Additional NASA and space-related domains
      {
        protocol: "https",
        hostname: "www.nasa.gov",
      },
      {
        protocol: "https",
        hostname: "hubblesite.org",
      },
      {
        protocol: "https",
        hostname: "jwst.nasa.gov",
      },
      // Mars rover photo domains
      {
        protocol: "https",
        hostname: "mars-photos.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "photojournal.jpl.nasa.gov",
      }
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_ORIGIN}/api/v1/:path*`,
      },
      {
        source: "/healthz",
        destination: `${API_ORIGIN}/healthz`,
      },
      {
        source: "/readyz",
        destination: `${API_ORIGIN}/readyz`,
      },
    ];
  },
};

export default nextConfig;
