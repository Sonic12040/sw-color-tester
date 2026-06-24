import { Link } from "react-router";
import type { Color } from "../../data/types.js";
import { hsl } from "../../utils/colorMath.js";
import { colorPath } from "../../utils/base.js";
import { toSlug } from "../../utils/slug.js";
import { resolveSurfaceArea } from "../../utils/paint.js";
import {
  FINISHES,
  SURFACE_TYPES,
  type Room,
  type Surface,
  type SurfaceType,
} from "../../domain/project.js";
import { usePalette } from "../../context/PaletteContext.js";
import { useAppContext } from "../../context/AppContext.js";
import { useToast } from "../Toast/Toast.js";
import { exportService } from "../../appModel.js";
import styles from "./WorkOrderView.module.css";

const toNum = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Painter lens (US16.1): the same project as a structured Work Order — rooms ×
 * surfaces, each surface assigned a color + finish + coats + measured area, with
 * per-room totals and a printable PDF. Surfaces draw their color from the
 * project's palette. A project with no rooms degrades to an "add a room" prompt.
 */
export function WorkOrderView() {
  const { colorModel } = useAppContext();
  const { entries, activeProject, rooms, addRoom } = usePalette();
  const showToast = useToast();

  // Colors a surface can be assigned to: the project's palette, in order.
  const paletteColors = entries
    .map((e) => colorModel.getColorById(e.id))
    .filter((c): c is Color => Boolean(c));
  const colorsById = new Map(paletteColors.map((c) => [c.id, c]));

  const totalSurfaces = rooms.reduce((n, r) => n + r.surfaces.length, 0);

  const exportPdf = async () => {
    try {
      await exportService.exportWorkOrderPdf(rooms, paletteColors, {
        project: activeProject.name,
      });
    } catch {
      showToast("Couldn't generate the work order PDF");
    }
  };

  return (
    <div className={styles.sheet}>
      <div className={styles.head}>
        <h2 className={styles.title}>Work order</h2>
        <div className={styles.headActions}>
          <button
            type="button"
            className="btn-on-dark"
            onClick={() => addRoom()}
          >
            Add room
          </button>
          <button
            type="button"
            className="btn-on-dark"
            onClick={exportPdf}
            disabled={totalSurfaces === 0}
          >
            Export work order PDF
          </button>
        </div>
      </div>

      {rooms.length === 0 ? (
        <p className={styles.empty}>
          Break this palette into a job: add a room, then add the surfaces to
          paint (walls, trim, doors…) and assign each a color, finish, and area.
        </p>
      ) : (
        rooms.map((room) => (
          <RoomSection key={room.id} room={room} colorsById={colorsById} />
        ))
      )}
    </div>
  );
}

