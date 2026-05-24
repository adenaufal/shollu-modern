const { useState, useEffect } = React;

const NAV_ITEMS = [
  { id: 'main',     label: 'Main',     Icon: ClockIcon },
  { id: 'location', label: 'Location', Icon: MapPinIcon },
  { id: 'schedule', label: 'Schedule', Icon: CalendarIcon },
  { id: 'tasks',    label: 'Tasks',    Icon: CheckSquareIcon, badge: 3 },
  { id: 'convert',  label: 'Convert',  Icon: ArrowRightLeftIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
  { id: 'about',    label: 'About',    Icon: InfoIcon },
];

const PAGE_TITLES = {
  main: 'Main', location: 'Location', schedule: 'Schedule',
  tasks: 'Tasks', convert: 'Convert dates', settings: 'Settings', about: 'About',
};

function TweaksPanel({ theme, setTheme, accent, setAccent, collapsed, setCollapsed, onClose }) {
  const accents = [
    { id:'teal',    color:'oklch(0.72 0.17 208)' },
    { id:'indigo',  color:'oklch(0.67 0.18 270)' },
    { id:'emerald', color:'oklch(0.72 0.17 155)' },
    { id:'rose',    color:'oklch(0.70 0.18 10)' },
    { id:'slate',   color:'oklch(0.567 0.028 210)' },
  ];
  return (
    <div className="tweaks-panel visible">
      <div className="tweaks-header">
        Tweaks
        <button className="tweaks-close" onClick={onClose}>✕</button>
      </div>
      <div className="tweaks-body">
        <div>
          <div className="tweak-label">Theme</div>
          <div className="theme-btns">
            {['light','dark','sepia'].map(t => (
              <button key={t} className={`theme-btn${theme===t?' active':''}`} onClick={()=>setTheme(t)}>
                {t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="tweak-label">Accent</div>
          <div style={{display:'flex', gap:6}}>
            {accents.map(a => (
              <button key={a.id}
                style={{width:20,height:20,borderRadius:'50%',background:a.color,border: accent===a.id ? '2.5px solid var(--fg)' : '2px solid transparent',cursor:'pointer'}}
                onClick={()=>setAccent(a.id)}
              />
            ))}
          </div>
        </div>
        <div>
          <div className="tweak-label">Sidebar</div>
          <div className="theme-btns">
            <button className={`theme-btn${!collapsed?' active':''}`} onClick={()=>setCollapsed(false)}>Expanded</button>
            <button className={`theme-btn${collapsed?' active':''}`} onClick={()=>setCollapsed(true)}>Collapsed</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [page, setPage]         = useState('main');
  const [theme, setThemeState]  = useState('light');
  const [accent, setAccentState]= useState('teal');
  const [collapsed, setCollapsed] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);

  const setTheme = (t) => {
    setThemeState(t);
    document.documentElement.setAttribute('data-theme', t);
  };
  const setAccent = (a) => {
    setAccentState(a);
    document.documentElement.setAttribute('data-accent', a);
  };

  // Tweaks protocol
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const renderPage = () => {
    switch(page) {
      case 'main':     return <MainPage />;
      case 'location': return <LocationPage />;
      case 'schedule': return <SchedulePage />;
      case 'tasks':    return <TasksPage />;
      case 'convert':  return <ConvertPage />;
      case 'settings': return <SettingsPage theme={theme} setTheme={setTheme} accent={accent} setAccent={setAccent} />;
      case 'about':    return <AboutPage />;
      default:         return <MainPage />;
    }
  };

  return (
    <>
      <div className="app-window">
        {/* Sidebar */}
        <div className={`sidebar${collapsed ? ' collapsed' : ''}`}>
          <div className="sidebar-logo">
            <img src="../../assets/icon-32.png" alt="Shollu Modern"/>
            {!collapsed && (
              <div className="sidebar-logo-text">
                <div className="sidebar-logo-name">Shollu</div>
                <div className="sidebar-logo-sub">Modern</div>
              </div>
            )}
          </div>
          <nav>
            {NAV_ITEMS.map(({ id, label, Icon, badge }) => (
              <button key={id}
                className={`nav-item${page === id ? ' active' : ''}`}
                onClick={() => setPage(id)}
                title={collapsed ? label : undefined}
              >
                <div className="nav-icon"><Icon size={15}/></div>
                {!collapsed && <span>{label}</span>}
                {!collapsed && badge && <span className="nav-badge">{badge}</span>}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="tray-row">
              <div className="toggle-pill"><div className="toggle-knob"/></div>
              {!collapsed && <span>Tray icon</span>}
            </div>
            {!collapsed && (
              <button className="nav-item" style={{width:'100%', marginTop:2, fontSize:11}} onClick={() => setCollapsed(true)}>
                <div className="nav-icon"><ChevronLeftIcon size={13}/></div>
                <span>Collapse</span>
              </button>
            )}
            {collapsed && (
              <button className="nav-item" style={{width:'100%', marginTop:2, justifyContent:'center'}} onClick={() => setCollapsed(false)}>
                <div className="nav-icon"><ChevronRightIcon size={13}/></div>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="content-area">
          {page !== 'main' && (
            <div className="content-header">
              <div className="content-header-title">{PAGE_TITLES[page]}</div>
              <div style={{display:'flex', gap:6, alignItems:'center'}}>
                <button className="btn btn-ghost btn-sm" style={{fontSize:11, padding:'3px 8px'}}
                  onClick={() => setTweaksOpen(v => !v)}>
                  Tweaks
                </button>
              </div>
            </div>
          )}
          {renderPage()}
        </div>
      </div>

      {tweaksOpen && (
        <TweaksPanel
          theme={theme} setTheme={setTheme}
          accent={accent} setAccent={setAccent}
          collapsed={collapsed} setCollapsed={setCollapsed}
          onClose={() => {
            setTweaksOpen(false);
            window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
          }}
        />
      )}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
