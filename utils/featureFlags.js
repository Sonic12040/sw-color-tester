/**
 * Checks if a feature flag is enabled via a cookie.
 * Usage: document.cookie = "visualizer=1";
 *
 * @param {string} flagName - The name of the feature flag (cookie key)
 * @returns {boolean} True if the flag is enabled (cookie value is '1'), false otherwise
 */
export function isFeatureEnabled(flagName) {
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + flagName + "=([^;]*)"),
  );
  return match ? match[1] === "1" : false;
}

/**
 * Returns an object with all known feature flags and their enabled status.
 * Add new flags to the array below as needed.
 */
export function getFeatureFlags() {
  const flags = [
    "visualizer",
    // Add more feature flag names here as needed
  ];
  return Object.fromEntries(flags.map((f) => [f, isFeatureEnabled(f)]));
}
