import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import type { Color } from "../data/types.js";
import type { PaletteProject } from "../domain/paletteData.js";
import { colorModel } from "../appModel.js";
import { decodeProjectParam } from "../utils/projectShare.js";
import { assignRoles } from "../utils/paletteIntelligence.js";
import { explainRole } from "../utils/colorCopy.js";
import { hsl, classifyLrv, undertone } from "../utils/colorMath.js";
import { SITE_URL } from "../utils/base.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { useNoindex } from "../hooks/useNoindex.js";
import styles from "./Board.module.css";

/**
 * Client presentation board (E13) — a branded, **read-only** rendering of a
 * Project, loaded entirely from an E18 share link (`?project=` compressed) so a
 * designer can hand a polished artifact to a client. Standalone (outside
 * RootLayout, no app nav), reads the `colorModel` singleton directly, and is
 * `noindex` (it's a private, link-shared view with no stored server state).
 * Live comments/approval are intentionally out of scope (they'd need a backend).
 */
export function BoardPage() {
  const [params] = useSearchParams();
  const projectParam = params.get("project");
  const titleOverride = params.get("title")?.trim();
  const [project, setProject] = useState<PaletteProject | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "empty">(
    projectParam ? "loading" : "empty",
  );

  useEffect(() => {
    if (!projectParam) {
      setStatus("empty");
      setProject(null);
      return;
    }
    let cancelled = false;
    setStatus("loading");
    decodeProjectParam(projectParam).then((p) => {
      if (cancelled) return;
      setProject(p);
      setStatus(p ? "ready" : "empty");
    });
    return () => {
      cancelled = true;
    };
  }, [projectParam]);

  const title = titleOverride || project?.name || "Color board";
  useDocumentMeta(`${title} | Sherwin-Williams Color Atlas`);
  useNoindex();

  const rows = (project?.entries ?? [])
    .map((entry) => ({ entry, color: colorModel.getColorById(entry.id) }))
    .filter((r): r is { entry: (typeof r)["entry"]; color: Color } =>
      Boolean(r.color),
    );
  const colors = rows.map((r) => r.color);
  const roleByIndex = assignRoles(
    colors,
    Object.fromEntries(rows.map((r) => [r.color.id, r.entry.role])),
  );

  return (
    <div className={styles.page}>
      <article className={styles.board}>
        <header className={styles.head}>
          <p className={styles.brandKicker}>Color palette</p>
          <h1 className={styles.title}>{title}</h1>
        </header>

        {status === "loading" && <p className={styles.note}>Loading board…</p>}

        {status === "empty" && (
          <p className={styles.note}>
            This board link is empty or invalid. Ask whoever shared it for a new
            link.
          </p>
        )}

        {status === "ready" && colors.length > 0 && (
          <ol className={styles.list}>
            {rows.map(({ entry, color: c }, i) => (
              <li key={c.id} className={styles.row}>
                <span
                  className={styles.swatch}
                  style={{ background: hsl(c) }}
                  aria-hidden="true"
                />
                <div className={styles.info}>
                  <p className={styles.name}>{c.name}</p>
                  <p className={styles.meta}>
                    SW {c.colorNumber} · {classifyLrv(c.lrv)} · LRV{" "}
                    {c.lrv.toFixed(1)} · {undertone(c)} undertone
                  </p>
                  <p
                    className={styles.role}
                    data-role={roleByIndex[i].role}
                    title={explainRole(roleByIndex[i].role)}
                  >
                    {roleByIndex[i].role} · {roleByIndex[i].proportion}%
                  </p>
                  {(entry.room || entry.note) && (
                    <p className={styles.annotation}>
                      {entry.room && (
                        <span className={styles.room}>{entry.room}</span>
                      )}
                      {entry.note && <span>{entry.note}</span>}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}

        <footer className={styles.footer}>
          <a href={SITE_URL} target="_blank" rel="noopener noreferrer">
            Presented with the Sherwin-Williams Color Atlas
          </a>
        </footer>
      </article>
    </div>
  );
}
