// Alphabetical A-Z / Z-A sorting of provider connections.
// Seam: the pure helpers in dashboard/providers/utils.js — the same functions
// the provider detail page uses to decide the persisted priority order.
import { describe, it, expect } from "vitest";
import {
  getConnectionSortLabel,
  sortConnectionsByLabel,
} from "@/app/(dashboard)/dashboard/providers/utils.js";

const conn = (over) => ({ id: over.id, ...over });

describe("getConnectionSortLabel — matches the label the row displays", () => {
  it("prefers name, then email, then displayName", () => {
    expect(getConnectionSortLabel({ name: "Prod", email: "a@b.c", displayName: "Friendly" })).toBe("Prod");
    expect(getConnectionSortLabel({ name: "  ", email: "a@b.c", displayName: "Friendly" })).toBe("a@b.c");
    expect(getConnectionSortLabel({ email: "", displayName: "Friendly" })).toBe("Friendly");
  });

  it("returns empty string when nothing is set (never throws)", () => {
    expect(getConnectionSortLabel({})).toBe("");
    expect(getConnectionSortLabel(null)).toBe("");
  });
});

describe("sortConnectionsByLabel — A-Z / Z-A", () => {
  const input = [
    conn({ id: "1", name: "Charlie" }),
    conn({ id: "2", name: "alpha" }),
    conn({ id: "3", name: "Bravo" }),
  ];

  it("A-Z is case-insensitive and does not mutate the input", () => {
    const snapshot = JSON.stringify(input);
    const out = sortConnectionsByLabel(input, "az");
    expect(out.map((c) => c.id)).toEqual(["2", "3", "1"]);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("Z-A is the exact reverse order", () => {
    expect(sortConnectionsByLabel(input, "za").map((c) => c.id)).toEqual(["1", "3", "2"]);
  });

  it("falls back to email/displayName so every row has a stable key", () => {
    const mixed = [
      conn({ id: "a", email: "zeta@x.com" }),
      conn({ id: "b", displayName: "Alpha" }),
      conn({ id: "c", name: "mid" }),
    ];
    expect(sortConnectionsByLabel(mixed, "az").map((c) => c.id)).toEqual(["b", "c", "a"]);
  });
});
