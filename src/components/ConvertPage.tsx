import { createSignal, createEffect, For } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import {
  G_MONTHS_FULL_ID, G_MONTHS_FULL_EN,
  H_MONTHS_ID, H_MONTHS_EN,
  WEEKDAYS_ID, WEEKDAYS_EN
} from "../helpers";
import type { DateResult } from "../helpers";

interface ConvertPageProps {
  lang: string;
}

export function ConvertPage(props: ConvertPageProps) {
  // Current Gregorian input values
  const today = new Date();
  const [gDay, setGDay] = createSignal<number>(today.getDate());
  const [gMonth, setGMonth] = createSignal<number>(today.getMonth() + 1); // 1-indexed
  const [gYear, setGYear] = createSignal<number>(today.getFullYear());

  // Current Hijri input values (will be populated dynamically)
  const [hDay, setHDay] = createSignal<number>(1);
  const [hMonth, setHMonth] = createSignal<number>(1); // 1-indexed
  const [hYear, setHYear] = createSignal<number>(1447);

  // Adjustment offset
  const [offset, setOffset] = createSignal<number>(0);

  // Conversion output state
  const [convertedHijri, setConvertedHijri] = createSignal<DateResult | null>(null);
  const [convertedGregorian, setConvertedGregorian] = createSignal<DateResult | null>(null);

  // Trigger conversion Gregorian -> Hijri
  const convertGregToHijri = async () => {
    try {
      const res = await invoke<DateResult>("convert_gregorian_to_hijri", {
        year: gYear(),
        month: gMonth(),
        day: gDay(),
        adjustment: offset()
      });
      setConvertedHijri(res);
      // Sync the Hijri input selectors so they display this converted date
      setHDay(res.day);
      setHMonth(res.month);
      setHYear(res.year);
    } catch (e) {
      console.error("Gregorian to Hijri conversion failed:", e);
    }
  };

  // Trigger conversion Hijri -> Gregorian
  const convertHijriToGreg = async () => {
    try {
      const res = await invoke<DateResult>("convert_hijri_to_gregorian", {
        year: hYear(),
        month: hMonth(),
        day: hDay(),
        adjustment: offset()
      });
      setConvertedGregorian(res);
      // Sync the Gregorian input selectors so they display this converted date
      setGDay(res.day);
      setGMonth(res.month);
      setGYear(res.year);
    } catch (e) {
      console.error("Hijri to Gregorian conversion failed:", e);
    }
  };

  // Initial conversion on mount + re-run when Gregorian inputs or offset change
  createEffect(() => {
    // Track these signals so the effect re-runs on change
    gDay(); gMonth(); gYear(); offset();
    convertGregToHijri();
  });

  const handleGregChange = () => {
    convertGregToHijri();
  };

  const handleHijriChange = () => {
    convertHijriToGreg();
  };

  const handleSetToday = () => {
    const d = new Date();
    setGDay(d.getDate());
    setGMonth(d.getMonth() + 1);
    setGYear(d.getFullYear());
    convertGregToHijri();
  };

  // Helper arrays for options selection
  const daysArray = Array.from({ length: 31 }, (_, i) => i + 1);
  const hijriDaysArray = Array.from({ length: 30 }, (_, i) => i + 1);
  const gregYearsArray = Array.from({ length: 150 }, (_, i) => today.getFullYear() - 100 + i);
  const hijriYearsArray = Array.from({ length: 150 }, (_, i) => 1350 + i);

  const getGMonthName = (idx: number) => {
    return props.lang === "Indonesia" ? G_MONTHS_FULL_ID[idx - 1] : G_MONTHS_FULL_EN[idx - 1];
  };

  const getHMonthName = (idx: number) => {
    return props.lang === "Indonesia" ? H_MONTHS_ID[idx - 1] : H_MONTHS_EN[idx - 1];
  };

  const getWeekdayName = (wkday: number) => {
    return props.lang === "Indonesia" ? WEEKDAYS_ID[wkday - 1] : WEEKDAYS_EN[wkday - 1];
  };

  return (
    <div class="content-scroll animate-fade-in space-y-4 max-w-lg mx-auto">
      {/* Masehi -> Hijriah Converter Card */}
      <div class="card border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm space-y-4">
        <div class="flex justify-between items-center select-none">
          <h3 class="text-sm font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
            {props.lang === "Indonesia" ? "Masehi ➔ Hijriah" : "Gregorian ➔ Hijri"}
          </h3>
        </div>

        {/* Gregorian Date Fields */}
        <div class="space-y-1">
          <span class="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase select-none">
            {props.lang === "Indonesia" ? "Tanggal Masehi" : "Gregorian Date"}
          </span>
          <div class="grid grid-cols-3 gap-2">
            <select
              value={gDay()}
              onChange={(e) => {
                setGDay(parseInt(e.currentTarget.value));
                handleGregChange();
              }}
              class="date-select text-slate-800 dark:text-slate-200"
            >
              <For each={daysArray}>
                {(d) => <option value={d}>{d}</option>}
              </For>
            </select>
            <select
              value={gMonth()}
              onChange={(e) => {
                setGMonth(parseInt(e.currentTarget.value));
                handleGregChange();
              }}
              class="date-select text-slate-800 dark:text-slate-200"
            >
              <For each={daysArray.slice(0, 12)}>
                {(m) => <option value={m}>{getGMonthName(m)}</option>}
              </For>
            </select>
            <select
              value={gYear()}
              onChange={(e) => {
                setGYear(parseInt(e.currentTarget.value));
                handleGregChange();
              }}
              class="date-select text-slate-800 dark:text-slate-200"
            >
              <For each={gregYearsArray}>
                {(y) => <option value={y}>{y}</option>}
              </For>
            </select>
          </div>
        </div>

        {/* Direction Indicator */}
        <div class="convert-arrow select-none text-slate-400 font-semibold text-center text-lg py-1">
          ⇅
        </div>

        {/* Hijri Date Fields */}
        <div class="space-y-1">
          <span class="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase select-none">
            {props.lang === "Indonesia" ? "Tanggal Hijriah" : "Hijri Date"}
          </span>
          <div class="grid grid-cols-3 gap-2">
            <select
              value={hDay()}
              onChange={(e) => {
                setHDay(parseInt(e.currentTarget.value));
                handleHijriChange();
              }}
              class="date-select text-slate-800 dark:text-slate-200"
            >
              <For each={hijriDaysArray}>
                {(d) => <option value={d}>{d}</option>}
              </For>
            </select>
            <select
              value={hMonth()}
              onChange={(e) => {
                setHMonth(parseInt(e.currentTarget.value));
                handleHijriChange();
              }}
              class="date-select text-slate-800 dark:text-slate-200"
            >
              <For each={daysArray.slice(0, 12)}>
                {(m) => <option value={m}>{getHMonthName(m)}</option>}
              </For>
            </select>
            <select
              value={hYear()}
              onChange={(e) => {
                setHYear(parseInt(e.currentTarget.value));
                handleHijriChange();
              }}
              class="date-select text-slate-800 dark:text-slate-200"
            >
              <For each={hijriYearsArray}>
                {(y) => <option value={y}>{y}</option>}
              </For>
            </select>
          </div>
        </div>

        {/* Display Output Result Box */}
        {convertedHijri() && (
          <div class="result-box select-none border border-teal-200 dark:border-teal-950 bg-teal-50 dark:bg-teal-950/20 rounded-lg p-4 mt-3">
            <div class="result-day text-[10px] font-bold tracking-wider text-teal-600 dark:text-teal-400 uppercase">
              {props.lang === "Indonesia" ? "Kalkulasi Hari" : "Weekday"}
            </div>
            <div class="result-val text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {getWeekdayName(convertedHijri()!.weekday)}
            </div>
            <div class="text-xs text-slate-500 dark:text-slate-400 mt-1 select-none font-medium">
              {props.lang === "Indonesia"
                ? `${convertedHijri()!.day} ${getHMonthName(convertedHijri()!.month)} ${convertedHijri()!.year} H`
                : `${convertedHijri()!.day} ${getHMonthName(convertedHijri()!.month)} ${convertedHijri()!.year} AH`}
              {" · "}
              {props.lang === "Indonesia"
                ? `${gDay()} ${getGMonthName(gMonth())} ${gYear()} M`
                : `${gDay()} ${getGMonthName(gMonth())} ${gYear()} AD`}
            </div>
          </div>
        )}

        {/* Form Action Commands */}
        <div class="flex gap-2 select-none pt-2">
          <button
            onClick={handleSetToday}
            class="btn btn-secondary select-none text-xs font-semibold px-4 py-2"
          >
            {props.lang === "Indonesia" ? "Hari Ini" : "Today"}
          </button>
        </div>
      </div>

      {/* Adjustments offset Card */}
      <div class="card border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm space-y-3">
        <h4 class="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase select-none">
          {props.lang === "Indonesia" ? "Penyesuaian Tanggal" : "Date Calibration"}
        </h4>
        <div class="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 select-none">
          <span>{props.lang === "Indonesia" ? "Offset Hijriah:" : "Hijri Offset:"}</span>
          <select
            value={offset()}
            onChange={(e) => setOffset(parseInt(e.currentTarget.value))}
            class="date-select text-center select-none text-slate-800 dark:text-slate-200"
            style={{ width: "90px" }}
          >
            <option value={-1}>-1 {props.lang === "Indonesia" ? "hari" : "day"}</option>
            <option value={0}>0 {props.lang === "Indonesia" ? "hari" : "days"}</option>
            <option value={1}>+1 {props.lang === "Indonesia" ? "hari" : "day"}</option>
          </select>
          <span class="text-xs text-slate-400 dark:text-slate-500">
            {props.lang === "Indonesia" ? "(koreksi hilal rukyat)" : "(calibrates lunar visibility)"}
          </span>
        </div>
      </div>
    </div>
  );
}
