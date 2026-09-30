import { createMemo, Show } from 'solid-js'
import { formatHours, prayerLabel, PRAYER_NAMES } from '../helpers'
import { useAppState } from '../state'
import './prayer-pages.css'

const keys = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const

export function FloatingBar() {
  const app = useAppState()
  const id = () => app.lang() === 'Indonesia'
  const second = () => app.now().getHours() * 3600 + app.now().getMinutes() * 60 + app.now().getSeconds()
  const next = createMemo(() => {
    const today = app.todayTimes()
    if (!today) return { index: 0, hour: 0, tomorrow: false }
    for (const index of [0, 2, 3, 4, 5]) if (second() < today[keys[index]] * 3600) return { index, hour: today[keys[index]], tomorrow: false }
    return { index: 0, hour: app.tomorrowTimes()?.fajr ?? today.fajr, tomorrow: true }
  })
  const countdown = createMemo(() => {
    const n = next(); const delta = Math.max(0, Math.floor(n.hour * 3600 + (n.tomorrow ? 86400 : 0) - second()))
    return `${String(Math.floor(delta / 3600)).padStart(2, '0')}:${String(Math.floor(delta % 3600 / 60)).padStart(2, '0')}:${String(delta % 60).padStart(2, '0')}`
  })
  const countdownLabel = () => app.layoutMode() === 'tenang' ? countdown().replace(/^0(?=\d:)/, '') : countdown()
  const close = () => void app.saveSettings({ floating_bar_visible: false }).catch(cause => app.notify(String(cause), 'error'))
  const times = () => app.todayTimes()
  const progress = () => {
    const start = times()?.fajr ?? 5
    const end = times()?.isha ?? 19
    return Math.max(0, Math.min(1, (second() / 3600 - start) / (end - start)))
  }
  const name = () => prayerLabel(PRAYER_NAMES[next().index], app.lang())
  return <div class={`prayer-overlay-bar ${app.layoutMode()}`} data-tauri-drag-region>
    <Show when={!app.loading() && Boolean(app.todayTimes())} fallback={<span class="overlay-status" data-tauri-drag-region role="status">{app.error() || (id() ? 'Memuat jadwal…' : 'Loading prayer times…')}</span>}>
    {app.layoutMode() === 'tenang' ? <>
      <i class="overlay-accent-dot" data-tauri-drag-region/>
      <strong class="overlay-prayer-name" data-tauri-drag-region>{name()}</strong>
      <b class="overlay-countdown" data-tauri-drag-region>{countdownLabel()}</b>
      <div class="overlay-mini-arc" data-tauri-drag-region><span data-tauri-drag-region style={{ width: `${progress() * 100}%` }}/><i data-tauri-drag-region style={{ left: `${progress() * 100}%` }}/></div>
      <span class="overlay-target" data-tauri-drag-region>{formatHours(next().hour % 24)}</span>
    </> : <div class="overlay-ledger" data-tauri-drag-region>
      <b data-tauri-drag-region>{app.settings()?.location.name?.toUpperCase() ?? '—'}</b><i data-tauri-drag-region>│</i><span data-tauri-drag-region>{name().toUpperCase()} {formatHours(next().hour % 24)}</span><i data-tauri-drag-region>│</i><strong data-tauri-drag-region>{countdownLabel()}</strong><i data-tauri-drag-region>│</i><span data-tauri-drag-region>MGH {times() ? formatHours(times()!.maghrib) : '--:--'}</span><i data-tauri-drag-region>│</i><span data-tauri-drag-region>ISH {times() ? formatHours(times()!.isha) : '--:--'}</span>
    </div>}
    </Show>
    <button type="button" class="overlay-close" onClick={close} aria-label={id() ? 'Tutup bilah melayang' : 'Close floating bar'}>×</button>
  </div>
}

export default FloatingBar
