import { Link } from "react-router";
import type { Color } from "../../data/types.js";
import { hsl, classifyLrv } from "../../utils/colorMath.js";
import { colorPath } from "../../utils/base.js";
import { toSlug } from "../../utils/slug.js";
import type { PaletteEntry } from "../../context/PaletteContext.js";
import styles from "./WorkOrderView.module.css";

interface Row {
  entry: PaletteEntry;
  color: Color;
}

const UNASSIGNED = "Unassigned";

/**
 * Painter lens (US15.3): the same project rendered as a field-readable job
 * sheet. Surfaces are grouped by their assigned room (roomless colors fall into
 * an "Unassigned" bucket), each row leading with the SW number — the thing a
 * painter actually orders — plus the note as a job instruction. A flat project
 * (no rooms assigned) degrades to a single un-headed list.
 */
export function WorkOrderView({ rows }: { rows: Row[] }) {
  // Preserve first-appearance order of rooms; collect roomless colors together.
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const room = row.entry.room?.trim() || UNASSIGNED;
    const bucket = groups.get(room);
    if (bucket) bucket.push(row);
    else groups.set(room, [row]);
  }

  // Flat project: nothing is assigned to a room, so drop the room headings.
  const flat = groups.size === 1 && groups.has(UNASSIGNED);

  return (
    <div className={styles.sheet}>
      {[...groups.entries()].map(([room, group]) => (
        <section key={room} className={styles.group} aria-label={room}>
          {!flat && (
            <header className={styles.groupHead}>
              <h2 className={styles.room}>{room}</h2>
              <span className={styles.count}>
                {group.length} {group.length === 1 ? "color" : "colors"}
              </span>
            </header>
          )}
          <ol className={styles.list}>
            {group.map(({ entry, color: c }) => (
              <li className={styles.row} key={c.id}>
                <span
                  className={styles.swatch}
                  style={{ background: hsl(c) }}
                  aria-hidden="true"
                />
                <span className={styles.info}>
                  <span className={styles.sw}>SW {c.colorNumber}</span>
                  <Link className={styles.name} to={colorPath(toSlug(c))}>
                    {c.name}
                  </Link>
                  <span className={styles.meta}>
                    {classifyLrv(c.lrv)} · LRV {c.lrv.toFixed(1)}
                  </span>
                  {entry.note && (
                    <span className={styles.note}>{entry.note}</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
