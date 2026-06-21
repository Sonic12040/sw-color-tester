import type { Color } from "../../data/types.js";
import { MiniTile } from "./MiniTile.js";
import styles from "./colorDetail.module.css";

interface ColorGridSectionProps {
  title: string;
  description: string;
  colors: Color[];
  roleFor: (color: Color, index: number) => string;
  onNavigate: (id: string) => void;
  /** Render inside a collapsed <details> disclosure (for secondary grids). */
  collapsible?: boolean;
}

/** A titled grid of mini color tiles (used for coordinating and similar colors). */
export function ColorGridSection({
  title,
  description,
  colors,
  roleFor,
  onNavigate,
  collapsible = false,
}: ColorGridSectionProps) {
  if (colors.length === 0) return null;

  const grid = (
    <div className={styles.colorGrid}>
      {colors.map((c, i) => (
        <MiniTile
          key={c.id}
          color={c}
          role={roleFor(c, i)}
          onClick={onNavigate}
        />
      ))}
    </div>
  );

  if (collapsible) {
    return (
      <details className={styles.tech}>
        <summary className={styles.techSummary}>{title}</summary>
        <div className={styles.techBody}>
          <p className={styles.sectionDesc}>{description}</p>
          {grid}
        </div>
      </details>
    );
  }

  return (
    <section>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <p className={styles.sectionDesc}>{description}</p>
      {grid}
    </section>
  );
}
