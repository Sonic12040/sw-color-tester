import { useLocation, useNavigate } from "react-router";
import { hsl } from "../../utils/colorPresentation.js";
import { useAppContext } from "../../context/AppContext.js";
import { useCompare } from "../../context/CompareContext.js";
import styles from "./CompareTray.module.css";

/** Persistent floating tray showing the current comparison selection. */
export function CompareTray() {
  const { colorModel } = useAppContext();
  const { compare, removeCompare, clearCompare } = useCompare();
  const navigate = useNavigate();
  const location = useLocation();

  // Don't shadow the comparison page itself.
  if (compare.length === 0 || location.pathname === "/compare") return null;

  const colors = compare
    .map((id) => colorModel.getColorById(id))
    .filter(Boolean);

  return (
    <div className={styles.tray} role="region" aria-label="Comparison tray">
      <div className={styles.swatches}>
        {colors.map(
          (c) =>
            c && (
              <div
                key={c.id}
                className={styles.swatch}
                style={{ background: hsl(c) }}
                title={`${c.name} (SW ${c.colorNumber})`}
              >
                <button
                  type="button"
                  className={styles.swatchRemove}
                  aria-label={`Remove ${c.name} from comparison`}
                  onClick={() => removeCompare(c.id)}
                >
                  ✕
                </button>
              </div>
            ),
        )}
      </div>
      <span className={styles.label}>{compare.length} selected</span>
      <div className={styles.actions}>
        <button type="button" className="btn-ghost" onClick={clearCompare}>
          Clear
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => navigate("/compare")}
        >
          Compare
        </button>
      </div>
    </div>
  );
}