function RoomSection({
  room,
  colorsById,
}: {
  room: Room;
  colorsById: Map<string, Color>;
}) {
  const {
    entries,
    renameRoom,
    deleteRoom,
    addSurface,
    updateSurface,
    deleteSurface,
  } = usePalette();
  const { colorModel } = useAppContext();

  const colorOptions = entries
    .map((e) => colorModel.getColorById(e.id))
    .filter((c): c is Color => Boolean(c));
  const totalArea = room.surfaces.reduce(
    (sum, s) => sum + resolveSurfaceArea(s),
    0,
  );

  return (
    <section className={styles.room} aria-label={room.name}>
      <header className={styles.roomHead}>
        <input
          className={`field-on-dark ${styles.roomName}`}
          value={room.name}
          aria-label={`Room name (${room.name})`}
          onChange={(e) => renameRoom(room.id, e.target.value)}
        />
        <span className={styles.roomMeta}>
          {room.surfaces.length} surface
          {room.surfaces.length === 1 ? "" : "s"} · {Math.round(totalArea)} sq
          ft
        </span>
        <div className={styles.roomActions}>
          <button
            type="button"
            className="btn-on-dark"
            onClick={() => addSurface(room.id)}
          >
            Add surface
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label={`Delete room ${room.name}`}
            onClick={() => deleteRoom(room.id)}
          >
            ✕
          </button>
        </div>
      </header>

      {room.surfaces.length === 0 ? (
        <p className={styles.roomEmpty}>
          No surfaces yet — add one to start spec'ing this room.
        </p>
      ) : (
        <ol className={styles.surfaces}>
          {room.surfaces.map((surface, i) => (
            <SurfaceRow
              key={surface.id}
              room={room}
              surface={surface}
              position={i + 1}
              color={
                surface.colorId ? colorsById.get(surface.colorId) : undefined
              }
              colorOptions={colorOptions}
              onChange={(patch) => updateSurface(room.id, surface.id, patch)}
              onDelete={() => deleteSurface(room.id, surface.id)}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function SurfaceRow({
  room,
  surface,
  position,
  color,
  colorOptions,
  onChange,
  onDelete,
}: {
  room: Room;
  surface: Surface;
  position: number;
  color: Color | undefined;
  colorOptions: Color[];
  onChange: (patch: Partial<Surface>) => void;
  onDelete: () => void;
}) {
  const label = `${room.name} surface ${position}`;
  const byDimensions = Boolean(surface.dimensions);
  const area = resolveSurfaceArea(surface);
  const dim = surface.dimensions;

  // Merge one dimension field, switching the surface onto dimension-based area.
  const setDim = (field: keyof NonNullable<Surface["dimensions"]>, v: string) =>
    onChange({
      dimensions: {
        lengthFt: dim?.lengthFt ?? 0,
        widthFt: dim?.widthFt ?? 0,
        heightFt: dim?.heightFt ?? 0,
        ...(dim?.doors != null ? { doors: dim.doors } : {}),
        ...(dim?.windows != null ? { windows: dim.windows } : {}),
        [field]: toNum(v),
      },
      areaSqFt: undefined,
    });

  return (
    <li className={styles.surface}>
      <span
        className={styles.swatch}
        data-empty={color ? undefined : true}
        style={color ? { background: hsl(color) } : undefined}
        aria-hidden="true"
      />
      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Surface</span>
          <select
            className="field-on-dark"
            value={surface.type}
            aria-label={`Surface type for ${label}`}
            onChange={(e) => onChange({ type: e.target.value as SurfaceType })}
          >
            {SURFACE_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Color</span>
          <select
            className="field-on-dark"
            value={surface.colorId ?? ""}
            aria-label={`Color for ${label}`}
            onChange={(e) => onChange({ colorId: e.target.value || undefined })}
          >
            <option value="">Unassigned</option>
            {colorOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (SW {c.colorNumber})
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Finish</span>
          <select
            className="field-on-dark"
            value={surface.finish ?? ""}
            aria-label={`Finish for ${label}`}
            onChange={(e) =>
              onChange({
                finish: (e.target.value as Surface["finish"]) || undefined,
              })
            }
          >
            <option value="">—</option>
            {FINISHES.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </label>

        <label className={`${styles.field} ${styles.fieldNarrow}`}>
          <span className={styles.fieldLabel}>Coats</span>
          <input
            className="field-on-dark"
            type="number"
            min="0"
            inputMode="numeric"
            value={surface.coats ?? ""}
            aria-label={`Coats for ${label}`}
            onChange={(e) =>
              onChange({
                coats:
                  e.target.value === "" ? undefined : toNum(e.target.value),
              })
            }
          />
        </label>

        <label className={`${styles.field} ${styles.fieldNarrow}`}>
          <span className={styles.fieldLabel}>Area (sq ft)</span>
          <input
            className="field-on-dark"
            type="number"
            min="0"
            inputMode="decimal"
            value={byDimensions ? Math.round(area) : (surface.areaSqFt ?? "")}
            disabled={byDimensions}
            aria-label={`Area for ${label}`}
            onChange={(e) =>
              onChange({
                areaSqFt:
                  e.target.value === "" ? undefined : toNum(e.target.value),
              })
            }
          />
        </label>
      </div>

      <button
        type="button"
        className={styles.iconBtn}
        aria-label={`Delete ${label}`}
        onClick={onDelete}
      >
        ✕
      </button>

      {/* Optional L×W×H measurement — reuses the paint-calculator area math. */}
      <details className={styles.measure}>
        <summary className={styles.measureSummary}>
          {byDimensions
            ? `Measured by L×W×H — ${Math.round(area)} sq ft`
            : "Measure by L×W×H"}
        </summary>
        <div className={styles.dims}>
          <label className={styles.dimField}>
            <span className={styles.fieldLabel}>Length</span>
            <input
              className="field-on-dark"
              type="number"
              min="0"
              inputMode="decimal"
              value={dim?.lengthFt ?? ""}
              aria-label={`Length for ${label}`}
              onChange={(e) => setDim("lengthFt", e.target.value)}
            />
          </label>
          <label className={styles.dimField}>
            <span className={styles.fieldLabel}>Width</span>
            <input
              className="field-on-dark"
              type="number"
              min="0"
              inputMode="decimal"
              value={dim?.widthFt ?? ""}
              aria-label={`Width for ${label}`}
              onChange={(e) => setDim("widthFt", e.target.value)}
            />
          </label>
          <label className={styles.dimField}>
            <span className={styles.fieldLabel}>Height</span>
            <input
              className="field-on-dark"
              type="number"
              min="0"
              inputMode="decimal"
              value={dim?.heightFt ?? ""}
              aria-label={`Height for ${label}`}
              onChange={(e) => setDim("heightFt", e.target.value)}
            />
          </label>
          <label className={styles.dimField}>
            <span className={styles.fieldLabel}>Doors</span>
            <input
              className="field-on-dark"
              type="number"
              min="0"
              inputMode="numeric"
              value={dim?.doors ?? ""}
              aria-label={`Doors for ${label}`}
              onChange={(e) => setDim("doors", e.target.value)}
            />
          </label>
          <label className={styles.dimField}>
            <span className={styles.fieldLabel}>Windows</span>
            <input
              className="field-on-dark"
              type="number"
              min="0"
              inputMode="numeric"
              value={dim?.windows ?? ""}
              aria-label={`Windows for ${label}`}
              onChange={(e) => setDim("windows", e.target.value)}
            />
          </label>
          {byDimensions && (
            <button
              type="button"
              className="btn-on-dark"
              onClick={() => onChange({ dimensions: undefined })}
            >
              Use area instead
            </button>
          )}
        </div>
      </details>

      {color && (
        <Link className={styles.colorLink} to={colorPath(toSlug(color))}>
          View {color.name}
        </Link>
      )}
    </li>
  );
}
