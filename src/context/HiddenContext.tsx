import { createSetContext } from "./createSetContext.js";
import { STORAGE_KEYS } from "../utils/storage.js";

const { Provider, useStore } = createSetContext(
  "useHidden",
  "HiddenProvider",
  STORAGE_KEYS.hidden,
);

export const HiddenProvider = Provider;

/** Hidden color ids + a toggle. */
export function useHidden() {
  const { set, toggle } = useStore();
  return { hidden: set, toggleHidden: toggle };
}
