"use client";

import dynamic from "next/dynamic";

const EarthCanvas = dynamic(
  () =>
    import("@/components/earth").then((m) => m.EarthCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="earth-loading">
        <div className="earth-loading__orb" />
        <div className="earth-loading__label">Initializing</div>
      </div>
    ),
  },
);

export default function HomePage() {
  return <EarthCanvas />;
}
