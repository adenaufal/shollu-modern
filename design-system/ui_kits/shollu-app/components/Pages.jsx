const { useState } = React;

/* ─── Qibla Compass SVG ─── */
function QiblaCompass({ deg = 295, size = 52 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="24" stroke="var(--border)" strokeWidth="1.5" fill="var(--surface)"/>
      <text x="26" y="9" textAnchor="middle" fontSize="6" fontWeight="700" fill="var(--fg-muted)" fontFamily="Inter,sans-serif">N</text>
      <text x="26" y="47" textAnchor="middle" fontSize="6" fill="var(--fg-muted)" fontFamily="Inter,sans-serif">S</text>
      <text x="7" y="28" textAnchor="middle" fontSize="6" fill="var(--fg-muted)" fontFamily="Inter,sans-serif">W</text>
      <text x="46" y="28" textAnchor="middle" fontSize="6" fill="var(--fg-muted)" fontFamily="Inter,sans-serif">E</text>
      <g transform={`translate(26,26) rotate(${deg})`}>
        <polygon points="0,-18 2.5,-6 0,-9 -2.5,-6" fill="var(--accent-500)"/>
        <polygon points="0,18 2.5,6 0,9 -2.5,6" fill="var(--fg-muted)" opacity="0.35"/>
      </g>
      <circle cx="26" cy="26" r="2" fill="var(--fg-muted)"/>
    </svg>
  );
}

