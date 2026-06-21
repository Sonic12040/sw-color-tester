import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  /** Short headline — rendered as an <h2> so it reads as a title, not body copy. */
  title: string;
  /** One-line helper text pointing at the next step. */
  description?: React.ReactNode;
  /** Primary call-to-action: the prominent filled button/link for the surface. */
  action?: React.ReactNode;
  /** Dark card treatment for the gallery's neutral-gray gutter (vs. the light
   *  workspace pages). Keeps text/CTA contrast correct on either background. */
  onDark?: boolean;
}

/**
 * Centered "nothing here yet" card shared by the gallery, compare, and palette
 * views so the three stay visually consistent. Wrapped in `role="status"` so
 * reaching the state dynamically (e.g. clearing a palette, removing the last
 * compared color) is announced to screen readers.
 */
export function EmptyState({
  title,
  description,
  action,
  onDark,
}: EmptyStateProps) {
  const className = onDark ? `${styles.empty} ${styles.onDark}` : styles.empty;
  return (
    <div className={className} role="status">
      <h2 className={styles.title}>{title}</h2>
      {description != null && (
        <p className={styles.description}>{description}</p>
      )}
      {action}
    </div>
  );
}
