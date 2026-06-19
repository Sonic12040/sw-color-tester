import { createContext, useCallback, useContext, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./ConfirmDialog.module.css";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirmDialog(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn)
    throw new Error(
      "useConfirmDialog must be used inside <ConfirmDialogProvider>",
    );
  return fn;
}

interface DialogState {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

export function ConfirmDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [closing, setClosing] = useState(false);

  // Stable identity so ConfirmContext consumers don't re-render on dialog state changes.
  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setClosing(false);
      setDialog({ options, resolve });
    });
  }, []);

  const close = (value: boolean) => {
    if (!dialog) return;
    setClosing(true);
    setTimeout(() => {
      dialog.resolve(value);
      setDialog(null);
      setClosing(false);
    }, 250);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog &&
        createPortal(
          <div
            className={`${styles.overlay} ${closing ? styles.closing : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <div className={styles.dialog}>
              <div className={styles.header}>
                <h2 id="confirm-title" className={styles.title}>
                  {dialog.options.title ?? "Are you sure?"}
                </h2>
              </div>
              <div className={styles.body}>
                <p className={styles.message}>{dialog.options.message}</p>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => close(false)}
                >
                  {dialog.options.cancelLabel ?? "Cancel"}
                </button>
                <button
                  type="button"
                  className={styles.confirmBtn}
                  onClick={() => close(true)}
                  autoFocus
                >
                  {dialog.options.confirmLabel ?? "Confirm"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </ConfirmContext.Provider>
  );
}
