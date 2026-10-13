import { describe, expect, it } from "vitest";
import { buildScheduleExport } from "../src/schedule-export";

const rows = [
  { iso: "2026-09-01", times: { fajr: 5 + 1 / 60, sunrise: 6, dhuhr: 12 + 3 / 60, asr: 15 + 9 / 60, maghrib: 18 + 7 / 60, isha: 19 + 3 / 60 } },
  { iso: "2026-09-02", times: { fajr: 5 + 1 / 60, sunrise: 5 + 59 / 60, dhuhr: 12 + 2 / 60, asr: 15 + 8 / 60, maghrib: 18 + 7 / 60, isha: 19 + 2 / 60 } },
];
const context = { yearMonth: "2026-09", monthTitle: "September 2026", location: "Pekanbaru <Riau>", lang: "Indonesia" };

describe("schedule export", () => {
  it("writes one CSV row per day with CRLF line endings", () => {
    const file = buildScheduleExport("csv", rows, context);
    expect(file.filename).toBe("Shollu-2026-09.csv");
    expect(file.content.split("\r\n")).toEqual([
      "Date,Fajr,Sunrise,Dhuhr,Asr,Maghrib,Isha",
      "2026-09-01,05:01,06:00,12:03,15:09,18:07,19:03",
      "2026-09-02,05:01,05:59,12:02,15:08,18:07,19:02",
    ]);
  });
  it("escapes the location and localizes headings in HTML", () => {
    const { content, type } = buildScheduleExport("html", rows, context);
    expect(type).toBe("text/html;charset=utf-8");
    expect(content).toContain("<p>Pekanbaru &lt;Riau&gt;</p>");
    expect(content).toContain("<th>Subuh</th>");
    expect(content).toContain("Jadwal Sholat · September 2026");
  });
  it("titles the TXT export with the month and location", () => {
    const lines = buildScheduleExport("txt", rows, { ...context, lang: "English" }).content.split("\n");
    expect(lines[0]).toBe("Prayer schedule · September 2026 · Pekanbaru <Riau>");
    expect(lines[2].startsWith("Date   Fajr")).toBe(true);
    expect(lines).toHaveLength(5);
  });
});
