import { useEffect, useState } from "react";
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
  showFavoriteButton?: boolean;
  showHideButton?: boolean;
  onFavoriteAll?: (groupId: string, groupName: string) => void;
  onHideAll?: (groupId: string, groupName: string) => void;
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
  showFavoriteButton = true,
  showHideButton = true,
  onFavoriteAll,
  onHideAll,
  emptyMessage,
  emptySubMessage,
}: ColorAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Open automatically when the section transitions from empty to having content
  // (e.g. Favorites accordion opening on first heart-click).
  useEffect(() => {
    if (defaultOpen) setIsOpen(true);
  }, [defaultOpen]);

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
                showFavoriteButton={showFavoriteButton}
                showHideButton={showHideButton}
              />
            ))}

            {hiddenFamilies?.map(({ name, count }) => (
              <HiddenFamilyTile key={name} familyName={name} count={count} />
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
