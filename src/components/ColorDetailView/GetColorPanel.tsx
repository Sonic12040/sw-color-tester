import type { Color } from "../../data/types.js";
import { swColorUrl, SW_STORE_LOCATOR_URL } from "../../utils/swLinks.js";
import { PaintCalculator } from "./PaintCalculator.js";
import styles from "./colorDetail.module.css";

interface GetColorPanelProps {
  color: Color;
}

/**
 * The shopper's "act on it" panel: order a sample, find a store, view at
 * Sherwin-Williams, and estimate how much paint to buy. Surfaces the in-store
 * color-rack locator when present.
 *
 * Outbound links are the natural place to wire conversion tracking if/when an
 * analytics layer (F3) lands — intentionally left untracked for now.
 */
export function GetColorPanel({ color }: GetColorPanelProps) {
  return (
    <section className={styles.getColor} aria-labelledby="get-color-heading">
      <h2 id="get-color-heading" className={styles.sectionTitle}>
        Get this color
      </h2>

      {color.storeStripLocator && (
        <p className={styles.rackCode}>
          In-store color rack: <strong>{color.storeStripLocator}</strong>
        </p>
      )}

      <div className={styles.getColorActions}>
        <a
          className="btn btn-on-dark"
          href={SW_STORE_LOCATOR_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Find a Sherwin-Williams store (opens in a new tab)"
        >
          Find a store
        </a>
        <a
          className="btn btn-on-dark"
          href={swColorUrl(color)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View ${color.name} at Sherwin-Williams (opens in a new tab)`}
        >
          View at Sherwin-Williams
        </a>
      </div>

      <details className={styles.tech}>
        <summary className={styles.techSummary}>Paint calculator</summary>
        <div className={styles.techBody}>
          <PaintCalculator />
        </div>
      </details>
    </section>
  );
}