/* ─── Main Page ─── */
function MainPage() {
  const prayers = [
    { name: 'Fajr',    yday: '04:39', today: '04:39', tmrw: '04:38', done: true,  next: false },
    { name: 'Sunrise', yday: '05:58', today: '05:58', tmrw: '05:57', done: true,  next: false },
    { name: 'Dhuhr',   yday: '11:51', today: '11:51', tmrw: '11:51', done: true,  next: false },
    { name: 'Asr',     yday: '15:13', today: '15:23', tmrw: '15:23', done: false, next: true  },
    { name: 'Maghrib', yday: '17:46', today: '17:46', tmrw: '17:46', done: false, next: false },
    { name: 'Isha',    yday: '18:58', today: '18:58', tmrw: '18:58', done: false, next: false },
  ];

  return (
    <div>
      {/* Location strip */}
      <div className="location-strip">
        <div>
          <div className="location-name">Jakarta, Indonesia</div>
          <div className="location-coords">−6.21°, 106.85° · 7 m · WIB (+07:00)</div>
        </div>
        <div className="date-display">
          <div className="date-greg">Rab, 20 Mei 2026</div>
          <div className="date-hijri">2 Dzulqa'dah 1447 H</div>
        </div>
      </div>

      <div className="content-scroll">
        {/* Hero */}
        <div className="hero-section">
          <div className="hero-left">
            <div className="hero-eyebrow">Next prayer <span className="hero-gold-dot"/></div>
            <div className="hero-main">
              <span className="hero-prayer">Asr</span>
              <span className="hero-countdown">2h 14m</span>
            </div>
            <div className="hero-time">15:23 · ISNA · Shafi'i</div>
          </div>
          <div className="qibla-mini">
            <div className="qibla-label">Qibla</div>
            <QiblaCompass deg={295} size={52}/>
            <div className="qibla-deg">295° W-NW</div>
          </div>
        </div>

        {/* Prayer grid */}
        <div className="prayer-grid">
          <div className="prayer-grid-header">
            <div className="gh-cell">Prayer</div>
            <div className="gh-cell">Yesterday</div>
            <div className="gh-cell today">Today</div>
            <div className="gh-cell">Tomorrow</div>
          </div>
          {prayers.map(p => (
            <div key={p.name} className={`prayer-row${p.next ? ' is-next' : ''}`}>
              <div className="gr-cell name">{p.name}</div>
              <div className="gr-cell">{p.yday} {p.name !== 'Asr' && p.name !== 'Maghrib' && p.name !== 'Isha' ? <span className="done-check">✓</span> : null}</div>
              <div className="gr-cell">
                {p.next && <span className="next-dot"/>}
                <span className={p.next ? 'next-time' : ''}>{p.today}</span>
                {p.done && !p.next && <span className="done-check">✓</span>}
              </div>
              <div className="gr-cell">{p.tmrw}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Location Page ─── */
function LocationPage() {
  const [method, setMethod] = useState('isna');
  const methods = [
    { id: 'karachi', label: 'Karachi (Univ. of Islamic Science)' },
    { id: 'isna',    label: 'ISNA (North America)' },
    { id: 'mwl',     label: 'Muslim World League' },
    { id: 'ummq',    label: 'Umm Al-Qura (Saudi Arabia)' },
    { id: 'egypt',   label: 'Egypt General Survey' },
  ];
  return (
    <div className="content-scroll">
      <div className="card" style={{marginBottom:12}}>
        <div className="card-title">Area</div>
        <div className="field">
          <div className="field-label">Area name</div>
          <input className="field-input" defaultValue="Jakarta" />
        </div>
        <div className="field-row" style={{marginBottom:12}}>
          <div className="field">
            <div className="field-label">Latitude</div>
            <input className="field-input" defaultValue="-6.2088" />
          </div>
          <div className="field">
            <div className="field-label">Longitude</div>
            <input className="field-input" defaultValue="106.8456" />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <div className="field-label">Altitude (m)</div>
            <input className="field-input" defaultValue="7" />
          </div>
          <div className="field">
            <div className="field-label">Timezone</div>
            <select className="field-input">
              <option>UTC+07:00 (WIB)</option>
              <option>UTC+08:00 (WITA)</option>
              <option>UTC+09:00 (WIT)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <div className="card-title">Calculation method</div>
        <div className="radio-list">
          {methods.map(m => (
            <div key={m.id} className={`radio-opt${method === m.id ? ' checked' : ''}`} onClick={() => setMethod(m.id)}>
              <div className="radio-circ"/>
              <span>{m.label}</span>
            </div>
          ))}
        </div>
        <div style={{marginTop:12, display:'flex', gap:16, alignItems:'center'}}>
          <div style={{fontSize:12, fontWeight:600, color:'var(--fg-muted)'}}>Madhab (Asr)</div>
          <div className="radio-opt checked" style={{marginBottom:0}}>
            <div className="radio-circ"/><span style={{fontSize:13}}>Shafi'i</span>
          </div>
          <div className="radio-opt" style={{marginBottom:0}}>
            <div className="radio-circ"/><span style={{fontSize:13}}>Hanafi</span>
          </div>
        </div>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <div className="card-title">Adjustments (minutes)</div>
        <div className="field-row-3">
          {['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'].map(p => (
            <div key={p} className="field">
              <div className="field-label">{p}</div>
              <input className="field-input" defaultValue="0" style={{textAlign:'center'}}/>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:'flex', justifyContent:'flex-end', gap:8, paddingBottom:8}}>
        <button className="btn btn-secondary">Cancel</button>
        <button className="btn btn-primary">Save location</button>
      </div>
    </div>
  );
}

/* ─── Convert Page ─── */
function ConvertPage() {
  const [lang, setLang] = useState('id');
  return (
    <div className="content-scroll">
      <div className="card" style={{marginBottom:12}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
          <div className="card-title" style={{marginBottom:0}}>Masehi → Hijriah</div>
          <div className="lang-toggle">
            <button className={`lang-btn${lang==='id'?' active':''}`} onClick={()=>setLang('id')}>ID</button>
            <button className={`lang-btn${lang==='en'?' active':''}`} onClick={()=>setLang('en')}>EN</button>
          </div>
        </div>
        <div style={{fontSize:11, fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', color:'var(--fg-muted)', marginBottom:6}}>
          {lang==='id' ? 'Tanggal Masehi' : 'Gregorian Date'}
        </div>
        <div className="date-grid">
          <select className="date-select"><option>20</option></select>
          <select className="date-select"><option>Mei / May</option></select>
          <select className="date-select"><option>2026</option></select>
        </div>
        <div className="convert-arrow">⇅</div>
        <div style={{fontSize:11, fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', color:'var(--fg-muted)', marginBottom:6}}>
          {lang==='id' ? 'Tanggal Hijriah' : 'Hijri Date'}
        </div>
        <div className="date-grid">
          <select className="date-select"><option>2</option></select>
          <select className="date-select"><option>Dzulqa'dah</option></select>
          <select className="date-select"><option>1447</option></select>
        </div>
        <div className="result-box">
          <div className="result-day">{lang==='id' ? 'Hari' : 'Day of week'}</div>
          <div className="result-val">Rabu / Wednesday</div>
        </div>
        <div style={{marginTop:10, display:'flex', gap:8}}>
          <button className="btn btn-primary btn-sm">
            {lang==='id' ? 'Konversi' : 'Convert'}
          </button>
          <button className="btn btn-secondary btn-sm">
            {lang==='id' ? 'Hari ini' : 'Today'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">{lang==='id' ? 'Penyesuaian' : 'Adjustment'}</div>
        <div style={{display:'flex', alignItems:'center', gap:10, fontSize:13}}>
          <span style={{color:'var(--fg-muted)'}}>
            {lang==='id' ? 'Offset hari:' : 'Day offset:'}
          </span>
          <input className="field-input" defaultValue="0" style={{width:70, textAlign:'center'}}/>
          <span style={{fontSize:11, color:'var(--fg-muted)'}}>
            {lang==='id' ? '(−1 / 0 / +1)' : '(−1 / 0 / +1)'}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── About Page ─── */
function AboutPage() {
  const [lang, setLang] = useState('id');
  return (
    <div className="content-scroll">
      <div className="about-hero">
        <div className="about-icon"><img src="../../assets/icon.png" alt="Shollu Modern"/></div>
        <div className="about-title">Shollu Modern</div>
        <div className="about-ver">v0.1.0-dev · PolyForm Noncommercial 1.0.0</div>
      </div>

      <div style={{display:'flex', justifyContent:'center', marginBottom:12}}>
        <div className="lang-toggle">
          <button className={`lang-btn${lang==='id'?' active':''}`} onClick={()=>setLang('id')}>Indonesia</button>
          <button className={`lang-btn${lang==='en'?' active':''}`} onClick={()=>setLang('en')}>English</button>
        </div>
      </div>

      <div className="about-credit">
        <div className="about-credit-title">
          {lang==='id' ? 'Berdasarkan karya' : 'Based on work by'}
        </div>
        <div className="about-credit-name">Ebta Setiawan</div>
        <div style={{marginTop:4}}>
          <a className="about-credit-link" href="#">ebsoft.web.id</a>
          {' · '}
          <a className="about-credit-link" href="#">github.com/ebta/shollu</a>
        </div>
        <div className="about-body" style={{marginTop:8}}>
          {lang==='id'
            ? 'Shollu dikembangkan dari 2004 hingga 2012 oleh Ebta Setiawan sebagai pengingat waktu sholat freeware untuk Windows. Program asli (Delphi + KOL) berukuran ~276 KB.'
            : 'Shollu was developed from 2004 to 2012 by Ebta Setiawan as a freeware prayer-times reminder for Windows. The original program (Delphi + KOL) weighed just ~276 KB.'}
        </div>
      </div>

      <div className="about-credit">
        <div className="about-credit-title">
          {lang==='id' ? 'Modernisasi komunitas' : 'Community modernization'}
        </div>
        <div className="about-body">
          {lang==='id'
            ? 'Shollu Modern adalah reimplementasi open-source berbasis Tauri 2 + SolidJS untuk Windows, macOS, dan Linux. Perhitungan waktu sholat divalidasi terhadap Shollu v3.10 (delta maks 11 detik).'
            : 'Shollu Modern is an open-source reimplementation built on Tauri 2 + SolidJS for Windows, macOS, and Linux. Prayer-time calculations are validated against Shollu v3.10 (max delta 11 seconds).'}
        </div>
      </div>

      <div style={{textAlign:'center', marginTop:12, marginBottom:4}}>
        <button className="btn btn-secondary btn-sm">
          {lang==='id' ? 'Buka bantuan' : 'Open help'}
        </button>
      </div>
    </div>
  );
}

/* ─── Settings Page ─── */
function SettingsPage({ theme, setTheme, accent, setAccent }) {
  const accents = [
    { id:'teal',    color:'oklch(0.72 0.17 208)' },
    { id:'indigo',  color:'oklch(0.67 0.18 270)' },
    { id:'emerald', color:'oklch(0.72 0.17 155)' },
    { id:'rose',    color:'oklch(0.70 0.18 10)' },
    { id:'slate',   color:'oklch(0.567 0.028 210)' },
  ];
  return (
    <div className="content-scroll">
      <div className="settings-section">
        <div className="settings-title">Tampilan / Appearance</div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Tema / Theme</div>
            <div className="settings-row-sub">Light · Dark · Sepia</div>
          </div>
          <div style={{display:'flex', gap:4}}>
            {['light','dark','sepia'].map(t => (
              <button key={t} className={`theme-btn${theme===t?' active':''}`} onClick={()=>setTheme(t)}>
                {t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Accent color</div>
            <div className="settings-row-sub">Active: {accent}</div>
          </div>
          <div className="accent-dots">
            {accents.map(a => (
              <button key={a.id} className={`accent-dot-btn${accent===a.id?' active':''}`}
                style={{background: a.color}} onClick={()=>setAccent(a.id)}/>
            ))}
          </div>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Density</div>
            <div className="settings-row-sub">Comfortable / Compact</div>
          </div>
          <div style={{display:'flex',gap:4}}>
            <button className="theme-btn active">Comfortable</button>
            <button className="theme-btn">Compact</button>
          </div>
        </div>
      </div>
      <div className="settings-section">
        <div className="settings-title">Bahasa / Language</div>
        <div className="settings-row">
          <div className="settings-row-label">App language</div>
          <select className="field-input" style={{width:160, fontSize:12}}>
            <option>Follow OS (Bahasa Indonesia)</option>
            <option>Bahasa Indonesia</option>
            <option>English</option>
          </select>
        </div>
      </div>
      <div className="settings-section">
        <div className="settings-title">Audio</div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Adzan audio</div>
            <div className="settings-row-sub">adzan-default.mp3</div>
          </div>
          <button className="btn btn-secondary btn-sm">Browse…</button>
        </div>
        {['Fajr','Dhuhr','Asr','Maghrib','Isha'].map(p => (
          <div key={p} className="settings-row">
            <div className="settings-row-label" style={{fontSize:12}}>{p}</div>
            <div style={{display:'flex', gap:4}}>
              <button className="theme-btn active" style={{fontSize:10}}>Adzan</button>
              <button className="theme-btn" style={{fontSize:10}}>Silent</button>
            </div>
          </div>
        ))}
      </div>
      <div className="settings-section">
        <div className="settings-title">System</div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Start with system</div>
            <div className="settings-row-sub">Launch Shollu Modern on login</div>
          </div>
          <div className="toggle-pill" style={{cursor:'pointer'}}><div className="toggle-knob"/></div>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">Show tray icon</div>
          </div>
          <div className="toggle-pill" style={{cursor:'pointer'}}><div className="toggle-knob"/></div>
        </div>
      </div>
    </div>
  );
}

/* ─── Schedule Page ─── */
function SchedulePage() {
  return (
    <div className="content-scroll">
      <div className="card" style={{marginBottom:12}}>
        <div className="card-title">Date range</div>
        <div className="field-row" style={{marginBottom:10}}>
          <div className="field"><div className="field-label">From</div><input className="field-input" defaultValue="2026-05-01"/></div>
          <div className="field"><div className="field-label">To</div><input className="field-input" defaultValue="2026-05-31"/></div>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button className="btn btn-primary btn-sm">Generate</button>
          <button className="btn btn-secondary btn-sm">Export CSV</button>
          <button className="btn btn-secondary btn-sm">Export HTML</button>
        </div>
      </div>
      <div className="prayer-grid">
        <div className="prayer-grid-header" style={{gridTemplateColumns:'80px repeat(6,1fr)'}}>
          {['Date','Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'].map(h => (
            <div key={h} className="gh-cell" style={{fontSize:9}}>{h}</div>
          ))}
        </div>
        {['20 Mei','21 Mei','22 Mei'].map((d,i) => (
          <div key={d} className="prayer-row" style={{gridTemplateColumns:'80px repeat(6,1fr)'}}>
            <div className="gr-cell" style={{fontSize:11,color:'var(--fg-muted)',fontWeight:600}}>{d}</div>
            {['04:39','05:58','11:51','15:23','17:46','18:58'].map((t,j) => (
              <div key={j} className="gr-cell" style={{fontSize:12}}>{t}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Tasks Page ─── */
function TasksPage() {
  const tasks = [
    { id:1, name:'Adzan Fajr', type:'Multimedia', freq:'Harian', active:true },
    { id:2, name:'Pengingat Dhuhr', type:'Informasi', freq:'Harian', active:true },
    { id:3, name:'Alarm Asr', type:'Peringatan', freq:'Harian', active:false },
  ];
  const typeColors = {
    'Multimedia': 'oklch(0.95 0.05 145)',
    'Informasi':  'oklch(0.93 0.04 230)',
    'Peringatan': 'oklch(0.93 0.06 25)',
  };
  const typeFg = {
    'Multimedia': 'oklch(0.38 0.14 145)',
    'Informasi':  'oklch(0.38 0.12 230)',
    'Peringatan': 'oklch(0.40 0.18 25)',
  };
  return (
    <div className="content-scroll">
      <div style={{display:'flex', justifyContent:'flex-end', marginBottom:10}}>
        <button className="btn btn-primary btn-sm">+ New task</button>
      </div>
      <div className="prayer-grid" style={{marginBottom:12}}>
        {tasks.map(t => (
          <div key={t.id} className="prayer-row" style={{gridTemplateColumns:'1fr auto auto auto', padding:'0 4px'}}>
            <div className="gr-cell" style={{flexDirection:'column', alignItems:'flex-start', gap:2}}>
              <span style={{fontWeight:600, fontSize:13}}>{t.name}</span>
              <span style={{fontSize:11, color:'var(--fg-muted)'}}>{t.freq}</span>
            </div>
            <div className="gr-cell">
              <span style={{background:typeColors[t.type], color:typeFg[t.type], fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:5}}>{t.type}</span>
            </div>
            <div className="gr-cell">
              <div className="toggle-pill" style={{background: t.active ? 'var(--accent-500)' : 'var(--slate-300)', cursor:'pointer'}}>
                <div className="toggle-knob" style={{left: t.active ? 'auto' : 2, right: t.active ? 2 : 'auto'}}/>
              </div>
            </div>
            <div className="gr-cell">
              <button className="btn btn-ghost btn-sm">Edit</button>
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-title">New task</div>
        <div className="field-row" style={{marginBottom:10}}>
          <div className="field"><div className="field-label">Name</div><input className="field-input" placeholder="Task name"/></div>
          <div className="field"><div className="field-label">Type</div>
            <select className="field-input">
              <option>Informasi</option><option>Peringatan</option><option>Multimedia</option><option>Command</option>
            </select>
          </div>
        </div>
        <div className="field-row">
          <div className="field"><div className="field-label">Trigger</div>
            <select className="field-input">
              <option>Fajr</option><option>Dhuhr</option><option>Asr</option><option>Maghrib</option><option>Isha</option>
            </select>
          </div>
          <div className="field"><div className="field-label">Frequency</div>
            <select className="field-input">
              <option>Harian</option><option>Mingguan</option><option>Bulanan</option><option>Sekali</option>
            </select>
          </div>
        </div>
        <div style={{marginTop:10, display:'flex', gap:8, justifyContent:'flex-end'}}>
          <button className="btn btn-secondary btn-sm">Cancel</button>
          <button className="btn btn-primary btn-sm">Save task</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  MainPage, LocationPage, ConvertPage, AboutPage, SettingsPage, SchedulePage, TasksPage, QiblaCompass,
});
