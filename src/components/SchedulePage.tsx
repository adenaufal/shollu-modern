import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount, untrack } from 'solid-js'
import { Portal } from 'solid-js/web'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { formatHours, G_MONTHS_FULL_EN, G_MONTHS_FULL_ID, G_DAYS_EN, G_DAYS_ID, prayerLabel, PRAYER_NAMES, WEEKDAYS_EN, WEEKDAYS_ID, toLocalDateIso } from '../helpers'
import type { DateResult, PrayerTimes } from '../helpers'
import { calculationKey, computeTimes, useAppState } from '../state'
import { QiblaCompass } from './QiblaCompass'
import { ChevronLeftIcon, ChevronRightIcon } from './Icons'
import './prayer-pages.css'

type DayRecord = { iso: string; times: PrayerTimes; hijri: DateResult | null }
const KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
const localIso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function SchedulePage(props: { lang?: string }) {
  const app = useAppState()
  const lang = () => props.lang ?? app.lang()
  const id = () => lang() === 'Indonesia'
  const todayIso = () => app.today() || toLocalDateIso()
  const [month, setMonth] = createSignal(`${todayIso().slice(0, 7)}-01`)
  const [records, setRecords] = createSignal<DayRecord[]>([])
  const [selected, setSelected] = createSignal(todayIso())
  const [loading, setLoading] = createSignal(false)
  const [pendingExport, setPendingExport] = createSignal<'csv' | 'html' | 'txt' | null>(null)
  let request = 0
  const yearMonth = () => month().slice(0, 7)
  const [year, monthNum] = [() => Number(yearMonth().slice(0, 4)), () => Number(yearMonth().slice(5, 7))]
  const monthTitle = () => `${(id() ? G_MONTHS_FULL_ID : G_MONTHS_FULL_EN)[monthNum() - 1]} ${year()}`
  const monthDates = createMemo(() => {
    const first = new Date(year(), monthNum() - 1, 1)
    const start = new Date(year(), monthNum() - 1, 1 - first.getDay())
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return localIso(d) })
  })
  const recordByDate = (iso: string) => records().find(item => item.iso === iso)
  const selectedRecord = () => recordByDate(selected())
  const weekday = (iso: string) => new Date(`${iso}T12:00:00`).getDay()
  const dateText = (iso: string, style: 'full' | 'short' = 'full') => new Intl.DateTimeFormat(id() ? 'id-ID' : 'en-US', style === 'full' ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${iso}T12:00:00`))

  const loadMonth = async (activeSettings: NonNullable<ReturnType<typeof app.settings>>) => {
    const index = ++request
    const dates = monthDates()
    setLoading(true)
    try {
      const loaded = await Promise.all(dates.map(async iso => {
        const [times, hijri] = await Promise.all([
          computeTimes(activeSettings, iso),
          invoke<DateResult>('convert_gregorian_to_hijri', { year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)), day: Number(iso.slice(8, 10)), adjustment: activeSettings.hijri_adjustment ?? 0 }).catch(() => null),
        ])
        return { iso, times, hijri }
      }))
      if (index === request) setRecords(loaded)
    } catch (error) {
      if (index === request) app.notify(id() ? 'Jadwal bulan ini gagal dimuat.' : 'Could not load this month’s schedule.', 'error')
    } finally { if (index === request) setLoading(false) }
  }

  const settingsKey = createMemo(() => {
    const settings = app.settings()
    return settings ? `${calculationKey(settings)}:${settings.hijri_adjustment ?? 0}` : ''
  })
  createEffect(() => {
    const key = settingsKey()
    const currentMonth = month()
    const snapshot = untrack(app.settings)
    if (key && snapshot && currentMonth) void loadMonth(snapshot)
  })
  const shiftMonth = (offset: number) => {
    const next = new Date(year(), monthNum() - 1 + offset, 1)
    const iso = localIso(next)
    setMonth(iso)
    setSelected(`${iso.slice(0, 7)}-01`)
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return
    if (event.key === 'ArrowLeft') { event.preventDefault(); shiftMonth(-1) }
    else if (event.key === 'ArrowRight') { event.preventDefault(); shiftMonth(1) }
  }
  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
  const download = (content: string, filename: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }))
    const link = document.createElement('a')
    link.href = url; link.download = filename; link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const saveExport = async (content: string, filename: string, type: string) => {
    try {
      if (isTauri()) {
        const saved = await invoke<boolean>('save_export_file', { defaultName: filename, content })
        if (!saved) return
      } else download(content, filename, type)
    } catch (cause) { app.notify(String(cause), 'error') }
  }
  const exportCsv = () => {
    const monthList = monthRecords()
    if (!monthList.length) { setPendingExport('csv'); return }
    const lines = [['Date', ...PRAYER_NAMES].join(',')]
    for (const row of monthList) lines.push([row.iso, ...KEYS.map(key => formatHours(row.times[key]))].join(','))
    void saveExport(lines.join('\r\n'), `Shollu-${yearMonth()}.csv`, 'text/csv;charset=utf-8')
  }
  const exportTxt = () => {
    const lines = [`${id() ? 'Jadwal Sholat' : 'Prayer schedule'} · ${monthTitle()} · ${app.settings()?.location.name ?? ''}`, '', `${id() ? 'Tanggal' : 'Date'}   ${PRAYER_NAMES.map(x => x.padEnd(9)).join(' ')}`]
    for (const row of records().filter(x => x.iso.startsWith(yearMonth()))) lines.push(`${row.iso}   ${KEYS.map(key => formatHours(row.times[key]).padEnd(9)).join(' ')}`)
    if (!monthRecords().length) { setPendingExport('txt'); return }
    void saveExport(lines.join('\n'), `Shollu-${yearMonth()}.txt`, 'text/plain;charset=utf-8')
  }
  const exportHtml = () => {
    const monthList = monthRecords()
    if (!monthList.length) { setPendingExport('html'); return }
    const rows = monthList.map(row => `<tr><td>${row.iso}</td>${KEYS.map(k => `<td>${formatHours(row.times[k])}</td>`).join('')}</tr>`).join('')
    const title = escapeHtml(monthTitle())
    const location = escapeHtml(app.settings()?.location.name ?? '')
    const html = `<!doctype html><html lang="${id() ? 'id' : 'en'}"><meta charset="utf-8"><title>Shollu · ${title}</title><style>body{font:14px system-ui;margin:40px;color:#25343a}h1{font-size:22px}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:8px;border-bottom:1px solid #ddd;font-variant-numeric:tabular-nums}th{background:#f5f8f8}button{margin:0 0 18px;padding:8px 12px;border:1px solid #ccd6d8;background:white;border-radius:6px;cursor:pointer}@media print{button{display:none}body{margin:0}}</style><h1>${id() ? 'Jadwal Sholat' : 'Prayer schedule'} · ${title}</h1><p>${location}</p><button onclick="window.print()">${id() ? 'Cetak' : 'Print'}</button><table><thead><tr><th>Date</th>${PRAYER_NAMES.map(n => `<th>${escapeHtml(prayerLabel(n, lang()))}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></html>`
    void saveExport(html, `Shollu-${yearMonth()}.html`, 'text/html;charset=utf-8')
  }
  const monthRecords = () => records().filter(x => x.iso.startsWith(yearMonth()))
  const nextPrayer = () => {
    const times = app.todayTimes()
    if (!times) return { index: 0, hour: 0 }
    const now = app.now(); const sec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
    for (const index of [0, 2, 3, 4, 5]) if (sec < times[KEYS[index]] * 3600) return { index, hour: times[KEYS[index]] }
    return { index: 0, hour: (app.tomorrowTimes()?.fajr ?? times.fajr) + 24 }
  }
  const nextCountdown = () => {
    const now = app.now()
    const seconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
    const delta = Math.max(0, Math.floor(nextPrayer().hour * 3600 - seconds))
    return `${String(Math.floor(delta / 3600)).padStart(2, '0')}:${String(Math.floor(delta % 3600 / 60)).padStart(2, '0')}:${String(delta % 60).padStart(2, '0')}`
  }
  const exportButtons = () => <div class="schedule-exports"><button class="btn btn-secondary" onClick={exportCsv}>CSV</button><button class="btn btn-secondary" onClick={exportHtml}>{id() ? 'Ekspor HTML' : 'Export HTML'}</button><button class="btn btn-secondary" onClick={exportTxt}>TXT</button></div>
  const monthNavigation = () => <div class="schedule-month-nav"><button class="schedule-icon-btn" onClick={() => shiftMonth(-1)} aria-label={id() ? 'Bulan sebelumnya' : 'Previous month'}><ChevronLeftIcon size={15}/></button><strong>{monthTitle()}</strong><button class="schedule-icon-btn" onClick={() => shiftMonth(1)} aria-label={id() ? 'Bulan berikutnya' : 'Next month'}><ChevronRightIcon size={15}/></button><span>{id() ? 'kalender masehi' : 'gregorian calendar'}</span></div>

  createEffect(() => {
    const format = pendingExport()
    if (!format || loading() || !monthRecords().length) return
    setPendingExport(null)
    if (format === 'csv') exportCsv()
    else if (format === 'html') exportHtml()
    else exportTxt()
  })
  const exportEvent = () => exportCsv()
  onMount(() => {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('shollu-export', exportEvent)
  })
  onCleanup(() => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('shollu-export', exportEvent)
    request++
  })

  return <div class={`prayer-page-schedule ${app.layoutMode()}`}>
    <Show when={app.layoutMode() === 'ringkas'}><div class="schedule-toolbar">{monthNavigation()}{exportButtons()}</div></Show>
    <Show when={app.layoutMode() === 'tenang'}><Portal mount={document.getElementById('page-actions') ?? document.body}><div class="schedule-header-portal">{monthNavigation()}{exportButtons()}</div></Portal></Show>
    <Show when={app.layoutMode() === 'tenang'} fallback={<div class="ledger-layout">
      <div class="ledger-pane">
        <div class="ledger-table" role="table">
          <div class="ledger-row ledger-head" role="row"><span>{id() ? 'Tanggal' : 'Date'}</span><For each={PRAYER_NAMES}>{n => <span>{prayerLabel(n, lang())}</span>}</For></div>
          <div class="ledger-body"><For each={monthRecords()}>{row => <button class={`ledger-row ${row.iso === todayIso() ? 'today' : ''} ${row.iso === selected() ? 'selected' : ''}`} onClick={() => setSelected(row.iso)} role="row"><span>{row.iso.slice(-2)} <small>{(id() ? G_DAYS_ID : G_DAYS_EN)[weekday(row.iso)]}</small></span><For each={KEYS}>{key => <span>{formatHours(row.times[key])}</span>}</For></button>}</For></div>
        </div>
      </div>
      <aside class="schedule-inspector">
        <section class="inspector-next"><div class="inspector-kicker">{id() ? 'Berikutnya' : 'Next prayer'}</div><strong>{prayerLabel(PRAYER_NAMES[nextPrayer().index], lang())}</strong><span class="inspector-time">{formatHours(nextPrayer().hour % 24)}</span><b class="main-inspector-countdown">{nextCountdown()}</b><small>{app.settings()?.location.name}</small></section>
        <section class="inspector-section"><h3>{id() ? 'Jadwal terpilih' : 'Selected day'}</h3><strong class="inspector-date">{dateText(selected())}</strong><Show when={selectedRecord()}>{record => <For each={PRAYER_NAMES}>{(name, i) => <div class="inspector-prayer"><span>{prayerLabel(name, lang())}</span><b>{formatHours(record().times[KEYS[i()]] )}</b></div>}</For>}</Show></section>
        <section class="inspector-qibla"><QiblaCompass size={42} deg={app.qibla()?.degrees ?? 0}/><div><h3>{id() ? 'Kiblat' : 'Qibla'}</h3><b>{app.qibla()?.degrees.toFixed(2) ?? '—'}°</b><small>{app.qibla()?.cardinal ?? '—'}</small></div></section>
        <div class="inspector-foot">{id() ? 'Waktu dihitung untuk lokasi dan metode aktif.' : 'Times use the active location and calculation method.'}</div>
      </aside>
    </div>}>
      <div class="calendar-layout">
        <section class="calendar-card">
          <div class="calendar-weekdays"><For each={id() ? WEEKDAYS_ID : WEEKDAYS_EN}>{(day, i) => <span class={i() === 5 ? 'friday' : ''}>{day.slice(0, 3)}</span>}</For></div>
          <div class={`calendar-grid ${loading() ? 'is-loading' : ''}`}>
            <For each={monthDates()}>{iso => {
              const row = () => recordByDate(iso)
              const inMonth = () => iso.slice(0, 7) === yearMonth()
              return <button class={`calendar-cell ${!inMonth() ? 'outside' : ''} ${iso === todayIso() ? 'today' : ''} ${iso === selected() ? 'selected' : ''}`} onClick={() => setSelected(iso)}>
                <div class="calendar-cell-top"><strong>{Number(iso.slice(-2))}</strong><small>{row()?.hijri?.day ?? '·'}</small></div>
                <span class="calendar-fajr">{row() ? formatHours(row()!.times.fajr) : '--:--'}</span><span class="calendar-maghrib">{row() ? formatHours(row()!.times.maghrib) : '--:--'}</span>
              </button>
            }}</For>
          </div>
        </section>
        <aside class="calendar-detail">
          <div class="detail-date-kicker">{dateText(selected()).split(',')[0]}</div><h2>{dateText(selected())}</h2>
          <p class="detail-hijri">{selectedRecord()?.hijri ? `${selectedRecord()!.hijri!.day} ${(id() ? ['Muharram','Safar',"Rabi'ul Awal","Rabi'ul Akhir",'Jumadil Awal','Jumadil Akhir','Rajab',"Sya'ban",'Ramadhan','Syawal',"Dzulqa'dah",'Dzulhijjah'] : ['Muharram','Safar',"Rabi' al-Awwal", "Rabi' al-Thani",'Jumada al-Awwal','Jumada al-Thani','Rajab',"Sha'ban",'Ramadan','Shawwal',"Dhu al-Qi'dah",'Dhu al-Hijjah'])[selectedRecord()!.hijri!.month - 1]} ${selectedRecord()!.hijri!.year} H` : id() ? 'Tanggal Hijriah' : 'Hijri date'}</p>
          <div class="detail-prayers"><Show when={selectedRecord()} fallback={<div class="schedule-loading">{loading() ? (id() ? 'Memuat jadwal…' : 'Loading schedule…') : '—'}</div>}>{row => <For each={PRAYER_NAMES}>{(name, i) => <div class="detail-prayer"><span>{prayerLabel(name, lang())}</span><strong>{formatHours(row().times[KEYS[i()]])}</strong></div>}</For>}</Show></div>
          <div class="detail-hint">{id() ? 'Pilih tanggal lain untuk melihat jadwal sholatnya.' : 'Select another date to view its prayer times.'}</div>
        </aside>
      </div>
    </Show>
    <div class="schedule-status"><span>{loading() ? (id() ? 'Memuat jadwal…' : 'Loading schedule…') : `${monthRecords().length} ${id() ? 'hari' : 'days'} · ${app.settings()?.location.name ?? ''}`}</span><span>{id() ? 'Waktu lokal' : 'Local time'}</span></div>
  </div>
}

export default SchedulePage
