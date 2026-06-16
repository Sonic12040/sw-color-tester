export class EventEmitter {
  #listeners = new Map<string, Set<(data?: unknown) => void>>();

  on(event: string, listener: (data?: unknown) => void): () => void {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  off(event: string, listener: (data?: unknown) => void): void {
    this.#listeners.get(event)?.delete(listener);
  }

  emit(event: string, data?: unknown): void {
    for (const listener of this.#listeners.get(event) ?? []) {
      listener(data);
    }
  }
}
