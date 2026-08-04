"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "../store/gameStore";
import { useEarthStore } from "@/components/earth/store/earthStore";

interface Mission {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  startLocation: { lat: number; lng: number; alt: number };
  waypoints: Array<{ lat: number; lng: number; name: string }>;
  completed: boolean;
}

const NEPAL_MISSIONS: Mission[] = [
  {
    id: "kathmandu-city-tour",
    title: "🏙️ Kathmandu City Tour",
    description: "Fly over historic Kathmandu with detailed 3D buildings",
    objectives: [
      "Take off from Tribhuvan Airport",
      "Fly over Thamel tourist district",
      "View Pashupatinath Temple",
      "Circle Durbar Square",
      "Visit Swayambhunath stupa",
      "Land safely at Tribhuvan"
    ],
    startLocation: { lat: 27.6966, lng: 85.3591, alt: 1337 }, // Tribhuvan
    waypoints: [
      { lat: 27.7145, lng: 85.3120, name: "Thamel District" },
      { lat: 27.7106, lng: 85.3485, name: "Pashupatinath" },
      { lat: 27.7040, lng: 85.3076, name: "Durbar Square" },
      { lat: 27.7149, lng: 85.2903, name: "Swayambhunath" },
      { lat: 27.6966, lng: 85.3591, name: "Tribhuvan Airport" }
    ],
    completed: false
  },
  {
    id: "everest-flyover",
    title: "🏔️ Everest Flyover",
    description: "Fly over Mount Everest and capture the peak",
    objectives: [
      "Take off from Lukla Airport",
      "Navigate to Everest Base Camp",
      "Fly over Everest summit (8,849m)",
      "Land safely at Kathmandu"
    ],
    startLocation: { lat: 27.6883, lng: 86.7314, alt: 2845 }, // Lukla
    waypoints: [
      { lat: 27.9881, lng: 86.9250, name: "Everest Base Camp" },
      { lat: 27.9881, lng: 86.9250, name: "Everest Summit" },
      { lat: 27.7172, lng: 85.3240, name: "Kathmandu Airport" }
    ],
    completed: false
  },
  {
    id: "annapurna-circuit",
    title: "⛰️ Annapurna Circuit",
    description: "Complete a scenic tour around the Annapurna range",
    objectives: [
      "Start from Pokhara Airport",
      "Fly through Annapurna Sanctuary",
      "Navigate Thorong La Pass",
      "Return to Pokhara"
    ],
    startLocation: { lat: 28.2096, lng: 83.9821, alt: 827 }, // Pokhara
    waypoints: [
      { lat: 28.5333, lng: 83.8167, name: "Annapurna Base Camp" },
      { lat: 28.7500, lng: 83.9333, name: "Thorong La Pass" },
      { lat: 28.2096, lng: 83.9821, name: "Pokhara Airport" }
    ],
    completed: false
  },
  {
    id: "mountain-rescue",
    title: "🚁 Mountain Rescue",
    description: "Emergency rescue mission in the Himalayas",
    objectives: [
      "Launch from Kathmandu",
      "Locate stranded climbers",
      "Land at high altitude",
      "Complete rescue and return"
    ],
    startLocation: { lat: 27.7172, lng: 85.3240, alt: 1337 }, // Kathmandu
    waypoints: [
      { lat: 28.1500, lng: 85.8500, name: "Search Area" },
      { lat: 27.7172, lng: 85.3240, name: "Kathmandu Airport" }
    ],
    completed: false
  }
];

