import { useEffect, useReducer } from "react";
import type { AppState } from "../models/AppState.js";

export interface AppSnapshot {
  favorites: Set<string>;
  hidden: Set<string>;
  lrvMin: number;
  lrvMax: number;
  neutralBg: boolean;
}

function snapshot(state: AppState): AppSnapshot {
  return {
    favorites: new Set(state.favorites),
    hidden: new Set(state.hidden),
    lrvMin: state.lrvMin,
    lrvMax: state.lrvMax,
    neutralBg: state.neutralBg,
  };
}

export function useAppState(appState: AppState): AppSnapshot {
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const events = ["favoritesChanged", "hiddenChanged", "lrvChanged"] as const;
    const unsubs = events.map((ev) => appState.on(ev, forceUpdate));
    return () => unsubs.forEach((u) => u());
  }, [appState]);

  return snapshot(appState);
}
