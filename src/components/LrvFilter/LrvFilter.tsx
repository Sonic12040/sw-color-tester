import { useEffect, useRef, useState } from "react";
import { TIMING } from "../../utils/config.js";
import styles from "./LrvFilter.module.css";

interface LrvFilterProps {
  lrvMin: number;
  lrvMax: number;
  colorCount: number;
  filteredCount: number;
  onChange: (min: number, max: number) => void;
}

export function LrvFilter({
  lrvMin,
  lrvMax,
  colorCount,
  filteredCount,
  onChange,
}: LrvFilterProps) {
  const [localMin, setLocalMin] = useState(lrvMin);
  const [localMax, setLocalMax] = useState(lrvMax);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external state back in (e.g. on reset from URL)
  useEffect(() => {
    setLocalMin(lrvMin);
  }, [lrvMin]);
  useEffect(() => {
    setLocalMax(lrvMax);
  }, [lrvMax]);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(Number(e.target.value), localMax);
    setLocalMin(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => onChange(val, localMax),
      TIMING.LRV_DEBOUNCE_MS,
    );
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(Number(e.target.value), localMin);
    setLocalMax(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => onChange(localMin, val),
      TIMING.LRV_DEBOUNCE_MS,
    );
  };

  const handleReset = () => {
    setLocalMin(0);
    setLocalMax(100);
    onChange(0, 100);
  };

  const isActive = localMin > 0 || localMax < 100;

  return (
    <div className={styles.filter} aria-label="Light Reflectance Value filter">
      <div className={styles.header}>
        <h2 className={styles.title}>LRV Filter</h2>
        <span className={styles.rangeLabel} aria-live="polite">
          <span id="lrv-value-min">{localMin}</span>
          <span aria-hidden="true"> – </span>
          <span id="lrv-value-max">{localMax}</span>
        </span>
        <span className={styles.count} id="lrv-count">
          Showing {filteredCount} of {colorCount} colors
        </span>
        <button
          type="button"
          id="lrv-reset"
          className={`${styles.reset} ${isActive ? styles.resetVisible : ""}`}
          aria-label="Reset LRV filter"
          onClick={handleReset}
        >
          Reset
        </button>
      </div>

      <div className={styles.trackContainer}>
        <div className={styles.track}>
          <div
            id="lrv-range-fill"
            className={styles.rangeFill}
            style={{ left: `${localMin}%`, right: `${100 - localMax}%` }}
          />
        </div>
        <input
          type="range"
          id="lrv-slider-min"
          className={`${styles.input} ${styles.inputMin}`}
          min={0}
          max={100}
          value={localMin}
          step={1}
          aria-label="Minimum LRV value"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={localMin}
          onChange={handleMinChange}
        />
        <input
          type="range"
          id="lrv-slider-max"
          className={`${styles.input} ${styles.inputMax}`}
          min={0}
          max={100}
          value={localMax}
          step={1}
          aria-label="Maximum LRV value"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={localMax}
          onChange={handleMaxChange}
        />
      </div>
    </div>
  );
}
