import { describe, expect, it } from "vitest";
import { addLocalDays, countChanges, formatHours, formatHoursFull, locationClock, prayerLabel, toLocalDateIso } from "../src/helpers";

describe("prayer clock", () => {
  it("keeps exact minute values despite binary floating point", () => {
    expect(formatHours(5 + 6 / 60)).toBe("05:06");
    expect(formatHours(4 + 36 / 60)).toBe("04:36");
    expect(formatHours(15 + 29 / 60)).toBe("15:29");
    expect(formatHoursFull(5 + 6 / 60)).toBe("05:06:00");
  });
  it("wraps midnight and renders missing values explicitly", () => {
    expect(formatHours(24)).toBe("00:00");
    expect(formatHours(-0.5)).toBe("23:30");
    expect(formatHours(Number.NaN)).toBe("--:--");
    expect(formatHoursFull(Number.POSITIVE_INFINITY)).toBe("--:--:--");
  });
  it("uses the chosen city day across UTC midnight and fractional offsets", () => {
    const clock = locationClock(new Date("2026-09-30T21:00:00Z"), 5.75);
    expect(toLocalDateIso(clock)).toBe("2026-10-01");
    expect(clock.getHours()).toBe(2);
    expect(clock.getMinutes()).toBe(45);
    expect(toLocalDateIso(locationClock(new Date("2026-10-01T01:00:00Z"), -5))).toBe("2026-09-30");
  });
  it("adds calendar days over month/year and leap-day boundaries", () => {
    expect(toLocalDateIso(addLocalDays(new Date(2026, 11, 31), 1))).toBe("2027-01-01");
    expect(toLocalDateIso(addLocalDays(new Date(2024, 1, 28), 1))).toBe("2024-02-29");
  });
});

describe("shared settings", () => {
  it("counts changed leaves without counting equivalent copies", () => {
    const saved = { location: { name: "Pekanbaru", timezone: 7 }, adjustments: { fajr: 0, asr: 0 } };
    expect(countChanges(saved, structuredClone(saved))).toBe(0);
    expect(countChanges(saved, { ...saved, location: { name: "Jakarta", timezone: 7 }, adjustments: { fajr: 2, asr: 0 } })).toBe(2);
  });
  it("localizes both calendar keys and display prayer names", () => {
    expect(prayerLabel("fajr", "Indonesia")).toBe("Subuh");
    expect(prayerLabel("Sunrise", "Indonesia")).toBe("Syuruq");
    expect(prayerLabel("isha", "English")).toBe("Isha");
  });
});
