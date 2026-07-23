"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { EarthEngine } from "../core/EarthEngine";

const Ctx = createContext<EarthEngine | null>(null);

export function EarthEngineProvider({ children }: { children: ReactNode }) {
  const engine = useMemo(() => EarthEngine.shared.init(), []);

  useEffect(() => {
    return () => {
      // Keep shared engine for HMR stability
    };
  }, []);

  return <Ctx.Provider value={engine}>{children}</Ctx.Provider>;
}

export function useEarthEngine(): EarthEngine {
  const ctx = useContext(Ctx);
  return ctx ?? EarthEngine.shared.init();
}
