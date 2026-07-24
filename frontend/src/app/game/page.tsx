"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect } from "react";
import { useEarthStore } from "@/components/earth/store/earthStore";
import { NEPAL_BOUNDS, NEPAL_CAMERA_CONFIG } from "@/components/game/NepalGame";

const EarthCanvas = dynamic(
  () => import("@/components/earth").then((m) => m.EarthCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="earth-loading">
        <div className="earth-loading__orb" />
        <div className="earth-loading__label">Loading Nepal Explorer</div>
      </div>
    ),
  },
);

const NepalGameMenu = dynamic(
  () => import("@/components/game/NepalGame").then((m) => m.NepalGameMenu),
  { ssr: false }
);

const NepalGameHUD = dynamic(
  () => import("@/components/game/NepalGame").then((m) => m.NepalGameHUD),
  { ssr: false }
);

export default function GamePage() {
  const requestFlyTo = useEarthStore((s) => s.requestFlyTo);

  useEffect(() => {
    // Focus camera on Nepal when page loads
    const timer = setTimeout(() => {
      requestFlyTo({
        lat: NEPAL_CAMERA_CONFIG.defaultPosition.lat,
        lng: NEPAL_CAMERA_CONFIG.defaultPosition.lng,
        altitude: NEPAL_CAMERA_CONFIG.defaultAltitude,
        duration: 3000,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [requestFlyTo]);

  return (
    <div className="game-page game-page--nepal">
      <nav className="game-page__nav game-page__nav--nepal">
        <Link href="/" className="game-page__back" title="Back to observatory">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 4L6 10L12 16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Observatory
        </Link>
        <div className="game-page__title-wrapper">
          <h1 className="game-page__title">
            Explore Nepal
          </h1>
        </div>
      </nav>

      <EarthCanvas mode="game" />

      {/* Nepal Game UI */}
      <NepalGameMenu />
      <NepalGameHUD />

      <style jsx>{`
        .game-page--nepal {
          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          background: linear-gradient(to bottom, #0a0e1a 0%, #000000 100%);
        }

        .game-page__nav--nepal {
          background: linear-gradient(
            135deg,
            rgba(220, 38, 38, 0.95),
            rgba(239, 68, 68, 0.90),
            rgba(30, 64, 175, 0.85)
          );
          backdrop-filter: blur(16px);
          border-bottom: 2px solid rgba(251, 191, 36, 0.3);
          box-shadow: 0 4px 24px rgba(220, 38, 38, 0.3);
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .game-page__back {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          transition: all 0.2s;
        }

        .game-page__back:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateX(-2px);
        }

        .game-page__title-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .game-page__title {
          font-size: 28px;
          font-weight: 800;
          color: white;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
          margin: 0;
        }

        @media (max-width: 768px) {
          .game-page__nav--nepal {
            padding: 12px 16px;
            flex-direction: column;
            gap: 12px;
          }

          .game-page__back {
            align-self: flex-start;
            font-size: 13px;
            padding: 6px 12px;
          }

          .game-page__title {
            font-size: 22px;
          }
        }
      `}</style>
    </div>
  );
}