export function NepalFlightSim() {
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [missionActive, setMissionActive] = useState(false);
  const [objectivesCompleted, setObjectivesCompleted] = useState<number>(0);
  const [showMissions, setShowMissions] = useState(false);

  const flightMode = useGameStore((s) => s.mode === "flight");
  const beginFlight = useGameStore((s) => s.beginFlight);
  const endFlight = useGameStore((s) => s.endFlight);
  const requestFlyTo = useEarthStore((s) => s.requestFlyTo);

  const handleStartMission = (mission: Mission) => {
    setSelectedMission(mission);
    setMissionActive(true);
    setObjectivesCompleted(0);
    setShowMissions(false);

    // Fly to mission start location
    requestFlyTo({
      lat: mission.startLocation.lat,
      lng: mission.startLocation.lng,
      altitude: mission.startLocation.alt,
      duration: 2000,
    });

    // Start flight mode
    setTimeout(() => {
      beginFlight({
        lat: mission.startLocation.lat,
        lng: mission.startLocation.lng,
        elevM: mission.startLocation.alt,
        headingDeg: 0,
      });
    }, 2500);
  };

  // Auto-start first mission on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!missionActive && !selectedMission) {
        handleStartMission(NEPAL_MISSIONS[0]);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [missionActive, selectedMission]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEndMission = () => {
    setMissionActive(false);
    setSelectedMission(null);
    setObjectivesCompleted(0);
    endFlight();
  };

  return (
    <>
      {/* Mission Toggle Button */}
      {!missionActive && (
        <button
          className="mission-toggle"
          onClick={() => setShowMissions(!showMissions)}
        >
          {showMissions ? "✕ Close" : "🎯 Missions"}
        </button>
      )}

      {/* Mission Selection Panel */}
      {showMissions && !missionActive && (
        <div className="mission-panel">
          <h2 className="mission-panel__title">Nepal Flight Missions</h2>
          <div className="mission-list">
            {NEPAL_MISSIONS.map((mission) => (
              <div key={mission.id} className="mission-card">
                <h3 className="mission-card__title">{mission.title}</h3>
                <p className="mission-card__desc">{mission.description}</p>
                <div className="mission-card__objectives">
                  {mission.objectives.map((obj, i) => (
                    <div key={i} className="objective">
                      <span className="objective__bullet">•</span>
                      {obj}
                    </div>
                  ))}
                </div>
                <button
                  className="mission-card__start"
                  onClick={() => handleStartMission(mission)}
                >
                  Start Mission
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Mission HUD */}
      {missionActive && selectedMission && (
        <div className="mission-hud">
          <div className="mission-hud__header">
            <h3 className="mission-hud__title">{selectedMission.title}</h3>
            <button
              className="mission-hud__end"
              onClick={handleEndMission}
            >
              End Mission
            </button>
          </div>
          <div className="mission-hud__objectives">
            {selectedMission.objectives.map((obj, i) => (
              <div
                key={i}
                className={`mission-objective ${i < objectivesCompleted ? "completed" : ""}`}
              >
                <span className="mission-objective__check">
                  {i < objectivesCompleted ? "✓" : "○"}
                </span>
                {obj}
              </div>
            ))}
          </div>
          <div className="mission-hud__progress">
            Progress: {objectivesCompleted}/{selectedMission.objectives.length}
          </div>
        </div>
      )}

      <style jsx>{`
        .mission-toggle {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 24px;
          background: rgba(30, 64, 175, 0.9);
          color: white;
          border: 2px solid rgba(251, 191, 36, 0.3);
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: all 0.2s;
          z-index: 1000;
        }

        .mission-toggle:hover {
          background: rgba(30, 64, 175, 1);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(30, 64, 175, 0.4);
        }

        .mission-panel {
          position: fixed;
          top: 80px;
          right: 20px;
          width: 400px;
          max-height: calc(100vh - 120px);
          background: rgba(15, 23, 42, 0.95);
          border: 2px solid rgba(251, 191, 36, 0.3);
          border-radius: 12px;
          padding: 24px;
          overflow-y: auto;
          backdrop-filter: blur(16px);
          z-index: 1000;
        }

        .mission-panel__title {
          font-size: 24px;
          font-weight: 800;
          color: white;
          margin: 0 0 20px 0;
          text-align: center;
        }

        .mission-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .mission-card {
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid rgba(251, 191, 36, 0.2);
          border-radius: 8px;
          padding: 16px;
          transition: all 0.2s;
        }

        .mission-card:hover {
          border-color: rgba(251, 191, 36, 0.5);
          transform: translateX(-4px);
        }

        .mission-card__title {
          font-size: 18px;
          font-weight: 700;
          color: white;
          margin: 0 0 8px 0;
        }

        .mission-card__desc {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
          margin: 0 0 12px 0;
        }

        .mission-card__objectives {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
        }

        .objective {
          display: flex;
          gap: 8px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.6);
        }

        .objective__bullet {
          color: rgba(251, 191, 36, 0.8);
        }

        .mission-card__start {
          width: 100%;
          padding: 10px;
          background: rgba(30, 64, 175, 0.9);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mission-card__start:hover {
          background: rgba(30, 64, 175, 1);
          transform: translateY(-2px);
        }

        .mission-hud {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 320px;
          background: rgba(15, 23, 42, 0.95);
          border: 2px solid rgba(251, 191, 36, 0.3);
          border-radius: 12px;
          padding: 20px;
          backdrop-filter: blur(16px);
          z-index: 1000;
        }

        .mission-hud__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .mission-hud__title {
          font-size: 18px;
          font-weight: 700;
          color: white;
          margin: 0;
        }

        .mission-hud__end {
          padding: 6px 12px;
          background: rgba(220, 38, 38, 0.8);
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mission-hud__end:hover {
          background: rgba(220, 38, 38, 1);
        }

        .mission-hud__objectives {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 16px;
        }

        .mission-objective {
          display: flex;
          gap: 10px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
          transition: all 0.3s;
        }

        .mission-objective.completed {
          color: rgba(134, 239, 172, 1);
        }

        .mission-objective__check {
          color: rgba(251, 191, 36, 0.8);
          font-weight: 700;
        }

        .mission-objective.completed .mission-objective__check {
          color: rgba(134, 239, 172, 1);
        }

        .mission-hud__progress {
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 14px;
          font-weight: 600;
          color: rgba(251, 191, 36, 0.9);
          text-align: center;
        }

        @media (max-width: 768px) {
          .mission-toggle {
            top: 10px;
            right: 10px;
            padding: 8px 16px;
            font-size: 14px;
          }

          .mission-panel,
          .mission-hud {
            right: 10px;
            width: calc(100vw - 20px);
            max-width: 360px;
          }

          .mission-panel {
            top: 60px;
          }
        }
      `}</style>
    </>
  );
}
