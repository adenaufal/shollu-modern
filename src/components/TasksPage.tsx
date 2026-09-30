import { createSignal, For, onCleanup, onMount, Show } from 'solid-js'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { Portal } from 'solid-js/web'
import { formatHours, prayerLabel, type ScheduledTask } from '../helpers'
import { useAppState } from '../state'
import './utility-pages.css'

type Frequency = 'Daily' | 'Weekly' | 'Monthly' | 'Once' | 'Start'
type TaskType = 'Info' | 'Warning' | 'MovingText' | 'Command' | 'Shutdown' | 'Hibernate' | 'Multimedia'
const frequencies: Frequency[] = ['Daily', 'Weekly', 'Monthly', 'Once', 'Start']
const taskTypes: TaskType[] = ['Info', 'Warning', 'MovingText', 'Command', 'Shutdown', 'Hibernate', 'Multimedia']
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const emptyTask = (): Omit<ScheduledTask, 'id' | 'enabled'> => ({ name: '', task_type: 'Info', frequency: 'Daily', time: '12:00', day_of_week: 1, day_of_month: 1, month: 1, message: '', file_path: null })

export function TasksPage(props: { lang: string }) {
  const app = useAppState()
  const id = () => props.lang === 'Indonesia'
  const [tasks, setTasks] = createSignal<ScheduledTask[]>([])
  const [form, setForm] = createSignal(emptyTask())
  const [selected, setSelected] = createSignal<string | null>(null)
  const [loading, setLoading] = createSignal(true)
  const [saving, setSaving] = createSignal(false)
  const [error, setError] = createSignal('')
  const [formError, setFormError] = createSignal('')
  const [formOpen, setFormOpen] = createSignal(false)
  const [editingId, setEditingId] = createSignal<string | null>(null)
  let tasksRevision = 0
  let disposed = false
  let unlistenTasks: (() => void) | undefined
  let formElement: HTMLFormElement | undefined

  const load = async () => {
    const revision = tasksRevision
    setLoading(true); setError('')
    try { const loaded = await invoke<ScheduledTask[]>('list_tasks'); if (revision === tasksRevision) setTasks(loaded) }
    catch { setError(id() ? 'Pengingat gagal dimuat.' : 'Could not load reminders.') }
    finally { setLoading(false) }
  }
  void load()
  const handleSave = () => { if (formOpen()) formElement?.requestSubmit() }
  onMount(() => {
    window.addEventListener('shollu-save', handleSave)
    void listen<ScheduledTask[]>('tasks-changed', event => { tasksRevision++; setTasks(event.payload); setError('') })
      .then(unlisten => disposed ? unlisten() : (unlistenTasks = unlisten))
      .catch(() => {})
  })
  onCleanup(() => { disposed = true; window.removeEventListener('shollu-save', handleSave); unlistenTasks?.() })
  const saveList = async (next: ScheduledTask[]) => {
    setSaving(true); setError('')
    try { await invoke('save_tasks', { tasks: next }); tasksRevision++; setTasks(next); return true }
    catch { setError(id() ? 'Perubahan gagal disimpan. Coba lagi.' : 'Could not save changes. Try again.'); return false }
    finally { setSaving(false) }
  }
  const toggle = (task: ScheduledTask) => saveList(tasks().map(item => item.id === task.id ? { ...item, enabled: !item.enabled } : item))
  const remove = async (task: ScheduledTask) => {
    if (await saveList(tasks().filter(item => item.id !== task.id))) setSelected(null)
  }
  const updateForm = (patch: Partial<ReturnType<typeof emptyTask>>) => setForm(current => ({ ...current, ...patch }))
  const chooseTaskFile = async () => {
    try {
      const file = await invoke<string | null>('choose_task_file')
      if (file) updateForm({ file_path: file })
    } catch { setFormError(id() ? 'Pemilih berkas tidak tersedia.' : 'File picker is unavailable.') }
  }
  const add = async (event: SubmitEvent) => {
    event.preventDefault(); setFormError('')
    const value = form()
    if (!value.name.trim()) { setFormError(id() ? 'Nama pengingat wajib diisi.' : 'Enter a reminder name.'); return }
    if (['Info', 'Warning', 'MovingText'].includes(value.task_type) && !value.message.trim()) { setFormError(id() ? 'Isi pesan pengingat.' : 'Enter a reminder message.'); return }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)) { setFormError(id() ? 'Pilih waktu yang valid.' : 'Choose a valid time.'); return }
    if (value.frequency === 'Weekly' && (!Number.isInteger(value.day_of_week) || (value.day_of_week ?? 0) < 1 || (value.day_of_week ?? 0) > 7)) { setFormError(id() ? 'Pilih hari yang valid.' : 'Choose a valid weekday.'); return }
    if (['Monthly', 'Once'].includes(value.frequency) && (!Number.isInteger(value.day_of_month) || (value.day_of_month ?? 0) < 1 || (value.day_of_month ?? 0) > 31)) { setFormError(id() ? 'Tanggal harus antara 1 dan 31.' : 'Day of month must be from 1 to 31.'); return }
    if (value.frequency === 'Once' && (!Number.isInteger(value.month) || (value.month ?? 0) < 1 || (value.month ?? 0) > 12)) { setFormError(id() ? 'Bulan harus antara 1 dan 12.' : 'Month must be from 1 to 12.'); return }
    if (['Command', 'Multimedia'].includes(value.task_type) && !value.file_path) { setFormError(id() ? 'Pilih berkas untuk jenis pengingat ini.' : 'Choose a file for this reminder type.'); return }
    const candidate: ScheduledTask = {
      ...value, id: editingId() ?? crypto.randomUUID(), name: value.name.trim(), message: value.message.trim(),
      day_of_week: value.frequency === 'Weekly' ? value.day_of_week : null,
      day_of_month: ['Monthly', 'Once'].includes(value.frequency) ? value.day_of_month : null,
      month: value.frequency === 'Once' ? value.month : null,
      file_path: value.file_path || null, enabled: true,
    }
    const next = editingId() ? tasks().map(task => task.id === editingId() ? { ...candidate, enabled: task.enabled } : task) : [...tasks(), candidate]
    if (await saveList(next)) { setForm(emptyTask()); setFormOpen(false); setEditingId(null); setSelected(candidate.id) }
  }
  const edit = (task: ScheduledTask) => {
    setEditingId(task.id)
    setForm({ ...task })
    setFormOpen(true)
    setFormError('')
  }
  const cancelForm = () => { setFormOpen(false); setEditingId(null); setForm(emptyTask()); setFormError('') }
  const clock = (value?: number) => value == null || !Number.isFinite(value) ? '—' : formatHours(value)
  const togglePrayer = async (name: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha') => {
    const current = app.settings()?.adzan_prayers
    if (!current) return
    try { await app.saveSettings({ adzan_prayers: { ...current, [name]: !current[name] } }) }
    catch { setError(id() ? 'Pengaturan adzan gagal disimpan. Coba lagi.' : 'Could not save prayer alarm settings. Try again.') }
  }
  const frequencyLabel = (frequency: string) => ({ Daily: id() ? 'Setiap hari' : 'Daily', Weekly: id() ? 'Mingguan' : 'Weekly', Monthly: id() ? 'Bulanan' : 'Monthly', Once: id() ? 'Sekali' : 'Once', Start: id() ? 'Saat mulai' : 'At startup' }[frequency] ?? frequency)
  const typeLabel = (type: string) => ({ Info: id() ? 'Info' : 'Info', Warning: id() ? 'Peringatan' : 'Warning', MovingText: id() ? 'Teks berjalan' : 'Moving text', Command: id() ? 'Perintah' : 'Command', Shutdown: id() ? 'Matikan' : 'Shutdown', Hibernate: id() ? 'Hibernasi' : 'Hibernate', Multimedia: id() ? 'Multimedia' : 'Multimedia' }[type] ?? type)
  const inspectorContent = () => {
    const task = tasks().find(item => item.id === selected())
    if (!task) return <div class="inspector-empty"><span>◷</span><strong>{id() ? 'Detail pengingat' : 'Reminder details'}</strong><p>{id() ? 'Pilih pengingat untuk melihat jadwal dan aksinya.' : 'Select a reminder to view its schedule and action.'}</p><button class="u-button primary" onClick={() => setFormOpen(true)}>＋ {id() ? 'Buat baru' : 'Create new'}</button></div>
    return <div><div class="inspector-top"><div><span class="utility-kicker">{id() ? 'PENGINGAT' : 'REMINDER'}</span><h3>{task.name}</h3></div><button class="u-icon-button" aria-label={id() ? 'Tutup detail' : 'Close details'} onClick={() => setSelected(null)}>×</button></div><div class="inspector-detail"><span>{id() ? 'Jenis' : 'Type'}</span><strong>{typeLabel(task.task_type)}</strong></div><div class="inspector-detail"><span>{id() ? 'Jadwal' : 'Schedule'}</span><strong>{frequencyLabel(task.frequency)}</strong></div><div class="inspector-detail"><span>{id() ? 'Waktu' : 'Time'}</span><strong class="mono-time">{task.time}</strong></div><Show when={task.message}><div class="inspector-message"><span>{id() ? 'Pesan' : 'Message'}</span><p>{task.message}</p></div></Show><Show when={task.file_path}><div class="inspector-message"><span>{id() ? 'Berkas' : 'File'}</span><p class="file-path">{task.file_path}</p></div></Show><div class="inspector-actions"><button class="u-button" onClick={() => edit(task)}>{id() ? 'Ubah' : 'Edit'}</button><button class="u-button" onClick={() => void toggle(task)}>{task.enabled ? (id() ? 'Nonaktifkan' : 'Disable') : (id() ? 'Aktifkan' : 'Enable')}</button><button class="u-button danger" onClick={() => void remove(task)}>{id() ? 'Hapus' : 'Delete'}</button></div></div>
  }

  return <div class="utility-page task-page" classList={{ 'layout-ringkas': app.layoutMode() === 'ringkas' }}>
    <Show when={app.layoutMode() === 'tenang'}><Portal mount={document.getElementById('page-actions')!}><button class="u-button primary" onClick={() => { setFormOpen(true); setEditingId(null); setForm(emptyTask()); setFormError('') }}>＋ {id() ? 'Pengingat baru' : 'New reminder'}</button></Portal></Show>
    <section class="u-card prayer-alarm-card"><div class="u-card-heading"><div><h3>{id() ? 'Alarm waktu sholat' : 'Prayer alarms'}</h3><p>{id() ? 'Pilih waktu sholat untuk pengingat adzan.' : 'Choose which prayer times trigger the adhan.'}</p></div><button class={`u-switch ${app.settings()?.adzan_sound_enabled ? 'on' : ''}`} role="switch" aria-checked={app.settings()?.adzan_sound_enabled ?? false} aria-label={id() ? 'Aktifkan audio adzan' : 'Enable adhan audio'} onClick={() => void app.saveSettings({ adzan_sound_enabled: !app.settings()?.adzan_sound_enabled }).catch(() => setError(id() ? 'Pengaturan audio gagal disimpan.' : 'Could not save audio settings.'))}><i/></button></div><div class="prayer-alarm-grid"><For each={['fajr','sunrise','dhuhr','asr','maghrib','isha'] as const}>{name => { const allowed = name !== 'sunrise'; const enabled = () => allowed && !!app.settings()?.adzan_prayers?.[name as 'fajr'|'dhuhr'|'asr'|'maghrib'|'isha']; return <div class={`prayer-alarm-tile ${enabled() ? 'enabled' : ''} ${!allowed ? 'disabled' : ''}`}><div><span>{prayerLabel(name, props.lang)}</span><strong>{clock(app.todayTimes()?.[name])}</strong></div><button class={`u-switch ${enabled() ? 'on' : ''}`} disabled={!allowed} role="switch" aria-checked={enabled()} aria-label={`${prayerLabel(name, props.lang)}${!allowed ? (id() ? ' tidak tersedia untuk adzan' : ' (no adhan)') : ''}`} onClick={() => allowed && void togglePrayer(name as 'fajr'|'dhuhr'|'asr'|'maghrib'|'isha')}><i/></button><Show when={!allowed}><small>{id() ? 'Tanpa adzan' : 'No adhan'}</small></Show></div> }}</For></div><div class="prayer-alarm-foot"><span>{app.settings()?.adzan_file_path?.split(/[\\/]/).pop() || (id() ? 'Berkas audio belum dipilih' : 'No audio file selected')}</span><button class="u-button" onClick={() => app.navigate('settings')}>{id() ? 'Atur audio…' : 'Set up audio…'}</button></div></section>
    <div class="tasks-layout">
      <section class="u-card task-list-card"><div class="u-card-heading"><div><h3>{id() ? 'Pengingat kustom' : 'Custom reminders'}</h3><p>{tasks().filter(t => t.enabled).length} {id() ? 'aktif' : 'active'} · {tasks().length} {id() ? 'total' : 'total'}</p></div><div class="task-heading-actions"><Show when={app.layoutMode() === 'ringkas'}><button class="u-button primary" onClick={() => { setFormOpen(true); setEditingId(null); setForm(emptyTask()); setFormError('') }}>＋ {id() ? 'Baru' : 'New'}</button></Show><button class="u-icon-button" onClick={load} aria-label={id() ? 'Muat ulang' : 'Reload'} title={id() ? 'Muat ulang' : 'Reload'}>↻</button></div></div>
        <Show when={loading()}><div class="task-empty" aria-busy="true">{id() ? 'Memuat pengingat…' : 'Loading reminders…'}</div></Show>
        <Show when={!loading() && !tasks().length}><div class="task-empty"><span class="empty-glyph">◷</span><strong>{id() ? 'Belum ada pengingat' : 'No reminders yet'}</strong><span>{id() ? 'Buat pengingat untuk menampilkan aksi terjadwal di sini.' : 'Create a reminder to see its schedule here.'}</span><button class="u-button" onClick={() => setFormOpen(true)}>{id() ? 'Buat pengingat' : 'Create reminder'}</button></div></Show>
        <Show when={!loading() && tasks().length}><div class="task-items"><For each={tasks()}>{task => <div role="group" aria-label={task.name} tabindex="0" class={`task-item ${selected() === task.id ? 'selected' : ''}`} onClick={() => setSelected(task.id)} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setSelected(task.id) } }}>
          <span class={`task-type-icon type-${task.task_type.toLowerCase()}`}>{task.task_type === 'Shutdown' ? '⏻' : task.task_type === 'Multimedia' ? '♫' : task.task_type === 'Command' ? '⌘' : '◷'}</span>
          <span class="task-main"><strong>{task.name}</strong><span>{frequencyLabel(task.frequency)} · {task.time}{task.message ? ` · ${task.message}` : ''}</span></span>
          <span class={`task-badge badge-${task.task_type.toLowerCase()}`}>{typeLabel(task.task_type)}</span>
          <button disabled={saving()} class={`u-switch ${task.enabled ? 'on' : ''}`} role="switch" aria-checked={task.enabled} aria-label={`${task.enabled ? (id() ? 'Nonaktifkan ' : 'Disable ') : (id() ? 'Aktifkan ' : 'Enable ')}${task.name}`} onClick={event => { event.stopPropagation(); void toggle(task) }}><i/></button>
          <span class="task-chevron">›</span>
        </div>}</For></div></Show>
        <div class="tray-note"><span>ⓘ</span>{id() ? 'Pengingat tetap berjalan dari tray meski jendela ditutup.' : 'Reminders continue from the system tray when the window is closed.'}</div>
      </section>
      <aside class="u-card task-inspector"><Show when={formOpen()} fallback={inspectorContent()}>
          <form ref={formElement} class="task-form" onSubmit={add}><div class="inspector-top"><div><span class="utility-kicker">{editingId() ? (id() ? 'UBAH PENGINGAT' : 'EDIT REMINDER') : (id() ? 'PENGINGAT BARU' : 'NEW REMINDER')}</span><h3>{editingId() ? (id() ? 'Ubah pengingat' : 'Edit reminder') : (id() ? 'Buat pengingat' : 'Create reminder')}</h3></div><button type="button" class="u-icon-button" aria-label={id() ? 'Tutup formulir' : 'Close form'} onClick={cancelForm}>×</button></div>
            <label class="u-field">{id() ? 'Nama' : 'Name'}<input value={form().name} onInput={e => updateForm({ name: e.currentTarget.value })} placeholder={id() ? 'Nama pengingat' : 'Reminder name'} maxlength="80"/></label>
            <label class="u-field">{id() ? 'Jenis tindakan' : 'Action type'}<select value={form().task_type} onChange={e => updateForm({ task_type: e.currentTarget.value as TaskType })}><For each={taskTypes}>{type => <option value={type}>{typeLabel(type)}</option>}</For></select></label>
            <label class="u-field">{id() ? 'Frekuensi' : 'Frequency'}<select value={form().frequency} onChange={e => updateForm({ frequency: e.currentTarget.value as Frequency })}><For each={frequencies}>{frequency => <option value={frequency}>{frequencyLabel(frequency)}</option>}</For></select></label>
            <Show when={form().frequency !== 'Start'}><label class="u-field">{id() ? 'Waktu' : 'Time'}<input type="time" value={form().time} onInput={e => updateForm({ time: e.currentTarget.value })}/></label></Show>
            <Show when={form().frequency === 'Weekly'}><label class="u-field">{id() ? 'Hari' : 'Day'}<select value={form().day_of_week ?? 1} onChange={e => updateForm({ day_of_week: Number(e.currentTarget.value) })}><For each={weekdays}>{(day, i) => <option value={i() + 1}>{id() ? ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][i()] : day}</option>}</For></select></label></Show>
            <Show when={['Monthly', 'Once'].includes(form().frequency)}><label class="u-field">{id() ? 'Tanggal' : 'Day of month'}<input type="number" min="1" max="31" value={form().day_of_month ?? 1} onInput={e => updateForm({ day_of_month: Number(e.currentTarget.value) })}/></label></Show>
            <Show when={form().frequency === 'Once'}><label class="u-field">{id() ? 'Bulan' : 'Month'}<input type="number" min="1" max="12" value={form().month ?? 1} onInput={e => updateForm({ month: Number(e.currentTarget.value) })}/></label></Show>
            <Show when={['Info', 'Warning', 'MovingText'].includes(form().task_type)}><label class="u-field">{id() ? 'Pesan' : 'Message'}<textarea value={form().message} onInput={e => updateForm({ message: e.currentTarget.value })} rows="2" maxlength="240"/></label></Show>
            <Show when={['Command', 'Multimedia'].includes(form().task_type)}><div class="u-field"><label>{id() ? 'Berkas' : 'File'}</label><div class="file-picker"><span title={form().file_path ?? ''}>{form().file_path || (id() ? 'Belum ada berkas dipilih' : 'No file selected')}</span><button type="button" class="u-button" onClick={chooseTaskFile}>{id() ? 'Pilih…' : 'Choose…'}</button></div></div></Show>
            <Show when={formError()}><div class="u-alert error" role="alert">{formError()}</div></Show><button class="u-button primary full-button" type="submit" disabled={saving()}>{saving() ? (id() ? 'Menyimpan…' : 'Saving…') : (editingId() ? (id() ? 'Simpan perubahan' : 'Save changes') : (id() ? 'Simpan pengingat' : 'Save reminder'))}</button>
          </form>
        </Show>
        </aside>
    </div><Show when={error()}><div class="u-alert error" role="alert">{error()}<button onClick={load}>{id() ? 'Coba lagi' : 'Retry'}</button></div></Show>
  </div>
}
