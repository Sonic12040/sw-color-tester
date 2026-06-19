import { useCallback, useEffect, useRef, useState } from "react";
import type { Color } from "../../data/types.js";
import { useFilters } from "../../context/FiltersContext.js";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";
import { AtlasToolbar } from "./AtlasToolbar.js";
import { FilterPanel } from "./FilterPanel.js";
import { ColorGrid } from "./ColorGrid.js";
import styles from "./AtlasLayout.module.css";

interface AtlasLayoutProps {
  colors: Color[];
  totalCount: number;
}

/** Width (px) at which the facet rail becomes persistent — keep in sync with --bp-lg. */
const RAIL_BREAKPOINT = 1024;

/**
 * Responsive faceted-gallery shell. The facet panel is a persistent left rail
 * at ≥1024px and an off-canvas drawer below that. The single source of truth
 * for the layout switch is the `--bp-lg` media query in the stylesheet; the
 * drawer's open state only matters below it.
 */
export function AtlasLayout({ colors, totalCount }: AtlasLayoutProps) {
  const { resetAll } = useFilters();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const railRef = useRef<HTMLDivElement | null>(null);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Trap focus inside the drawer while it's open (it can only open below the
  // rail breakpoint, so the trap never engages on desktop).
  useFocusTrap({
    active: drawerOpen,
    containerRef: railRef,
    onEscape: closeDrawer,
    focusKey: drawerOpen,
  });

  // If the viewport grows past the rail breakpoint while the drawer is open,
  // drop the drawer state so the trap releases and the rail shows in-flow.
  useEffect(() => {
    if (!drawerOpen || typeof window === "undefined") return;
    const mq = window.matchMedia(`(min-width: ${RAIL_BREAKPOINT}px)`);
    const onChange = () => mq.matches && setDrawerOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [drawerOpen]);

  return (
    <div className={styles.shell}>
      <AtlasToolbar
        filteredCount={colors.length}
        totalCount={totalCount}
        onOpenFilters={() => setDrawerOpen(true)}
      />

      <div className={styles.body}>
        {drawerOpen && (
          <div
            className={styles.backdrop}
            onClick={closeDrawer}
            aria-hidden="true"
          />
        )}

        <aside
          ref={railRef}
          className={styles.rail}
          data-open={drawerOpen}
          tabIndex={-1}
          aria-label="Filters"
        >
          <FilterPanel
            filteredCount={colors.length}
            totalCount={totalCount}
            onClose={closeDrawer}
          />
        </aside>

        <main className={styles.main} aria-label="Color results">
          <ColorGrid colors={colors} onResetFilters={resetAll} />
        </main>
      </div>
    </div>
  );
}
