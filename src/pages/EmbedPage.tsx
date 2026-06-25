import { useSearchParams } from "react-router";
import type { Color } from "../data/types.js";
import { colorModel } from "../appModel.js";
import { isEmbedTheme } from "../utils/embed.js";
import { EmbedWidget } from "../components/Embed/EmbedWidget.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { useNoindex } from "../hooks/useNoindex.js";
import styles from "./EmbedPage.module.css";

/**
 * Standalone embed (E14, US14.1) — a chrome-less, read-only swatch/palette meant
 * to live in a partner's `<iframe>`. Rendered OUTSIDE RootLayout (no header/nav),
 * so it reads the `colorModel` singleton directly rather than through context.
 * Colors come from `?c=slug,slug`; `?theme=light|dark`; `?campaign=` flows into
 * the back-link UTM. `noindex` — it's a fragment, not a page to rank.
 */
export function EmbedPage() {
  const [params] = useSearchParams();
  useDocumentMeta("Sherwin-Williams color embed");
  useNoindex();

  const themeParam = params.get("theme");
  const theme = isEmbedTheme(themeParam) ? themeParam : "light";
  const campaign = params.get("campaign") ?? undefined;

  const colors = (params.get("c") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((slug) => colorModel.getColorBySlug(slug))
    .filter((c): c is Color => Boolean(c));

  return (
    <div className={styles.embed}>
      {colors.length > 0 ? (
        <EmbedWidget colors={colors} theme={theme} campaign={campaign} />
      ) : (
        <p className={styles.empty}>No colors to display.</p>
      )}
    </div>
  );
}
