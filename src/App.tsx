import { useCallback, useMemo, useState } from "react";
import { AppContext } from "./context/AppContext.js";
import { AppProviders } from "./context/AppProviders.js";
import { useFavorites } from "./context/FavoritesContext.js";
import { useHidden } from "./context/HiddenContext.js";
import { colorData } from "./data/palette.js";
import { ColorModel } from "./models/ColorModel.js";
import { AppState } from "./models/AppState.js";
import { ExportService } from "./utils/ExportService.js";
import { useAppState } from "./hooks/useAppState.js";
import { Header } from "./components/Header/Header.js";
import { ColorExplorer } from "./components/ColorExplorer/ColorExplorer.js";
import { Modal } from "./components/Modal/Modal.js";
import { ToastContainer } from "./components/Toast/Toast.js";

// Singletons — created once outside the component tree
const colorModel = new ColorModel(colorData);
const appState = new AppState(colorModel);
const exportService = new ExportService();

function AppInner() {
  const [modalColorId, setModalColorId] = useState<string | null>(null);

  const openModal = useCallback((colorId: string) => setModalColorId(colorId), []);
  const closeModal = useCallback(() => setModalColorId(null), []);

  // colorModel & appState are stable singletons and openModal is memoized, so this
  // context value never changes identity — AppContext-only consumers don't re-render
  // when favorites / hidden / lrv change.
  const ctxValue = useMemo(
    () => ({ colorModel, appState, openModal }),
    [openModal],
  );
  const snapshot = useAppState(appState);
  const { lrvMin, lrvMax } = snapshot;
  const { favorites, clearFavorites } = useFavorites();
  const { hidden, clearHidden } = useHidden();

  const lrvRange = { min: lrvMin, max: lrvMax };
  const visibleColors = colorModel.getVisibleColors(hidden, favorites, lrvRange);

  const onLrvChange = (min: number, max: number) => {
    appState.setLrvRange(min, max);
  };

  const onExportFavorites = () => {
    const favColors = colorModel.getFavoriteColors(favorites);
    if (favColors.length > 0) exportService.exportColors(favColors);
  };

  const onClearFavorites = async () => {
    if (favorites.size === 0) return;
    clearFavorites();
  };

  const onClearHidden = () => {
    if (hidden.size === 0) return;
    clearHidden();
  };

  return (
    <AppContext.Provider value={ctxValue}>
      <Header
        lrvMin={lrvMin}
        lrvMax={lrvMax}
        colorCount={colorModel.getActiveColors().length}
        filteredCount={visibleColors.length}
        favoritesCount={favorites.size}
        hiddenCount={hidden.size}
        onLrvChange={onLrvChange}
        onExportFavorites={onExportFavorites}
        onClearFavorites={onClearFavorites}
        onClearHidden={onClearHidden}
      />

      <main aria-label="Color families accordion">
        <ColorExplorer />
      </main>

      <Modal colorId={modalColorId} onClose={closeModal} />
      <ToastContainer />
    </AppContext.Provider>
  );
}

export function App() {
  return (
    <AppProviders>
      <AppInner />
    </AppProviders>
  );
}
