import type { Color } from "../../data/types.js";
import styles from "./colorDetail.module.css";

interface HslBreakdownProps {
  color: Color;
}

/** Hue / Saturation / Lightness bars for a color. */
export function HslBreakdown({ color }: HslBreakdownProps) {
  const hue = Math.round(color.hue * 360);
  const sat = Math.round(color.saturation * 100);
  const lig = Math.round(color.lightness * 100);

  const channels = [
    {
      name: "Hue",
      value: `${hue}°`,
      pct: color.hue * 100,
      bg: `linear-gradient(to right, hsl(0,100%,50%),hsl(60,100%,50%),hsl(120,100%,50%),hsl(180,100%,50%),hsl(240,100%,50%),hsl(300,100%,50%),hsl(360,100%,50%))`,
    },
    {
      name: "Saturation",
      value: `${sat}%`,
      pct: sat,
      bg: `linear-gradient(to right, hsl(${hue},0%,50%), hsl(${hue},100%,50%))`,
    },
    {
      name: "Lightness",
      value: `${lig}%`,
      pct: lig,
      bg: `linear-gradient(to right, hsl(${hue},${sat}%,0%), hsl(${hue},${sat}%,50%), hsl(${hue},${sat}%,100%))`,
    },
  ];

  return (
    <div className={styles.hslSection}>
      <h2 className={styles.sectionTitle}>HSL color breakdown</h2>
      {channels.map(({ name, value, pct, bg }) => (
        <div key={name} className={styles.hslItem}>
          <div className={styles.hslItemLabel}>
            <span className={styles.hslItemName}>{name}</span>
            <span className={styles.hslItemValue}>{value}</span>
          </div>
          <div className={styles.hslBar} style={{ background: bg }}>
            <div className={styles.hslIndicator} style={{ left: `${pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
