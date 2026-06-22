import { createContext } from "react";
import type { ColorModel } from "../models/ColorModel.js";
import { useRequiredContext } from "./useRequiredContext.js";

export interface AppContextValue {
  colorModel: ColorModel;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  return useRequiredContext(AppContext, "useAppContext", "AppProvider");
}
