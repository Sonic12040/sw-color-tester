/**
 * URL Parameter Utilities
 *
 * A centralized module for managing URL parameters in a consistent and reusable way.
 * Provides methods to get and set array-based URL parameters with automatic URL history management.
 */

export class URLParameterManager {
  /**
   * Get an array parameter from the URL
   * @param {string} paramName - The name of the URL parameter
   * @param {string} delimiter - The delimiter used to split the parameter value (default: ',')
   * @returns {string[]} Array of parameter values, or empty array if parameter doesn't exist
   */
  static getArrayParameter(paramName, delimiter = ",") {
    const params = new URLSearchParams(globalThis.location.search);
    const value = params.get(paramName);
    return value
      ? value.split(delimiter).filter((item) => item.trim() !== "")
      : [];
  }

  /**
   * Set an array parameter in the URL
   * @param {string} paramName - The name of the URL parameter
   * @param {string[]} values - Array of values to set
   * @param {string} delimiter - The delimiter used to join the parameter values (default: ',')
   * @param {boolean} replaceState - Whether to replace the current history state (default: true)
   */
  static setArrayParameter(
    paramName,
    values,
    delimiter = ",",
    replaceState = true
  ) {
    const params = new URLSearchParams(globalThis.location.search);

    if (values.length > 0) {
      // Filter out empty values and join with delimiter
      const filteredValues = values.filter(
        (value) => value && value.trim() !== ""
      );
      if (filteredValues.length > 0) {
        params.set(paramName, filteredValues.join(delimiter));
      } else {
        params.delete(paramName);
      }
    } else {
      params.delete(paramName);
    }

    const newUrl = `${globalThis.location.pathname}?${params.toString()}`;

    if (replaceState) {
      globalThis.history.replaceState({}, "", newUrl);
    } else {
      globalThis.history.pushState({}, "", newUrl);
    }
  }

  /**
   * Process an array parameter value
   * @private
   */
  static _processArrayParameter(params, key, value) {
    if (value.length === 0) {
      params.delete(key);
      return;
    }

    const filteredValues = value.filter((v) => v && v.toString().trim() !== "");

    if (filteredValues.length > 0) {
      params.set(key, filteredValues.join(","));
    } else {
      params.delete(key);
    }
  }

  /**
   * Process a scalar (non-array) parameter value
   * @private
   */
  static _processScalarParameter(params, key, value) {
    const stringValue = value.toString().trim();

    if (stringValue === "") {
      params.delete(key);
    } else {
      params.set(key, stringValue);
    }
  }

  /**
   * Batch update multiple parameters at once to avoid rapid History API calls
   * @param {Object} updates - Object with parameter updates
   * @param {boolean} replaceState - Whether to replace the current history state (default: true)
   */
  static batchUpdate(updates, replaceState = true) {
    const params = new URLSearchParams(globalThis.location.search);

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === undefined) {
        params.delete(key);
      } else if (Array.isArray(value)) {
        this._processArrayParameter(params, key, value);
      } else {
        this._processScalarParameter(params, key, value);
      }
    }

    const newUrl = `${globalThis.location.pathname}?${params.toString()}`;

    if (replaceState) {
      globalThis.history.replaceState({}, "", newUrl);
    } else {
      globalThis.history.pushState({}, "", newUrl);
    }
  }

  /**
   * Get a scalar parameter from the URL
   * @param {string} paramName - The name of the URL parameter
   * @returns {string|null} The parameter value, or null if not found
   */
  static getScalarParameter(paramName) {
    const params = new URLSearchParams(globalThis.location.search);
    return params.get(paramName);
  }

  /**
   * Set a scalar parameter in the URL
   * @param {string} paramName - The name of the URL parameter
   * @param {string|number|null} value - Value to set, or null to remove
   * @param {boolean} replaceState - Whether to replace the current history state (default: true)
   */
  static setScalarParameter(paramName, value, replaceState = true) {
    const params = new URLSearchParams(globalThis.location.search);

    if (value === null || value === undefined || value === "") {
      params.delete(paramName);
    } else {
      params.set(paramName, value.toString());
    }

    const newUrl = `${globalThis.location.pathname}?${params.toString()}`;

    if (replaceState) {
      globalThis.history.replaceState({}, "", newUrl);
    } else {
      globalThis.history.pushState({}, "", newUrl);
    }
  }
}
