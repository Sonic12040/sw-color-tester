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
      const { type, url, message } = event.data;

      if (type === "FILE_UPDATED") {
        console.log("📦 File updated:", url);

        // Show subtle notification for background updates
        showBackgroundUpdateNotification(url);
      }
    });
  });
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
    background: #0066cc;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    display: flex;
    gap: 12px;
    align-items: center;
    animation: slideIn 0.3s ease-out;
    max-width: 400px;
  `;

  notification.innerHTML = `
    <span style="flex: 1;">🎉 New version available!</span>
    <button id="reload-btn" style="
      background: white;
      color: #0066cc;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
    ">Update Now</button>
    <button id="dismiss-btn" style="
      background: transparent;
      color: white;
      border: 1px solid white;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    ">Later</button>
  `;

  document.body.appendChild(notification);

  // Handle reload button
  notification.querySelector("#reload-btn").addEventListener("click", () => {
    console.log("[App] User requested update");
    if (worker) {
      worker.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  });

  // Handle dismiss button
  notification.querySelector("#dismiss-btn").addEventListener("click", () => {
    console.log("[App] User dismissed update notification");
    notification.remove();
  });

  // Auto-dismiss after 30 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 30000);
}

/**
 * Show subtle notification for background file updates
 */
function showBackgroundUpdateNotification(url) {
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
    background: #28a745;
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    z-index: 9999;
    font-size: 14px;
    animation: slideUp 0.3s ease-out;
  `;

  const filename = url.split("/").pop();
  notification.textContent = `✨ ${filename} updated in background`;

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
`;
document.head.appendChild(style);

// Log PWA status
console.log("[App] PWA initialization script loaded");
if ("serviceWorker" in navigator) {
  console.log("[App] Service Worker supported ✅");
} else {
  console.warn("[App] Service Worker not supported ❌");
}
