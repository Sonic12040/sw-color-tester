import { useState } from "react";
import type { Color } from "../../data/types.js";
import type { SchemeType } from "../../domain/types.js";
import {
  schemeFromColor,
  SCHEME_TYPES,
} from "../../utils/paletteIntelligence.js";
import { SCHEME_LABEL, explainScheme } from "../../utils/colorCopy.js";
import { hueRelation } from "../../utils/colorMath.js";
import { useAppContext } from "../../context/AppContext.js";
import { usePalette } from "../../context/PaletteContext.js";
import { useCompare } from "../../context/CompareContext.js";
import { useToast } from "../Toast/Toast.js";
import { MiniTile } from "./MiniTile.js";
import styles from "./colorDetail.module.css";

/** Saturation at/below which hue-based schemes don't apply (a near-neutral base). */
const NEUTRAL_SATURATION = 0.1;

interface SchemeSectionProps {
  base: Color;
  onNavigate: (id: string) => void;
}

/**
 * Color-harmony generator (E11): pick a scheme type and see 3–5 real SW colors
 * snapped from the catalog, with a one-line rationale and one-click "add all to
 * palette" / "compare all". Deterministic, so it prerenders cleanly.
 */
export function SchemeSection({ base, onNavigate }: SchemeSectionProps) {
  const { colorModel } = useAppContext();
  const { palette, togglePalette } = usePalette();
  const { compare, toggleCompare } = useCompare();
  const showToast = useToast();
  const [type, setType] = useState<SchemeType>("analogous");

  const colors = schemeFromColor(base, type, colorModel.getActiveColors());
  const neutralBase =
    type !== "monochromatic" && base.saturation <= NEUTRAL_SATURATION;

  const addAllToPalette = () => {
    const ids = [base.id, ...colors.map((c) => c.id)];
    const added = ids.filter((id) => !palette.includes(id));
    added.forEach((id) => togglePalette(id));
    showToast(
      added.length
        ? `Added ${added.length} to palette`
        : "Already in your palette",
    );
  };

  const compareAll = () => {
    [base.id, ...colors.map((c) => c.id)]
      .filter((id) => !compare.includes(id))
      .forEach((id) => toggleCompare(id)); // context caps at 4
    showToast("Added to comparison (up to 4)");
  };

  return (
    <section>
      <h2 className={styles.sectionTitle}>Color schemes</h2>
      <p className={styles.sectionDesc}>
        Build a harmonious scheme from {base.name}, snapped to real SW colors.
      </p>

      <div className={styles.schemeControls}>
        <label className={styles.schemeField}>
          <span className={styles.schemeFieldLabel}>Scheme</span>
          <select
            className="field-on-dark"
            value={type}
            onChange={(e) => setType(e.target.value as SchemeType)}
            aria-label="Scheme type"
          >
            {SCHEME_TYPES.map((t) => (
              <option key={t} value={t}>
                {SCHEME_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className={styles.bodyText}>{explainScheme(type)}</p>

      {neutralBase ? (
        <p className={styles.schemeEmpty}>
          {base.name} is a near-neutral, so hue-based schemes don’t apply. Try
          Monochromatic for tints and shades.
        </p>
      ) : colors.length === 0 ? (
        <p className={styles.schemeEmpty}>
          No close catalog matches for this scheme.
        </p>
      ) : (
        <>
          <div className={styles.colorGrid}>
            {colors.map((c) => (
              <MiniTile
                key={c.id}
                color={c}
                role={hueRelation(base, c)}
                onClick={onNavigate}
              />
            ))}
          </div>
          <div className={styles.schemeActions}>
            <button
              type="button"
              className="btn btn-on-dark"
              onClick={addAllToPalette}
            >
              Add all to palette
            </button>
            <button
              type="button"
              className="btn btn-on-dark"
              onClick={compareAll}
            >
              Compare all
            </button>
          </div>
        </>
      )}
    </section>
  );
}
