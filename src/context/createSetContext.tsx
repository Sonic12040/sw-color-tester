import { createContext, useMemo } from "react";
import { usePersistentSet } from "../hooks/usePersistentSet.js";
import { useRequiredContext } from "./useRequiredContext.js";

export interface SetStore {
  set: Set<string>;
  toggle: (id: string) => void;
}

/**
 * Build a persisted Set-of-ids store (favorites, hidden, …) as its own isolated
 * context — so consumers only re-render for the slice they read. Returns the
 * Provider plus a hook yielding `{ set, toggle }`; callers map those to domain
 * names (e.g. favorites / toggleFavorite).
 */
export function createSetContext(
  hook: string,
  provider: string,
  storageKey: string,
) {
  const Context = createContext<SetStore | null>(null);

  function Provider({ children }: { children: React.ReactNode }) {
    const [set, actions] = usePersistentSet(storageKey);
    const value = useMemo<SetStore>(
      () => ({ set, toggle: actions.toggle }),
      [set, actions],
    );
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  const useStore = () => useRequiredContext(Context, hook, provider);

  return { Provider, useStore };
}
