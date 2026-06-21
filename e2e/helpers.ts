import { readdirSync } from "node:fs";
import { resolve } from "node:path";

/** First N prerendered color slugs (directory names under dist/colors). */
export function colorSlugs(n: number): string[] {
  return readdirSync(resolve(process.cwd(), "dist", "colors")).slice(0, n);
}
