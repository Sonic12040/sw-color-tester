/**
 * Controller for the color detail modal overlay.
 */

import {
  CSS_CLASSES,
  ELEMENT_IDS,
  DATA_ATTRIBUTES,
  ICONS,
  URL_PARAMS,
  TIMING,
} from "../utils/config.js";
import { colorDetailModal } from "../utils/templates.js";
import {
  ToggleFavoriteCommand,
  ToggleHiddenCommand,
} from "../commands/index.js";

export class ModalController {
  #unsubscribers = [];

  constructor(model, state, dialog, commandBus) {
    this.model = model;
    this.state = state;
    this.dialog = dialog;
    this.commandBus = commandBus;
  }

  setupListeners() {
    document.addEventListener("click", (e) => {
      if (
        e.target.classList.contains(CSS_CLASSES.MODAL_OVERLAY) ||
        e.target.closest(`.${CSS_CLASSES.MODAL_CLOSE}`)
      ) {
        this.close();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.close();
      }
    });
  }

  open(colorId) {
    const scrollPosition =
      globalThis.scrollY || document.documentElement.scrollTop;
    this.state.setScrollPosition(scrollPosition);

    const color = this.model.getColorById(colorId);

    if (!color) {
      console.error("Color not found:", colorId);
      return;
    }

    const coordinatingColors = {};
    if (color.coordinatingColors) {
      if (color.coordinatingColors.coord1ColorId) {
        coordinatingColors.coord1 = this.model.getColorById(
          color.coordinatingColors.coord1ColorId,
        );
      }
      if (color.coordinatingColors.coord2ColorId) {
        coordinatingColors.coord2 = this.model.getColorById(
          color.coordinatingColors.coord2ColorId,
        );
      }
      if (color.coordinatingColors.whiteColorId) {
        coordinatingColors.white = this.model.getColorById(
          color.coordinatingColors.whiteColorId,
        );
      }
    }

    const similarColors = [];
    if (color.similarColors && Array.isArray(color.similarColors)) {
      for (const similarId of color.similarColors) {
        const similarColor = this.model.getColorById(similarId);
        if (similarColor) {
          similarColors.push(similarColor);
        }
      }
    }

    const existingModal = document.getElementById(
      ELEMENT_IDS.COLOR_DETAIL_MODAL,
    );
    if (existingModal) {
      existingModal.remove();
    }

    const isFavorited = this.state.getFavoriteSet().has(colorId);
    const isHidden = this.state.getHiddenSet().has(colorId);

    const modalHTML = colorDetailModal(
      color,
      coordinatingColors,
      similarColors,
      isFavorited,
      isHidden,
    );
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    requestAnimationFrame(() => {
      const modal = document.getElementById(ELEMENT_IDS.COLOR_DETAIL_MODAL);
      if (modal) {
        modal.classList.add(CSS_CLASSES.MODAL_ACTIVE);

        const closeButton = modal.querySelector(`.${CSS_CLASSES.MODAL_CLOSE}`);
        if (closeButton) {
          closeButton.focus();
        }

        this.#setupAccordion(modal);
        this.#setupActionButtons(modal, color, colorId);
        this.#setupMiniTiles(modal);
      }
    });

    this.#subscribeToState(colorId);
    document.body.style.overflow = "hidden";
  }

  /**
   * Subscribe to state events so modal UI stays in sync with external changes (e.g. undo).
   */
  #subscribeToState(colorId) {
    this.#unsubscribeFromState();
    this.#unsubscribers.push(
      this.state.on("favoritesChanged", () => this.#updateFavoriteUI(colorId)),
      this.state.on("hiddenChanged", () => this.#updateHiddenUI(colorId)),
    );
  }

  #unsubscribeFromState() {
    for (const unsub of this.#unsubscribers) unsub();
    this.#unsubscribers = [];
  }

  #updateFavoriteUI(colorId) {
    const modal = document.getElementById(ELEMENT_IDS.COLOR_DETAIL_MODAL);
    if (!modal) return;
    const btn = modal.querySelector(
      `.${CSS_CLASSES.MODAL_ACTION_BUTTON_FAVORITE}`,
    );
    if (!btn) return;

