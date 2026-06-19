import { beforeEach, vi } from "vitest";

// Persistence writes to localStorage; clear it before each test so persisted
// favorites / hidden / lrv from one test never leak into the next.
beforeEach(() => {
  localStorage.clear();
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
