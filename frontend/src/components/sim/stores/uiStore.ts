"use client";

import { create } from "zustand";

export type SimScreen =
  | "menu"
  | "explore"
  | "hangar"
  | "planner"
  | "missions"
  | "profile"
  | "settings"
  | "logbook"
  | "multiplayer"
  | "academy";

export type ToastKind = "info" | "success" | "warn" | "critical" | "atc";

export interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  body?: string;
  ttlMs?: number;
}

interface SimUiState {
  screen: SimScreen;
  menuOpen: boolean;
  settingsOpen: boolean;
  missionsOpen: boolean;
  profileOpen: boolean;
  multiplayerOpen: boolean;
  developerOpen: boolean;
  hudScale: number;
  toasts: ToastItem[];

  setScreen: (s: SimScreen) => void;
  openMenu: () => void;
  closeMenu: () => void;
  setSettingsOpen: (v: boolean) => void;
  setMissionsOpen: (v: boolean) => void;
  setProfileOpen: (v: boolean) => void;
  setMultiplayerOpen: (v: boolean) => void;
  setDeveloperOpen: (v: boolean) => void;
  setHudScale: (v: number) => void;
  pushToast: (t: Omit<ToastItem, "id">) => void;
  dismissToast: (id: string) => void;
}

let toastSeq = 0;

export const useSimUiStore = create<SimUiState>((set, get) => ({
  screen: "menu",
  menuOpen: true,
  settingsOpen: false,
  missionsOpen: false,
  profileOpen: false,
  multiplayerOpen: false,
  developerOpen: false,
  hudScale: 1,
  toasts: [],

  setScreen: (screen) =>
    set({
      screen,
      menuOpen: screen === "menu",
    }),
  openMenu: () => set({ menuOpen: true, screen: "menu" }),
  closeMenu: () => set({ menuOpen: false, screen: "explore" }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setMissionsOpen: (missionsOpen) => set({ missionsOpen }),
  setProfileOpen: (profileOpen) => set({ profileOpen }),
  setMultiplayerOpen: (multiplayerOpen) => set({ multiplayerOpen }),
  setDeveloperOpen: (developerOpen) => set({ developerOpen }),
  setHudScale: (hudScale) => set({ hudScale }),
  pushToast: (t) => {
    const id = `toast-${++toastSeq}`;
    set((s) => ({ toasts: [...s.toasts.slice(-6), { ...t, id }] }));
    const ttl = t.ttlMs ?? 4500;
    window.setTimeout(() => get().dismissToast(id), ttl);
  },
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));
