/* Month schedule export (CSV, HTML, TXT), shared by Tenang Schedule and Ringkas Main. */
import { invoke, isTauri } from '@tauri-apps/api/core'
import { formatHours, prayerLabel, PRAYER_NAMES } from './helpers'
import type { PrayerTimes } from './helpers'

export type ExportFormat = 'csv' | 'html' | 'txt'
export interface ScheduleRow { iso: string; times: PrayerTimes }
export interface ExportContext { yearMonth: string; monthTitle: string; location: string; lang: string }

const KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
const TYPES: Record<ExportFormat, string> = {
  csv: 'text/csv;charset=utf-8',
  html: 'text/html;charset=utf-8',
  txt: 'text/plain;charset=utf-8',
}

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)

export function buildScheduleExport(format: ExportFormat, rows: ScheduleRow[], context: ExportContext) {
  const id = context.lang === 'Indonesia'
  const heading = id ? 'Jadwal Sholat' : 'Prayer schedule'
  let content: string
  if (format === 'csv') {
    content = [['Date', ...PRAYER_NAMES].join(','), ...rows.map(row => [row.iso, ...KEYS.map(key => formatHours(row.times[key]))].join(','))].join('\r\n')
  } else if (format === 'txt') {
    content = [`${heading} · ${context.monthTitle} · ${context.location}`, '', `${id ? 'Tanggal' : 'Date'}   ${PRAYER_NAMES.map(name => name.padEnd(9)).join(' ')}`,
      ...rows.map(row => `${row.iso}   ${KEYS.map(key => formatHours(row.times[key]).padEnd(9)).join(' ')}`)].join('\n')
  } else {
    const title = escapeHtml(context.monthTitle)
    const body = rows.map(row => `<tr><td>${row.iso}</td>${KEYS.map(key => `<td>${formatHours(row.times[key])}</td>`).join('')}</tr>`).join('')
    content = `<!doctype html><html lang="${id ? 'id' : 'en'}"><meta charset="utf-8"><title>Shollu · ${title}</title><style>body{font:14px system-ui;margin:40px;color:#25343a}h1{font-size:22px}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:8px;border-bottom:1px solid #ddd;font-variant-numeric:tabular-nums}th{background:#f5f8f8}button{margin:0 0 18px;padding:8px 12px;border:1px solid #ccd6d8;background:white;border-radius:6px;cursor:pointer}@media print{button{display:none}body{margin:0}}</style><h1>${heading} · ${title}</h1><p>${escapeHtml(context.location)}</p><button onclick="window.print()">${id ? 'Cetak' : 'Print'}</button><table><thead><tr><th>Date</th>${PRAYER_NAMES.map(name => `<th>${escapeHtml(prayerLabel(name, context.lang))}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></html>`
  }
  return { content, filename: `Shollu-${context.yearMonth}.${format}`, type: TYPES[format] }
}

/** Save through the native dialog in Tauri, or as a browser download in plain Vite. */
export async function saveScheduleExport(file: { content: string; filename: string; type: string }) {
  if (isTauri()) {
    await invoke<boolean>('save_export_file', { defaultName: file.filename, content: file.content })
    return
  }
  const url = URL.createObjectURL(new Blob([file.content], { type: file.type }))
  const link = document.createElement('a')
  link.href = url; link.download = file.filename; link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
