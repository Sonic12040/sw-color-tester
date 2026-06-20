import type { Color } from "../../data/types.js";
import { MiniTile } from "./MiniTile.js";
import styles from "./colorDetail.module.css";

interface ColorGridSectionProps {
  title: string;
  description: string;
  colors: Color[];
  roleFor: (color: Color, index: number) => string;
  onNavigate: (id: string) => void;
}

/** A titled grid of mini color tiles (used for coordinating and similar colors). */
export function ColorGridSection({
  title,
  description,
  colors,
  roleFor,
  onNavigate,
}: ColorGridSectionProps) {
  if (colors.length === 0) return null;
  return (
    <section>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <p className={styles.sectionDesc}>{description}</p>
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
    </section>
  );
}
