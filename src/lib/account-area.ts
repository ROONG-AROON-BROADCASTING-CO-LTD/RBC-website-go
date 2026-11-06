export function accountAreaForPath(pathname: string) {
  const route = pathname.match(/^\/(?:th|en|zh)\/([^/]+)(?:\/|$)/)?.[1];
  if (route === "operations") return "operations";
  if (
    route &&
    ["partner", "partner-login", "partner-signup", "apply", "wizard"].includes(
      route,
    )
  ) {
    return "partner";
  }
  // partner-bookings is the customer's booking history, not a partner workspace.
  return "customer";
}
