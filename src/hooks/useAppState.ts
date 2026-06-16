import { useSyncExternalStore } from "react";
import type { AppState } from "../models/AppState.js";

export interface AppSnapshot {
  favorites: Set<string>;
  hidden: Set<string>;
  lrvMin: number;
  lrvMax: number;
  neutralBg: boolean;
}

const EVENTS = [
  "favoritesChanged",
  "hiddenChanged",
  "lrvChanged",
  "neutralBgChanged",
] as const;

function snapshot(state: AppState): AppSnapshot {
  return {
    // Return live references — useSyncExternalStore guarantees a new snapshot
    // object on every notify(), so referential equality checks work correctly.
    favorites: state.favorites,
    hidden: state.hidden,
    lrvMin: state.lrvMin,
    lrvMax: state.lrvMax,
    neutralBg: state.neutralBg,
  };
}

export function useAppState(appState: AppState): AppSnapshot {
  return useSyncExternalStore(
    (notify) => {
      const unsubs = EVENTS.map((ev) => appState.on(ev, notify));
      return () => unsubs.forEach((u) => u());
    },
    () => snapshot(appState),
  );
}
