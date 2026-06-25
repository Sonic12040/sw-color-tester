import { Link } from "react-router";
import { useAppContext } from "../context/AppContext.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { JsonLd } from "../components/seo/JsonLd.js";
import { EmptyState } from "../components/EmptyState/EmptyState.js";
import { buildCollectionsIndexJsonLd } from "../utils/seo.js";
import { collectionPath } from "../utils/base.js";
import { hsl } from "../utils/colorMath.js";
import styles from "./Collections.module.css";

/** Index of curated editorial collections (E12, US12.3): `/collections`. */
export function CollectionsIndexPage() {
  const { colorModel } = useAppContext();
  const collections = colorModel.getCollections();

  useDocumentMeta(
    "Color collections | Sherwin-Williams Color Atlas",
    "Curated Sherwin-Williams color collections — trend-driven and timeless palettes for every room.",
  );

  return (
    <div className={styles.page}>
      <JsonLd data={buildCollectionsIndexJsonLd(collections)} />
      <div className={styles.card}>
        <h1 className={styles.title}>Color collections</h1>
        <p className={styles.blurb}>
          Curated palettes — trend-driven and timeless — to jump-start a room.
          Each is a hand-picked set of Sherwin-Williams colors that work
          together.
        </p>

        {collections.length === 0 ? (
          <EmptyState
            onDark
            title="No collections yet."
            description="Curated collections will appear here."
            action={
              <Link to="/" className="btn-secondary">
                Browse colors
              </Link>
            }
          />
        ) : (
          <ul className={styles.grid}>
            {collections.map((c) => (
              <li key={c.slug}>
                <Link className={styles.tile} to={collectionPath(c.slug)}>
                  <span className={styles.tileStrip} aria-hidden="true">
                    {c.colors.slice(0, 5).map((color) => (
                      <span
                        key={color.id}
                        className={styles.tileStripCell}
                        style={{ background: hsl(color) }}
                      />
                    ))}
                  </span>
                  <span className={styles.tileBody}>
                    <span className={styles.tileName}>{c.title}</span>
                    <span className={styles.tileMeta}>
                      {c.colors.length} colors
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
