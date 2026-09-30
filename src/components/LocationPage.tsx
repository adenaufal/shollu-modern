import { createEffect, createResource, createSignal, For, onCleanup, onMount, Show } from 'solid-js'
import { invoke } from '@tauri-apps/api/core'
import { Portal } from 'solid-js/web'
import { calculationKey, computeTimes, useAppState } from '../state'
import { formatHours, prayerLabel, toLocalDateIso } from '../helpers'
import './utility-pages.css'

interface City {
  id: number
  region_id: number
  region_name: string
  name: string
  latitude: number
  longitude: number
}

const methods = [
  ['Karachi (Univ. Ilmu Islam)', 'Karachi (Univ. of Islamic Science)'],
  ['ISNA (Amerika Utara)', 'ISNA (North America)'],
  ['Liga Dunia Islam (MWL)', 'Muslim World League (MWL)'],
  ['Umm Al-Qura (Arab Saudi)', 'Umm Al-Qura (Saudi Arabia)'],
  ['Otoritas Survei Mesir', 'Egyptian General Authority of Survey'],
]
const timeNames = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
const timezones = Array.from({ length: 105 }, (_, i) => i / 4 - 12)
const timezoneLabel = (offset: number) => offset.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
const displayMethods = [
  { setting: 2, method: 1, code: 'ISNA', detail: 'North America · 15° / 15°' },
  { setting: 1, method: 0, code: 'Karachi', detail: 'Univ. of Islamic Science · 18° / 18°' },
  { setting: 3, method: 2, code: 'MWL', detail: 'Muslim World League · 18° / 17°' },
  { setting: 4, method: 3, code: 'Umm Al-Qura', detail: 'Saudi Arabia · 18.5° / 90 min' },
  { setting: 5, method: 4, code: 'Egypt', detail: 'General Survey Authority · 19.5° / 17.5°' },
]

