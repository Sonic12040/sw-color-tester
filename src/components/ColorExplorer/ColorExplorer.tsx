import { useAppContext } from "../../context/AppContext.js";
import { useAppState } from "../../hooks/useAppState.js";
import { useFavorites } from "../../context/FavoritesContext.js";
import { useHidden } from "../../context/HiddenContext.js";
import { useToast } from "../Toast/Toast.js";
import { ColorAccordion } from "./ColorAccordion/ColorAccordion.js";
import styles from "./ColorExplorer.module.css";

export function ColorExplorer() {
  const { colorModel, appState, openModal } = useAppContext();
  const snapshot = useAppState(appState);
  const { favorites, actions: favActions, toggleFavorite, toggleBulkFavorite } =
    useFavorites();
  const { hidden, actions: hiddenActions, toggleHidden, toggleBulkHidden } =
    useHidden();
  const showToast = useToast();

  const { lrvMin, lrvMax } = snapshot;
  const lrvRange = { min: lrvMin, max: lrvMax };

  const designerPickIds = colorModel.getDesignerPickIds(); // stable — built once in constructor
  const favoriteColors = colorModel.getFavoriteColors(favorites);
  const hiddenColors = colorModel.getHiddenColors(hidden);
  const visibleColors = colorModel.getVisibleColors(hidden, favorites, lrvRange);
  const colorFamilies = colorModel.groupByFamily(visibleColors);
  const sortedFamilies = colorModel.sortFamiliesByPriority([...colorFamilies.keys()]);
  const hiddenFamilies = colorModel.getHiddenFamilies(hidden, favorites);

  // Event handlers
  const onToggleFavorite = (id: string) => toggleFavorite(id);
  const onToggleHidden = (id: string) => toggleHidden(id);
  const onFavoriteAll = (_groupId: string, groupName: string) => {
    const ids = colorModel.getFamilyColors(groupName).map((c) => c.id);
    if (ids.length === 0) return;

    const wereAllFavorited = ids.every((id) => favorites.has(id));
    toggleBulkFavorite(ids);

    const verb = wereAllFavorited ? "Unfavorited" : "Favorited";
    showToast(`${verb} ${ids.length} ${groupName} colors`, {
      actionText: "Undo",
      onAction: () =>
        wereAllFavorited
          ? favActions.addMultiple(ids)
          : favActions.removeMultiple(ids),
    });
  };
  const onHideAll = (_groupId: string, groupName: string) => {
    const ids = colorModel.getFamilyColors(groupName).map((c) => c.id);
    if (ids.length === 0) return;

    const wereAllHidden = ids.every((id) => hidden.has(id));
    toggleBulkHidden(ids);

    const verb = wereAllHidden ? "Unhid" : "Hid";
    showToast(`${verb} ${ids.length} ${groupName} colors`, {
      actionText: "Undo",
      onAction: () =>
        wereAllHidden
          ? hiddenActions.addMultiple(ids)
          : hiddenActions.removeMultiple(ids),
    });
  };
  const onUnhideFamily = (familyName: string) =>
    hiddenActions.removeMultiple(colorModel.getColorIdsForFamily(familyName));
  const onView = (id: string) => openModal(id);

  const favTitle =
    favoriteColors.length > 0
      ? `Favorites (${favoriteColors.length})`
      : "Favorites";
  const hiddenTitle =
    hiddenColors.length > 0
      ? `Hidden Colors (${hiddenColors.length})`
      : "Hidden Colors";

  return (
    <div id="color-accordion" className={styles.container}>
      {/* Favorites section */}
      <ColorAccordion
        id="favorites"
        title={favTitle}
        defaultOpen={favoriteColors.length > 0}
        colors={favoriteColors}
        favorites={favorites}
        hidden={hidden}
        designerPickIds={designerPickIds}
        showHideButton={false}
        onToggleFavorite={onToggleFavorite}
        onToggleHidden={onToggleHidden}
        onView={onView}
        emptyMessage="No favorite colors yet."
        emptySubMessage="Click the heart icon on any color to add it to your favorites."
      />

      {/* Hidden section */}
      <ColorAccordion
        id="hidden"
        title={hiddenTitle}
        colors={hiddenColors}
        hiddenFamilies={hiddenFamilies}
        favorites={favorites}
        hidden={hidden}
        designerPickIds={designerPickIds}
        showFavoriteButton={false}
        onToggleFavorite={onToggleFavorite}
        onToggleHidden={onToggleHidden}
        onView={onView}
        onUnhideFamily={onUnhideFamily}
        emptyMessage="No hidden colors."
      />

      {/* Color family sections */}
      {sortedFamilies.map((family) => {
        const familyColors = colorFamilies.get(family) ?? [];
        return (
          <ColorAccordion
            key={family}
            id={`family-${family.toLowerCase().replace(/\s+/g, "-")}`}
            title={`${family} (${familyColors.length})`}
            defaultOpen={false}
            showBulkActions
            groupName={family}
            colors={familyColors}
            favorites={favorites}
            hidden={hidden}
            designerPickIds={designerPickIds}
            onToggleFavorite={onToggleFavorite}
            onToggleHidden={onToggleHidden}
            onView={onView}
            onFavoriteAll={onFavoriteAll}
            onHideAll={onHideAll}
          />
        );
      })}
    </div>
  );
}
