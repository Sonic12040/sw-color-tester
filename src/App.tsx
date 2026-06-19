import { useCallback, useMemo, useState } from "react";
import { AppContext } from "./context/AppContext.js";
import { AppProviders } from "./context/AppProviders.js";
import { useFavorites } from "./context/FavoritesContext.js";
import { useHidden } from "./context/HiddenContext.js";
import { useFilters } from "./context/FiltersContext.js";
import { colorData } from "./data/palette.js";
import { ColorModel } from "./models/ColorModel.js";
import { ExportService } from "./utils/ExportService.js";
import { Header } from "./components/Header/Header.js";
import { ColorExplorer } from "./components/ColorExplorer/ColorExplorer.js";
import { Modal } from "./components/Modal/Modal.js";
import { ToastContainer, useToast } from "./components/Toast/Toast.js";

// Singletons — created once outside the component tree
const colorModel = new ColorModel(colorData);
const exportService = new ExportService();

function AppInner() {
  const [modalColorId, setModalColorId] = useState<string | null>(null);

  const openModal = useCallback(
    (colorId: string) => setModalColorId(colorId),
    [],
  );
  const closeModal = useCallback(() => setModalColorId(null), []);

  // colorModel is a stable singleton and openModal is memoized, so this context
  // value never changes identity — AppContext-only consumers don't re-render when
  // favorites / hidden / lrv change.
  const ctxValue = useMemo(() => ({ colorModel, openModal }), [openModal]);

  const { favorites, clearFavorites, actions: favActions } = useFavorites();
  const { hidden, clearHidden, actions: hiddenActions } = useHidden();
  const { lrvMin, lrvMax, lrvRange, setLrvRange } = useFilters();
  const showToast = useToast();

  const visibleColors = useMemo(
    () => colorModel.getVisibleColors(hidden, favorites, lrvRange),
    [hidden, favorites, lrvRange],
  );

  const onExportFavorites = () => {
    const favColors = colorModel.getFavoriteColors(favorites);
    if (favColors.length > 0) exportService.exportColors(favColors);
  };

  const onClearFavorites = () => {
    if (favorites.size === 0) return;
    const cleared = [...favorites];
    clearFavorites();
    showToast(
      `Cleared ${cleared.length} favorite${cleared.length === 1 ? "" : "s"}`,
      { actionText: "Undo", onAction: () => favActions.addMultiple(cleared) },
    );
  };

  const onClearHidden = () => {
    if (hidden.size === 0) return;
    const cleared = [...hidden];
    clearHidden();
    showToast(
      `Cleared ${cleared.length} hidden color${cleared.length === 1 ? "" : "s"}`,
      {
        actionText: "Undo",
        onAction: () => hiddenActions.addMultiple(cleared),
      },
    );
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
        onLrvChange={setLrvRange}
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
