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
import { ELEMENT_IDS } from "./utils/config.js";

// Initialize MVC components
const colorModel = new ColorModel(colorData);
const appState = new AppState(colorModel);
const colorView = new ColorView(ELEMENT_IDS.COLOR_ACCORDION);
const dialogService = new DialogService();
const exportService = new ExportService();
const lrvFilterController = new LrvFilterController(appState);

// Late-binding closures — colorController is assigned before any user interaction
let colorController;
const modalController = new ModalController(
  colorModel,
  appState,
  dialogService,
  {
    onToggleFavorite: (id) => colorController.handleFavoriteButton(id),
    onToggleHidden: (id) => colorController.handleHideButton(id),
  },
);
colorController = new ColorController(
  colorModel,
  appState,
  colorView,
  dialogService,
  exportService,
  lrvFilterController,
  modalController,
);

// Start the application
colorController.init();
