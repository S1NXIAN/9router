export const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "none", label: "No connection" },
];

// noAuth providers (e.g. free proxies) are always usable even though they
// never have a stored connection record, so they never fall into "none".
export function getConnectionStatus(stats, isNoAuth = false) {
  if (isNoAuth) return "active";
  if (!stats || stats.total === 0) return "none";
  return stats.allDisabled ? "inactive" : "active";
}

export function matchesStatusFilter(statusFilter, stats, isNoAuth = false) {
  if (statusFilter === "all") return true;
  return getConnectionStatus(stats, isNoAuth) === statusFilter;
}

// Sort key = the label the connection row already shows (name → email → displayName),
// so the alphabetical order always agrees with what the user sees.
export function getConnectionSortLabel(connection) {
  return (
    connection?.name?.trim() ||
    connection?.email?.trim() ||
    connection?.displayName?.trim() ||
    ""
  );
}

// Returns a new array — never mutates the input. `direction` is "az" or "za".
export function sortConnectionsByLabel(connections, direction) {
  const sign = direction === "za" ? -1 : 1;
  return [...(connections || [])].sort(
    (a, b) =>
      sign * getConnectionSortLabel(a).localeCompare(getConnectionSortLabel(b)),
  );
}
