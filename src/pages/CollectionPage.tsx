import { useParams, Link } from "react-router";
import { useAppContext } from "../context/AppContext.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { JsonLd } from "../components/seo/JsonLd.js";
import { CollectionColorGrid } from "../components/Collections/CollectionColorGrid.js";
import { NotFoundPage } from "./NotFoundPage.js";
import { buildCollectionJsonLd } from "../utils/seo.js";
import { hsl } from "../utils/colorMath.js";
import styles from "./Collections.module.css";

/** A curated editorial collection landing page (E12, US12.1): `/collections/:slug`. */
export function CollectionPage() {
  const { slug } = useParams();
  const { colorModel } = useAppContext();
  const collection = slug ? colorModel.getCollectionBySlug(slug) : undefined;

  useDocumentMeta(
    collection
      ? `${collection.title} — Sherwin-Williams color collection`
      : "Not found | Sherwin-Williams Color Atlas",
    collection?.blurb,
  );

  if (!collection) return <NotFoundPage />;

  return (
    <div className={styles.page}>
      <JsonLd data={buildCollectionJsonLd(collection)} />
      <div className={styles.card}>
        <p className={styles.crumbs}>
          <Link to="/collections">Collections</Link> / {collection.title}
        </p>
        <h1 className={styles.title}>{collection.title}</h1>
        <p className={styles.blurb}>{collection.blurb}</p>

        <div className={styles.heroStrip} aria-hidden="true">
          {collection.colors.map((c) => (
            <div
              key={c.id}
              className={styles.heroCell}
              style={{ background: hsl(c) }}
            />
          ))}
        </div>

        <CollectionColorGrid colors={collection.colors} />
      </div>
    </div>
  );
}
