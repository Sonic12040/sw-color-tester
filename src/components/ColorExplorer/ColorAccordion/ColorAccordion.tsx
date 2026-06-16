import { useState } from "react";
import type { Color } from "../../../data/types.js";
import { ColorTile, HiddenFamilyTile } from "../ColorTile/ColorTile.js";
import { BulkActionsPanel } from "../BulkActionsPanel/BulkActionsPanel.js";
import styles from "./ColorAccordion.module.css";

interface ColorAccordionProps {
  id: string;
  title: string;
  defaultOpen?: boolean;
  showBulkActions?: boolean;
  groupName?: string;
  colors: Color[];
  hiddenFamilies?: Array<{ name: string; count: number }>;
  favorites: Set<string>;
  hidden: Set<string>;
  designerPickIds: Set<string>;
  showFavoriteButton?: boolean;
  showHideButton?: boolean;
  onToggleFavorite: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onView: (id: string) => void;
  onFavoriteAll?: (groupId: string, groupName: string) => void;
  onHideAll?: (groupId: string, groupName: string) => void;
  onUnhideFamily?: (familyName: string) => void;
  emptyMessage?: string;
  emptySubMessage?: string;
}

export function ColorAccordion({
  id,
  title,
  defaultOpen = false,
  showBulkActions = false,
  groupName = "",
  colors,
  hiddenFamilies,
  favorites,
  hidden,
  designerPickIds,
  showFavoriteButton = true,
  showHideButton = true,
  onToggleFavorite,
  onToggleHidden,
  onView,
  onFavoriteAll,
  onHideAll,
  onUnhideFamily,
  emptyMessage,
  emptySubMessage,
}: ColorAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const contentId = `${id}-content`;
  const headerId = `${id}-header`;

  const hasContent =
    colors.length > 0 || (hiddenFamilies && hiddenFamilies.length > 0);

  return (
    <div className={styles.item}>
      <button
        id={headerId}
        type="button"
        className={styles.header}
        aria-expanded={isOpen}
        aria-controls={contentId}
        data-section={id}
        onClick={() => setIsOpen((o) => !o)}
      >
        <span>{title}</span>
        <svg
          className={`${styles.icon} ${isOpen ? styles.iconOpen : ""}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div
        id={contentId}
        className={styles.content}
        aria-labelledby={headerId}
        aria-hidden={!isOpen}
        role="region"
        {...(!isOpen ? { inert: true } : {})}
      >
        <div className={styles.panel}>
          {showBulkActions && onFavoriteAll && onHideAll && (
            <BulkActionsPanel
              groupId={id}
              groupName={groupName}
              onFavoriteAll={onFavoriteAll}
              onHideAll={onHideAll}
            />
          )}

          <div className={styles.grid}>
            {colors.map((color) => (
              <ColorTile
                key={color.id}
                color={color}
                isFavorite={favorites.has(color.id)}
                isHidden={hidden.has(color.id)}
                isDesignerPick={designerPickIds.has(color.id)}
                showFavoriteButton={showFavoriteButton}
                showHideButton={showHideButton}
                onToggleFavorite={onToggleFavorite}
                onToggleHidden={onToggleHidden}
                onView={onView}
              />
            ))}

            {hiddenFamilies?.map(({ name, count }) => (
              <HiddenFamilyTile
                key={name}
                familyName={name}
                count={count}
                onUnhide={onUnhideFamily ?? (() => {})}
              />
            ))}
          </div>

          {!hasContent && emptyMessage && (
            <div className={styles.empty}>
              <p>{emptyMessage}</p>
              {emptySubMessage && (
                <p className={styles.emptySubtext}>{emptySubMessage}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
