/**
 * app.js - Application Entry Point
 * Initializes and wires together the MVC components
 */

import { colorData } from "./constants.js";
import { ColorModel } from "./models/ColorModel.js";
import { AppState } from "./models/AppState.js";
import { ColorView } from "./views/ColorView.js";
import { ColorController } from "./controllers/ColorController.js";
import { LrvFilterController } from "./controllers/LrvFilterController.js";
import { ModalController } from "./controllers/ModalController.js";
import { DialogService } from "./utils/DialogService.js";
import { ExportService } from "./utils/ExportService.js";
import { CommandBus } from "./utils/CommandBus.js";
import { ELEMENT_IDS } from "./utils/config.js";
import { VisualizerView } from "./views/VisualizerView.js";
import { VisualizerController } from "./controllers/VisualizerController.js";

// Initialize MVC components
const colorModel = new ColorModel(colorData);
const appState = new AppState(colorModel);
const colorView = new ColorView(ELEMENT_IDS.COLOR_ACCORDION);
const dialogService = new DialogService();
const exportService = new ExportService();
const lrvFilterController = new LrvFilterController(appState);
const commandBus = new CommandBus(colorModel, appState);
const modalController = new ModalController(
  colorModel,
  appState,
  dialogService,
  commandBus,
);

const colorController = new ColorController(
  colorModel,
  appState,
  colorView,
  dialogService,
  exportService,
  lrvFilterController,
  modalController,
  commandBus,
);

// ── Visualizer ──────────────────────────────────────────────
const visualizerView = new VisualizerView("#visualizer-canvas");
const visualizerController = new VisualizerController(
  appState,
  visualizerView,
  commandBus,
  colorModel,
);

// ── Tab switching (mobile two-tab system) ───────────────────
const tabExplorer = document.getElementById("tab-explorer");
const tabVisualizer = document.getElementById("tab-visualizer");
const panelExplorer = document.getElementById("panel-explorer");
const panelVisualizer = document.getElementById("panel-visualizer");

function switchTab(activeTab, inactiveTab, activePanel, inactivePanel) {
  activeTab.setAttribute("aria-selected", "true");
  inactiveTab.setAttribute("aria-selected", "false");
  activePanel.removeAttribute("hidden");
  inactivePanel.setAttribute("hidden", "");
}

if (tabExplorer && tabVisualizer) {
  tabExplorer.addEventListener("click", () =>
    switchTab(tabExplorer, tabVisualizer, panelExplorer, panelVisualizer),
  );
  tabVisualizer.addEventListener("click", () =>
    switchTab(tabVisualizer, tabExplorer, panelVisualizer, panelExplorer),
  );
}

// Start the application
colorController.init();
