import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Persistence writes to localStorage; clear it before each test so persisted
// favorites / hidden / sort from one test never leak into the next.
beforeEach(() => {
  localStorage.clear();
});

// Unmount React trees, drop any fake timers, and reset the anti-flash flag the
// gallery may set on <html> — so component/integration tests start clean.
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  delete document.documentElement.dataset.presort;
});

// jsdom doesn't implement matchMedia; the Atlas drawer reads it on open.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}
