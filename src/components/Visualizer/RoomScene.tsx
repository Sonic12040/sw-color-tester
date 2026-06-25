import type { Color } from "../../data/types.js";
import type { Scene } from "../../domain/scene.js";
import type { LightingPreset } from "../../utils/sceneRender.js";
import { hsl } from "../../utils/colorMath.js";
import styles from "./Visualizer.module.css";

/**
 * Render a scene with its walls painted `color` under a `lighting` preset (E9,
 * US9.2/9.4). The walls are filled with the chosen color; a soft radial shading
 * gradient is multiplied over the wall area to preserve depth/shadow; the static
 * foreground (floor, window, furniture) sits on top; finally the lighting tint
 * overlays the whole scene. SVG + CSS blend modes — no canvas, no binary assets,
 * scales crisply and stays accessible.
 */
export function RoomScene({
  scene,
  color,
  lighting,
}: {
  scene: Scene;
  color: Color;
  lighting: LightingPreset;
}) {
  const fill = hsl(color);
  const shadeId = `scene-shade-${scene.slug}`;
  return (
    <svg
      className={styles.scene}
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      role="img"
      aria-label={`${scene.name} with the walls painted ${color.name} (SW ${color.colorNumber})`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id={shadeId} cx="50%" cy="38%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#e6e6e6" />
          <stop offset="100%" stopColor="#8f8f8f" />
        </radialGradient>
      </defs>

      {/* Base + recolored walls. */}
      <rect width={scene.width} height={scene.height} fill="#ffffff" />
      {scene.walls.map((w, i) => (
        <rect key={i} x={w.x} y={w.y} width={w.w} height={w.h} fill={fill} />
      ))}

      {/* Depth: multiply a shading gradient over the wall regions only. */}
      {scene.walls.map((w, i) => (
        <rect
          key={`shade-${i}`}
          x={w.x}
          y={w.y}
          width={w.w}
          height={w.h}
          fill={`url(#${shadeId})`}
          style={{ mixBlendMode: "multiply" }}
        />
      ))}

      {/* Static foreground (floor, window, furniture). */}
      <g dangerouslySetInnerHTML={{ __html: scene.foreground }} />

      {/* Lighting white-balance/exposure overlay (US9.4). */}
      {lighting.overlay && lighting.opacity > 0 && (
        <rect
          width={scene.width}
          height={scene.height}
          fill={lighting.overlay}
          opacity={lighting.opacity}
          style={{ mixBlendMode: lighting.blend }}
        />
      )}
    </svg>
  );
}
