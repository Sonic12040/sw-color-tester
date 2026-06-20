import { Link } from "react-router";
import { hsl, undertone, classifyLrv } from "../utils/colorMath.js";
import { colorPath } from "../utils/base.js";
import { toSlug } from "../utils/slug.js";
import { useAppContext } from "../context/AppContext.js";
import { useCompare } from "../context/CompareContext.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { ContrastMatrix } from "../components/Workspace/ContrastMatrix.js";
import styles from "./ComparePage.module.css";

export function ComparePage() {
  const { colorModel } = useAppContext();
  const { compare, removeCompare, clearCompare } = useCompare();
  useDocumentMeta("Compare colors | Sherwin-Williams Color Atlas");

  const colors = compare
    .map((id) => colorModel.getColorById(id))
    .flatMap((c) => (c ? [c] : []));

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Compare colors</h1>
        {colors.length > 0 && (
          <button
            type="button"
            className="btn-secondary"
            onClick={clearCompare}
          >
            Clear all
          </button>
        )}
      </div>

      {colors.length === 0 ? (
        <div className={styles.empty}>
          <p>No colors selected to compare yet.</p>
          <p>
            Use the compare button on any color card (up to four) to line them
            up side by side.
          </p>
          <Link to="/" className="btn-primary">
            Browse colors
          </Link>
        </div>
      ) : (
        <div className={styles.scroll}>
          <div className={styles.grid}>
            {colors.map((c) => (
              <div className={styles.col} key={c.id}>
                <div className={styles.swatch} style={{ background: hsl(c) }}>
                  <button
                    type="button"
                    className={styles.remove}
                    aria-label={`Remove ${c.name}`}
                    onClick={() => removeCompare(c.id)}
                  >
                    ✕
                  </button>
                </div>
                <div className={styles.rows}>
                  <div className={styles.cell}>
                    <Link className={styles.name} to={colorPath(toSlug(c))}>
                      {c.name}
                    </Link>
                    <span>SW {c.colorNumber}</span>
                  </div>
                  <div className={styles.cell}>
                    <span className={styles.cellLabel}>Undertone</span>
                    {undertone(c)}
                  </div>
                  <div className={styles.cell}>
                    <span className={styles.cellLabel}>Lightness</span>
                    {classifyLrv(c.lrv)} · LRV {c.lrv.toFixed(1)}
                  </div>
                  <div className={styles.cell}>
                    <span className={styles.cellLabel}>Hex</span>
                    {c.hex.toUpperCase()}
                  </div>
                  <div className={styles.cell}>
                    <span className={styles.cellLabel}>RGB</span>
                    {c.red}, {c.green}, {c.blue}
                  </div>
                  {c.lab && (
                    <div className={styles.cell}>
                      <span className={styles.cellLabel}>LAB</span>
                      {c.lab.L.toFixed(0)}, {c.lab.A.toFixed(0)},{" "}
                      {c.lab.B.toFixed(0)}
                    </div>
                  )}
                  <div className={styles.cell}>
                    <span className={styles.cellLabel}>Family</span>
                    {c.colorFamilyNames.join(", ") || "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {colors.length >= 2 && <ContrastMatrix colors={colors} />}
    </div>
  );
}
