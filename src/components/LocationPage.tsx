import { createSignal, onMount, For, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import type { AppSettings } from "../helpers";

interface LocationPageProps {
  lang: string;
}

interface City {
  id: number;
  region_id: number;
  region_name: string;
  name: string;
  latitude: number;
  longitude: number;
}

export function LocationPage(props: LocationPageProps) {
  const [settings, setSettings] = createSignal<AppSettings | null>(null);

  // Form field states
  const [areaName, setAreaName] = createSignal<string>("");
  const [latitude, setLatitude] = createSignal<number>(0.506567);
  const [longitude, setLongitude] = createSignal<number>(101.43779);
  const [altitude, setAltitude] = createSignal<number>(12);
  const [timezone, setTimezone] = createSignal<number>(7);
  const [method, setMethod] = createSignal<number>(2); // ISNA
  const [madhab, setMadhab] = createSignal<number>(1); // Shafii
  
  // Individual adjustments
  const [adjFajr, setAdjFajr] = createSignal<number>(0);
  const [adjSunrise, setAdjSunrise] = createSignal<number>(0);
  const [adjDhuhr, setAdjDhuhr] = createSignal<number>(0);
  const [adjAsr, setAdjAsr] = createSignal<number>(0);
  const [adjMaghrib, setAdjMaghrib] = createSignal<number>(0);
  const [adjIsha, setAdjIsha] = createSignal<number>(0);

  // Autocomplete search states
  const [searchQuery, setSearchQuery] = createSignal<string>("");
  const [searchResults, setSearchResults] = createSignal<City[]>([]);
  const [showDropdown, setShowDropdown] = createSignal<boolean>(false);

  // Load existing location settings on mount
  const loadLocationSettings = async () => {
    try {
      const res = await invoke<AppSettings>("get_settings");
      setSettings(res);
      
      setAreaName(res.location.name);
      setSearchQuery(res.location.name);
      setLatitude(res.location.latitude);
      setLongitude(res.location.longitude);
      setAltitude(res.location.altitude);
      setTimezone(res.location.timezone);
      
      setMethod(res.method);
      setMadhab(res.madhab);

      setAdjFajr(res.adjustments.fajr);
      setAdjSunrise(res.adjustments.sunrise);
      setAdjDhuhr(res.adjustments.dhuhr);
      setAdjAsr(res.adjustments.asr);
      setAdjMaghrib(res.adjustments.maghrib);
      setAdjIsha(res.adjustments.isha);
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  };

  onMount(() => {
    loadLocationSettings();
  });

  // Handle typing inside Area input box to trigger search
  const handleAreaInput = async (query: string) => {
    setSearchQuery(query);
    setAreaName(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    try {
      // Query rusqlite cities DB via Tauri B4 query layers
      const res = await invoke<City[]>("search_cities", { query: query.trim(), limit: 10 });
      setSearchResults(res);
      setShowDropdown(res.length > 0);
    } catch (e) {
      console.error("City search query failed:", e);
    }
  };

  // Click handler on selecting a city from autocomplete list
  const handleSelectCity = (city: City) => {
    setAreaName(city.name);
    setSearchQuery(city.name);
    setLatitude(city.latitude);
    setLongitude(city.longitude);
    // Standard Indonesian timezone offsets helper, can be overridden manually
    // Most cities from SPN parser default to correct coordinates.
    // Set typical timezone defaults based on longitude bounds:
    let tzOffset = 7; // WIB
    if (city.longitude >= 115 && city.longitude < 125) {
      tzOffset = 8; // WITA
    } else if (city.longitude >= 125) {
      tzOffset = 9; // WIT
    }
    setTimezone(tzOffset);
    
    setSearchResults([]);
    setShowDropdown(false);
  };

  // Save modified locations back to Settings persistence
  const handleSaveLocation = async () => {
    const currSettings = settings();
    if (!currSettings) return;

    const updated: AppSettings = {
      ...currSettings,
      location: {
        name: areaName().trim(),
        latitude: latitude(),
        longitude: longitude(),
        altitude: altitude(),
        timezone: timezone()
      },
      method: method(),
      madhab: madhab(),
      adjustments: {
        fajr: adjFajr(),
        sunrise: adjSunrise(),
        dhuhr: adjDhuhr(),
        asr: adjAsr(),
        maghrib: adjMaghrib(),
        isha: adjIsha()
      }
    };

    try {
      await invoke("save_settings", { settings: updated });
      setSettings(updated);
      alert(props.lang === "Indonesia" ? "Lokasi & Metode berhasil diperbarui!" : "Location & Calculation parameters successfully saved!");
    } catch (e) {
      console.error("Failed to save location settings:", e);
    }
  };

  const methodsList = [
    { id: 1, label: props.lang === "Indonesia" ? "Karachi (Univ. Ilmu Islam)" : "Karachi (Univ. of Islamic Science)" },
    { id: 2, label: "ISNA (North America)" },
    { id: 3, label: props.lang === "Indonesia" ? "MWL (Liga Dunia Islam)" : "MWL (Muslim World League)" },
    { id: 4, label: "Umm Al-Qura (Saudi Arabia)" },
    { id: 5, label: props.lang === "Indonesia" ? "Mesir (Survey Umum)" : "Egypt General Survey Authority" }
  ];

  return (
    <div class="content-scroll animate-fade-in space-y-4 max-w-lg mx-auto">
      
      {/* Area & Coordinates Card */}
      <div class="card border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm space-y-4">
        <h3 class="text-sm font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase select-none">
          {props.lang === "Indonesia" ? "Lokasi & Koordinat" : "Area & Coordinates"}
        </h3>

        {/* Autocomplete City Input */}
        <div class="field autocomplete-container select-none">
          <label class="field-label">{props.lang === "Indonesia" ? "Nama Wilayah / Kota" : "Area Name"}</label>
          <input
            type="text"
            placeholder={props.lang === "Indonesia" ? "Cari kota (misal: Pekanbaru)..." : "Search cities (e.g., Pekanbaru)..."}
            value={searchQuery()}
            onInput={(e) => handleAreaInput(e.currentTarget.value)}
            class="field-input text-slate-800 dark:text-slate-200"
          />
          
          {/* Autocomplete Dropdown List */}
          <Show when={showDropdown()}>
            <div class="autocomplete-dropdown border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <For each={searchResults()}>
                {(city) => (
                  <div
                    onClick={() => handleSelectCity(city)}
                    class="autocomplete-item hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200"
                  >
                    <span>{city.name}</span>
                    <span class="autocomplete-item-region text-slate-400 font-medium">
                      {city.region_name} ({city.longitude.toFixed(2)}°, {city.latitude.toFixed(2)}°)
                    </span>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* Coordinates Inputs Row */}
        <div class="field-row">
          <div class="field">
            <span class="field-label select-none">{props.lang === "Indonesia" ? "Lintang (Latitude)" : "Latitude"}</span>
            <input
              type="number"
              step="0.000001"
              value={latitude()}
              onInput={(e) => setLatitude(parseFloat(e.currentTarget.value))}
              class="field-input text-slate-800 dark:text-slate-200"
            />
          </div>
          <div class="field">
            <span class="field-label select-none">{props.lang === "Indonesia" ? "Bujur (Longitude)" : "Longitude"}</span>
            <input
              type="number"
              step="0.000001"
              value={longitude()}
              onInput={(e) => setLongitude(parseFloat(e.currentTarget.value))}
              class="field-input text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        {/* Altitude & Timezone Row */}
        <div class="field-row">
          <div class="field">
            <span class="field-label select-none">{props.lang === "Indonesia" ? "Ketinggian (m)" : "Altitude (m)"}</span>
            <input
              type="number"
              value={altitude()}
              onInput={(e) => setAltitude(parseFloat(e.currentTarget.value))}
              class="field-input text-slate-800 dark:text-slate-200"
            />
          </div>
          <div class="field">
            <span class="field-label select-none">{props.lang === "Indonesia" ? "Zona Waktu" : "Timezone Offset"}</span>
            <select
              value={timezone()}
              onChange={(e) => setTimezone(parseFloat(e.currentTarget.value))}
              class="date-select text-slate-800 dark:text-slate-200"
            >
              <option value={7}>UTC+07:00 (WIB)</option>
              <option value={8}>UTC+08:00 (WITA)</option>
              <option value={9}>UTC+09:00 (WIT)</option>
              <option value={0}>UTC+00:00 (GMT)</option>
              <option value={1}>UTC+01:00 (BST)</option>
              <option value={3.5}>UTC+03:30 (Tehran)</option>
              <option value={4}>UTC+04:00 (GST)</option>
              <option value={5.5}>UTC+05:30 (IST)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Calculation Methods Card */}
      <div class="card border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm space-y-3 select-none">
        <h3 class="text-sm font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase select-none">
          {props.lang === "Indonesia" ? "Metode Kalkulasi" : "Calculation Methods"}
        </h3>

        {/* List of Calculation Methods */}
        <div class="radio-list select-none">
          <For each={methodsList}>
            {(m) => (
              <div
                onClick={() => setMethod(m.id)}
                class={`radio-opt select-none ${method() === m.id ? "checked" : ""}`}
              >
                <div class="radio-circ" />
                <span class="text-slate-700 dark:text-slate-300 font-medium">{m.label}</span>
              </div>
            )}
          </For>
        </div>

        {/* Fiqh Madhab Selectors */}
        <div class="flex items-center gap-4 pt-2 select-none border-t border-slate-100 dark:border-slate-800/40">
          <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase select-none">
            {props.lang === "Indonesia" ? "Kalkulasi Asar (Mazhab)" : "Fiqh Madhab (Asr)"}
          </span>
          <div
            onClick={() => setMadhab(1)}
            class={`radio-opt select-none ${madhab() === 1 ? "checked" : ""}`}
          >
            <div class="radio-circ" />
            <span class="text-xs text-slate-700 dark:text-slate-300 font-semibold select-none">Shafi'i (Maliki, Hanbali)</span>
          </div>
          <div
            onClick={() => setMadhab(2)}
            class={`radio-opt select-none ${madhab() === 2 ? "checked" : ""}`}
          >
            <div class="radio-circ" />
            <span class="text-xs text-slate-700 dark:text-slate-300 font-semibold select-none">Hanafi</span>
          </div>
        </div>
      </div>

      {/* Adjustments offset Card */}
      <div class="card border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm space-y-3 select-none">
        <h3 class="text-sm font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase select-none">
          {props.lang === "Indonesia" ? "Koreksi Waktu (Menit)" : "Adjustments (Minutes)"}
        </h3>

        {/* Grid of offset adjusters */}
        <div class="field-row-3 select-none">
          <div class="field">
            <span class="field-label text-center select-none">Fajr</span>
            <input
              type="number"
              value={adjFajr()}
              onInput={(e) => setAdjFajr(parseInt(e.currentTarget.value))}
              class="field-input text-center select-none text-slate-800 dark:text-slate-200"
            />
          </div>
          <div class="field">
            <span class="field-label text-center select-none">Sunrise</span>
            <input
              type="number"
              value={adjSunrise()}
              onInput={(e) => setAdjSunrise(parseInt(e.currentTarget.value))}
              class="field-input text-center select-none text-slate-800 dark:text-slate-200"
            />
          </div>
          <div class="field">
            <span class="field-label text-center select-none">Dhuhr</span>
            <input
              type="number"
              value={adjDhuhr()}
              onInput={(e) => setAdjDhuhr(parseInt(e.currentTarget.value))}
              class="field-input text-center select-none text-slate-800 dark:text-slate-200"
            />
          </div>
          <div class="field">
            <span class="field-label text-center select-none">Asr</span>
            <input
              type="number"
              value={adjAsr()}
              onInput={(e) => setAdjAsr(parseInt(e.currentTarget.value))}
              class="field-input text-center select-none text-slate-800 dark:text-slate-200"
            />
          </div>
          <div class="field">
            <span class="field-label text-center select-none">Maghrib</span>
            <input
              type="number"
              value={adjMaghrib()}
              onInput={(e) => setAdjMaghrib(parseInt(e.currentTarget.value))}
              class="field-input text-center select-none text-slate-800 dark:text-slate-200"
            />
          </div>
          <div class="field">
            <span class="field-label text-center select-none">Isha</span>
            <input
              type="number"
              value={adjIsha()}
              onInput={(e) => setAdjIsha(parseInt(e.currentTarget.value))}
              class="field-input text-center select-none text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Form Action Controls */}
      <div class="flex justify-end pt-2 select-none pb-8">
        <button
          onClick={handleSaveLocation}
          class="btn btn-primary select-none text-xs font-semibold px-6 py-2 shadow"
        >
          {props.lang === "Indonesia" ? "Simpan Lokasi" : "Save Location"}
        </button>
      </div>

    </div>
  );
}
