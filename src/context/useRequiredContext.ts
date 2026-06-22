import { useContext, type Context } from "react";

/**
 * Read a context that must be used inside its provider, throwing a consistent
 * error otherwise. Centralizes the `useContext` + null-guard boilerplate every
 * context hook repeats.
 */
export function useRequiredContext<T>(
  context: Context<T | null>,
  hook: string,
  provider: string,
): T {
  const value = useContext(context);
  if (value === null) {
    throw new Error(`${hook} must be used inside <${provider}>`);
  }
  return value;
}
