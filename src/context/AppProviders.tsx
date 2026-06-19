import { FavoritesProvider } from "./FavoritesContext.js";
import { HiddenProvider } from "./HiddenContext.js";
import { ToastProvider } from "../components/Toast/Toast.js";
import { ConfirmDialogProvider } from "../components/ConfirmDialog/ConfirmDialog.js";

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
        <ToastProvider>
          <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
        </ToastProvider>
      </HiddenProvider>
    </FavoritesProvider>
  );
}
