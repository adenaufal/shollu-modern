import { createMemo, Show } from 'solid-js'
import { formatHours, prayerLabel, PRAYER_NAMES } from '../helpers'
import { useAppState } from '../state'
import './prayer-pages.css'

const keys = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const

export function DropZone() {
  const app = useAppState()
  const nowSeconds = () => app.now().getHours() * 3600 + app.now().getMinutes() * 60 + app.now().getSeconds()
  const next = createMemo(() => {
    const today = app.todayTimes()
    if (!today) return { index: 0, hour: 0, tomorrow: false }
    for (const index of [0, 2, 3, 4, 5]) if (nowSeconds() < today[keys[index]] * 3600) return { index, hour: today[keys[index]], tomorrow: false }
    return { index: 0, hour: app.tomorrowTimes()?.fajr ?? today.fajr, tomorrow: true }
  })
  const remaining = createMemo(() => {
    const target = next(); return Math.max(0, Math.floor(target.hour * 3600 + (target.tomorrow ? 86400 : 0) - nowSeconds()))
  })
  const countdown = () => `${String(Math.floor(remaining() / 3600)).padStart(2, '0')}:${String(Math.floor(remaining() % 3600 / 60)).padStart(2, '0')}:${String(remaining() % 60).padStart(2, '0')}`
  const countdownLabel = () => app.layoutMode() === 'tenang' ? countdown().replace(/^0(?=\d:)/, '') : countdown()
  const progress = () => {
    const start = app.todayTimes()?.fajr ?? 5
    const end = app.todayTimes()?.isha ?? 19
    return Math.max(0, Math.min(1, (nowSeconds() / 3600 - start) / Math.max(1, end - start)))
  }
  const close = () => void app.saveSettings({ drop_zone_visible: false }).catch(cause => app.notify(String(cause), 'error'))
  const nextName = () => prayerLabel(PRAYER_NAMES[next().index], app.lang())
  const city = () => app.settings()?.location.name ?? '—'
  const time = () => formatHours(next().hour % 24)
  return <div class={`prayer-overlay-zone ${app.layoutMode()}`} data-tauri-drag-region>
    <Show when={!app.loading() && Boolean(app.todayTimes())} fallback={<span class="overlay-status" data-tauri-drag-region role="status">{app.error() || (app.lang() === 'Indonesia' ? 'Memuat jadwal…' : 'Loading prayer times…')}</span>}>
    {app.layoutMode() === 'tenang' ? <>
      <div class="zone-ring" data-tauri-drag-region style={{ background: `conic-gradient(var(--accent-500) ${progress() * 1}turn, var(--bg-hover) ${progress() * 1}turn 1turn)` }}><div data-tauri-drag-region><small data-tauri-drag-region>{nextName()}</small></div></div>
      <strong class="zone-countdown" data-tauri-drag-region>{countdownLabel()}</strong><span class="zone-time-city" data-tauri-drag-region>{time()} · {city()}</span>
    </> : <>
      <div class="zone-ledger-stack" data-tauri-drag-region><b data-tauri-drag-region>{nextName().toUpperCase()}</b><strong data-tauri-drag-region>{countdownLabel()}</strong><span data-tauri-drag-region>{time()} · {city()}</span></div><i class="zone-progress" data-tauri-drag-region><span data-tauri-drag-region style={{ height: `${progress() * 100}%` }}/></i>
    </>}
    </Show>
    <button type="button" class="zone-overlay-close" onClick={close} aria-label={app.lang() === 'Indonesia' ? 'Tutup drop zone' : 'Close drop zone'}>×</button>
  </div>
}

export default DropZone
