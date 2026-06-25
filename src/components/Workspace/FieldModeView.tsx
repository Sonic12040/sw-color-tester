import { useState } from "react";
import { useNavigate } from "react-router";
import type { Color } from "../../data/types.js";
import { hsl } from "../../utils/colorMath.js";
import { colorPath } from "../../utils/base.js";
import { toSlug } from "../../utils/slug.js";
import {
  finishLabel,
  surfaceTypeLabel,
  type Surface,
} from "../../domain/project.js";
import { projectProgress, resolveSurfaceArea } from "../../utils/paint.js";
import { buildShoppingList } from "../../utils/workOrder.js";
import { usePalette } from "../../context/PaletteContext.js";
import { useAppContext } from "../../context/AppContext.js";
import { useToast } from "../Toast/Toast.js";
import styles from "./FieldModeView.module.css";

/**
 * Field mode (E17) — an on-site rendering of the Work Order: high-contrast,
 * large-type, big tap targets, for reading in bright light with gloves. It's a
 * read view of the spec (no editing) except for the one action that matters on
 * the job — checking surfaces off as they're painted. Everything is local-first,
 * so check-offs persist and work offline (the route + active project are
 * precached / in localStorage); they reconcile whenever connectivity returns.
 *
 * US17.2: a jump-to-SW-number search to confirm a color at the counter.
 */
export function FieldModeView({ onExit }: { onExit: () => void }) {
  const { colorModel } = useAppContext();
  const { rooms, entries, activeProject, updateSurface } = usePalette();
  const navigate = useNavigate();
  const showToast = useToast();
  const [query, setQuery] = useState("");

  const colorsById = new Map(
    entries
      .map((e) => colorModel.getColorById(e.id))
      .filter((c): c is Color => Boolean(c))
      .map((c) => [c.id, c]),
  );

  const progress = projectProgress(rooms);
  const pct = Math.round(progress.fraction * 100);
  const shoppingList = buildShoppingList(rooms, colorsById);

  // Jump to a color by its SW number (digits only; tolerant of "SW 6258").
  const jumpToNumber = (e: React.FormEvent) => {
    e.preventDefault();
    const number = query.replace(/[^0-9]/g, "");
    if (!number) return;
    const color = colorModel.getColorByNumber(number);
    if (color) {
      navigate(colorPath(toSlug(color)));
    } else {
      showToast(`No color found for SW ${number}`);
    }
  };

  return (
    <section className={styles.field} aria-label="Field mode work order">
      <header className={styles.head}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>{activeProject.name}</h2>
          <button type="button" className={styles.exit} onClick={onExit}>
            Exit field mode
          </button>
        </div>

        <form className={styles.search} role="search" onSubmit={jumpToNumber}>
          <label className={styles.searchLabel} htmlFor="field-number-search">
            Look up a color by SW number
          </label>
          <div className={styles.searchRow}>
            <input
              id="field-number-search"
              className={styles.searchInput}
              type="text"
              inputMode="numeric"
              placeholder="e.g. 6258"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className={styles.searchBtn}>
              Go
            </button>
          </div>
        </form>
      </header>

      {progress.total > 0 && (
        <div className={styles.progress}>
          <span className={styles.progressCount}>
            {progress.done}/{progress.total} surfaces done · {pct}%
          </span>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.done}
            aria-valuetext={`${progress.done} of ${progress.total} surfaces done`}
          >
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {rooms.map((room) => (
        <section key={room.id} className={styles.room} aria-label={room.name}>
          <h3 className={styles.roomName}>{room.name}</h3>
          {room.surfaces.length === 0 ? (
            <p className={styles.roomEmpty}>No surfaces.</p>
          ) : (
            <ul className={styles.surfaces}>
              {room.surfaces.map((surface, i) => (
                <FieldSurface
                  key={surface.id}
                  surface={surface}
                  label={`${room.name} surface ${i + 1}`}
                  color={
                    surface.colorId
                      ? colorsById.get(surface.colorId)
                      : undefined
                  }
                  onToggleDone={(done) =>
                    updateSurface(room.id, surface.id, {
                      done: done || undefined,
                    })
                  }
                />
              ))}
            </ul>
          )}
        </section>
      ))}

      {shoppingList.length > 0 && (
        <section className={styles.shop} aria-label="Shopping list">
          <h3 className={styles.roomName}>Shopping list</h3>
          <ul className={styles.surfaces}>
            {shoppingList.map((it) => (
              <li
                key={`${it.colorId}-${it.finish ?? "any"}`}
                className={styles.shopRow}
              >
                <span
                  className={styles.swatch}
                  style={{ background: it.hex }}
                  aria-hidden="true"
                />
                <span className={styles.shopInfo}>
                  <span className={styles.shopName}>
                    {it.name} · SW {it.number}
                  </span>
                  <span className={styles.shopMeta}>
                    {it.finishLabel ?? "Any finish"} ·{" "}
                    {it.rack ? `Rack ${it.rack}` : "Rack n/a"}
                  </span>
                </span>
                <span className={styles.shopCans}>
                  {it.cans} can{it.cans === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}

function FieldSurface({
  surface,
  label,
  color,
  onToggleDone,
}: {
  surface: Surface;
  label: string;
  color: Color | undefined;
  onToggleDone: (done: boolean) => void;
}) {
  const area = resolveSurfaceArea(surface);
  const finish = finishLabel(surface.finish);
  const specs = [
    surfaceTypeLabel(surface.type),
    finish,
    surface.coats != null
      ? `${surface.coats} coat${surface.coats === 1 ? "" : "s"}`
      : null,
    area > 0 ? `${Math.round(area)} sq ft` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className={styles.surface} data-done={surface.done ? true : undefined}>
      <label className={styles.check}>
        <input
          type="checkbox"
          className={styles.checkInput}
          checked={Boolean(surface.done)}
          aria-label={`Mark ${label} done`}
          onChange={(e) => onToggleDone(e.target.checked)}
        />
        <span className={styles.checkBox} aria-hidden="true" />
      </label>
      <span
        className={styles.swatch}
        data-empty={color ? undefined : true}
        style={color ? { background: hsl(color) } : undefined}
        aria-hidden="true"
      />
      <span className={styles.surfaceInfo}>
        <span className={styles.surfaceName}>
          {color ? `${color.name} · SW ${color.colorNumber}` : "Unassigned"}
        </span>
        <span className={styles.surfaceSpecs}>{specs}</span>
      </span>
    </li>
  );
}
