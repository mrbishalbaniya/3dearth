"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect } from "react";
import { useEarthStore } from "@/components/earth/store/earthStore";

const EarthCanvas = dynamic(
  () =>
    import("@/components/earth").then((m) => m.EarthCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="earth-loading">
        <div className="earth-loading__orb" />
        <div className="earth-loading__label">Initializing Observatory</div>
      </div>
    ),
  },
);

export default function HomePage() {
  const setLayer = useEarthStore((s) => s.setLayer);

  useEffect(() => {
    // Disable clouds and atmosphere for clearer view
    setLayer("clouds", false);
    setLayer("atmosphere", false);
  }, [setLayer]);

  return (
    <>
      <div className="observatory-nav">
        <Link href="/my-location" className="observatory-nav__link">
          📍 My Location 3D Map
        </Link>
        <Link href="/kathmandu-3d" className="observatory-nav__link">
          🏙️ Kathmandu 3D
        </Link>
        <Link href="/game" className="observatory-nav__link">
          ✈️ Flight Simulator
        </Link>
        <Link href="/nasa" className="observatory-nav__link">
          🚀 NASA Dashboard
        </Link>
      </div>
      <EarthCanvas mode="observatory" />
    </>
  );
}
