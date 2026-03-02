import { CSS_CLASSES, ELEMENT_IDS, TIMING } from "./config.js";
import { confirmationModal, toastNotification } from "./templates.js";

export class DialogService {
  /**
   * Show confirmation dialog and return a Promise.
   * @param {Object} options - Confirmation options
   * @param {string} options.title - Dialog title
   * @param {string} options.message - Confirmation message
   * @param {string} options.confirmText - Confirm button text
   * @param {string} options.cancelText - Cancel button text
   * @param {string} options.confirmClass - CSS class for confirm button
   * @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled
   */
  confirm(options) {
    return new Promise((resolve) => {
      const modalHTML = confirmationModal(options);

      document.body.insertAdjacentHTML("beforeend", modalHTML);

      const overlay = document.getElementById(ELEMENT_IDS.CONFIRM_OVERLAY);
      const confirmBtn = document.getElementById(ELEMENT_IDS.CONFIRM_CONFIRM);
      const cancelBtn = document.getElementById(ELEMENT_IDS.CONFIRM_CANCEL);

      // Focus confirm button for accessibility
      setTimeout(() => confirmBtn.focus(), 100);

      const handleConfirm = () => {
        cleanup();
        resolve(true);
      };

      const handleCancel = () => {
        cleanup();
        resolve(false);
      };

      const cleanup = () => {
        document.removeEventListener("keydown", handleEscape);
        overlay.classList.add(CSS_CLASSES.CONFIRM_CLOSING);
        setTimeout(() => {
          overlay.remove();
        }, TIMING.CLOSE_ANIMATION_MS);
      };

      confirmBtn.addEventListener("click", handleConfirm);
      cancelBtn.addEventListener("click", handleCancel);

      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          handleCancel();
        }
      });

      const handleEscape = (e) => {
        if (e.key === "Escape") {
          handleCancel();
        }
      };
      document.addEventListener("keydown", handleEscape);
    });
  }

  /**
   * Show toast notification with optional undo action.
   * @param {Object} options - Toast options
   * @param {string} options.message - Toast message
   * @param {Function} [options.onUndo] - Callback when undo is clicked
   * @param {number} [options.duration=5000] - Auto-dismiss duration in ms
   */
  toast({ message, onUndo, duration = 5000 }) {
    const toastId = `toast-${Date.now()}`;
    const toastHTML = toastNotification({
      message,
      actionText: "Undo",
      id: toastId,
    });

    document.body.insertAdjacentHTML("beforeend", toastHTML);

    const toast = document.getElementById(toastId);
    const actionBtn = toast.querySelector(`.${CSS_CLASSES.TOAST_ACTION}`);
    const closeBtn = toast.querySelector(`.${CSS_CLASSES.TOAST_CLOSE}`);

    let timeoutId = null;
    let isDismissed = false;

    const scheduleAutoDismiss = () => {
      timeoutId = setTimeout(() => {
        dismissToast();
      }, duration);
    };

    const dismissToast = () => {
      if (isDismissed) return;
      isDismissed = true;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      toast.classList.add(CSS_CLASSES.TOAST_HIDING);
      setTimeout(() => {
        toast.remove();
      }, TIMING.CLOSE_ANIMATION_MS);
    };

    const handleUndo = () => {
      if (isDismissed) return;
      dismissToast();
      if (onUndo) {
        onUndo();
      }
    };

    actionBtn.addEventListener("click", handleUndo);
    closeBtn.addEventListener("click", dismissToast);

    scheduleAutoDismiss();
  }
}
