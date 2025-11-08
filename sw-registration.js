// sw-registration.js - Service Worker Registration and Update Handler

/**
 * Register service worker and handle updates
 */
if ("serviceWorker" in navigator) {
  let refreshing = false;

  // Reload page when new service worker takes control
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) {
      refreshing = true;
      console.log("[App] New service worker activated, reloading...");
      window.location.reload();
    }
  });

  // Register the service worker
  window.addEventListener("load", () => {
    // Use relative path for GitHub Pages subdirectory compatibility
    navigator.serviceWorker
      .register("./service-worker.js", {
        scope: "./",
      })
      .then((registration) => {
        console.log("✅ Service Worker registered:", registration.scope);
        console.log("[App] PWA is now available offline!");

        // Check for updates every hour
        setInterval(() => {
          console.log("[App] Checking for updates...");
          registration.update();
        }, 60 * 60 * 1000);

        // Listen for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          console.log("🔄 New service worker installing...");

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New version available
              console.log("📦 New version available!");
              showUpdateNotification(newWorker);
            }
          });
        });
      })
      .catch((error) => {
        console.error("❌ Service Worker registration failed:", error);
      });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener("message", (event) => {
      const { type, url, message, version, buildDate, environment } =
        event.data;

      if (type === "FILE_UPDATED") {
        console.log("📦 File updated:", url);
        console.log("   Version:", version);
        console.log("   Environment:", environment);

        // Show subtle notification for background updates
        showBackgroundUpdateNotification(url, version, environment);
      }
    });

    // Get and log current version
    getServiceWorkerVersion();
  });
}

/**
 * Get version info from service worker
 */
function getServiceWorkerVersion() {
  if (!navigator.serviceWorker.controller) {
    console.log("[App] No service worker controller yet");
    return;
  }

  const messageChannel = new MessageChannel();

  messageChannel.port1.onmessage = (event) => {
    const { version, buildDate, environment, basePath, cachedFiles } =
      event.data;
    console.log("📋 Service Worker Info:");
    console.log("   Version:", version);
    console.log("   Build Date:", buildDate);
    console.log("   Environment:", environment);
    console.log("   Base Path:", basePath || "(root)");
    console.log("   Cached Files:", cachedFiles);

    // Store in window for debugging
    globalThis.swVersion = {
      version,
      buildDate,
      environment,
      basePath,
      cachedFiles,
    };
  };

  navigator.serviceWorker.controller.postMessage({ type: "GET_VERSION" }, [
    messageChannel.port2,
  ]);
}

/**
 * Show notification when new service worker is available
 */
