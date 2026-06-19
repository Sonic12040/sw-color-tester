import { beforeEach } from "vitest";

// Persistence writes to localStorage; clear it before each test so persisted
// favorites / hidden / lrv from one test never leak into the next.
beforeEach(() => {
  localStorage.clear();
});
