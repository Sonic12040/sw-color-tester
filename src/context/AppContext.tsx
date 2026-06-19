import { createContext, useContext } from "react";
import type { ColorModel } from "../models/ColorModel.js";

export interface AppContextValue {
  colorModel: ColorModel;
  openModal: (colorId: string) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside <AppProvider>");
  return ctx;
}
