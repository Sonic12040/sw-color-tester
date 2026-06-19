import type { Color } from "../../data/types.js";
import { hsl, contrastText } from "../../utils/colorPresentation.js";
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
      style={{ background: hsl(color), color: contrastText(color.lrv) }}
      aria-label={`View ${color.name}`}
      onClick={() => onClick(color.id)}
    >
      <div className={styles.miniRole}>{role}</div>
      <div className={styles.miniName}>{color.name}</div>
      <div className={styles.miniNumber}>SW {color.colorNumber}</div>
    </button>
  );
}
