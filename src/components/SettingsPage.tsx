import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js'
import { invoke } from '@tauri-apps/api/core'
import { ACCENTS, prayerLabel } from '../helpers'
import { useAppState } from '../state'
import './utility-pages.css'

const themes = ['light', 'dark', 'sepia'] as const
type Theme = typeof themes[number]
const prayerAudio = [
  { prayer: 'fajr', file: 'azan-fajr.mp3' },
  { prayer: 'dhuhr', file: 'azan-mecca.mp3' },
  { prayer: 'asr', file: 'azan-egypt.mp3' },
  { prayer: 'maghrib', file: 'azan-dammam.mp3' },
  { prayer: 'isha', file: 'azan-mecca.mp3' },
] as const

export function SettingsPage(props: { lang: string }) {
  const app = useAppState()
  const id = () => props.lang === 'Indonesia'
  const settings = () => app.settings()
  const [theme, setTheme] = createSignal<Theme>('light')
  const [accent, setAccent] = createSignal('teal')
  const [busy, setBusy] = createSignal(false)
  const [error, setError] = createSignal('')
  const [status, setStatus] = createSignal('')
  const [previewing, setPreviewing] = createSignal(false)
  const [previewPrayer, setPreviewPrayer] = createSignal('fajr')
  let active = true
  createEffect(() => {
    if (!previewing()) return
    let disposed = false
    const timer = window.setInterval(() => {
      void invoke<boolean>('is_audio_playing').then(playing => {
        if (!disposed && !playing) setPreviewing(false)
      }).catch(() => { if (!disposed) setPreviewing(false) })
    }, 1000)
    onCleanup(() => { disposed = true; window.clearInterval(timer) })
  })

  const skin = (value = settings()?.skin ?? '') => {
    const found = /^(light|dark|sepia)-(teal|indigo|emerald|rose|slate)$/.exec(value)
    if (found) { setTheme(found[1] as Theme); setAccent(found[2]) }
  }
  createEffect(() => skin(settings()?.skin))
  const persist = async (patch: Record<string, unknown>, success?: string) => {
    setBusy(true); setError(''); setStatus('')
    try { await app.saveSettings(patch); if (success) setStatus(success) }
    catch { if (patch.skin) skin(settings()?.skin); setError(id() ? 'Pengaturan gagal disimpan. Coba lagi.' : 'Could not save settings. Try again.') }
    finally { setBusy(false) }
  }
  const chooseAudio = async () => {
    setError('')
    try {
      const path = await invoke<string | null>('choose_audio_file')
      if (path) await persist({ adzan_file_path: path }, id() ? 'Berkas audio diperbarui.' : 'Audio file updated.')
    } catch { setError(id() ? 'Pemilih berkas audio gagal dibuka.' : 'Could not open the audio file picker.') }
  }
  const testAudio = async () => {
    setError('')
    setPreviewing(true)
    try { await invoke('play_prayer_adzan', { prayer: previewPrayer() }); if (!active) await invoke('stop_audio') }
    catch { setPreviewing(false); setError(id() ? 'Berkas audio tidak dapat diputar.' : 'Could not play this audio file.') }
  }
  const stopAudio = async () => {
    try { await invoke('stop_audio'); setPreviewing(false) }
    catch { setError(id() ? 'Audio gagal dihentikan.' : 'Could not stop audio playback.') }
  }
  onCleanup(() => { active = false; if (previewing()) void invoke('stop_audio').catch(() => {}) })
  const themeLabel = (value: string) => id() ? ({ light: 'Terang', dark: 'Gelap', sepia: 'Sepia' }[value] ?? value) : value.charAt(0).toUpperCase() + value.slice(1)

  return <div class="utility-page settings-page" classList={{ 'layout-ringkas': app.layoutMode() === 'ringkas' }}>
    <div class="utility-heading"><div><p class="utility-kicker">{id() ? 'PREFERENSI' : 'PREFERENCES'}</p><h2>{id() ? 'Pengaturan' : 'Settings'}</h2><p class="utility-subtitle">{id() ? 'Sesuaikan tampilan dan perilaku Shollu.' : 'Personalize Shollu’s appearance and behavior.'}</p></div><Show when={busy()}><span class="saving-state">◌ {id() ? 'Menyimpan…' : 'Saving…'}</span></Show></div>
    <div class="settings-layout" classList={{ compact: app.layoutMode() === 'ringkas' }}><nav class="settings-nav"><a href="#display">{id() ? 'Tampilan' : 'Display'}</a><a href="#sound">{id() ? 'Audio' : 'Audio'}</a><a href="#behavior">{id() ? 'Perilaku' : 'Behavior'}</a></nav><div class="settings-sections">
      <section class="u-card settings-card" id="display"><div class="u-card-heading"><div><h3>{id() ? 'Mode tampilan' : 'Display mode'}</h3><p>{id() ? 'Pilih kepadatan tampilan utama.' : 'Choose how the main screen is arranged.'}</p></div></div><div class="mode-tiles"><button class={`mode-tile ${app.layoutMode() === 'tenang' ? 'active' : ''}`} aria-pressed={app.layoutMode() === 'tenang'} onClick={() => void persist({ layout_mode: 'tenang' })}><div class="mode-preview calm-preview"><i/><i/><i/><i/><i/></div><span class="mode-radio"/><span><strong>Tenang</strong><small>{id() ? 'Ruang lapang dengan kartu dan day arc' : 'Roomy cards and day arc'}</small></span></button><button class={`mode-tile ${app.layoutMode() === 'ringkas' ? 'active' : ''}`} aria-pressed={app.layoutMode() === 'ringkas'} onClick={() => void persist({ layout_mode: 'ringkas' })}><div class="mode-preview compact-preview"><i/><i/><i/><i/><i/><i/></div><span class="mode-radio"/><span><strong>Ringkas</strong><small>{id() ? 'Tabel bulanan dan inspector' : 'Monthly table and inspector'}</small></span></button></div></section>
      <section class="u-card settings-card"><div class="u-card-heading"><div><h3>{id() ? 'Tema & aksen' : 'Theme & accent'}</h3><p>{id() ? 'Pilih warna yang nyaman untuk Anda.' : 'Choose a palette that feels right.'}</p></div></div><div class="setting-row"><div><strong>{id() ? 'Tema' : 'Theme'}</strong><span>{id() ? 'Warna latar aplikasi' : 'App background colors'}</span></div><div class="theme-segments"><For each={themes}>{value => <button classList={{ selected: theme() === value }} onClick={() => { setTheme(value); void persist({ skin: `${value}-${accent()}` }) }}>{themeLabel(value)}</button>}</For></div></div><div class="setting-row"><div><strong>{id() ? 'Warna aksen' : 'Accent color'}</strong><span>{id() ? 'Sorotan dan kontrol aktif' : 'Highlights and active controls'}</span></div><div class="accent-swatches"><For each={ACCENTS}>{item => <button class={`accent-swatch ${accent() === item.id ? 'selected' : ''}`} style={{ '--swatch': item.color }} title={item.label} aria-label={item.label} aria-pressed={accent() === item.id} onClick={() => { setAccent(item.id); void persist({ skin: `${theme()}-${item.id}` }) }}/>}</For></div></div></section>
      <section class="u-card settings-card"><div class="u-card-heading"><div><h3>{id() ? 'Bahasa' : 'Language'}</h3><p>{id() ? 'Bahasa antarmuka aplikasi.' : 'Language used throughout the app.'}</p></div></div><div class="setting-row"><div><strong>{id() ? 'Bahasa aplikasi' : 'App language'}</strong></div><div class="theme-segments"><button classList={{ selected: props.lang === 'Indonesia' }} onClick={() => void persist({ language: 'Indonesia' })}>Indonesia</button><button classList={{ selected: props.lang !== 'Indonesia' }} onClick={() => void persist({ language: 'English' })}>English</button></div></div></section>
      <section class="u-card settings-card" id="sound">
        <div class="u-card-heading"><div><h3>{id() ? 'Audio adzan' : 'Adhan audio'}</h3><p>{id() ? 'Rekaman Shollu3 sesuai waktu sholat, dilanjutkan doa.' : 'Original Shollu3 recordings by prayer, followed by dua.'}</p></div><button class={`u-switch ${settings()?.adzan_sound_enabled ? 'on' : ''}`} role="switch" aria-checked={settings()?.adzan_sound_enabled ?? false} aria-label={id() ? 'Audio adzan' : 'Adhan audio'} onClick={() => void persist({ adzan_sound_enabled: !settings()?.adzan_sound_enabled })}><i/></button></div>
        <div class="audio-choice"><span class="audio-mark">♫</span><div class="audio-info"><strong>{settings()?.adzan_file_path?.split(/[\\/]/).pop() || (id() ? 'Audio bawaan Shollu3' : 'Bundled Shollu3 audio')}</strong><small>{settings()?.adzan_file_path || (id() ? 'Lima waktu sholat · doa setelah adzan' : 'Five prayers · dua after adhan')}</small></div><button class="u-button" onClick={chooseAudio}>{id() ? 'Pilih berkas' : 'Choose file'}</button></div>
        <Show when={settings()?.adzan_file_path}><div class="audio-actions"><button class="u-button" onClick={() => void persist({ adzan_file_path: '' }, id() ? 'Audio bawaan dipulihkan.' : 'Bundled audio restored.')}>{id() ? 'Gunakan bawaan' : 'Use bundled audio'}</button><span>{id() ? 'Berkas pilihan berlaku untuk semua waktu sholat.' : 'Your selected file overrides all prayer recordings.'}</span></div></Show>
        <div class="setting-row"><label for="audio-preview-prayer"><strong>{id() ? 'Pratinjau sholat' : 'Preview prayer'}</strong></label><select id="audio-preview-prayer" class="u-input" value={previewPrayer()} disabled={previewing()} onChange={event => setPreviewPrayer(event.currentTarget.value)}><For each={prayerAudio}>{item => <option value={item.prayer}>{prayerLabel(item.prayer, props.lang)} · {item.file}</option>}</For></select></div>
        <div class="audio-actions"><button class="u-button" onClick={testAudio} disabled={previewing()}>{id() ? '▶ Uji audio' : '▶ Test audio'}</button><button class="u-button" onClick={stopAudio} disabled={!previewing()}>{id() ? 'Hentikan' : 'Stop'}</button><span>{id() ? 'Adzan → dua.mp3. Hentikan membatalkan keduanya.' : 'Adhan → dua.mp3. Stop cancels both recordings.'}</span></div>
      </section>
      <section class="u-card settings-card" id="behavior"><div class="u-card-heading"><div><h3>{id() ? 'Perilaku aplikasi' : 'App behavior'}</h3><p>{id() ? 'Opsi jendela dan pengingat.' : 'Window and reminder options.'}</p></div></div><div class="setting-row"><div><strong>{id() ? 'Pembulatan waktu' : 'Prayer time rounding'}</strong><span>{id() ? 'Cara membulatkan menit jadwal' : 'How prayer times round to a minute'}</span></div><div class="theme-segments"><For each={[0,1,2]}>{value => <button classList={{ selected: settings()?.pembulatan === value }} onClick={() => void persist({ pembulatan: value })}>{id() ? ['Turun','Naik','Terdekat'][value] : ['Down','Up','Nearest'][value]}</button>}</For></div></div><div class="setting-toggle-row"><div><strong>{id() ? 'Selalu di atas' : 'Always on top'}</strong><span>{id() ? 'Jaga jendela tetap terlihat' : 'Keep the window above others'}</span></div><button class={`u-switch ${settings()?.always_on_top ? 'on' : ''}`} role="switch" aria-checked={settings()?.always_on_top ?? false} aria-label={id() ? 'Selalu di atas' : 'Always on top'} onClick={() => void persist({ always_on_top: !settings()?.always_on_top })}><i/></button></div><div class="setting-toggle-row"><div><strong>{id() ? 'Mulai saat masuk' : 'Launch at login'}</strong><span>{id() ? 'Jalankan Shollu saat komputer dinyalakan' : 'Start Shollu when you sign in'}</span></div><button class={`u-switch ${settings()?.autostart ? 'on' : ''}`} role="switch" aria-checked={settings()?.autostart ?? false} aria-label={id() ? 'Mulai saat masuk' : 'Launch at login'} onClick={() => void persist({ autostart: !settings()?.autostart })}><i/></button></div><div class="setting-toggle-row"><div><strong>{id() ? 'Bilah melayang' : 'Floating bar'}</strong><span>{id() ? 'Tampilkan waktu sholat di atas jendela' : 'Show prayer times in a small overlay'}</span></div><button class={`u-switch ${settings()?.floating_bar_visible ? 'on' : ''}`} role="switch" aria-checked={settings()?.floating_bar_visible ?? false} aria-label={id() ? 'Bilah melayang' : 'Floating bar'} onClick={() => void persist({ floating_bar_visible: !settings()?.floating_bar_visible })}><i/></button></div><div class="setting-toggle-row"><div><strong>{id() ? 'Drop zone' : 'Drop zone'}</strong><span>{id() ? 'Tampilkan area seret dan lepas' : 'Show the drag-and-drop zone'}</span></div><button class={`u-switch ${settings()?.drop_zone_visible ? 'on' : ''}`} role="switch" aria-checked={settings()?.drop_zone_visible ?? false} aria-label="Drop zone" onClick={() => void persist({ drop_zone_visible: !settings()?.drop_zone_visible })}><i/></button></div></section>
      <Show when={status()}><div class="u-alert success" role="status">{status()}</div></Show><Show when={error()}><div class="u-alert error" role="alert">{error()}</div></Show>
    </div><Show when={app.layoutMode() === 'ringkas'}><aside class="u-card compact-settings-inspector"><div class="inspector-top"><div><p class="utility-kicker">{id() ? 'PINTASAN' : 'SHORTCUTS'}</p><h3>{id() ? 'Kiat aplikasi' : 'Quick reference'}</h3></div></div><div class="shortcut-row"><span>{id() ? 'Palet perintah' : 'Command palette'}</span><kbd>⌘K</kbd></div><div class="shortcut-row"><span>{id() ? 'Simpan perubahan' : 'Save changes'}</span><kbd>⌘S</kbd></div><div class="shortcut-row"><span>{id() ? 'Ganti mode' : 'Switch display mode'}</span><kbd>⌘⇧M</kbd></div><div class="shortcut-row"><span>{id() ? 'Bulan berikutnya' : 'Next month'}</span><kbd>⌘→</kbd></div><div class="shortcut-row"><span>{id() ? 'Sembunyikan ke tray' : 'Hide to tray'}</span><kbd>⌘W</kbd></div><p class="settings-storage-note">{id() ? 'Preferensi disimpan di folder konfigurasi Shollu.' : 'Preferences are stored in Shollu’s local configuration folder.'}</p></aside></Show></div>
  </div>
}
