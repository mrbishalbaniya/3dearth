"use client";

import { create } from "zustand";
import {
  INITIAL_NEPAL_GAME_STATE,
  type NepalGameChallenge,
  type NepalGameMode,
  type NepalGameState,
} from "./nepalConfig";

interface NepalGameStore extends NepalGameState {
  // Actions
  setMode: (mode: NepalGameMode) => void;
  startChallenge: (challenge: NepalGameChallenge) => void;
  completeChallenge: (success: boolean, timeBonus?: number) => void;
  addFoundCity: (cityId: string) => void;
  addFoundMountain: (mountainId: string) => void;
  addScore: (points: number) => void;
  addFlightDistance: (km: number) => void;
  addFlightTime: (seconds: number) => void;
  resetGame: () => void;
}

export const useNepalGameStore = create<NepalGameStore>((set) => ({
  ...INITIAL_NEPAL_GAME_STATE,

  setMode: (mode) => set({ mode }),

  startChallenge: (challenge) =>
    set({
      currentChallenge: challenge,
    }),

  completeChallenge: (success, timeBonus = 0) =>
    set((state) => {
      if (!state.currentChallenge) return state;

      const points = success
        ? state.currentChallenge.points + timeBonus
        : 0;

      return {
        score: state.score + points,
        challengesCompleted: success
          ? [...state.challengesCompleted, state.currentChallenge.id]
          : state.challengesCompleted,
        currentChallenge: null,
      };
    }),

  addFoundCity: (cityId) =>
    set((state) => ({
      citiesFound: state.citiesFound.includes(cityId)
        ? state.citiesFound
        : [...state.citiesFound, cityId],
    })),

  addFoundMountain: (mountainId) =>
    set((state) => ({
      mountainsFound: state.mountainsFound.includes(mountainId)
        ? state.mountainsFound
        : [...state.mountainsFound, mountainId],
    })),

  addScore: (points) =>
    set((state) => ({
      score: state.score + points,
    })),

  addFlightDistance: (km) =>
    set((state) => ({
      totalDistance: state.totalDistance + km,
    })),

  addFlightTime: (seconds) =>
    set((state) => ({
      totalFlightTime: state.totalFlightTime + seconds,
    })),

  resetGame: () => set(INITIAL_NEPAL_GAME_STATE),
}));
