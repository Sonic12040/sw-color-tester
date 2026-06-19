import { createContext, useContext, useMemo } from "react";
import { useSet, type SetActions } from "../hooks/useSet.js";

export interface HiddenContextValue {
  hidden: Set<string>;
  actions: SetActions<string>;
  toggleHidden: (id: string) => void;
  clearHidden: () => void;
  toggleBulkHidden: (colorIds: string[]) => void;
}

export const HiddenContext = createContext<HiddenContextValue | null>(null);

export function useHidden(): HiddenContextValue {
  const ctx = useContext(HiddenContext);
  if (!ctx) {
    throw new Error("useHidden must be used inside <HiddenProvider>");
  }
  return ctx;
}

export function HiddenProvider({ children }: { children: React.ReactNode }) {
  const [hidden, actions] = useSet<string>();

  const toggleBulkHidden = (colorIds: string[]) => {
    const allHidden = colorIds.length > 0 && colorIds.every((id) => hidden.has(id));
    if (allHidden) {
      actions.removeMultiple(colorIds);
    } else {
      actions.addMultiple(colorIds);
    }
  };

  const value = useMemo<HiddenContextValue>(() => ({
    hidden,
    actions,
    toggleHidden: actions.toggle,
    clearHidden: actions.clear,
    toggleBulkHidden,
  }), [hidden, actions]);

  return (
    <HiddenContext.Provider value={value}>
      {children}
    </HiddenContext.Provider>
  );
}
