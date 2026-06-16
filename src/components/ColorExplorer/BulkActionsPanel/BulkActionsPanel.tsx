import styles from "./BulkActionsPanel.module.css";

interface BulkActionsPanelProps {
  groupId: string;
  groupName: string;
  onFavoriteAll: (groupId: string, groupName: string) => void;
  onHideAll: (groupId: string, groupName: string) => void;
}

export function BulkActionsPanel({
  groupId,
  groupName,
  onFavoriteAll,
  onHideAll,
}: BulkActionsPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.container}>
        <span className={styles.label}>Family Actions:</span>
        <button
          type="button"
          className={styles.btn}
          title={`Favorite all colors in the ${groupName} family`}
          onClick={() => onFavoriteAll(groupId, groupName)}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>Favorite All</span>
        </button>
        <button
          type="button"
          className={styles.btn}
          title={`Hide all colors in the ${groupName} family`}
          onClick={() => onHideAll(groupId, groupName)}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-5 0-9.27-3.11-11-7 1.21-2.61 3.16-4.77 5.66-6.11" />
            <path d="M1 1l22 22" />
          </svg>
          <span>Hide All</span>
        </button>
      </div>
    </div>
  );
}
