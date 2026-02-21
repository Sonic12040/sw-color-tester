/**
 * app.js - Application Entry Point
 * Initializes and wires together the MVC components
 */

import { colorData } from "./constants.js";
import { ColorModel } from "./models/ColorModel.js";
import { AppState } from "./models/AppState.js";
import { ColorView } from "./views/ColorView.js";
import { ColorController } from "./controllers/ColorController.js";
import { ELEMENT_IDS } from "./utils/config.js";

// Initialize MVC components
const colorModel = new ColorModel(colorData);
const appState = new AppState(colorModel);
const colorView = new ColorView(ELEMENT_IDS.COLOR_ACCORDION);
const colorController = new ColorController(colorModel, appState, colorView);

// Start the application
colorController.init();
