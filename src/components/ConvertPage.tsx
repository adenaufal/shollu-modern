import { createResource, createSignal, For, onMount, Show } from 'solid-js'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { Portal } from 'solid-js/web'
import type { DateResult } from '../helpers'
import { G_MONTHS_EN, G_MONTHS_FULL_EN, G_MONTHS_FULL_ID, G_MONTHS_ID, H_MONTHS_EN, H_MONTHS_ID, WEEKDAYS_EN, WEEKDAYS_ID } from '../helpers'
import { useAppState } from '../state'
import './utility-pages.css'

type Direction = 'gregorian' | 'hijri'
type GregorianDate = Pick<DateResult, 'year' | 'month' | 'day'>
interface ConvertRow extends GregorianDate { hijri: DateResult }
const gregorianMonths = (lang: string) => lang === 'Indonesia' ? G_MONTHS_FULL_ID : G_MONTHS_FULL_EN
const shortGregorianMonths = (lang: string) => lang === 'Indonesia' ? G_MONTHS_ID : G_MONTHS_EN
const hijriMonths = (lang: string) => lang === 'Indonesia' ? H_MONTHS_ID : H_MONTHS_EN
const weekdayOf = (date: GregorianDate, lang: string) => (lang === 'Indonesia' ? WEEKDAYS_ID : WEEKDAYS_EN)[new Date(date.year, date.month - 1, date.day).getDay()]
const julianDay = (date: GregorianDate) => Math.floor(Date.UTC(date.year, date.month - 1, date.day) / 86_400_000 + 2_440_587.5)

