"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { EarthEngine } from "../core/EarthEngine";

const Ctx = createContext<EarthEngine | null>(null);

export function EarthEngineProvider({ children }: { children: ReactNode }) {
  // Never initialize during render; client components can still render on server.
  const engine = useMemo(() => EarthEngine.shared, []);

  useEffect(() => {
    engine.init();
    return () => {
      // Keep shared engine for HMR stability
    };
  }, [engine]);

  return <Ctx.Provider value={engine}>{children}</Ctx.Provider>;
}

export function useEarthEngine(): EarthEngine {
  const ctx = useContext(Ctx);
  // Return shared instance without side effects; provider effect performs init.
  return ctx ?? EarthEngine.shared;
}
