import { createSignal, createEffect, For, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";

interface TasksPageProps {
  lang: string;
}

interface ScheduledTask {
  id: string;
  name: string;
  task_type: string; // "Info", "Warning", "MovingText", "Command", "Shutdown", "Hibernate", "Multimedia"
  frequency: string; // "Daily", "Weekly", "Monthly", "Once", "Start"
  time: string;      // "HH:mm"
  day_of_week: number | null; // 1 = Sunday, 2 = Monday, ..., 7 = Saturday
  day_of_month: number | null; // 1..31
  month: number | null;        // 1..12
  message: string;
  file_path: string | null;
  enabled: bool;
}

export function TasksPage(props: TasksPageProps) {
  const [tasks, setTasks] = createSignal<ScheduledTask[]>([]);
  const [loading, setLoading] = createSignal<boolean>(false);

  // Form states for creating a new task
  const [name, setName] = createSignal<string>("");
  const [taskType, setTaskType] = createSignal<string>("Info");
  const [frequency, setFrequency] = createSignal<string>("Daily");
  const [time, setTime] = createSignal<string>("12:00");
  const [dayOfWeek, setDayOfWeek] = createSignal<number>(1); // Sunday
  const [dayOfMonth, setDayOfMonth] = createSignal<number>(1);
  const [month, setMonth] = createSignal<number>(1);
  const [message, setMessage] = createSignal<string>("");
  const [filePath, setFilePath] = createSignal<string>("");

  // Load all tasks from backend
  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await invoke<ScheduledTask[]>("list_tasks");
      setTasks(res);
    } catch (e) {
      console.error("Failed to load tasks:", e);
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    loadTasks();
  });

  // Toggle enabled/disabled state of a task
  const handleToggleTask = async (taskId: string) => {
    const list = tasks();
    const updated = list.map((t) => {
      if (t.id === taskId) {
        return { ...t, enabled: !t.enabled };
      }
      return t;
    });

    try {
      await invoke("save_tasks", { tasks: updated });
      setTasks(updated);
    } catch (e) {
      console.error("Failed to toggle task active state:", e);
    }
  };

  // Delete a task
  const handleDeleteTask = async (taskId: string) => {
    const confirmMsg = props.lang === "Indonesia"
      ? "Apakah Anda yakin ingin menghapus pengingat ini?"
      : "Are you sure you want to delete this task reminder?";
    if (!window.confirm(confirmMsg)) return;

    const list = tasks();
    const filtered = list.filter((t) => t.id !== taskId);

    try {
      await invoke("save_tasks", { tasks: filtered });
      setTasks(filtered);
    } catch (e) {
      console.error("Failed to delete task:", e);
    }
  };

  // Create a new task
  const handleAddTask = async (e: Event) => {
    e.preventDefault();
    if (!name().trim()) {
      alert(props.lang === "Indonesia" ? "Nama pengingat tidak boleh kosong!" : "Task name cannot be empty!");
      return;
    }

    const newTask: ScheduledTask = {
      id: String(Date.now()),
      name: name().trim(),
      task_type: taskType(),
      frequency: frequency(),
      time: time(),
      day_of_week: frequency() === "Weekly" ? dayOfWeek() : null,
      day_of_month: frequency() === "Monthly" || frequency() === "Once" ? dayOfMonth() : null,
      month: frequency() === "Once" ? month() : null,
      message: message().trim(),
      file_path: filePath().trim() ? filePath().trim() : null,
      enabled: true
    };

    const updated = [...tasks(), newTask];

    try {
      await invoke("save_tasks", { tasks: updated });
      setTasks(updated);
      
      // Clear form inputs
      setName("");
      setMessage("");
      setFilePath("");
      alert(props.lang === "Indonesia" ? "Pengingat berhasil ditambahkan!" : "Task successfully added!");
    } catch (e) {
      console.error("Failed to add new task:", e);
    }
  };

  const getTaskTypeColorClass = (type: string) => {
    switch (type) {
      case "Multimedia": return "badge-multimedia";
      case "Info": return "badge-info";
      case "Warning": return "badge-warning";
      case "Shutdown": return "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400";
      case "Hibernate": return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
      default: return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  return (
    <div class="content-scroll animate-fade-in space-y-4 max-w-2xl mx-auto">
      
      {/* Existing Tasks Listing */}
      <div class="space-y-2 select-none">
        <h3 class="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase select-none">
          {props.lang === "Indonesia" ? "Daftar Pengingat Aktif" : "Active Scheduled Alarms"}
        </h3>
        
        <Show when={tasks().length === 0}>
          <div class="card text-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-8 shadow-sm">
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {props.lang === "Indonesia"
                ? "Belum ada jadwal pengingat tambahan yang dibuat."
                : "No scheduled alarm tasks created yet."}
            </p>
          </div>
        </Show>

        <Show when={tasks().length > 0}>
          <div class="prayer-grid border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
            <For each={tasks()}>
              {(t) => (
                <div class="prayer-row grid p-3 task-row align-center select-none" style={{ "grid-template-columns": "1fr auto auto auto" }}>
                  <div class="gr-cell flex-col items-start gap-1 select-none">
                    <span class="font-bold text-[13px] text-slate-800 dark:text-slate-200">{t.name}</span>
                    <span class="text-[11px] text-slate-500 dark:text-slate-400">
                      {t.frequency} @ {t.time}
                      {t.message ? ` · "${t.message.substring(0, 20)}..."` : ""}
                    </span>
                  </div>
                  <div class="gr-cell justify-center">
                    <span class={`text-[10px] font-bold px-2 py-1 rounded select-none ${getTaskTypeColorClass(t.task_type)}`}>
                      {t.task_type}
                    </span>
                  </div>
                  {/* Enabled Toggle switch */}
                  <div class="gr-cell justify-center">
                    <div
                      onClick={() => handleToggleTask(t.id)}
                      class={`toggle-pill cursor-pointer ${t.enabled ? "active" : ""}`}
                    >
                      <div class="toggle-knob" />
                    </div>
                  </div>
                  <div class="gr-cell justify-end">
                    <button
                      onClick={() => handleDeleteTask(t.id)}
                      class="btn btn-ghost select-none text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-2 py-1"
                    >
                      {props.lang === "Indonesia" ? "Hapus" : "Delete"}
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>

      {/* Task Creation Form Editor */}
      <div class="card border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm space-y-4">
        <h4 class="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase select-none">
          {props.lang === "Indonesia" ? "Buat Pengingat Baru" : "Create New Alarm Task"}
        </h4>
        
        <form onSubmit={handleAddTask} class="space-y-3">
          <div class="field-row">
            <div class="field">
              <label class="field-label select-none">{props.lang === "Indonesia" ? "Nama Pengingat" : "Task Name"}</label>
              <input
                type="text"
                placeholder={props.lang === "Indonesia" ? "Contoh: Sholat Fajr" : "Example: Morning Fajr alert"}
                value={name()}
                onInput={(e) => setName(e.currentTarget.value)}
                class="field-input text-slate-800 dark:text-slate-200"
              />
            </div>
            <div class="field">
              <label class="field-label select-none">{props.lang === "Indonesia" ? "Tipe Tindakan" : "Action Type"}</label>
              <select
                value={taskType()}
                onChange={(e) => setTaskType(e.currentTarget.value)}
                class="date-select text-slate-800 dark:text-slate-200"
              >
                <option value="Info">{props.lang === "Indonesia" ? "Tampilkan Informasi" : "Show Information"}</option>
                <option value="Warning">{props.lang === "Indonesia" ? "Tampilkan Peringatan" : "Show Warning"}</option>
                <option value="Multimedia">{props.lang === "Indonesia" ? "Putar Suara (Adzan)" : "Play Sound (Adzan)"}</option>
                <option value="Command">{props.lang === "Indonesia" ? "Eksekusi Script/Command" : "Execute Command Script"}</option>
                <option value="Shutdown">{props.lang === "Indonesia" ? "Shutdown PC" : "Shutdown PC"}</option>
                <option value="Hibernate">{props.lang === "Indonesia" ? "Hibernate PC" : "Hibernate PC"}</option>
              </select>
            </div>
          </div>

          <div class="field-row">
            <div class="field">
              <label class="field-label select-none">{props.lang === "Indonesia" ? "Pemicu Waktu" : "Trigger Time"}</label>
              <input
                type="time"
                value={time()}
                onInput={(e) => setTime(e.currentTarget.value)}
                class="field-input text-slate-800 dark:text-slate-200"
              />
            </div>
            <div class="field">
              <label class="field-label select-none">{props.lang === "Indonesia" ? "Frekuensi" : "Frequency"}</label>
              <select
                value={frequency()}
                onChange={(e) => setFrequency(e.currentTarget.value)}
                class="date-select text-slate-800 dark:text-slate-200"
              >
                <option value="Daily">{props.lang === "Indonesia" ? "Setiap Hari" : "Daily"}</option>
                <option value="Weekly">{props.lang === "Indonesia" ? "Mingguan" : "Weekly"}</option>
                <option value="Monthly">{props.lang === "Indonesia" ? "Bulanan" : "Monthly"}</option>
                <option value="Once">{props.lang === "Indonesia" ? "Sekali Saja" : "Once"}</option>
                <option value="Start">{props.lang === "Indonesia" ? "Saat Aplikasi Start" : "When App Starts"}</option>
              </select>
            </div>
          </div>

          {/* Conditional Weekly Options */}
          <Show when={frequency() === "Weekly"}>
            <div class="field animate-fade-in">
              <label class="field-label select-none">{props.lang === "Indonesia" ? "Pilih Hari" : "Select Day of Week"}</label>
              <select
                value={dayOfWeek()}
                onChange={(e) => setDayOfWeek(parseInt(e.currentTarget.value))}
                class="date-select text-slate-800 dark:text-slate-200"
              >
                <option value={1}>{props.lang === "Indonesia" ? "Ahad" : "Sunday"}</option>
                <option value={2}>{props.lang === "Indonesia" ? "Senin" : "Monday"}</option>
                <option value={3}>{props.lang === "Indonesia" ? "Selasa" : "Tuesday"}</option>
                <option value={4}>{props.lang === "Indonesia" ? "Rabu" : "Wednesday"}</option>
                <option value={5}>{props.lang === "Indonesia" ? "Kamis" : "Thursday"}</option>
                <option value={6}>{props.lang === "Indonesia" ? "Jumat" : "Friday"}</option>
                <option value={7}>{props.lang === "Indonesia" ? "Sabtu" : "Saturday"}</option>
              </select>
            </div>
          </Show>

          {/* Conditional Monthly/Once Options */}
          <Show when={frequency() === "Monthly" || frequency() === "Once"}>
            <div class="field-row animate-fade-in">
              <div class="field">
                <label class="field-label select-none">{props.lang === "Indonesia" ? "Tanggal Bulanan (1-31)" : "Day of Month (1-31)"}</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dayOfMonth()}
                  onInput={(e) => setDayOfMonth(parseInt(e.currentTarget.value))}
                  class="field-input text-slate-800 dark:text-slate-200"
                />
              </div>
              <Show when={frequency() === "Once"}>
                <div class="field">
                  <label class="field-label select-none">{props.lang === "Indonesia" ? "Pilih Bulan" : "Select Month"}</label>
                  <select
                    value={month()}
                    onChange={(e) => setMonth(parseInt(e.currentTarget.value))}
                    class="date-select text-slate-800 dark:text-slate-200"
                  >
                    <option value={1}>1 - {props.lang === "Indonesia" ? "Januari" : "January"}</option>
                    <option value={2}>2 - {props.lang === "Indonesia" ? "Februari" : "February"}</option>
                    <option value={3}>3 - {props.lang === "Indonesia" ? "Maret" : "March"}</option>
                    <option value={4}>4 - {props.lang === "Indonesia" ? "April" : "April"}</option>
                    <option value={5}>5 - {props.lang === "Indonesia" ? "Mei" : "May"}</option>
                    <option value={6}>6 - {props.lang === "Indonesia" ? "Juni" : "June"}</option>
                    <option value={7}>7 - {props.lang === "Indonesia" ? "Juli" : "July"}</option>
                    <option value={8}>8 - {props.lang === "Indonesia" ? "Agustus" : "August"}</option>
                    <option value={9}>9 - {props.lang === "Indonesia" ? "September" : "September"}</option>
                    <option value={10}>10 - {props.lang === "Indonesia" ? "Oktober" : "October"}</option>
                    <option value={11}>11 - {props.lang === "Indonesia" ? "November" : "November"}</option>
                    <option value={12}>12 - {props.lang === "Indonesia" ? "Desember" : "December"}</option>
                  </select>
                </div>
              </Show>
            </div>
          </Show>

          {/* Conditional message field for Info/Warning alerts */}
          <Show when={taskType() === "Info" || taskType() === "Warning"}>
            <div class="field animate-fade-in">
              <label class="field-label select-none">{props.lang === "Indonesia" ? "Pesan Notifikasi" : "Notification Message"}</label>
              <textarea
                placeholder={props.lang === "Indonesia" ? "Ketik pesan alarm di sini..." : "Type custom alarm alert text here..."}
                value={message()}
                onInput={(e) => setMessage(e.currentTarget.value)}
                class="field-input text-slate-800 dark:text-slate-200 h-16 resize-none"
              />
            </div>
          </Show>

          {/* Conditional file path field for Command/Multimedia player */}
          <Show when={taskType() === "Multimedia" || taskType() === "Command"}>
            <div class="field animate-fade-in">
              <label class="field-label select-none">
                {taskType() === "Multimedia"
                  ? (props.lang === "Indonesia" ? "Path File Audio (MP3/WAV/OGG)" : "Audio File Path (MP3/WAV/OGG)")
                  : (props.lang === "Indonesia" ? "Script Command / Program Path" : "Script Command / Program Path")}
              </label>
              <input
                type="text"
                placeholder={
                  taskType() === "Multimedia"
                    ? (props.lang === "Indonesia" ? "C:\\Users\\...\\Downloads\\adzan.mp3" : "C:\\Users\\...\\Downloads\\adzan.mp3")
                    : (props.lang === "Indonesia" ? "echo 'Time to pray!'" : "echo 'Time to pray!'")
                }
                value={filePath()}
                onInput={(e) => setFilePath(e.currentTarget.value)}
                class="field-input text-slate-800 dark:text-slate-200"
              />
            </div>
          </Show>

          <div class="flex select-none justify-end pt-2">
            <button
              type="submit"
              class="btn btn-primary select-none text-xs font-semibold px-4 py-2"
            >
              {props.lang === "Indonesia" ? "Simpan Jadwal Pengingat" : "Save Task Reminder"}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
