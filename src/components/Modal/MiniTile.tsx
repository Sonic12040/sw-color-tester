import type { Color } from "../../data/types.js";
import { hsl } from "../../utils/colorPresentation.js";
import styles from "./Modal.module.css";

interface MiniTileProps {
  color: Color;
  role: string;
  onClick: (id: string) => void;
}

export function MiniTile({ color, role, onClick }: MiniTileProps) {
  return (
    <button
      type="button"
      className={styles.miniTile}
      style={{ background: hsl(color) }}
      aria-label={`View ${color.name}`}
      onClick={() => onClick(color.id)}
    >
      <span className={styles.miniCaption}>
        <span className={styles.miniRole}>{role}</span>
        <span className={styles.miniName}>{color.name}</span>
        <span className={styles.miniNumber}>SW {color.colorNumber}</span>
      </span>
    </button>
  );
}
