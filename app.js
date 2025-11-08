/**
 * app.js - Application Entry Point
 * Initializes and wires together the MVC components
 */

console.log("=== APP.JS LOADING ===");
console.log("Timestamp:", new Date().toISOString());

import { colorData } from "./constants.js";
import { ColorModel } from "./models/ColorModel.js";
import { AppState } from "./models/AppState.js";
import { ColorView } from "./views/ColorView.js";
import { ColorController } from "./controllers/ColorController.js";
import { ELEMENT_IDS } from "./utils/config.js";

console.log("✅ All imports loaded successfully");
console.log("Color data count:", colorData?.length || 0);

// Initialize MVC components
console.log("Initializing MVC components...");

const colorModel = new ColorModel(colorData);
console.log("✅ ColorModel created");

const appState = new AppState(colorModel);
console.log("✅ AppState created");

const colorView = new ColorView(ELEMENT_IDS.COLOR_ACCORDION);
console.log("✅ ColorView created");

const colorController = new ColorController(colorModel, appState, colorView);
console.log("✅ ColorController created");

// Start the application
console.log("Starting application...");
colorController.init();
console.log("✅ Application initialized");
console.log("=== APP.JS COMPLETE ===");