export function LocationPage(props: { lang: string }) {
  const app = useAppState()
  const id = () => props.lang === 'Indonesia'
  const [query, setQuery] = createSignal('')
  const [results, setResults] = createSignal<City[]>([])
  const [searching, setSearching] = createSignal(false)
  const [error, setError] = createSignal('')
  const [previewError, setPreviewError] = createSignal('')
  const [saving, setSaving] = createSignal(false)
  const [saveError, setSaveError] = createSignal('')
  let previewRequest = 0
  let searchTimer: ReturnType<typeof setTimeout> | undefined
  let requestId = 0
  let searchInitialized = false
  onCleanup(() => { if (searchTimer) clearTimeout(searchTimer) })
  const handleSave = () => { void save() }
  onMount(() => window.addEventListener('shollu-save', handleSave))
  onCleanup(() => window.removeEventListener('shollu-save', handleSave))

  const draft = () => app.draftSettings()
  const location = () => draft()?.location
  createEffect(() => {
    const name = location()?.name
    if (!searchInitialized && name) { setQuery(name); searchInitialized = true }
  })
  const previewDate = () => {
    const active = app.settings()
    const baseOffset = active?.location.timezone ?? location()?.timezone ?? 0
    const offset = location()?.timezone ?? baseOffset
    return toLocalDateIso(new Date(app.now().getTime() + (offset - baseOffset) * 3_600_000))
  }
  const [preview] = createResource(
    () => {
      const settings = draft()
      return settings ? `${calculationKey(settings)}|${previewDate()}` : undefined
    },
    async (source) => {
      const settings = draft()
      if (!settings || !source) return null
      const currentRequest = ++previewRequest
      setPreviewError('')
      const date = source.slice(source.lastIndexOf('|') + 1)
      const loc = settings.location
      const values = [loc.latitude, loc.longitude, loc.altitude, loc.timezone]
      const adjustmentsValid = Object.values(settings.adjustments).every(Number.isFinite)
      if (!loc.name.trim() || !values.every(Number.isFinite) || loc.latitude < -90 || loc.latitude > 90 || loc.longitude < -180 || loc.longitude > 180 || loc.altitude < -500 || loc.altitude > 10000 || loc.timezone < -12 || loc.timezone > 14 || !adjustmentsValid) {
        if (currentRequest === previewRequest) setPreviewError(id() ? 'Periksa nilai lokasi untuk melihat pratinjau.' : 'Check the location values to calculate this preview.')
        return null
      }
      try { return await computeTimes(settings, date) }
      catch {
        if (currentRequest === previewRequest) setPreviewError(id() ? 'Pratinjau waktu sholat gagal dihitung.' : 'Could not calculate the prayer-time preview.')
        return null
      }
    },
  )
  const patchLocation = (patch: Partial<NonNullable<ReturnType<typeof location>>>) => {
    const current = location()
    if (current) app.updateDraft({ location: { ...current, ...patch } })
  }
  const search = (value: string) => {
    setQuery(value)
    setResults([])
    if (searchTimer) clearTimeout(searchTimer)
    const current = ++requestId
    if (value.trim().length < 2) { setSearching(false); return }
    setSearching(true)
    searchTimer = setTimeout(async () => {
      try {
        const cities = await invoke<City[]>('search_cities', { query: value.trim(), limit: 8 })
        if (current === requestId) setResults(cities)
      } catch {
        if (current === requestId) setError(id() ? 'Pencarian kota gagal.' : 'City search failed.')
      } finally {
        if (current === requestId) setSearching(false)
      }
    }, 250)
  }
  const selectCity = (city: City) => {
    const current = location()
    if (!current) return
    app.updateDraft({ location: { ...current, name: city.name, latitude: city.latitude, longitude: city.longitude } })
    setQuery(city.name)
    setResults([])
    setError('')
  }
  const save = async () => {
    const settings = draft()
    const loc = location()
    if (!settings || !loc) return
    setError('')
    setSaveError('')
    if (!loc.name.trim() || ![loc.latitude, loc.longitude, loc.altitude, loc.timezone].every(Number.isFinite) || loc.latitude < -90 || loc.latitude > 90 || loc.longitude < -180 || loc.longitude > 180 || loc.altitude < -500 || loc.altitude > 10000 || loc.timezone < -12 || loc.timezone > 14) {
      setError(id() ? 'Periksa nama, koordinat, ketinggian (-500–10.000 m), dan zona waktu.' : 'Check the name, coordinates, altitude (-500–10,000 m), and timezone.')
      return
    }
    setSaving(true)
    try { await app.saveDraft() }
    catch { setSaveError(id() ? 'Gagal menyimpan. Coba lagi.' : 'Could not save. Try again.') }
    finally { setSaving(false) }
  }
  const time = (value?: number) => value == null || !Number.isFinite(value) ? '—' : formatHours(value)
  const largestShift = () => {
    const current = app.todayTimes()
    const next = preview()
    if (!current || !next) return null
    return timeNames.map(name => Math.round((next[name] - current[name]) * 60)).reduce((largest, value) => Math.abs(value) > Math.abs(largest) ? value : largest, 0)
  }
  const cityPicker = (withLabel = true) => <div class="u-field autocomplete-field"><Show when={withLabel}><label for="location-city">{id() ? 'Kota / wilayah' : 'City'}</label></Show><input id="location-city" value={query()} onInput={e => search(e.currentTarget.value)} placeholder={id() ? 'Cari kota…' : 'Search city…'} autocomplete="off"/><Show when={searching()}><small class="field-hint">{id() ? 'Mencari…' : 'Searching…'}</small></Show><Show when={results().length}><div class="city-results"><For each={results()}>{city => <button onClick={() => selectCity(city)}><strong>{city.name}</strong><span>{city.region_name} · {city.latitude.toFixed(3)}, {city.longitude.toFixed(3)}</span></button>}</For></div></Show></div>
  const timezoneSelect = (inputId: string) => <select id={inputId} value={location()?.timezone ?? 7} onChange={e => patchLocation({ timezone: Number(e.currentTarget.value) })}><For each={timezones}>{offset => <option value={offset}>UTC{offset >= 0 ? '+' : ''}{timezoneLabel(offset)}</option>}</For></select>
  const coordinates = () => <>
    <div class="u-field-grid"><div class="u-field"><label for="location-latitude">{id() ? 'Lintang' : 'Latitude'}</label><div class="input-suffix"><input id="location-latitude" type="number" min="-90" max="90" step="0.000001" value={location()?.latitude ?? ''} onInput={e => patchLocation({ latitude: e.currentTarget.value === '' ? Number.NaN : Number(e.currentTarget.value) })}/><span>° N/S</span></div></div><div class="u-field"><label for="location-longitude">{id() ? 'Bujur' : 'Longitude'}</label><div class="input-suffix"><input id="location-longitude" type="number" min="-180" max="180" step="0.000001" value={location()?.longitude ?? ''} onInput={e => patchLocation({ longitude: e.currentTarget.value === '' ? Number.NaN : Number(e.currentTarget.value) })}/><span>° E/W</span></div></div></div>
    <div class="u-field-grid"><div class="u-field"><label for="location-altitude">{id() ? 'Ketinggian' : 'Altitude'}</label><div class="input-suffix"><input id="location-altitude" type="number" min="-500" max="10000" step="1" value={location()?.altitude ?? ''} onInput={e => patchLocation({ altitude: e.currentTarget.value === '' ? Number.NaN : Number(e.currentTarget.value) })}/><span>m</span></div></div><div class="u-field"><label for="location-timezone">{id() ? 'Zona waktu' : 'Timezone'}</label>{timezoneSelect('location-timezone')}</div></div>
  </>
  const compactRows = () => <div class="location-inline-rows"><div class="location-inline-row"><label for="location-city">{id() ? 'Kota' : 'City'}</label>{cityPicker(false)}</div><div class="location-inline-row"><label for="location-latitude-compact">{id() ? 'Lintang' : 'Latitude'}</label><input id="location-latitude-compact" type="number" min="-90" max="90" step="0.000001" value={location()?.latitude ?? ''} onInput={e => patchLocation({ latitude: e.currentTarget.value === '' ? Number.NaN : Number(e.currentTarget.value) })}/></div><div class="location-inline-row"><label for="location-longitude-compact">{id() ? 'Bujur' : 'Longitude'}</label><input id="location-longitude-compact" type="number" min="-180" max="180" step="0.000001" value={location()?.longitude ?? ''} onInput={e => patchLocation({ longitude: e.currentTarget.value === '' ? Number.NaN : Number(e.currentTarget.value) })}/></div><div class="location-inline-row"><label for="location-altitude-compact">{id() ? 'Ketinggian' : 'Altitude'}</label><input id="location-altitude-compact" type="number" min="-500" max="10000" step="1" value={location()?.altitude ?? ''} onInput={e => patchLocation({ altitude: e.currentTarget.value === '' ? Number.NaN : Number(e.currentTarget.value) })}/></div><div class="location-inline-row"><label for="location-timezone-compact">{id() ? 'Zona waktu' : 'Timezone'}</label>{timezoneSelect('location-timezone-compact')}</div></div>
  const adjustmentFields = () => <div class="adjustment-grid"><div class="adjustment-title">{id() ? 'Koreksi waktu · menit' : 'Adjustments · minutes'}</div><For each={timeNames}>{name => <label for={`adjust-${name}`}>{prayerLabel(name, props.lang)}<input id={`adjust-${name}`} type="number" min="-60" max="60" value={draft()?.adjustments[name] ?? 0} onInput={e => app.updateDraft({ adjustments: { ...draft()!.adjustments, [name]: e.currentTarget.value === '' ? Number.NaN : Number(e.currentTarget.value) } })}/></label>}</For></div>
  const methodRadios = () => <div class="method-radio-list" role="radiogroup" aria-label={id() ? 'Metode perhitungan' : 'Calculation method'}><For each={displayMethods}>{item => <button type="button" role="radio" aria-checked={draft()?.method === item.setting} class={`method-radio-card ${draft()?.method === item.setting ? 'selected' : ''}`} onClick={() => app.updateDraft({ method: item.setting })}><i/><span><strong>{id() ? methods[item.method][0] : methods[item.method][1]}</strong><small>{item.detail}</small></span></button>}</For></div>
  const methodSegments = () => <div class="location-method-segments" role="radiogroup" aria-label={id() ? 'Metode perhitungan' : 'Calculation method'}><For each={displayMethods}>{item => <button type="button" role="radio" aria-checked={draft()?.method === item.setting} classList={{ selected: draft()?.method === item.setting }} title={id() ? methods[item.method][0] : methods[item.method][1]} onClick={() => app.updateDraft({ method: item.setting })}>{item.code}</button>}</For></div>

  return <div class="utility-page location-page" classList={{ 'layout-ringkas': app.layoutMode() === 'ringkas' }}>
    <Show when={app.layoutMode() === 'tenang'}><Portal mount={document.getElementById('page-actions')!}><div class="heading-actions"><Show when={previewError()} fallback={<Show when={largestShift() !== null}><span class="location-delta">{id() ? 'Pergeseran waktu' : 'Times shift by'} <strong>{largestShift()! > 0 ? '+' : ''}{largestShift()}m</strong></span></Show>}><span class="location-delta error" title={previewError()}>{id() ? 'Pratinjau tidak tersedia' : 'Preview unavailable'}</span></Show><button class="u-button" onClick={() => { app.revertDraft(); setQuery(draft()?.location.name ?? '') }}>{id() ? 'Urungkan' : 'Revert'}</button><button class="u-button primary" onClick={save} disabled={saving() || app.dirtyCount() === 0}>{saving() ? (id() ? 'Menyimpan…' : 'Saving…') : (id() ? 'Simpan' : 'Save')}</button></div></Portal></Show>
    <Show when={app.layoutMode() === 'tenang'} fallback={<div class="location-layout compact-location-layout">
      <div class="compact-location-main"><section class="u-card location-form compact-location-card"><div class="u-card-heading"><div><p class="utility-kicker">{id() ? 'TEMPAT' : 'PLACE'}</p><h3>{location()?.name}</h3></div></div>{compactRows()}</section>
        <section class="u-card calculation-card compact-calculation-card"><div class="u-card-heading"><div><p class="utility-kicker">{id() ? 'METODE' : 'METHOD'}</p><h3>{id() ? 'Metode perhitungan' : 'Calculation method'}</h3></div></div>{methodSegments()}<div class="madhab-choice"><span>{id() ? 'Mazhab Ashar' : 'Asr madhab'}</span><div><button classList={{ selected: draft()?.madhab === 1 }} aria-pressed={draft()?.madhab === 1} onClick={() => app.updateDraft({ madhab: 1 })}>Shafi'i</button><button classList={{ selected: draft()?.madhab === 2 }} aria-pressed={draft()?.madhab === 2} onClick={() => app.updateDraft({ madhab: 2 })}>Hanafi</button></div></div>{adjustmentFields()}</section>
      </div>
      <aside class="location-inspector"><div class="compact-location-inspector"><div class="u-card-heading"><div><p class="utility-kicker">{id() ? 'PRATINJAU LANGSUNG · HARI INI' : 'LIVE PREVIEW · TODAY'}</p><h3>{location()?.name}</h3><p>{previewDate()} · UTC{(location()?.timezone ?? 0) >= 0 ? '+' : ''}{timezoneLabel(location()?.timezone ?? 0)}</p></div></div><div class="inspector-prayer-list"><For each={timeNames}>{name => <div><span>{prayerLabel(name, props.lang)}</span><strong>{time(preview()?.[name])}</strong></div>}</For></div><Show when={previewError()}><p class="u-alert error" role="alert">{previewError()}</p></Show><p class="inspector-hint">{id() ? 'Pratinjau berubah saat nilai lokasi dan metode diedit.' : 'Preview recalculates as location and method values change.'}</p></div><div class="compact-location-actions"><Show when={app.dirtyCount() > 0}><span>{app.dirtyCount()} {id() ? 'perubahan' : 'changes'}</span></Show><div><button class="u-button" onClick={() => { app.revertDraft(); setQuery(draft()?.location.name ?? '') }}>{id() ? 'Urungkan' : 'Revert'}</button><button class="u-button primary" onClick={save} disabled={saving() || app.dirtyCount() === 0}>{saving() ? '…' : <>{id() ? 'Simpan' : 'Save'} <kbd>⌘S</kbd></>}</button></div></div></aside>
    </div>}>
      <div class="location-layout tenang-location-layout"><div class="location-editor tenang-location-editor"><section class="u-card location-form"><div class="u-card-heading"><div><p class="utility-kicker">{id() ? 'TEMPAT' : 'PLACE'}</p><h3>{id() ? 'Tempat' : 'Place'}</h3></div></div>{cityPicker()}{coordinates()}</section><section class="u-card calculation-card adjustment-card">{adjustmentFields()}</section></div><section class="u-card calculation-card method-card"><div class="u-card-heading"><div><p class="utility-kicker">{id() ? 'METODE PERHITUNGAN' : 'CALCULATION METHOD'}</p><h3>{id() ? 'Metode perhitungan' : 'Calculation method'}</h3></div></div>{methodRadios()}<div class="madhab-choice"><span>{id() ? 'Mazhab Ashar' : 'Asr madhab'}</span><div><button classList={{ selected: draft()?.madhab === 1 }} aria-pressed={draft()?.madhab === 1} onClick={() => app.updateDraft({ madhab: 1 })}>Shafi'i</button><button classList={{ selected: draft()?.madhab === 2 }} aria-pressed={draft()?.madhab === 2} onClick={() => app.updateDraft({ madhab: 2 })}>Hanafi</button></div></div></section></div>
    </Show>
    <Show when={error() || saveError()}><div class="u-alert error" role="alert">{error() || saveError()}</div></Show>
  </div>
}
