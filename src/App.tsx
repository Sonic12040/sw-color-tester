import { useCallback, useMemo, useState } from "react";
import { AppContext } from "./context/AppContext.js";
import { colorData } from "./data/palette.js";
import { ColorModel } from "./models/ColorModel.js";
import { AppState } from "./models/AppState.js";
import { CommandBus } from "./utils/CommandBus.js";
import { ExportService } from "./utils/ExportService.js";
import { useAppState } from "./hooks/useAppState.js";
import { ClearFavoritesCommand, ClearHiddenCommand } from "./commands/index.js";
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

  const openModal = useCallback(
    (colorId: string) => setModalColorId(colorId),
    [],
  );
  const closeModal = useCallback(() => setModalColorId(null), []);

  const ctxValue = useMemo(
    () => ({ colorModel, appState, commandBus, openModal }),
    [openModal],
  );
  const snapshot = useAppState(appState);
  const { favorites, hidden, lrvMin, lrvMax } = snapshot;

  const lrvRange = useMemo(
    () => ({ min: lrvMin, max: lrvMax }),
    [lrvMin, lrvMax],
  );
  const visibleColors = useMemo(
    () => colorModel.getVisibleColors(hidden, favorites, lrvRange),
    [hidden, favorites, lrvRange],
  );

  const onLrvChange = useCallback((min: number, max: number) => {
    appState.setLrvRange(min, max);
  }, []);

  const onExportFavorites = useCallback(() => {
    const favColors = colorModel.getFavoriteColors(favorites);
    if (favColors.length > 0) exportService.exportColors(favColors);
  }, [favorites]);

  const onClearFavorites = useCallback(async () => {
    if (favorites.size === 0) return;
    await commandBus.execute(new ClearFavoritesCommand());
  }, [favorites.size]);

  const onClearHidden = useCallback(async () => {
    if (hidden.size === 0) return;
    await commandBus.execute(new ClearHiddenCommand());
  }, [hidden.size]);

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
    <ToastProvider>
      <ConfirmDialogProvider>
        <AppInner />
      </ConfirmDialogProvider>
    </ToastProvider>
  );
}
