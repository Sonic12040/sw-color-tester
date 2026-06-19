import { FavoritesProvider } from "./FavoritesContext.js";
import { HiddenProvider } from "./HiddenContext.js";
import { FiltersProvider } from "./FiltersContext.js";
import { CompareProvider } from "./CompareContext.js";
import { PaletteProvider } from "./PaletteContext.js";
import { ToastProvider } from "../components/Toast/Toast.js";

/**
 * Composes the app's independent state contexts into a single provider.
 *
 * These are deliberately kept as SEPARATE contexts rather than merged into one.
 * React propagates context by value identity, so a single combined value would
 * re-render every consumer whenever any slice changed — toggling one hidden
 * color would re-render favorites-only components, etc. Separate contexts let a
 * consumer subscribe to only the slice it needs (validated in
 * context-isolation.test.tsx). This component removes the provider-nesting
 * boilerplate without giving up that isolation.
 *
 * Ordering note: providers are independent, so nesting order is cosmetic.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <FavoritesProvider>
      <HiddenProvider>
        <FiltersProvider>
          <CompareProvider>
            <PaletteProvider>
              <ToastProvider>{children}</ToastProvider>
            </PaletteProvider>
          </CompareProvider>
        </FiltersProvider>
      </HiddenProvider>
    </FavoritesProvider>
  );
}
