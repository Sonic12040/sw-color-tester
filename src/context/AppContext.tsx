import { createContext, use } from "react";
import type { ColorModel } from "../models/ColorModel.js";
import type { AppState } from "../models/AppState.js";
import type { CommandBus } from "../utils/CommandBus.js";

export interface AppContextValue {
  colorModel: ColorModel;
  appState: AppState;
  commandBus: CommandBus;
  openModal: (colorId: string) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const ctx = use(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside <AppProvider>");
  return ctx;
}
