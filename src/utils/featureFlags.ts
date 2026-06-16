export function isFeatureEnabled(flagName: string): boolean {
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + flagName + "=([^;]*)"),
  );
  return match ? match[1] === "1" : false;
}
