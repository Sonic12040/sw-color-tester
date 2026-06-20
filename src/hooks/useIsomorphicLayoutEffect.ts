import { useEffect, useLayoutEffect } from "react";

/**
 * `useLayoutEffect` on the client, `useEffect` on the server.
 *
 * Layout effects run synchronously after commit but **before the browser
 * paints**, so state they set is reflected in the first visible frame (no
 * flash). On the server `useLayoutEffect` is a no-op that warns, so we fall back
 * to `useEffect` there.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
