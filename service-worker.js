// service-worker.js - PWA Service Worker with Smart Caching
// GitHub Pages compatible with automatic base path detection

const CACHE_VERSION = "v1.4.0";
const CACHE_NAME = `sw-colors-${CACHE_VERSION}`;

// Auto-detect base path for GitHub Pages vs local development
const isGitHubPages = globalThis.location.hostname.includes("github.io");
const BASE_PATH = isGitHubPages ? "/sw-color-tester" : "";

console.log("[SW] Base path:", BASE_PATH || "(root)");

// Files to cache
const STATIC_ASSETS = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/styles.css`,
  `${BASE_PATH}/app.js`,
  `${BASE_PATH}/models/ColorModel.js`,
  `${BASE_PATH}/models/AppState.js`,
  `${BASE_PATH}/views/ColorView.js`,
  `${BASE_PATH}/controllers/ColorController.js`,
  `${BASE_PATH}/utils/config.js`,
  `${BASE_PATH}/utils/templates.js`,
  `${BASE_PATH}/utils/url-parameter-utilities.js`,
  `${BASE_PATH}/manifest.json`,
];

// Large file that needs special handling
const LARGE_ASSETS = [`${BASE_PATH}/constants.js`];

// All assets combined
const ALL_ASSETS = [...STATIC_ASSETS, ...LARGE_ASSETS];

// Hash map to track file versions (etags or last-modified dates)
// Limited to prevent memory leaks
const MAX_FILE_VERSIONS = 100;
let fileVersions = {};

// Request deduplication - prevent duplicate simultaneous requests
const pendingRequests = new Map();

// Network timeout configuration
const NETWORK_TIMEOUT = 10000; // 10 seconds

// ============================================
// INSTALL EVENT - Called when SW is first registered
// ============================================
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker version", CACHE_VERSION);

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Caching static assets...");
        // Cache static assets immediately
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Cache large assets separately (non-blocking)
        console.log("[SW] Pre-caching large assets...");
        return caches.open(CACHE_NAME).then((cache) => {
          return Promise.all(
            LARGE_ASSETS.map((url) =>
              fetch(url)
                .then((response) => {
                  if (response.ok) {
                    // Store version info
                    const etag = response.headers.get("etag");
                    const lastModified = response.headers.get("last-modified");
                    fileVersions[url] = { etag, lastModified };

                    console.log(
                      `[SW] Cached ${url} (${
                        etag || lastModified || "no version"
                      })`
                    );
                    return cache.put(url, response);
                  }
                })
                .catch((err) =>
                  console.error(`[SW] Failed to cache ${url}:`, err)
                )
            )
          );
        });
      })
      .then(() => {
        console.log("[SW] Install complete, activating immediately");
        // Force activation immediately
        return globalThis.skipWaiting();
      })
  );
});

// ============================================
// ACTIVATE EVENT - Clean up old caches
// ============================================
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker version", CACHE_VERSION);

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        // Delete old caches
        return Promise.all(
          cacheNames
            .filter(
              (name) => name.startsWith("sw-colors-") && name !== CACHE_NAME
            )
            .map((name) => {
              console.log("[SW] Deleting old cache:", name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log("[SW] Activation complete, taking control");
        // Take control of all pages immediately
        return globalThis.clients.claim();
      })
  );
});

// ============================================
// FETCH EVENT - Intercept network requests
// ============================================
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle requests to our own origin
  if (url.origin !== self.location.origin) {
    return;
  }

  // Only handle requests in our scope
  if (BASE_PATH && !url.pathname.startsWith(BASE_PATH)) {
    return;
  }

  // Different strategies based on file type
  if (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith("/")
  ) {
    // Stale-while-revalidate for code files
    event.respondWith(staleWhileRevalidate(request));
  } else if (
    url.pathname.includes("icon") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg")
  ) {
    // Cache-first for images (they rarely change)
    event.respondWith(cacheFirst(request));
  } else {
    // Network-first for everything else
    event.respondWith(networkFirst(request));
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Fetch with timeout to prevent hanging requests
 */
function fetchWithTimeout(request, timeout) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Network timeout")), timeout)
    ),
  ]);
}

/**
 * Retry fetch with exponential backoff
 */
async function fetchWithRetry(request, maxRetries = 2) {
  let lastError;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await fetchWithTimeout(request, NETWORK_TIMEOUT);
      return response;
    } catch (error) {
      lastError = error;
      if (i < maxRetries) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, delay));
        console.log(
          `[SW] Retrying ${request.url} (attempt ${i + 2}/${maxRetries + 1})`
        );
      }
    }
  }
  throw lastError;
}

/**
 * Cleanup old file versions to prevent memory leak
 */
function cleanupFileVersions() {
  const keys = Object.keys(fileVersions);
  if (keys.length > MAX_FILE_VERSIONS) {
    // Remove oldest entries (simple FIFO)
    const toRemove = keys.slice(0, keys.length - MAX_FILE_VERSIONS);
    for (const key of toRemove) {
      delete fileVersions[key];
    }
    console.log(`[SW] Cleaned up ${toRemove.length} old file version entries`);
  }
}

// ============================================
// CACHING STRATEGIES
// ============================================

/**
 * Stale-While-Revalidate Strategy
 * 1. Return cached version immediately (fast)
 * 2. Fetch from network in background
 * 3. Update cache with fresh version
 * 4. Notify clients if content changed
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // Check if there's already a pending request for this URL
  const requestKey = request.url;
  if (pendingRequests.has(requestKey)) {
    // Return the existing promise to avoid duplicate requests
    return cachedResponse || pendingRequests.get(requestKey);
  }

  // Fetch from network in background with timeout
  const fetchPromise = fetchWithTimeout(request, NETWORK_TIMEOUT)
    .then(async (networkResponse) => {
      // Handle 304 Not Modified - no body to process
      if (networkResponse.status === 304) {
        console.log("[SW] File not modified (304):", request.url);
        return cachedResponse || networkResponse;
      }

      if (networkResponse.ok) {
        // Check if content actually changed
        const hasChanged = await hasFileChanged(
          request.url,
          networkResponse.clone()
        );

        if (hasChanged) {
          console.log("[SW] File updated:", request.url);

          // Update cache
          cache.put(request, networkResponse.clone());

          // Notify all clients about the update
          notifyClients({
            type: "FILE_UPDATED",
            url: request.url,
            message: "New version available",
          });
        }

        return networkResponse;
      }
      return cachedResponse || networkResponse;
    })
    .catch((error) => {
      console.error("[SW] Fetch failed:", request.url, error);
      return cachedResponse;
    })
    .finally(() => {
      // Clean up pending request
      pendingRequests.delete(requestKey);
    });

  // Store pending request
  pendingRequests.set(requestKey, fetchPromise);

  // Return cached response immediately if available
  return cachedResponse || fetchPromise;
}

/**
 * Cache-First Strategy
 * Good for static assets that rarely change
 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error("[SW] Cache-first fetch failed:", request.url, error);
    // Return a minimal fallback
    return new Response("Offline - Resource not cached", { status: 503 });
  }
}

/**
 * Network-First Strategy
 * Good for dynamic content
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error("[SW] Network-first fetch failed:", request.url, error);
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response("Offline", { status: 503 });
  }
}

// ============================================
// UPDATE DETECTION
// ============================================

/**
 * Check if file has changed by comparing ETags, Last-Modified headers, or content hash
 * Returns: true if changed, false if not changed or error
 */
async function hasFileChanged(url, newResponse) {
  // Validate response
  if (!newResponse?.ok) {
    console.warn(
      "[SW] Invalid response for change detection:",
      url,
      newResponse?.status
    );
    return false;
  }

  const oldVersion = fileVersions[url];
  const newEtag = newResponse.headers.get("etag");
  const newLastModified = newResponse.headers.get("last-modified");

  // Strategy 1: Use ETags if available (most reliable)
  if (newEtag && oldVersion?.etag) {
    const changed = oldVersion.etag !== newEtag;
    if (changed) {
      updateFileVersion(url, { etag: newEtag, lastModified: newLastModified });
    }
    return changed;
  }

  // Strategy 2: Use Last-Modified if available
  if (newLastModified && oldVersion?.lastModified) {
    const changed = oldVersion.lastModified !== newLastModified;
    if (changed) {
      updateFileVersion(url, { etag: newEtag, lastModified: newLastModified });
    }
    return changed;
  }

  // Strategy 3: First time seeing this file with headers
  if ((newEtag || newLastModified) && !oldVersion) {
    updateFileVersion(url, { etag: newEtag, lastModified: newLastModified });
    return false; // Don't notify on first cache
  }

  // Strategy 4: Fall back to content hash comparison
  try {
    const newContent = await newResponse.clone().text();
    const newHash = await simpleHash(newContent);

    if (!oldVersion?.hash) {
      // First time with hash - store but don't trigger update
      updateFileVersion(url, {
        etag: newEtag,
        lastModified: newLastModified,
        hash: newHash,
      });
      return false;
    }

    const changed = oldVersion.hash !== newHash;
    if (changed) {
      updateFileVersion(url, {
        etag: newEtag,
        lastModified: newLastModified,
        hash: newHash,
      });
    }
    return changed;
  } catch (error) {
    console.error("[SW] Error comparing content:", error);
    return false; // Fail safely
  }
}

/**
 * Update file version with cleanup
 */
function updateFileVersion(url, versionData) {
  fileVersions[url] = versionData;
  cleanupFileVersions();
}

/**
 * Simple hash function for content comparison
 */
async function simpleHash(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Notify all clients (browser tabs) of updates
 */
async function notifyClients(message) {
  const clients = await globalThis.clients.matchAll({ type: "window" });
  for (const client of clients) {
    client.postMessage(message);
  }
}

// ============================================
// MESSAGE HANDLER - Receive commands from page
// ============================================
globalThis.addEventListener("message", (event) => {
  // Basic origin validation for cross-origin messages
  if (event.origin && event.origin !== globalThis.location.origin) {
    console.warn("[SW] Message from different origin ignored:", event.origin);
    return;
  }

  const { type } = event.data || {};

  switch (type) {
    case "SKIP_WAITING":
      // Force update to new service worker
      console.log("[SW] SKIP_WAITING requested");
      globalThis.skipWaiting();
      break;

    case "CHECK_UPDATES":
      // Manually check for updates
      console.log("[SW] Checking for updates...");
      checkAllUpdates()
        .then((updatedFiles) => {
          event.ports?.[0]?.postMessage({ updatedFiles });
        })
        .catch((error) => {
          console.error("[SW] Update check failed:", error);
          event.ports?.[0]?.postMessage({ error: error.message });
        });
      break;

    case "CLEAR_CACHE":
      // Clear all caches (for debugging)
      console.log("[SW] Clearing cache...");
      caches
        .delete(CACHE_NAME)
        .then(() => {
          event.ports?.[0]?.postMessage({ success: true });
        })
        .catch((error) => {
          console.error("[SW] Cache clear failed:", error);
          event.ports?.[0]?.postMessage({
            success: false,
            error: error.message,
          });
        });
      break;

    default:
      console.log("[SW] Unknown message type:", type);
  }
});

/**
 * Check all cached files for updates with retry logic
 */
async function checkAllUpdates() {
  const updatedFiles = [];
  const failedFiles = [];

  for (const url of ALL_ASSETS) {
    try {
      const response = await fetchWithRetry(
        new Request(url, { cache: "no-cache" }),
        2
      );

      if (response.ok) {
        const hasChanged = await hasFileChanged(url, response);
        if (hasChanged) {
          updatedFiles.push(url);
          const cache = await caches.open(CACHE_NAME);
          await cache.put(url, response);
          console.log("[SW] Updated cache for:", url);
        }
      } else {
        console.warn(
          "[SW] Update check got bad response:",
          url,
          response.status
        );
        failedFiles.push({ url, status: response.status });
      }
    } catch (error) {
      console.error("[SW] Update check failed for:", url, error.message);
      failedFiles.push({ url, error: error.message });
    }
  }

  if (updatedFiles.length > 0) {
    console.log("[SW] Updates found:", updatedFiles);
  } else {
    console.log("[SW] No updates found");
  }

  if (failedFiles.length > 0) {
    console.warn("[SW] Failed to check:", failedFiles);
  }

  return updatedFiles;
}

console.log("[SW] Service worker script loaded");
