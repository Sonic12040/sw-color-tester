import type { Color } from "../../data/types.js";
import { contrastRatio, hsl } from "../../utils/colorMath.js";
import styles from "./ContrastMatrix.module.css";

interface ContrastMatrixProps {
  colors: Color[];
}

/** Grade a WCAG ratio. Meaning is carried by the mark + label, not color alone. */
function grade(ratio: number): { label: string; mark: string; cls: string } {
  if (ratio >= 7) return { label: "AAA", mark: "✓", cls: styles.gradeAaa };
  if (ratio >= 4.5) return { label: "AA", mark: "✓", cls: styles.gradeAa };
  if (ratio >= 3)
    return { label: "AA large", mark: "△", cls: styles.gradeLarge };
  return { label: "Low", mark: "✕", cls: styles.gradeLow };
}

/**
 * Pairwise WCAG contrast matrix for the selected colors — how legible each color
 * is as text/detail on every other. A semantic table with row/column headers so
 * the pairing of any cell is announced to assistive tech.
 */
export function ContrastMatrix({ colors }: ContrastMatrixProps) {
  if (colors.length < 2) return null;

  return (
    <section className={styles.wrap} aria-labelledby="contrast-heading">
      <h2 id="contrast-heading" className={styles.heading}>
        Contrast pairings
      </h2>
      <p className={styles.desc}>
        WCAG contrast ratio for every pair — how legible one color is as text or
        detail placed on the other. AA needs 4.5:1 (3:1 for large text), AAA
        7:1.
      </p>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <caption className="sr-only">
            Pairwise WCAG contrast ratios between the selected colors. Each row
            is a foreground color placed on each column&apos;s background.
          </caption>
          <thead>
            <tr>
              <td className={styles.corner} />
              {colors.map((c) => (
                <th key={c.id} scope="col" className={styles.colHead}>
                  <span
                    className={styles.dot}
                    style={{ background: hsl(c) }}
                    aria-hidden="true"
                  />
                  <span className={styles.headName}>{c.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {colors.map((row) => (
              <tr key={row.id}>
                <th scope="row" className={styles.rowHead}>
                  <span
                    className={styles.dot}
                    style={{ background: hsl(row) }}
                    aria-hidden="true"
                  />
                  <span className={styles.headName}>{row.name}</span>
                </th>
                {colors.map((col) => {
                  if (row.id === col.id) {
                    return (
                      <td
                        key={col.id}
                        className={styles.self}
                        aria-label="same color"
                      >
                        —
                      </td>
                    );
                  }
                  const ratio = contrastRatio(row, col);
                  const g = grade(ratio);
                  return (
                    <td
                      key={col.id}
                      className={`${styles.cell} ${g.cls}`}
                      aria-label={`${ratio.toFixed(1)} to 1, ${g.label}`}
                    >
                      <span className={styles.ratio}>{ratio.toFixed(1)}:1</span>
                      <span className={styles.badge}>
                        <span aria-hidden="true">{g.mark}</span> {g.label}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
