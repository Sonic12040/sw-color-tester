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

/**
 * useSyncExternalStore requires getSnapshot to return a stable cached reference.
 * If the underlying values haven't changed, we must return the exact same object —
 * otherwise React detects a new reference on every render and loops infinitely (error #185).
 *
 * We cache one snapshot per AppState instance and only create a new object when
 * one of the tracked values has actually changed.
 */
const snapshotCache = new WeakMap<AppState, AppSnapshot>();

function getSnapshot(state: AppState): AppSnapshot {
  const prev = snapshotCache.get(state);
  if (
    prev &&
    prev.favorites === state.favorites &&
    prev.hidden === state.hidden &&
    prev.lrvMin === state.lrvMin &&
    prev.lrvMax === state.lrvMax &&
    prev.neutralBg === state.neutralBg
  ) {
    return prev;
  }
  const next: AppSnapshot = {
    favorites: state.favorites,
    hidden: state.hidden,
    lrvMin: state.lrvMin,
    lrvMax: state.lrvMax,
    neutralBg: state.neutralBg,
  };
  snapshotCache.set(state, next);
  return next;
}

export function useAppState(appState: AppState): AppSnapshot {
  return useSyncExternalStore(
    (notify) => {
      const unsubs = EVENTS.map((ev) => appState.on(ev, notify));
      return () => unsubs.forEach((u) => u());
    },
    () => getSnapshot(appState),
  );
}
