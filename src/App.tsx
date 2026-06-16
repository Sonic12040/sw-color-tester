import { useState } from "react";
import { AppContext } from "./context/AppContext.js";
import { FavoritesProvider, useFavorites } from "./context/FavoritesContext.js";
import { colorData } from "./data/palette.js";
import { ColorModel } from "./models/ColorModel.js";
import { AppState } from "./models/AppState.js";
import { CommandBus } from "./utils/CommandBus.js";
import { ExportService } from "./utils/ExportService.js";
import { useAppState } from "./hooks/useAppState.js";
import { ClearHiddenCommand } from "./commands/index.js";
import { Header } from "./components/Header/Header.js";
import { ColorExplorer } from "./components/ColorExplorer/ColorExplorer.js";
import { Modal } from "./components/Modal/Modal.js";
import { ToastProvider, ToastContainer } from "./components/Toast/Toast.js";
import { ConfirmDialogProvider } from "./components/ConfirmDialog/ConfirmDialog.js";

// Singletons — created once outside the component tree
const colorModel = new ColorModel(colorData);
const appState = new AppState(colorModel);
const commandBus = new CommandBus(colorModel, appState);
const exportService = new ExportService();

function AppInner() {
  const [modalColorId, setModalColorId] = useState<string | null>(null);

  const openModal = (colorId: string) => setModalColorId(colorId);
  const closeModal = () => setModalColorId(null);

  const ctxValue = { colorModel, appState, commandBus, openModal };
  const snapshot = useAppState(appState);
  const { hidden, lrvMin, lrvMax } = snapshot;
  const { favorites, clearFavorites } = useFavorites();

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

  const onClearHidden = async () => {
    if (hidden.size === 0) return;
    await commandBus.execute(new ClearHiddenCommand());
  };

  return (
    <AppContext.Provider value={ctxValue}>
      <Header
        lrvMin={lrvMin}
        lrvMax={lrvMax}
        colorCount={colorModel.getActiveColors().length}
        filteredCount={visibleColors.length}
        favoritesCount={favorites.size}
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
    <FavoritesProvider>
      <ToastProvider>
        <ConfirmDialogProvider>
          <AppInner />
        </ConfirmDialogProvider>
      </ToastProvider>
    </FavoritesProvider>
  );
}