function showUpdateNotification(worker) {
  // Create notification element
  const notification = document.createElement("div");
  notification.id = "sw-update-notification";
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.25);
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 12px;
    animation: slideIn 0.3s ease-out;
    max-width: 400px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  const versionInfo = globalThis.swVersion?.version
    ? `<div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Current: ${globalThis.swVersion.version}</div>`
    : "";

  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <span style="font-size: 32px;">🎉</span>
      <div style="flex: 1;">
        <strong style="font-size: 16px; display: block;">New version available!</strong>
        ${versionInfo}
      </div>
    </div>
    <div style="display: flex; gap: 8px;">
      <button id="reload-btn" style="
        flex: 1;
        background: white;
        color: #667eea;
        border: none;
        padding: 10px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        transition: transform 0.2s;
      " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
        Update Now
      </button>
      <button id="dismiss-btn" style="
        background: rgba(255,255,255,0.2);
        color: white;
        border: 1px solid rgba(255,255,255,0.5);
        padding: 10px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.2s;
      " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
        Later
      </button>
    </div>
  `;

  document.body.appendChild(notification);

  // Handle reload button
  notification.querySelector("#reload-btn").addEventListener("click", () => {
    console.log("[App] User requested update");
    notification.innerHTML =
      '<div style="text-align: center; padding: 10px;">Updating...</div>';
    if (worker) {
      worker.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  });

  // Handle dismiss button
  notification.querySelector("#dismiss-btn").addEventListener("click", () => {
    console.log("[App] User dismissed update notification");
    notification.style.animation = "slideOut 0.3s ease-in";
    setTimeout(() => notification.remove(), 300);
  });

  // Auto-dismiss after 30 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.animation = "slideOut 0.3s ease-in";
      setTimeout(() => notification.remove(), 300);
    }
  }, 30000);
}

/**
 * Show subtle notification for background file updates
 */
function showBackgroundUpdateNotification(url, version, environment) {
  // Track which files we've already notified about
  if (!globalThis.notifiedFiles) {
    globalThis.notifiedFiles = new Set();
  }

  // Don't notify about the same file twice in one session
  if (globalThis.notifiedFiles.has(url)) {
    return;
  }

  globalThis.notifiedFiles.add(url);

  // Don't show notification on initial page load (first 5 seconds)
  if (!globalThis.pageLoadTime) {
    globalThis.pageLoadTime = Date.now();
  }

  const timeSinceLoad = Date.now() - globalThis.pageLoadTime;
  if (timeSinceLoad < 5000) {
    // Page just loaded, this is likely initial cache, not an update
    return;
  }

  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    z-index: 9999;
    font-size: 14px;
    animation: slideUp 0.3s ease-out;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    max-width: 350px;
  `;

  const filename = url.split("/").pop();
  const envBadge = environment
    ? `<span style="background: rgba(255,255,255,0.3); padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 8px;">${environment}</span>`
    : "";

  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 20px;">✨</span>
      <div style="flex: 1;">
        <strong>${filename}</strong> updated
        ${envBadge}
        ${
          version
            ? `<div style="font-size: 11px; opacity: 0.9; margin-top: 2px;">Version: ${version}</div>`
            : ""
        }
      </div>
    </div>
  `;

  document.body.appendChild(notification);

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    notification.style.animation = "slideDown 0.3s ease-in";
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// Add CSS animations
const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
  
  @keyframes slideUp {
    from {
      transform: translateY(100px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  @keyframes slideDown {
    from {
      transform: translateY(0);
      opacity: 1;
    }
    to {
      transform: translateY(100px);
      opacity: 0;
    }
  }
  
  /* Mobile responsive for update notifications */
  @media (max-width: 600px) {
    #sw-update-notification {
      left: 20px !important;
      right: 20px !important;
      top: auto !important;
      bottom: 20px !important;
      max-width: none !important;
    }
  }
`;
document.head.appendChild(style);

// Log PWA status
console.log("[App] PWA initialization script loaded");
if ("serviceWorker" in navigator) {
  console.log("[App] Service Worker supported ✅");
} else {
  console.warn("[App] Service Worker not supported ❌");
}

// Expose helpful debugging functions globally
globalThis.swDebug = {
  /**
   * Get current service worker version info
   */
  getVersion: async () => {
    if (!navigator.serviceWorker.controller) {
      console.warn("No active service worker");
      return null;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        console.table(event.data);
        resolve(event.data);
      };
      navigator.serviceWorker.controller.postMessage({ type: "GET_VERSION" }, [
        messageChannel.port2,
      ]);
    });
  },

  /**
   * Manually check for updates
   */
  checkUpdates: async () => {
    if (!navigator.serviceWorker.controller) {
      console.warn("No active service worker");
      return null;
    }

    console.log("🔍 Checking for updates...");
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        const { updatedFiles, error, version, environment } = event.data;

        if (error) {
          console.error("❌ Update check failed:", error);
          resolve({ error });
          return;
        }

        if (updatedFiles && updatedFiles.length > 0) {
          console.log(`✅ Found ${updatedFiles.length} updated file(s):`);
          console.table(updatedFiles);
          console.log(`Version: ${version} (${environment})`);
        } else {
          console.log(`✅ All files up to date`);
          console.log(`Version: ${version} (${environment})`);
        }

        resolve(event.data);
      };
      navigator.serviceWorker.controller.postMessage(
        { type: "CHECK_UPDATES" },
        [messageChannel.port2]
      );
    });
  },

  /**
   * Clear all caches (for debugging)
   */
  clearCache: async () => {
    if (!navigator.serviceWorker.controller) {
      console.warn("No active service worker");
      return null;
    }

    console.log("🗑️ Clearing cache...");
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          console.log("✅ Cache cleared! Reload the page to re-cache.");
        } else {
          console.error("❌ Failed to clear cache:", event.data.error);
        }
        resolve(event.data);
      };
      navigator.serviceWorker.controller.postMessage({ type: "CLEAR_CACHE" }, [
        messageChannel.port2,
      ]);
    });
  },

  /**
   * Force update to new service worker
   */
  forceUpdate: async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      console.warn("No service worker registration found");
      return;
    }

    console.log("🔄 Forcing service worker update...");
    await registration.update();
    console.log("✅ Update check complete");
  },
};

console.log(
  "💡 Tip: Use swDebug.getVersion(), swDebug.checkUpdates(), or swDebug.forceUpdate() to interact with the service worker"
);
