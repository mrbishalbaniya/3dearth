"use client";

import { createContext, useContext } from "react";

/** Observatory homepage vs dedicated flight-sim page. */
export type EarthAppMode = "observatory" | "game";

const EarthAppModeContext = createContext<EarthAppMode>("observatory");

export function EarthAppModeProvider({
  mode,
  children,
}: {
  mode: EarthAppMode;
  children: React.ReactNode;
}) {
  return (
    <EarthAppModeContext.Provider value={mode}>
      {children}
    </EarthAppModeContext.Provider>
  );
}

export function useEarthAppMode(): EarthAppMode {
  return useContext(EarthAppModeContext);
}
