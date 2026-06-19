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
import { ToastContainer } from "./components/Toast/Toast.js";
import { useConfirmDialog } from "./components/ConfirmDialog/ConfirmDialog.js";

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

  const { favorites, clearFavorites } = useFavorites();
  const { hidden, clearHidden } = useHidden();
  const { lrvMin, lrvMax, lrvRange, setLrvRange } = useFilters();
  const confirm = useConfirmDialog();

  const visibleColors = useMemo(
    () => colorModel.getVisibleColors(hidden, favorites, lrvRange),
    [hidden, favorites, lrvRange],
  );

  const onExportFavorites = () => {
    const favColors = colorModel.getFavoriteColors(favorites);
    if (favColors.length > 0) exportService.exportColors(favColors);
  };

  const onClearFavorites = async () => {
    if (favorites.size === 0) return;
    const ok = await confirm({
      title: "Clear all favorites?",
      message: `This removes all ${favorites.size} favorited color${favorites.size === 1 ? "" : "s"}.`,
      confirmLabel: "Clear favorites",
    });
    if (ok) clearFavorites();
  };

  const onClearHidden = async () => {
    if (hidden.size === 0) return;
    const ok = await confirm({
      title: "Clear all hidden colors?",
      message: `This unhides all ${hidden.size} hidden color${hidden.size === 1 ? "" : "s"}.`,
      confirmLabel: "Clear hidden",
    });
    if (ok) clearHidden();
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
