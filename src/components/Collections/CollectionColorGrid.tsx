import { Link } from "react-router";
import type { Color } from "../../data/types.js";
import { hsl, classifyLrv } from "../../utils/colorMath.js";
import { colorPath } from "../../utils/base.js";
import { toSlug } from "../../utils/slug.js";
import styles from "../../pages/Collections.module.css";

/**
 * A grid of color swatches rendered as real `<Link>` anchors (crawlable, unlike
 * the button-based MiniTile) — used on collection landing pages so the curated
 * colors are first-class internal links for SEO + discovery.
 */
export function CollectionColorGrid({ colors }: { colors: Color[] }) {
  return (
    <ul className={styles.grid}>
      {colors.map((c) => (
        <li key={c.id}>
          <Link className={styles.tile} to={colorPath(toSlug(c))}>
            <span
              className={styles.tileSwatch}
              style={{ background: hsl(c) }}
              aria-hidden="true"
            />
            <span className={styles.tileBody}>
              <span className={styles.tileName}>{c.name}</span>
              <span className={styles.tileMeta}>
                SW {c.colorNumber} · {classifyLrv(c.lrv)} · LRV{" "}
                {c.lrv.toFixed(1)}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
