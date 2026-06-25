import type { Color } from "../../data/types.js";
import type { EmbedTheme } from "../../utils/embed.js";
import { withUtm } from "../../utils/embed.js";
import { hsl } from "../../utils/colorMath.js";
import { colorCanonicalUrl, SITE_URL } from "../../utils/base.js";
import { toSlug } from "../../utils/slug.js";
import styles from "./EmbedWidget.module.css";

/**
 * The read-only embed widget (E14) — a themable swatch (1 color) or palette
 * (many) rendered from resolved colors. Each swatch links to its canonical color
 * page and the footer links home; all links open in a new tab and carry UTM so a
 * host site's analytics can attribute the click. Self-contained styling (no app
 * chrome) so it renders the same inside a partner's `<iframe>`.
 */
export function EmbedWidget({
  colors,
  theme,
  campaign,
}: {
  colors: Color[];
  theme: EmbedTheme;
  campaign?: string;
}) {
  const utm = (url: string) => withUtm(url, { campaign });
  return (
    <div className={styles.widget} data-theme={theme}>
      <ul
        className={styles.grid}
        data-single={colors.length === 1 || undefined}
      >
        {colors.map((c) => (
          <li key={c.id} className={styles.item}>
            <a
              className={styles.swatchLink}
              href={utm(colorCanonicalUrl(toSlug(c)))}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span
                className={styles.swatch}
                style={{ background: hsl(c) }}
                aria-hidden="true"
              />
              <span className={styles.meta}>
                <span className={styles.name}>{c.name}</span>
                <span className={styles.number}>SW {c.colorNumber}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <a
        className={styles.brand}
        href={utm(SITE_URL)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Sherwin-Williams Color Atlas
      </a>
    </div>
  );
}
