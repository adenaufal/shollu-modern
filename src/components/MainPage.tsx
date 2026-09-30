import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount, untrack } from 'solid-js'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { formatHours, getMethodName, G_MONTHS_FULL_EN, G_MONTHS_FULL_ID, prayerLabel, PRAYER_NAMES } from '../helpers'
import type { PrayerTimes, ScheduledTask } from '../helpers'
import { calculationKey, computeTimes, useAppState } from '../state'
import { QiblaCompass } from './QiblaCompass'
import { ChevronLeftIcon, ChevronRightIcon } from './Icons'
import './prayer-pages.css'

const TIME_KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const

function CompactMain(props: { lang: () => string }) {
  const app = useAppState()
  const id = () => props.lang() === 'Indonesia'
  const [rows, setRows] = createSignal<{ iso: string; times: PrayerTimes }[]>([])
  const [selected, setSelected] = createSignal(app.today())
  const [visibleMonth, setVisibleMonth] = createSignal(`${app.today().slice(0, 7)}-01`)
  const [pendingExport, setPendingExport] = createSignal(false)
  let monthRequest = 0
  const today = () => app.today()
  const month = () => visibleMonth().slice(0, 7)
  let observedDay = today()
  createEffect(() => {
    const currentDay = today()
    if (currentDay.slice(0, 7) !== observedDay.slice(0, 7) && month() === observedDay.slice(0, 7)) {
      const start = `${currentDay.slice(0, 7)}-01`
      setVisibleMonth(start)
      setSelected(start)
    }
    observedDay = currentDay
  })
  const loadMonth = async (active = untrack(app.settings)) => {
    if (!active) return
    const request = ++monthRequest
    const [y, m] = month().split('-').map(Number)
    const count = new Date(y, m, 0).getDate()
    try {
      const result = await Promise.all(Array.from({ length: count }, async (_, day) => {
        const iso = `${month()}-${String(day + 1).padStart(2, '0')}`
        return { iso, times: await computeTimes(active, iso) }
      }))
      if (request === monthRequest) setRows(result)
    } catch (cause) { app.notify(String(cause), 'error') }
  }
  const settingsKey = createMemo(() => {
    const settings = app.settings()
    return settings ? calculationKey(settings) : ''
  })
  createEffect(() => { const key = settingsKey(); visibleMonth(); if (key) void loadMonth() })
  onCleanup(() => { monthRequest++ })
  const toggleSetting = (key: 'adzan_sound_enabled' | 'floating_bar_visible' | 'always_on_top') => {
    const current = app.settings()?.[key]
    if (current != null) void app.saveSettings({ [key]: !current }).catch(cause => app.notify(String(cause), 'error'))
  }
  const next = createMemo(() => {
    const times = app.todayTimes(); const now = app.now(); const second = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
    if (times) for (const index of [0, 2, 3, 4, 5]) if (second < times[TIME_KEYS[index]] * 3600) return { index, hour: times[TIME_KEYS[index]] }
    return { index: 0, hour: (app.tomorrowTimes()?.fajr ?? times?.fajr ?? 0) + 24 }
  })
  const countdown = createMemo(() => {
    const now = app.now(); const seconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
    const delta = Math.max(0, Math.floor(next().hour * 3600 - seconds))
    return `${String(Math.floor(delta / 3600)).padStart(2, '0')}:${String(Math.floor(delta % 3600 / 60)).padStart(2, '0')}:${String(delta % 60).padStart(2, '0')}`
  })
  const chosen = () => rows().find(row => row.iso === selected())
  const dateLabel = (iso: string) => {
    const parts = new Intl.DateTimeFormat(id() ? 'id-ID' : 'en-US', { weekday: 'short', day: '2-digit', month: 'short' }).formatToParts(new Date(`${iso}T12:00:00`))
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? ''
    return `${get('weekday')} ${get('day')} ${get('month')}`
  }
  const monthTitle = () => {
    const [y, m] = month().split('-').map(Number)
    return `${(id() ? G_MONTHS_FULL_ID : G_MONTHS_FULL_EN)[m - 1]} ${y}`
  }
  const shiftMonth = (delta: number) => {
    const [y, m] = month().split('-').map(Number)
    const nextMonth = new Date(y, m - 1 + delta, 1)
    const iso = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`
    setVisibleMonth(iso)
    setSelected(iso)
  }
  const saveCsv = async () => {
    const monthRows = rows().filter(row => row.iso.startsWith(month()))
    if (!monthRows.length) { setPendingExport(true); return }
    const content = [['Date', ...PRAYER_NAMES].join(','), ...monthRows.map(row => [row.iso, ...rowKeys.map(key => formatHours(row.times[key]))].join(','))].join('\r\n')
    const filename = `Shollu-${month()}.csv`
    try {
      if (isTauri()) await invoke<boolean>('save_export_file', { defaultName: filename, content })
      else {
        const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
        const link = document.createElement('a'); link.href = url; link.download = filename; link.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } catch (cause) { app.notify(String(cause), 'error') }
  }
  createEffect(() => { if (pendingExport() && rows().some(row => row.iso.startsWith(month()))) { setPendingExport(false); void saveCsv() } })
  const exportEvent = () => void saveCsv()
  onMount(() => { window.addEventListener('shollu-export', exportEvent) })
  onCleanup(() => { window.removeEventListener('shollu-export', exportEvent); monthRequest++ })
  const rowKeys = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
  return <>
  <Show when={app.error()}><div class="status-banner tone-error" role="alert">{app.error()} <button class="btn btn-secondary" onClick={() => void app.refresh()}>{id() ? 'Coba lagi' : 'Retry'}</button></div></Show>
  <Show when={!app.loading()} fallback={<div class="compact-main-skeleton skeleton-pulse"><div/><div/></div>}>
  <div class="compact-main-layout">
    <div class="compact-main-pane"><div class="compact-main-toolbar"><div class="compact-main-month"><button class="schedule-icon-btn" onClick={() => shiftMonth(-1)} aria-label={id() ? 'Bulan sebelumnya' : 'Previous month'}><ChevronLeftIcon size={14}/></button><strong>{monthTitle()}</strong><button class="schedule-icon-btn" onClick={() => shiftMonth(1)} aria-label={id() ? 'Bulan berikutnya' : 'Next month'}><ChevronRightIcon size={14}/></button></div><button class="btn btn-secondary compact-export" onClick={() => void saveCsv()}>{id() ? 'Ekspor CSV' : 'Export CSV'}</button></div>
    <div class="compact-main-table-wrap"><table class="compact-main-table"><thead><tr><th>{id() ? 'Tanggal' : 'Date'}</th><For each={PRAYER_NAMES}>{name => <th>{prayerLabel(name, props.lang())}</th>}</For></tr></thead><tbody>
      <For each={rows()}>{row => <tr tabindex="0" aria-selected={row.iso === selected()} class={`${row.iso === today() ? 'today' : ''} ${row.iso === selected() ? 'selected' : ''}`} onClick={() => setSelected(row.iso)} onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(row.iso) }
        else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); const index = rows().findIndex(item => item.iso === row.iso); const target = rows()[Math.max(0, Math.min(rows().length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))]; if (target) setSelected(target.iso) }
      }}><td>{dateLabel(row.iso)}</td><For each={rowKeys}>{key => <td>{formatHours(row.times[key])}</td>}</For></tr>}</For>
    </tbody></table></div></div>
    <aside class="main-inspector">
      <section class="inspector-next"><div class="inspector-kicker">{id() ? 'Berikutnya' : 'Next prayer'}</div><strong>{prayerLabel(PRAYER_NAMES[next().index], props.lang())}</strong><span class="inspector-time">{formatHours(next().hour % 24)}</span><b class="main-inspector-countdown">{countdown()}</b><small>{app.settings()?.location.name}</small></section>
      <section class="main-inspector-params"><h3>{id() ? 'Parameter' : 'Parameters'}</h3><div><span>{id() ? 'Metode' : 'Method'}</span><button class="inspector-chip" onClick={() => app.navigate('location')}>{app.settings() ? getMethodName(app.settings()!.method) : '—'}</button></div><div><span>{id() ? 'Mazhab' : 'Madhab'}</span><button class="inspector-chip" onClick={() => app.navigate('location')}>{app.settings()?.madhab === 2 ? 'Hanafi' : "Shafi'i"}</button></div><div><span>{id() ? 'Zona' : 'Zone'}</span><button class="inspector-chip" onClick={() => app.navigate('location')}>UTC{(app.settings()?.location.timezone ?? 0) >= 0 ? '+' : ''}{app.settings()?.location.timezone}</button></div><div class="adjustment-quick"><span>{id() ? 'Koreksi' : 'Adjust'}</span><button class="inspector-chip" onClick={() => app.navigate('location')}>{rowKeys.map(key => app.settings()?.adjustments[key] ?? 0).join(' ')}</button></div><strong class="compact-selected-date">{dateLabel(selected())}</strong><div class="compact-selected-times"><For each={rowKeys}>{(key, i) => <div><span>{prayerLabel(PRAYER_NAMES[i()], props.lang())}</span><b>{chosen() ? formatHours(chosen()!.times[key]) : '—'}</b></div>}</For></div></section>
      <section class="inspector-qibla"><QiblaCompass size={42} deg={app.qibla()?.degrees ?? 0}/><div><h3>{id() ? 'Kiblat' : 'Qibla'}</h3><b>{app.qibla()?.degrees.toFixed(2) ?? '—'}°</b><small>{app.qibla()?.cardinal ?? '—'}</small></div></section>
      <section class="main-inspector-tasks"><div class="main-inspector-tasks-head"><h3>{id() ? 'Alarm' : 'Alarms'}</h3><button onClick={() => app.navigate('tasks')}>+ {id() ? 'Tambah' : 'Add'}</button></div><For each={[
        { key: 'adzan_sound_enabled' as const, label: id() ? 'Adzan MP3' : 'Adhan MP3' },
        { key: 'floating_bar_visible' as const, label: id() ? 'Bilah melayang' : 'Floating bar' },
        { key: 'always_on_top' as const, label: id() ? 'Selalu di atas' : 'Always on top' },
      ]}>{item => <div class="main-inspector-task"><span>{item.label}</span><button class={`mini-switch ${app.settings()?.[item.key] ? 'on' : ''}`} role="switch" aria-checked={Boolean(app.settings()?.[item.key])} aria-label={item.label} onClick={() => toggleSetting(item.key)}><i/></button></div>}</For></section>
    </aside>
  </div>
  </Show>
  </>
}

export function MainPage(props: { lang?: string }) {
  const app = useAppState()
  const lang = () => props.lang ?? app.lang()
  const id = () => lang() === 'Indonesia'
  const [tasks, setTasks] = createSignal<ScheduledTask[]>([])
  let unlistenTasks: (() => void) | undefined
  let disposed = false
  let tasksChangedDuringLoad = false
  onMount(() => {
    const loadTasks = async () => {
      if (isTauri()) {
        try {
          const stopListening = await listen<ScheduledTask[]>('tasks-changed', event => {
            if (disposed) return
            tasksChangedDuringLoad = true
            setTasks(event.payload)
          })
          if (disposed) stopListening()
          else unlistenTasks = stopListening
        } catch { /* The browser preview has no native task event source. */ }
      }
      try {
        const initialTasks = await invoke<ScheduledTask[]>('list_tasks')
        if (!disposed && !tasksChangedDuringLoad) setTasks(initialTasks)
      } catch {
        if (!disposed && !tasksChangedDuringLoad) setTasks([])
      }
    }
    void loadTasks()
  })
  onCleanup(() => { disposed = true; unlistenTasks?.() })
  const toggleTask = async (task: ScheduledTask) => {
    const updated = tasks().map(item => item.id === task.id ? { ...item, enabled: !item.enabled } : item)
    try { await invoke('save_tasks', { tasks: updated }); setTasks(updated) } catch (cause) { app.notify(String(cause), 'error') }
  }
  const toggleAdzan = () => {
    const enabled = app.settings()?.adzan_sound_enabled
    if (enabled != null) void app.saveSettings({ adzan_sound_enabled: !enabled }).catch(() => {})
  }
  const now = () => app.now()
  const times = () => app.todayTimes()
  const tomorrow = () => app.tomorrowTimes()
  const secondsNow = () => now().getHours() * 3600 + now().getMinutes() * 60 + now().getSeconds()
  const nextIndex = createMemo(() => {
    const t = times()
    if (!t) return 0
    for (const i of [0, 2, 3, 4, 5]) if (secondsNow() < t[TIME_KEYS[i]] * 3600) return i
    return 0
  })
  const nextHour = createMemo(() => {
    const t = times()
    const index = nextIndex()
    if (!t) return 0
    if (secondsNow() >= t.isha * 3600) return (tomorrow()?.fajr ?? t.fajr) + 24
    return t[TIME_KEYS[index]]
  })
  const countdown = createMemo(() => {
    const delta = Math.max(0, Math.floor(nextHour() * 3600 - secondsNow()))
    return `${String(Math.floor(delta / 3600)).padStart(2, '0')}:${String(Math.floor(delta % 3600 / 60)).padStart(2, '0')}:${String(delta % 60).padStart(2, '0')}`
  })
  const calmCountdown = () => countdown().replace(/^0(?=\d:)/, '')
  const remainingText = () => {
    const [hours, minutes] = countdown().split(':')
    return id() ? `${Number(hours)}j ${minutes}m` : `${Number(hours)}h ${minutes}m`
  }
  const currentIndex = createMemo(() => {
    const t = times()
    if (!t) return -1
    let current = -1
    for (const i of [0, 2, 3, 4, 5]) if (secondsNow() >= t[TIME_KEYS[i]] * 3600) current = i
    return current
  })
  const pct = (hour: number) => Math.max(0, Math.min(100, (hour - 4) / 16 * 100))
  const nowPct = createMemo(() => pct(secondsNow() / 3600))
  const currentLabel = () => currentIndex() < 0 ? (id() ? 'Sebelum Subuh' : 'Before Fajr') : prayerLabel(PRAYER_NAMES[currentIndex()], lang())
  const dateLabel = () => new Intl.DateTimeFormat(id() ? 'id-ID' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now())

  return <div class={`prayer-page-main ${app.layoutMode()}`}>
    <Show when={app.layoutMode() === 'tenang'} fallback={<CompactMain lang={lang}/> }>
    <Show when={app.error()}><div class="status-banner tone-error" role="alert">{app.error()} <button class="btn btn-secondary" onClick={() => void app.refresh()}>{id() ? 'Coba lagi' : 'Retry'}</button></div></Show>
    <Show when={app.loading()}><div class="prayer-skeleton skeleton-pulse"><div/><div/><div/></div></Show>
    <Show when={!app.loading() && times()}>
      {(today) => <>
        <section class="calm-hero">
          <div class="calm-hero-top">
            <div class="calm-hero-copy">
              <div class="calm-eyebrow">{id() ? 'Berikutnya' : 'Next prayer'}</div>
              <div class="calm-next-line"><span>{prayerLabel(PRAYER_NAMES[nextIndex()], lang())}</span><strong>{calmCountdown()}</strong></div>
              <div class="calm-subline">{id() ? 'pukul' : 'at'} {formatHours(nextHour() % 24)} · {id() ? 'sekarang' : 'now'} {currentLabel()}, {id() ? 'sisa' : 'in'} {remainingText()}</div>
            </div>
            <div class="calm-qibla" title={id() ? 'Arah kiblat' : 'Qibla direction'}>
              <QiblaCompass deg={app.qibla()?.degrees ?? 0} size={44}/>
              <div class="calm-qibla-info"><span>{id() ? 'KIBLAT' : 'QIBLA'}</span><strong>{app.qibla()?.degrees.toFixed(1) ?? '—'}°</strong><small>{app.qibla()?.cardinal ?? '—'}</small></div>
            </div>
          </div>
          <div class="day-arc" aria-label={id() ? 'Lintasan waktu sholat hari ini' : "Today's prayer timeline"}>
            <div class="arc-track"/><div class="arc-progress" style={{ width: `${nowPct()}%` }}/>
            <div class="arc-now" style={{ left: `${nowPct()}%` }}><span>{formatHours(secondsNow() / 3600)}</span></div>
            <For each={[...PRAYER_NAMES]}>{(name, idx) => {
              const i = idx()
              const hour = () => today()[TIME_KEYS[i]]
              const isPast = () => i === 1 ? secondsNow() >= today().sunrise * 3600 : currentIndex() > i
              const isNext = () => i === nextIndex()
              return <div class={`arc-marker ${isPast() ? 'past' : ''} ${isNext() ? 'next' : ''}`} style={{ left: `${pct(hour())}%` }}>
                <span class="arc-name">{prayerLabel(name, lang())}</span><span class="arc-tick"/><span class="arc-time">{formatHours(hour())}</span>
              </div>
            }}</For>
          </div>
        </section>
        <div class="calm-main-grid">
          <section class="calm-card today-card">
            <header class="calm-card-head"><div><h2>{id() ? 'Hari ini' : 'Today'}</h2><p>{dateLabel()}</p></div><span>{id() ? 'waktu lokal' : 'local time'}</span></header>
            <div class="today-list">
              <For each={[...PRAYER_NAMES]}>{(name, idx) => {
                const i = idx()
                const isPast = () => i === 1 ? secondsNow() >= today().sunrise * 3600 : currentIndex() > i
                const deltaLabel = () => {
                  if (!tomorrow()) return '—'
                  const delta = Math.round((tomorrow()![TIME_KEYS[i]] - today()[TIME_KEYS[i]]) * 60)
                  return `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${Math.abs(delta)}m`
                }
                return <div class={`today-row ${i === currentIndex() ? 'current' : ''} ${i === nextIndex() ? 'next' : ''} ${isPast() ? 'passed' : ''}`}>
                  <i/><span>{prayerLabel(name, lang())}</span><strong>{formatHours(today()[TIME_KEYS[i]])}</strong><small>{deltaLabel()}</small>
                </div>
              }}</For>
            </div>
          </section>
          <div class="calm-side-stack">
            <section class="calm-card reminder-card">
              <header class="calm-card-head"><div><h2>{id() ? 'Pengingat' : 'Reminders'}</h2><p>{id() ? 'Adzan dan pengingat kustom' : 'Adhan and custom reminders'}</p></div><button class="reminder-add" onClick={() => app.navigate('tasks')}>+ {id() ? 'Tambah' : 'Add'}</button></header>
              <div class="reminder-preview"><span class="reminder-icon">♫</span><div><strong>{app.settings()?.adzan_file_path?.split(/[\\/]/).pop() || (id() ? 'Adzan' : 'Adhan')}</strong><small>{id() ? 'Mengikuti jadwal sholat' : 'Follows prayer times'}</small></div><button class={`mini-switch ${app.settings()?.adzan_sound_enabled ? 'on' : ''}`} role="switch" aria-checked={Boolean(app.settings()?.adzan_sound_enabled)} aria-label={id() ? 'Alihkan suara adzan' : 'Toggle adhan audio'} onClick={toggleAdzan}><i/></button></div>
              <For each={tasks().slice(0, 2)}>{task => <div class="reminder-preview"><span class="reminder-icon">◷</span><div><strong>{task.name}</strong><small>{task.time} · {task.message || task.frequency}</small></div><button class={`mini-switch ${task.enabled ? 'on' : ''}`} role="switch" aria-checked={task.enabled} aria-label={`${task.enabled ? (id() ? 'Nonaktifkan ' : 'Disable ') : (id() ? 'Aktifkan ' : 'Enable ')}${task.name}`} onClick={() => void toggleTask(task)}><i/></button></div>}</For>
              <Show when={!tasks().length}><small class="reminder-empty">{id() ? 'Belum ada pengingat kustom.' : 'No custom reminders yet.'}</small></Show>
            </section>
            <section class="calm-note"><span class="note-spark">◷</span><div><strong>{id() ? 'Besok' : 'Tomorrow'}</strong><p>{app.tomorrowTimes() ? `${id() ? 'Subuh' : 'Fajr'} ${formatHours(app.tomorrowTimes()!.fajr)} · ${id() ? 'Dzuhur' : 'Dhuhr'} ${formatHours(app.tomorrowTimes()!.dhuhr)} · ${id() ? 'Maghrib' : 'Maghrib'} ${formatHours(app.tomorrowTimes()!.maghrib)}` : (id() ? 'Jadwal besok belum tersedia.' : "Tomorrow's times are not available yet.")}</p></div></section>
          </div>
        </div>
        <div class="calm-meta-strip"><span>◷ {dateLabel()}</span><span>{app.settings()?.location.name ?? '—'}</span><span>{app.settings() ? `UTC${app.settings()!.location.timezone >= 0 ? '+' : ''}${app.settings()!.location.timezone}` : ''}</span></div>
      </>}
    </Show>
    </Show>
  </div>
}

export default MainPage
