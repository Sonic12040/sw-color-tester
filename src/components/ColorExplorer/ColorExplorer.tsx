import { useAppContext } from "../../context/AppContext.js";
import { useAppState } from "../../hooks/useAppState.js";
import {
  ToggleFavoriteCommand,
  ToggleHiddenCommand,
  BulkFavoriteCommand,
  BulkHideCommand,
  UnhideGroupCommand,
} from "../../commands/index.js";
import { ColorAccordion } from "./ColorAccordion/ColorAccordion.js";
import styles from "./ColorExplorer.module.css";

export function ColorExplorer() {
  const { colorModel, appState, commandBus, openModal } = useAppContext();
  const snapshot = useAppState(appState);

  const { favorites, hidden, lrvMin, lrvMax } = snapshot;
  const lrvRange = { min: lrvMin, max: lrvMax };

  const designerPickIds = colorModel.getDesignerPickIds(); // stable — built once in constructor
  const favoriteColors = colorModel.getFavoriteColors(favorites);
  const hiddenColors = colorModel.getHiddenColors(hidden);
  const visibleColors = colorModel.getVisibleColors(hidden, favorites, lrvRange);
  const colorFamilies = colorModel.groupByFamily(visibleColors);
  const sortedFamilies = colorModel.sortFamiliesByPriority([...colorFamilies.keys()]);
  const hiddenFamilies = colorModel.getHiddenFamilies(hidden, favorites);

  // Command dispatchers
  const onToggleFavorite = (id: string) => commandBus.execute(new ToggleFavoriteCommand(id));
  const onToggleHidden = (id: string) => commandBus.execute(new ToggleHiddenCommand(id));
  const onFavoriteAll = (groupId: string, groupName: string) => commandBus.execute(new BulkFavoriteCommand(groupId, groupName));
  const onHideAll = (groupId: string, groupName: string) => commandBus.execute(new BulkHideCommand(groupId, groupName));
  const onUnhideFamily = (familyName: string) => commandBus.execute(new UnhideGroupCommand(familyName));
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