    const isFav = this.state.getFavoriteSet().has(colorId);
    const svg = btn.querySelector("svg");
    const span = btn.querySelector("span");
    if (svg) svg.setAttribute("fill", isFav ? "currentColor" : "none");
    if (span) span.textContent = isFav ? "Favorited" : "Add to Favorites";
    btn.setAttribute(
      "aria-label",
      `${isFav ? "Remove from" : "Add to"} favorites`,
    );
  }

  #updateHiddenUI(colorId) {
    const modal = document.getElementById(ELEMENT_IDS.COLOR_DETAIL_MODAL);
    if (!modal) return;
    const btn = modal.querySelector(`.${CSS_CLASSES.MODAL_ACTION_BUTTON_HIDE}`);
    if (!btn) return;

    const isHidden = this.state.getHiddenSet().has(colorId);
    const svg = btn.querySelector("svg");
    const span = btn.querySelector("span");
    if (svg) svg.innerHTML = isHidden ? ICONS.EYE : ICONS.EYE_OFF;
    if (span) span.textContent = isHidden ? "Hidden" : "Hide Color";
    btn.setAttribute("aria-label", `${isHidden ? "Show" : "Hide"} color`);
  }

  #setupAccordion(modal) {
    const accordionTrigger = modal.querySelector(
      `.${CSS_CLASSES.MODAL_ACCORDION_TRIGGER}`,
    );
    const accordionPanel = modal.querySelector(
      `.${CSS_CLASSES.MODAL_ACCORDION_PANEL}`,
    );

    if (accordionTrigger && accordionPanel) {
      accordionTrigger.addEventListener("click", () => {
        const isExpanded =
          accordionTrigger.getAttribute("aria-expanded") === "true";

        accordionTrigger.setAttribute("aria-expanded", !isExpanded);
        accordionPanel.setAttribute("aria-hidden", isExpanded);

        if (isExpanded) {
          accordionPanel.setAttribute("inert", "");
        } else {
          accordionPanel.removeAttribute("inert");
        }
      });
    }
  }

  #setupActionButtons(modal, color, colorId) {
    const favoriteButton = modal.querySelector(
      `.${CSS_CLASSES.MODAL_ACTION_BUTTON_FAVORITE}`,
    );
    const shareButton = modal.querySelector(
      `.${CSS_CLASSES.MODAL_ACTION_BUTTON_SHARE}`,
    );
    const copyButton = modal.querySelector(
      `.${CSS_CLASSES.MODAL_ACTION_BUTTON_COPY}`,
    );
    const hideButton = modal.querySelector(
      `.${CSS_CLASSES.MODAL_ACTION_BUTTON_HIDE}`,
    );
    const storeButton = modal.querySelector(
      `.${CSS_CLASSES.MODAL_ACTION_BUTTON_STORE}`,
    );

    if (favoriteButton) {
      favoriteButton.addEventListener("click", () => {
        this.commandBus.execute(new ToggleFavoriteCommand(colorId));
      });
    }

    if (shareButton) {
      shareButton.addEventListener("click", async () => {
        await this.#handleShare(color);
      });
    }

    if (copyButton) {
      copyButton.addEventListener("click", async () => {
        await this.#handleCopyColorCode(color);
      });
    }

    if (hideButton) {
      hideButton.addEventListener("click", () => {
        this.commandBus.execute(new ToggleHiddenCommand(colorId));
      });
    }

    if (storeButton) {
      storeButton.addEventListener("click", () => {
        this.dialog.toast({
          message: `Visit your local Sherwin-Williams store and ask for: ${color.name} or ${color.brandKey} ${color.colorNumber} (Location: ${color.storeStripLocator})`,
          duration: TIMING.STORE_TOAST_MS,
        });
      });
    }
  }

  #setupMiniTiles(modal) {
    const clickableTiles = modal.querySelectorAll(
      `.${CSS_CLASSES.MODAL_MINI_TILE_CLICKABLE}`,
    );
    clickableTiles.forEach((tile) => {
      const handleClick = () => {
        const tileColorId = tile.getAttribute(DATA_ATTRIBUTES.ID);
        if (tileColorId) {
          this.open(tileColorId);
        }
      };

      tile.addEventListener("click", handleClick);
      tile.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      });
    });
  }

  async #handleShare(color) {
    const shareData = {
      title: `${color.name} - Sherwin-Williams`,
      text: `Check out this color: ${color.name} (${color.colorNumber})`,
      url:
        window.location.origin +
        window.location.pathname +
        `?${URL_PARAMS.COLOR}=${color.id}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        this.#flashButtonText(
          `.${CSS_CLASSES.MODAL_ACTION_BUTTON_SHARE} span`,
          "Link Copied!",
        );
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  }

  async #handleCopyColorCode(color) {
    const colorCode = `${color.name} (SW ${color.colorNumber})
Hex: ${color.hex}
RGB: rgb(${color.red}, ${color.green}, ${color.blue})
HSL: hsl(${Math.round(color.hue * 360)}°, ${Math.round(
      color.saturation * 100,
    )}%, ${Math.round(color.lightness * 100)}%)`;

    try {
      await navigator.clipboard.writeText(colorCode);
      this.#flashButtonText(
        `.${CSS_CLASSES.MODAL_ACTION_BUTTON_COPY} span`,
        "Copied!",
      );
    } catch (err) {
      console.error("Error copying color code:", err);
      this.dialog.toast({
        message: `Color Code: ${colorCode}`,
        duration: TIMING.COPY_FALLBACK_TOAST_MS,
      });
    }
  }

  close() {
    this.#unsubscribeFromState();
    const modal = document.getElementById(ELEMENT_IDS.COLOR_DETAIL_MODAL);
    if (modal) {
      modal.classList.remove(CSS_CLASSES.MODAL_ACTIVE);

      setTimeout(() => {
        modal.remove();
        document.body.style.overflow = "";

        // Restore scroll position
        const savedScrollPosition = this.state.getScrollPosition();
        if (savedScrollPosition > 0) {
          globalThis.scrollTo({
            top: savedScrollPosition,
            behavior: "instant",
          });
          this.state.setScrollPosition(0);
        }
      }, TIMING.CLOSE_ANIMATION_MS);
    }
  }

  #flashButtonText(selector, tempText) {
    const el = document.querySelector(selector);
    if (!el) return;
    const originalText = el.textContent;
    el.textContent = tempText;
    setTimeout(() => {
      el.textContent = originalText;
    }, TIMING.FEEDBACK_RESET_MS);
  }
}
