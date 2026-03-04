/**
 * StorageService — zero-dependency IndexedDB wrapper for persisting
 * custom room JSON payloads.
 *
 * All public methods are async and safe to call even when IndexedDB is
 * unavailable (e.g. private browsing in older Safari) — they resolve
 * gracefully with sensible defaults rather than throwing.
 *
 * Database: "sw-color-visualizer"
 * Object Store: "customRooms"  (keyPath: "room.id")
 */

const DB_NAME = "sw-color-visualizer";
const DB_VERSION = 1;
const STORE_NAME = "customRooms";

export class StorageService {
  /** @type {Promise<IDBDatabase>|null} Singleton DB connection promise */
  #dbPromise = null;

  // ────────────────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────────────────

  /**
   * Persist a custom room payload.
   * If a room with the same id already exists it is overwritten.
   *
   * @param {object} roomPayload — full Vector Scene Graph JSON
   *   (must contain `room.id`)
   * @returns {Promise<void>}
   */
  async saveRoom(roomPayload) {
    const db = await this.#open();
    if (!db) return;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(roomPayload);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Retrieve a single room payload by its id.
   *
   * @param {string} roomId
   * @returns {Promise<object|undefined>}
   */
  async getRoom(roomId) {
    const db = await this.#open();
    if (!db) return undefined;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(roomId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Return every stored custom room payload.
   *
   * @returns {Promise<object[]>}
   */
  async getAllRooms() {
    const db = await this.#open();
    if (!db) return [];

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Delete a single custom room by its id.
   *
   * @param {string} roomId
   * @returns {Promise<void>}
   */
  async deleteRoom(roomId) {
    const db = await this.#open();
    if (!db) return;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(roomId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Remove all stored custom rooms.
   *
   * @returns {Promise<void>}
   */
  async clearAll() {
    const db = await this.#open();
    if (!db) return;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ────────────────────────────────────────────────────────────
  // Private — DB lifecycle
  // ────────────────────────────────────────────────────────────

  /**
   * Open (or return the cached) IndexedDB connection.
   * Returns `null` when IndexedDB is not available.
   *
   * @returns {Promise<IDBDatabase|null>}
   */
  #open() {
    if (this.#dbPromise) return this.#dbPromise;

    this.#dbPromise = new Promise((resolve) => {
      if (typeof indexedDB === "undefined") {
        resolve(null);
        return;
      }

      let request;
      try {
        request = indexedDB.open(DB_NAME, DB_VERSION);
      } catch {
        // SecurityError in some private-browsing modes
        resolve(null);
        return;
      }

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "room.id" });
        }
      };

      request.onsuccess = () => resolve(request.result);

      request.onerror = () => {
        // Swallow — callers get null and use graceful fallbacks
        resolve(null);
      };
    });

    return this.#dbPromise;
  }
}