export function ConvertPage(props: { lang: string }) {
  const app = useAppState()
  const id = () => props.lang === 'Indonesia'
  const today = () => {
    const [year, month, day] = app.today().split('-').map(Number)
    return Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day)
      ? { year, month, day }
      : { year: new Date().getFullYear(), month: new Date().getMonth() + 1, day: new Date().getDate() }
  }
  const [direction, setDirection] = createSignal<Direction>('gregorian')
  const [gregorian, setGregorian] = createSignal<GregorianDate>(today())
  const [hijri, setHijri] = createSignal<DateResult>({ year: 1447, month: 1, day: 1, weekday: 1 })
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal('')
  const [tableError, setTableError] = createSignal('')
  let request = 0
  const offset = () => app.settings()?.hijri_adjustment ?? 0
  const validDate = (from: Direction, value: GregorianDate) => {
    if (![value.year, value.month, value.day].every(Number.isInteger) || value.year < 1 || value.year > 9999 || value.month < 1 || value.month > 12 || value.day < 1) return false
    return from === 'gregorian'
      ? value.day <= new Date(value.year, value.month, 0).getDate()
      : value.day <= 30
  }
  const runConversion = async (from: Direction, values: GregorianDate = from === 'gregorian' ? gregorian() : hijri()) => {
    if (!validDate(from, values)) {
      request++
      setLoading(false)
      setError(id() ? 'Masukkan tanggal kalender yang valid.' : 'Enter a valid calendar date.')
      return
    }
    const current = ++request
    setLoading(true)
    setError('')
    try {
      const converted = from === 'gregorian'
        ? await invoke<DateResult>('convert_gregorian_to_hijri', { ...values, adjustment: offset() })
        : await invoke<DateResult>('convert_hijri_to_gregorian', { ...values, adjustment: offset() })
      if (current !== request) return
      if (from === 'gregorian') setHijri(converted)
      else setGregorian(converted)
    } catch {
      if (current === request) setError(id() ? 'Tanggal tidak dapat dikonversi.' : 'Could not convert this date.')
    } finally { if (current === request) setLoading(false) }
  }
  const changeGregorian = (patch: Partial<GregorianDate>) => {
    const next = { ...gregorian(), ...patch }
    setGregorian(next); setDirection('gregorian'); void runConversion('gregorian', next)
  }
  const changeHijri = (patch: Partial<DateResult>) => {
    const next = { ...hijri(), ...patch }
    setHijri(next); setDirection('hijri'); void runConversion('hijri', next)
  }
  const setToday = () => { const next = today(); setGregorian(next); setDirection('gregorian'); void runConversion('gregorian', next) }
  const setOffset = async (value: number) => {
    try { await app.saveSettings({ hijri_adjustment: value }); void runConversion(direction()) }
    catch { setError(id() ? 'Koreksi gagal disimpan.' : 'Could not save the date adjustment.') }
  }
  const [monthRows, monthRowsActions] = createResource(
    () => `${gregorian().year}-${gregorian().month}-${offset()}`,
    async (source): Promise<ConvertRow[]> => {
      setTableError('')
      const [year, month] = source.split('-').map(Number)
      const count = new Date(year, month, 0).getDate()
      try {
        return await Promise.all(Array.from({ length: count }, async (_, index) => {
          const day = index + 1
          const hijriDate = await invoke<DateResult>('convert_gregorian_to_hijri', { year, month, day, adjustment: offset() })
          const gregorianDate = { year, month, day }
          return { ...gregorianDate, hijri: hijriDate }
        }))
      } catch {
        setTableError(id() ? 'Peta bulan gagal dimuat.' : 'Could not load the month map.')
        return []
      }
    },
  )
  const exportMonth = async () => {
    const rows = monthRows()
    if (!rows?.length) return
    const csv = ['Gregorian,Hijri,Weekday', ...rows.map(row => `${row.day} ${gregorianMonths(props.lang)[row.month - 1]} ${row.year},${row.hijri.day} ${hijriMonths(props.lang)[row.hijri.month - 1]} ${row.hijri.year},${weekdayOf(row, props.lang)}`)].join('\r\n')
    const defaultName = `shollu-calendar-${gregorian().year}-${String(gregorian().month).padStart(2, '0')}.csv`
    if (isTauri()) {
      try { await invoke('save_export_file', { defaultName, content: csv }) }
      catch { setTableError(id() ? 'Ekspor gagal disimpan.' : 'Could not save the export.') }
      return
    }
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url; link.download = defaultName; link.click()
    URL.revokeObjectURL(url)
  }
  onMount(() => { const date = today(); setGregorian(date); void runConversion('gregorian', date) })
  const years = Array.from({ length: 151 }, (_, i) => 1950 + i)
  const hijriYears = Array.from({ length: 151 }, (_, i) => 1350 + i)
  const weekday = () => weekdayOf(gregorian(), props.lang)
  const gregorianText = () => `${gregorian().day} ${gregorianMonths(props.lang)[gregorian().month - 1]} ${gregorian().year}`
  const hijriText = () => `${hijri().day} ${hijriMonths(props.lang)[hijri().month - 1]} ${hijri().year} H`
  const dateControls = () => <div class="date-pair">
    <section class={`u-card date-card ${direction() === 'gregorian' ? 'date-card-active' : ''}`}><div class="date-card-label">{id() ? 'Masehi' : 'Gregorian'}<span>G</span></div><div class="date-big"><strong>{gregorian().day}</strong><span>{gregorianMonths(props.lang)[gregorian().month - 1]}</span><small>{gregorian().year}</small></div><div class="date-selects"><select aria-label={id() ? 'Tanggal Masehi' : 'Gregorian day'} value={gregorian().day} onChange={e => changeGregorian({ day: Number(e.currentTarget.value) })}><For each={Array.from({ length: 31 }, (_, i) => i + 1)}>{day => <option value={day}>{day}</option>}</For></select><select aria-label={id() ? 'Bulan Masehi' : 'Gregorian month'} value={gregorian().month} onChange={e => changeGregorian({ month: Number(e.currentTarget.value) })}><For each={gregorianMonths(props.lang)}>{(month, i) => <option value={i() + 1}>{month}</option>}</For></select><select aria-label={id() ? 'Tahun Masehi' : 'Gregorian year'} value={gregorian().year} onChange={e => changeGregorian({ year: Number(e.currentTarget.value) })}><For each={years}>{year => <option value={year}>{year}</option>}</For></select></div></section>
    <button class="swap-button" onClick={() => { const next = direction() === 'gregorian' ? 'hijri' : 'gregorian'; setDirection(next); void runConversion(next) }} aria-label={id() ? 'Tukar arah konversi' : 'Swap conversion direction'} title={id() ? 'Tukar arah' : 'Swap direction'}>⇄</button>
    <section class={`u-card date-card hijri-card ${direction() === 'hijri' ? 'date-card-active' : ''}`}><div class="date-card-label">{id() ? 'Hijriah' : 'Hijri'}<span>H</span></div><div class="date-big"><strong>{hijri().day}</strong><span>{hijriMonths(props.lang)[hijri().month - 1]}</span><small>{hijri().year}</small></div><div class="date-selects"><select aria-label={id() ? 'Tanggal Hijriah' : 'Hijri day'} value={hijri().day} onChange={e => changeHijri({ day: Number(e.currentTarget.value) })}><For each={Array.from({ length: 30 }, (_, i) => i + 1)}>{day => <option value={day}>{day}</option>}</For></select><select aria-label={id() ? 'Bulan Hijriah' : 'Hijri month'} value={hijri().month} onChange={e => changeHijri({ month: Number(e.currentTarget.value) })}><For each={hijriMonths(props.lang)}>{(month, i) => <option value={i() + 1}>{month}</option>}</For></select><select aria-label={id() ? 'Tahun Hijriah' : 'Hijri year'} value={hijri().year} onChange={e => changeHijri({ year: Number(e.currentTarget.value) })}><For each={hijriYears}>{year => <option value={year}>{year}</option>}</For></select></div></section>
  </div>

  return <div class="utility-page convert-page" classList={{ 'layout-ringkas': app.layoutMode() === 'ringkas' }}>
    <Show when={app.layoutMode() === 'tenang'}><Portal mount={document.getElementById('page-actions')!}><button class="u-button" onClick={setToday}>{id() ? 'Hari ini' : 'Today'} · {app.today()}</button></Portal></Show>
    <Show when={app.layoutMode() === 'tenang'}><div class="converter-wrap">{dateControls()}<section class="conversion-result"><div><span class="result-label">{id() ? 'HARI' : 'DAY'}</span><strong>{loading() ? '···' : weekday()}</strong></div><div class="result-dates"><span>{gregorianText()}</span><span>{hijriText()}</span></div></section><section class="offset-control"><div><strong>{id() ? 'Koreksi awal bulan' : 'Month-start adjustment'}</strong><span>{id() ? 'Sesuaikan dengan rukyatul hilal setempat' : 'Align with local moon sighting'}</span></div><div class="offset-segments"><For each={[-1, 0, 1]}>{value => <button classList={{ selected: offset() === value }} aria-pressed={offset() === value} onClick={() => void setOffset(value)}>{value > 0 ? `+${value}` : value} {id() ? 'hari' : 'day'}</button>}</For></div></section><Show when={error()}><div class="u-alert error" role="alert">{error()}<button onClick={() => void runConversion(direction())}>{id() ? 'Coba lagi' : 'Retry'}</button></div></Show></div></Show>
    <Show when={app.layoutMode() === 'ringkas'}><div class="compact-converter"><div class="compact-converter-inputs">{dateControls()}</div><div class="compact-converter-body"><section class="u-card month-map"><div class="u-card-heading"><div><h3>{id() ? 'Peta bulan' : 'Month map'} · {gregorianMonths(props.lang)[gregorian().month - 1]} {gregorian().year}</h3><p>{id() ? 'Tanggal Masehi, Hijriah, dan hari' : 'Gregorian date, Hijri date, and weekday'}</p></div><button class="u-icon-button" onClick={exportMonth} disabled={!monthRows()?.length} aria-label={id() ? 'Ekspor bulan sebagai CSV' : 'Export month as CSV'} title={id() ? 'Ekspor CSV' : 'Export CSV'}>⇩</button></div><div class="month-map-head"><span>{id() ? 'Masehi' : 'Gregorian'}</span><span>{id() ? 'Hijriah' : 'Hijri'}</span><span>{id() ? 'Hari' : 'Day'}</span></div><div class="month-map-rows" aria-busy={monthRows.loading}><Show when={monthRows.loading}><div class="month-map-message">{id() ? 'Memuat peta bulan…' : 'Loading month map…'}</div></Show><Show when={!monthRows.loading && monthRows()?.length}><For each={monthRows()}>{row => <button class={`month-map-row ${row.day === gregorian().day ? 'selected' : ''}`} aria-pressed={row.day === gregorian().day} onClick={() => changeGregorian({ year: row.year, month: row.month, day: row.day })}><span>{row.day} {shortGregorianMonths(props.lang)[row.month - 1]} {row.year}</span><span>{row.hijri.day} {hijriMonths(props.lang)[row.hijri.month - 1]}</span><span>{weekdayOf(row, props.lang)}</span></button>}</For></Show><Show when={tableError()}><div class="month-map-message error">{tableError()} <button onClick={() => void monthRowsActions.refetch()}>{id() ? 'Coba lagi' : 'Retry'}</button></div></Show></div></section><aside class="u-card compact-converter-inspector"><div class="inspector-top"><div><p class="utility-kicker">{id() ? 'HASIL' : 'RESULT'}</p><h3>{weekday()}</h3></div></div><div class="compact-result-date"><span>{hijriText()}</span><span>{gregorianText()}</span><span>JD {julianDay(gregorian())}</span></div><div class="compact-offset"><p class="utility-kicker">{id() ? 'OFFSET HILAL' : 'MOON-SIGHTING OFFSET'}</p><div class="compact-offset-buttons"><For each={[-1, 0, 1]}>{value => <button classList={{ selected: offset() === value }} aria-pressed={offset() === value} onClick={() => void setOffset(value)}>{value > 0 ? `+${value}` : value}</button>}</For></div><p class="inspector-hint">{id() ? 'Kalibrasi rukyat lokal berlaku untuk seluruh peta bulan.' : 'Local sighting adjustment applies to the full month map.'}</p></div><div class="compact-inspector-actions"><button class="u-button" onClick={setToday}>{id() ? 'Hari ini' : 'Today'}</button><button class="u-button" onClick={exportMonth} disabled={!monthRows()?.length}>{id() ? 'Ekspor' : 'Export'}</button></div><Show when={error() || tableError()}><div class="u-alert error" role="alert">{error() || tableError()}</div></Show></aside></div></div></Show>
  </div>
}
