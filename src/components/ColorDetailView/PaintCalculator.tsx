import { useState } from "react";
import { paintEstimate } from "../../utils/paint.js";
import styles from "./colorDetail.module.css";

const toNum = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}

function Field({ id, label, value, onChange }: FieldProps) {
  return (
    <span className={styles.calcField}>
      <label className={styles.calcLabel} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={styles.calcInput}
        type="number"
        min="0"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </span>
  );
}

/**
 * Estimate how much paint a room needs. Recomputes live from the pure
 * `paintEstimate`; the result is announced politely for screen-reader users.
 */
export function PaintCalculator() {
  const [length, setLength] = useState("12");
  const [width, setWidth] = useState("12");
  const [height, setHeight] = useState("8");
  const [coats, setCoats] = useState("2");
  const [doors, setDoors] = useState("1");
  const [windows, setWindows] = useState("2");

  const est = paintEstimate({
    lengthFt: toNum(length),
    widthFt: toNum(width),
    heightFt: toNum(height),
    coats: toNum(coats),
    doors: toNum(doors),
    windows: toNum(windows),
  });

  return (
    <div className={styles.calc}>
      <fieldset className={styles.calcFieldset}>
        <legend className={styles.calcLegend}>Room dimensions (feet)</legend>
        <div className={styles.calcGrid}>
          <Field
            id="calc-length"
            label="Length"
            value={length}
            onChange={setLength}
          />
          <Field
            id="calc-width"
            label="Width"
            value={width}
            onChange={setWidth}
          />
          <Field
            id="calc-height"
            label="Height"
            value={height}
            onChange={setHeight}
          />
          <Field
            id="calc-coats"
            label="Coats"
            value={coats}
            onChange={setCoats}
          />
          <Field
            id="calc-doors"
            label="Doors"
            value={doors}
            onChange={setDoors}
          />
          <Field
            id="calc-windows"
            label="Windows"
            value={windows}
            onChange={setWindows}
          />
        </div>
      </fieldset>

      <p className={styles.calcResult} aria-live="polite">
        About <strong>{est.gallons}</strong> gal — buy{" "}
        <strong>
          {est.cans} can{est.cans === 1 ? "" : "s"}
        </strong>
        .
      </p>
      <p className={styles.calcNote}>
        {est.paintableSqFt} sq ft paintable over {est.coats} coat
        {est.coats === 1 ? "" : "s"}, at ~350 sq ft per gallon. A rough guide —
        check coverage on the can.
      </p>
    </div>
  );
}
