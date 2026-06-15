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

// ── Explorer Drawer Toggle (Mobile/Tablet/Desktop) ──────────
const explorerToggle = document.getElementById('explorer-toggle');
const panelExplorer = document.getElementById('panel-explorer');
if (explorerToggle && panelExplorer) {
  if (window.innerWidth >= 900) {
    panelExplorer.classList.add('is-expanded');
  }

  const updateIcon = () => {
    const isExpanded = panelExplorer.classList.contains('is-expanded');
    const svg = explorerToggle.querySelector('svg');
    if (!svg) return;
    
    if (window.innerWidth < 600) {
      svg.style.transform = isExpanded ? 'rotate(270deg)' : 'rotate(90deg)';
    } else {
      svg.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
    }
  };

  updateIcon();

  explorerToggle.addEventListener('click', () => {
    panelExplorer.classList.toggle('is-expanded');
    updateIcon();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 900 && !panelExplorer.classList.contains('is-expanded')) {
      panelExplorer.classList.add('is-expanded');
    }
    updateIcon();
  });
}

// Start the application
colorController.init();
