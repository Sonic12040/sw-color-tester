/**
 * Lightweight event emitter for decoupled pub/sub communication.
 */

export class EventEmitter {
  #listeners = new Map();

  /**
   * Subscribe to an event.
   * @param {string} event - Event name
   * @param {Function} listener - Callback to invoke
   * @returns {Function} Unsubscribe function
   */
  on(event, listener) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event).add(listener);
    return () => this.off(event, listener);
  }

  /**
   * Unsubscribe from an event.
   * @param {string} event - Event name
   * @param {Function} listener - Callback to remove
   */
  off(event, listener) {
    this.#listeners.get(event)?.delete(listener);
  }

  /**
   * Emit an event to all subscribers.
   * @param {string} event - Event name
   * @param {*} [data] - Optional payload
   */
  emit(event, data) {
    for (const listener of this.#listeners.get(event) ?? []) {
      listener(data);
    }
  }
}
