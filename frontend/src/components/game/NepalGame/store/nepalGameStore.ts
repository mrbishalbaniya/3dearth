"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { 
  NepalGameMode, 
  NepalGameChallenge, 
  NepalGameState 
} from "../nepalConfig";

export interface Player {
  id: string;
  name: string;
  position: { lat: number; lng: number; alt: number };
  heading: number;
  speed: number;
  aircraftId: string;
  color: string;
  isLocal: boolean;
}

export interface MultiplayerState {
  isConnected: boolean;
  roomCode: string | null;
  players: Map<string, Player>;
  maxPlayers: number;
  isHost: boolean;
}

interface NepalGameStore extends NepalGameState {
  // Core game state
  isGameStarted: boolean;
  isPaused: boolean;
  timeRemaining: number | null;
  
  // Multiplayer state
  multiplayer: MultiplayerState;
  
  // Actions
  setMode: (mode: NepalGameMode) => void;
  startChallenge: (challenge: NepalGameChallenge) => void;
  completeChallenge: () => void;
  failChallenge: () => void;
  addScore: (points: number) => void;
  visitCity: (cityId: string) => void;
  discoverMountain: (mountainId: string) => void;
  updateFlightStats: (distance: number, time: number) => void;
  setPaused: (paused: boolean) => void;
  resetGame: () => void;
  
  // Multiplayer actions
  connectToRoom: (roomCode: string, playerName: string) => void;
  disconnectFromRoom: () => void;
  updatePlayerPosition: (position: { lat: number; lng: number; alt: number }, heading: number, speed: number) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  updateRemotePlayer: (playerId: string, data: Partial<Player>) => void;
}

const INITIAL_MULTIPLAYER_STATE: MultiplayerState = {
  isConnected: false,
  roomCode: null,
  players: new Map(),
  maxPlayers: 8,
  isHost: false,
};

export const useNepalGameStore = create<NepalGameStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    mode: "explore",
    currentChallenge: null,
    score: 0,
    challengesCompleted: [],
    citiesFound: [],
    mountainsFound: [],
    totalDistance: 0,
    totalFlightTime: 0,
    isGameStarted: false,
    isPaused: false,
    timeRemaining: null,
    multiplayer: INITIAL_MULTIPLAYER_STATE,

    // Core game actions
    setMode: (mode) => set({ mode, isGameStarted: mode !== "explore" }),

    startChallenge: (challenge) =>
      set({
        currentChallenge: challenge,
        timeRemaining: challenge.timeLimit ?? null,
        isPaused: false,
      }),

    completeChallenge: () => {
      const state = get();
      const challenge = state.currentChallenge;
      if (!challenge) return;

      const timeBonus = state.timeRemaining
        ? Math.floor(state.timeRemaining / 10)
        : 0;

      set({
        score: state.score + challenge.points + timeBonus,
        challengesCompleted: [...state.challengesCompleted, challenge.id],
        currentChallenge: null,
        timeRemaining: null,
      });
    },

    failChallenge: () =>
      set({
        currentChallenge: null,
        timeRemaining: null,
      }),

    addScore: (points) =>
      set((state) => ({ score: state.score + points })),

    visitCity: (cityId) =>
      set((state) => ({
        citiesFound: state.citiesFound.includes(cityId)
          ? state.citiesFound
          : [...state.citiesFound, cityId],
      })),

    discoverMountain: (mountainId) =>
      set((state) => ({
        mountainsFound: state.mountainsFound.includes(mountainId)
          ? state.mountainsFound
          : [...state.mountainsFound, mountainId],
      })),

    updateFlightStats: (distance, time) =>
      set((state) => ({
        totalDistance: state.totalDistance + distance,
        totalFlightTime: state.totalFlightTime + time,
      })),

    setPaused: (isPaused) => set({ isPaused }),

    resetGame: () =>
      set({
        mode: "explore",
        currentChallenge: null,
        score: 0,
        challengesCompleted: [],
        citiesFound: [],
        mountainsFound: [],
        totalDistance: 0,
        totalFlightTime: 0,
        isGameStarted: false,
        isPaused: false,
        timeRemaining: null,
      }),

    // Multiplayer actions
    connectToRoom: (roomCode, playerName) => {
      const localPlayerId = `player-${Date.now()}`;
      const localPlayer: Player = {
        id: localPlayerId,
        name: playerName,
        position: { lat: 28.3949, lng: 84.124, alt: 5000 },
        heading: 0,
        speed: 0,
        aircraftId: "cirrus_sr22",
        color: "#00ff00",
        isLocal: true,
      };

      const players = new Map();
      players.set(localPlayerId, localPlayer);

      set({
        multiplayer: {
          isConnected: true,
          roomCode,
          players,
          maxPlayers: 8,
          isHost: false,
        },
      });
    },

    disconnectFromRoom: () =>
      set({
        multiplayer: INITIAL_MULTIPLAYER_STATE,
      }),

    updatePlayerPosition: (position, heading, speed) => {
      const { multiplayer } = get();
      const localPlayer = Array.from(multiplayer.players.values()).find(
        (p) => p.isLocal
      );
      if (!localPlayer) return;

      const updatedPlayers = new Map(multiplayer.players);
      updatedPlayers.set(localPlayer.id, {
        ...localPlayer,
        position,
        heading,
        speed,
      });

      set({
        multiplayer: {
          ...multiplayer,
          players: updatedPlayers,
        },
      });
    },

    addPlayer: (player) => {
      const { multiplayer } = get();
      const updatedPlayers = new Map(multiplayer.players);
      updatedPlayers.set(player.id, player);

      set({
        multiplayer: {
          ...multiplayer,
          players: updatedPlayers,
        },
      });
    },

    removePlayer: (playerId) => {
      const { multiplayer } = get();
      const updatedPlayers = new Map(multiplayer.players);
      updatedPlayers.delete(playerId);

      set({
        multiplayer: {
          ...multiplayer,
          players: updatedPlayers,
        },
      });
    },

    updateRemotePlayer: (playerId, data) => {
      const { multiplayer } = get();
      const player = multiplayer.players.get(playerId);
      if (!player || player.isLocal) return;

      const updatedPlayers = new Map(multiplayer.players);
      updatedPlayers.set(playerId, {
        ...player,
        ...data,
      });

      set({
        multiplayer: {
          ...multiplayer,
          players: updatedPlayers,
        },
      });
    },
  }))
);

// Subscribe to player position updates to emit to socket
if (typeof window !== "undefined") {
  useNepalGameStore.subscribe(
    (state) => state.multiplayer.players,
    (players) => {
      const localPlayer = Array.from(players.values()).find((p) => p.isLocal);
      if (localPlayer) {
        // Emit position update via socket (will be handled by socket manager)
        window.dispatchEvent(
          new CustomEvent("player-position-update", {
            detail: {
              position: localPlayer.position,
              heading: localPlayer.heading,
              speed: localPlayer.speed,
            },
          })
        );
      }
    }
  );
}
