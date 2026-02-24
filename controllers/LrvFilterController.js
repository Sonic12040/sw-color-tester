/**
 * Controller for the LRV (Light Reflectance Value) dual-range slider widget.
 */

import { CSS_CLASSES, ELEMENT_IDS } from "../utils/config.js";

const DEBOUNCE_MS = 80;

export class LrvFilterController {
  constructor(state) {
    this.state = state;
  }

  /**
   * Wire up slider listeners and initialize UI from persisted state.
   * @param {Function} onChange - Called after each debounced range change or reset
   */
  setup(onChange) {
    const minSlider = document.getElementById(ELEMENT_IDS.LRV_SLIDER_MIN);
    const maxSlider = document.getElementById(ELEMENT_IDS.LRV_SLIDER_MAX);
    const minValue = document.getElementById(ELEMENT_IDS.LRV_VALUE_MIN);
    const maxValue = document.getElementById(ELEMENT_IDS.LRV_VALUE_MAX);
    const rangeFill = document.getElementById(ELEMENT_IDS.LRV_RANGE_FILL);
    const resetBtn = document.getElementById(ELEMENT_IDS.LRV_RESET);

    if (!minSlider || !maxSlider) return;

    const { min, max } = this.state.getLrvRange();
    minSlider.value = min;
    maxSlider.value = max;

    const updateSliderUI = () => {
      const minVal = Number(minSlider.value);
      const maxVal = Number(maxSlider.value);

      minValue.textContent = minVal;
      maxValue.textContent = maxVal;

      minSlider.setAttribute("aria-valuenow", minVal);
      maxSlider.setAttribute("aria-valuenow", maxVal);

      rangeFill.style.left = `${minVal}%`;
      rangeFill.style.right = `${100 - maxVal}%`;

      const isActive = minVal > 0 || maxVal < 100;
      resetBtn.classList.toggle(CSS_CLASSES.LRV_FILTER_RESET_VISIBLE, isActive);
    };

    let renderTimeout = null;
    const debouncedRender = () => {
      if (renderTimeout) clearTimeout(renderTimeout);
      renderTimeout = setTimeout(() => {
        const minVal = Number(minSlider.value);
        const maxVal = Number(maxSlider.value);
        this.state.setLrvRange(minVal, maxVal);
        onChange();
      }, DEBOUNCE_MS);
    };

    minSlider.addEventListener("input", () => {
      if (Number(minSlider.value) > Number(maxSlider.value)) {
        minSlider.value = maxSlider.value;
      }
      updateSliderUI();
      debouncedRender();
    });

    maxSlider.addEventListener("input", () => {
      if (Number(maxSlider.value) < Number(minSlider.value)) {
        maxSlider.value = minSlider.value;
      }
      updateSliderUI();
      debouncedRender();
    });

    resetBtn.addEventListener("click", () => {
      minSlider.value = 0;
      maxSlider.value = 100;
      updateSliderUI();
      this.state.setLrvRange(0, 100);
      onChange();
    });

    updateSliderUI();
  }
}
