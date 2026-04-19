import { describe, expect, it } from "vitest";
import {
  getFallbackPhaseByLocalTime,
  getFallbackPhaseByTimeZone,
  getSkySnapshotByTimeZone,
  pickPoem,
  pickPoemAvoidRecent,
} from "./sunPhase";
import type { SkyPhase } from "./sunPhase";

describe("getFallbackPhaseByLocalTime", () => {
  it("returns noon for noon hour", () => {
    const date = new Date("2026-04-19T11:30:00");
    expect(getFallbackPhaseByLocalTime(date)).toBe("noon");
  });

  it("returns sunset for late afternoon boundary", () => {
    const date = new Date("2026-04-19T17:15:00");
    expect(getFallbackPhaseByLocalTime(date)).toBe("sunset");
  });
});

describe("getFallbackPhaseByTimeZone", () => {
  it("maps UTC instant to morning in Asia/Ho_Chi_Minh", () => {
    const date = new Date("2026-04-19T00:30:00Z");
    expect(getFallbackPhaseByTimeZone(date, "Asia/Ho_Chi_Minh")).toBe("morning");
  });

  it("falls back to local time when timezone is invalid", () => {
    const date = new Date("2026-04-19T11:30:00");
    expect(getFallbackPhaseByTimeZone(date, "Invalid/Timezone")).toBe("noon");
  });
});

describe("getSkySnapshotByTimeZone", () => {
  it("returns a fallback snapshot with null altitude", () => {
    const snapshot = getSkySnapshotByTimeZone(new Date("2026-04-19T00:30:00Z"), "Asia/Ho_Chi_Minh");
    expect(snapshot.source).toBe("fallback");
    expect(snapshot.altitudeDeg).toBeNull();
  });
});

describe("pickPoem", () => {
  const pool: Record<SkyPhase, string[]> = {
    night: ["n1", "n2"],
    dawn: ["d1"],
    morning: ["m1"],
    noon: ["nn1"],
    afternoon: ["a1"],
    sunset: ["s1"],
    dusk: ["dk1"],
  };

  it("picks deterministic poem by seed", () => {
    expect(pickPoem("night", pool, 3)).toBe("n2");
  });

  it("returns default fallback when pool empty", () => {
    const emptyPool = { ...pool, dusk: [] };
    expect(pickPoem("dusk", emptyPool, 1)).toContain("bầu trời");
  });
});

describe("pickPoemAvoidRecent", () => {
  const pool: Record<SkyPhase, string[]> = {
    night: ["n1", "n2", "n3"],
    dawn: ["d1"],
    morning: ["m1"],
    noon: ["nn1"],
    afternoon: ["a1"],
    sunset: ["s1"],
    dusk: ["dk1"],
  };

  it("skips recent poems when alternatives exist", () => {
    const picked = pickPoemAvoidRecent("night", pool, 0, ["n1", "n2"]);
    expect(picked).toBe("n3");
  });

  it("falls back to full pool when all options are recent", () => {
    const picked = pickPoemAvoidRecent("night", pool, 2, ["n1", "n2", "n3"]);
    expect(["n1", "n2", "n3"]).toContain(picked);
  });
});


