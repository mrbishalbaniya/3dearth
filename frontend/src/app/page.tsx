"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

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
  return (
    <>
      <div className="observatory-nav">
        <Link href="/game" className="observatory-nav__link">
          Launch Flight Simulator →
        </Link>
      </div>
      <EarthCanvas mode="observatory" />
    </>
  );
}
