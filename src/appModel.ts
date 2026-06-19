import { colorData } from "./data/palette.js";
import { ColorModel } from "./models/ColorModel.js";
import { ExportService } from "./utils/ExportService.js";

// Module-level singletons — created once per process (client tab or SSR render),
// shared by every route and by the prerender step.
export const colorModel = new ColorModel(colorData);
export const exportService = new ExportService();
