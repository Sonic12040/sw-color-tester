import { Link } from "react-router";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import styles from "./NotFoundPage.module.css";

export function NotFoundPage() {
  useDocumentMeta("Not found | Sherwin-Williams Color Atlas");
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Color not found</h1>
      <p className={styles.text}>
        We couldn't find that color. It may have been renamed or removed.
      </p>
      <Link to="/" className="btn-primary">
        Browse all colors
      </Link>
    </div>
  );
}
