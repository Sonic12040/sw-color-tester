import type { Color } from "../../data/types.js";
import { useAppContext } from "../../context/AppContext.js";
import { useFavorites } from "../../context/FavoritesContext.js";
import { useHidden } from "../../context/HiddenContext.js";
import { useCompare } from "../../context/CompareContext.js";
import { usePalette } from "../../context/PaletteContext.js";
import { ColorCard } from "./ColorCard.js";
import styles from "./ColorGrid.module.css";

interface ColorGridProps {
  colors: Color[];
  onResetFilters: () => void;
}

/**
 * The single flat, responsive grid of color cards (replaces the family
 * accordions). Subscribes to the favorite / hidden / compare sets once here and
 * passes primitive flags to memoized {@link ColorCard}s, so toggling one color
 * only re-renders the cards whose state actually changed.
 */
export function ColorGrid({ colors, onResetFilters }: ColorGridProps) {
  const { colorModel } = useAppContext();
  const { favorites, toggleFavorite } = useFavorites();
  const { hidden, toggleHidden } = useHidden();
  const { compare, toggleCompare, isFull } = useCompare();
  const { palette, togglePalette } = usePalette();

  if (colors.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>No colors match your filters</p>
        <p>
          Try a different lightness band, removing a facet, or clearing search.
        </p>
        <button
          type="button"
          className="btn-secondary"
          onClick={onResetFilters}
        >
          Clear all filters
        </button>
      </div>
    );
  }

  return (
    <div className={styles.grid} role="list" aria-label="Colors">
      {colors.map((color) => (
        <div role="listitem" key={color.id}>
          <ColorCard
            color={color}
            isFavorite={favorites.has(color.id)}
            isHidden={hidden.has(color.id)}
            isComparing={compare.includes(color.id)}
            inPalette={palette.includes(color.id)}
            isDesignerPick={colorModel.isDesignerPick(color.id)}
            compareDisabled={isFull}
            onToggleFavorite={toggleFavorite}
            onToggleHidden={toggleHidden}
            onToggleCompare={toggleCompare}
            onTogglePalette={togglePalette}
          />
        </div>
      ))}
    </div>
  );
}
