// Data-safety check for alphabetical connection sorting.
// Simulates exactly what the UI does: sort by label, then persist the new
// order as `priority`, then Download Backup → Import Backup. Asserts that
// ordering survives AND that no credential/field is lost in the process.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { sortConnectionsByLabel } from "@/app/(dashboard)/dashboard/providers/utils.js";

const originalDataDir = process.env.DATA_DIR;
let tempDir;
let db;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-sort-persist-"));
  process.env.DATA_DIR = tempDir;
  vi.resetModules();
  db = await import("@/lib/db/index.js");
  await db.initDb();
});

afterAll(() => {
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

// Mirror of the UI action: optimistic sort, then sequential priority writes.
async function sortAndPersist(connections, direction) {
  const sorted = sortConnectionsByLabel(connections, direction);
  for (let i = 0; i < sorted.length; i++) {
    await db.updateProviderConnection(sorted[i].id, { priority: i + 1 });
  }
  return sorted;
}

describe("alphabetical sort persists and survives backup", () => {
  it("writes priority in A-Z order and keeps every secret intact", async () => {
    const provider = "sort-provider";
    await db.createProviderConnection({
      provider, authType: "apikey", name: "Zulu", apiKey: "sk-zulu-secret",
      providerSpecificData: { baseUrl: "https://z.example", nodeName: "Zulu" },
    });
    await db.createProviderConnection({
      provider, authType: "apikey", name: "alpha", apiKey: "sk-alpha-secret",
    });
    await db.createProviderConnection({
      provider, authType: "apikey", name: "Mike", apiKey: "sk-mike-secret",
    });

    const before = await db.getProviderConnections({ provider });
    const sorted = await sortAndPersist(before, "az");

    const after = await db.getProviderConnections({ provider });
    expect(after.map((c) => c.name)).toEqual(["alpha", "Mike", "Zulu"]);
    expect(after.map((c) => c.priority)).toEqual([1, 2, 3]);

    // No secret or provider-specific field was dropped by the priority write.
    const zulu = after.find((c) => c.name === "Zulu");
    expect(zulu.apiKey).toBe("sk-zulu-secret");
    expect(zulu.providerSpecificData).toMatchObject({
      baseUrl: "https://z.example",
      nodeName: "Zulu",
    });
    expect(sorted.length).toBe(after.length);
  });

  it("order survives a full Download Backup → Import Backup round-trip", async () => {
    const provider = "sort-roundtrip";
    for (const name of ["Charlie", "alpha", "Bravo"]) {
      await db.createProviderConnection({
        provider, authType: "apikey", name, apiKey: `sk-${name}`,
      });
    }

    const before = await db.getProviderConnections({ provider });
    await sortAndPersist(before, "za"); // Z-A: Charlie, Bravo, alpha

    const backup = await db.exportDb();
    // The export is not array-sorted (Q2 = survives reimport, not file order);
    // what carries the order is each row's persisted `priority`.
    const exported = backup.providerConnections.filter((c) => c.provider === provider);
    const priorityOf = (name) => exported.find((c) => c.name === name).priority;
    expect(priorityOf("Charlie")).toBeLessThan(priorityOf("Bravo"));
    expect(priorityOf("Bravo")).toBeLessThan(priorityOf("alpha"));

    await db.importDb(backup);
    const restored = await db.getProviderConnections({ provider });
    expect(restored.map((c) => c.name)).toEqual(["Charlie", "Bravo", "alpha"]);
    expect(restored.find((c) => c.name === "alpha").apiKey).toBe("sk-alpha");
  });
});
