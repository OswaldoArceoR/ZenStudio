'use strict';

const { useState, useEffect } = React;

/**
 * Componente para el botón de cambio de tema (Claro/Oscuro).
 * Gestiona su propio estado y la lógica para aplicar el tema.
 */
function ThemeToggleButton() {
  // 1. Estado: 'theme' guarda el tema actual ('light' o 'dark').
  // Lo inicializamos desde localStorage o por defecto a 'light'.
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('zen_theme') || 'light';
  });

  // 2. Efecto: Se ejecuta cuando el estado 'theme' cambia.
  // Se encarga de actualizar el atributo en <html> y guardar en localStorage.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('zen_theme', theme);
  }, [theme]); // El efecto solo se re-ejecuta si 'theme' cambia.

  // 3. Función para cambiar el tema.
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // 4. Renderizado del botón.
  // Usamos el estado 'theme' para determinar qué icono mostrar.
  return (
    <button
      className="theme-toggle-btn"
      onClick={toggleTheme}
      title="Alternar Tema"
      aria-pressed={theme === 'dark'}
    >
      <svg id="moon-icon" className="icon-toggle" viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
      <svg id="sun-icon" className="icon-toggle" viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
    </button>
  );
}

// --- Simple Timer component (initial React integration) ---
function Timer() {
  const [minutes, setMinutes] = useState(() => {
    const v = parseInt(document.getElementById('minutes-input')?.value || '25', 10);
    return Number.isFinite(v) ? v : 25;
  });
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setSecondsLeft(minutes * 60);
  }, [minutes]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(id);
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  return (
    <div className="react-timer">
      <div style={{display:'flex', gap:8, alignItems:'center'}}>
        <label htmlFor="react-minutes">Minutos:</label>
        <input id="react-minutes" type="number" min={1} max={120} value={minutes}
               onChange={e => setMinutes(Math.max(1, Math.min(120, parseInt(e.target.value||'25',10))))} />
      </div>
      <div style={{margin:'8px 0', fontSize:'1.2rem'}}>{fmt(secondsLeft)}</div>
      <div style={{display:'flex', gap:8}}>
        <button className="action-btn primary-btn" onClick={() => setRunning(r => !r)}>{running ? 'Pause' : 'Start'}</button>
        <button className="action-btn secondary-btn" onClick={() => { setRunning(false); setSecondsLeft(minutes*60); }}>Reset</button>
      </div>
    </div>
  );
}

// --- Simple Notes component (initial React integration) ---
function Notes() {
  const LS_NOTES = 'zen_notes';
  const [text, setText] = useState(() => localStorage.getItem(LS_NOTES) || '');

  useEffect(() => {
    localStorage.setItem(LS_NOTES, text);
  }, [text]);

  return (
    <div className="react-notes">
      <textarea
        style={{width:'100%', minHeight:'120px'}}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Escribe tus notas rápidas aquí..."
      />
      <div style={{display:'flex', gap:8, marginTop:8}}>
        <button className="action-btn secondary-btn" onClick={() => setText(text + '\n- ')}>Lista</button>
        <button className="action-btn tertiary-btn" onClick={() => setText('')}>Limpiar</button>
      </div>
    </div>
  );
}

// --- Simple Sounds placeholder (hook into existing DOM later) ---
function Sounds() {
  const [list, setList] = useState([]); // {id,name,file}[]
  const [playing, setPlaying] = useState({}); // id -> HTMLAudioElement
  const [isMutedGlobally, setIsMutedGlobally] = useState(true);

  // Load global + user sounds from server
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [globalsRes, userRes] = await Promise.all([
          fetch('obtenerSonidosGlobalBlobs.php'),
          fetch('obtenerSonidosUsuario.php')
        ]);
        const globals = await globalsRes.json().catch(() => []);
        const userData = await userRes.json().catch(() => ({ success:false, sonidos:[] }));
        const globalSounds = Array.isArray(globals) ? globals.map(s => ({ id: 'global_' + s.id, name: s.nombre, file: s.url })) : [];
        const userSounds = (userData.success ? userData.sonidos : []).map(s => ({ id: 'srv_user_' + s.id, name: s.nombre, file: s.url }));
        if (mounted) setList([...globalSounds, ...userSounds]);
      } catch (_) {}
    }
    load();
    return () => { mounted = false; };
  }, []);

  // Sync global mute from button in topbar
  useEffect(() => {
    const btn = document.getElementById('sound-toggle');
    const handler = () => {
      const pressed = btn?.getAttribute('aria-pressed') === 'true';
      setIsMutedGlobally(pressed);
      Object.values(playing).forEach(a => { a.muted = pressed; });
    };
    btn?.addEventListener('click', handler);
    return () => btn?.removeEventListener('click', handler);
  }, [playing]);

  // Stop and mute all on visibility change
  useEffect(() => {
    const vis = () => {
      if (document.hidden) Object.values(playing).forEach(a => { try { a.pause(); a.currentTime = 0; a.muted = true; } catch(_){} });
    };
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, [playing]);

  function toggle(sound) {
    if (!window.__zenstudio_user_interacted) {
      return; // honor autoplay policy
    }
    const current = playing[sound.id];
    if (!current) {
      const audio = new Audio(sound.file);
      audio.loop = true;
      audio.muted = isMutedGlobally;
      audio.play().catch(() => {});
      setPlaying(prev => ({ ...prev, [sound.id]: audio }));
      // Persist selection on server
      try {
        const sid = parseInt(sound.id.replace(/^global_|^srv_user_/, ''), 10);
        if (Number.isInteger(sid)) {
          const body = sound.id.startsWith('global_') ? { sonido_global_id: sid, sonido_usuario_id: null } : { sonido_usuario_id: sid, sonido_global_id: null };
          fetch('guardarConfiguracion.php', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).catch(()=>{});
        }
      } catch(_) {}
    } else {
      try { current.pause(); current.currentTime = 0; } catch(_) {}
      const copy = { ...playing }; delete copy[sound.id];
      setPlaying(copy);
    }
  }

  function setVolume(soundId, v) {
    const a = playing[soundId];
    if (a) a.volume = v;
  }

  async function onUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type?.startsWith('audio/')) { alert('Selecciona un audio válido'); return; }
    const form = new FormData();
    form.append('sound', file);
    const r = await fetch('subirSonidoUsuario.php', { method:'POST', body: form });
    const result = await r.json().catch(()=>({ success:false }));
    if (result.success) {
      // reload user sounds
      try {
        const userRes = await fetch('obtenerSonidosUsuario.php');
        const userData = await userRes.json();
        const userSounds = (userData.success ? userData.sonidos : []).map(s => ({ id: 'srv_user_' + s.id, name: s.nombre, file: s.url }));
        setList(prev => {
          const globals = prev.filter(s => s.id.startsWith('global_'));
          return [...globals, ...userSounds];
        });
      } catch(_) {}
    } else {
      alert('No se pudo subir el sonido');
    }
  }

  async function deleteUser(soundId) {
    if (!soundId.startsWith('srv_user_')) return;
    const sid = parseInt(soundId.replace('srv_user_', ''), 10);
    if (!Number.isInteger(sid)) return;
    const ok = confirm('¿Eliminar este sonido?');
    if (!ok) return;
    const r = await fetch('eliminarSonidoUsuario.php', {
      method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body: new URLSearchParams({ id: String(sid) })
    });
    const data = await r.json().catch(()=>({ success:false }));
    if (data.success) {
      setList(prev => prev.filter(s => s.id !== soundId));
      const a = playing[soundId]; if (a) { try { a.pause(); a.currentTime=0; } catch(_){} }
      setPlaying(p => { const c={...p}; delete c[soundId]; return c; });
    } else {
      alert('No se pudo eliminar');
    }
  }

  return (
    <div className="react-sounds" style={{marginTop:8}}>
      <div style={{display:'flex', gap:8, marginBottom:8}}>
        <button className="action-btn secondary-btn" onClick={() => setIsMutedGlobally(m => { const n=!m; Object.values(playing).forEach(a=>a.muted=n); return n; })}>
          {isMutedGlobally ? 'Desmutear' : 'Mutear'}
        </button>
        <label className="action-btn tertiary-btn" style={{cursor:'pointer'}}>
          Subir Audio
          <input type="file" accept="audio/*" style={{display:'none'}} onChange={onUpload} />
        </label>
      </div>
      {list.length === 0 && <p style={{color:'var(--clr-text-muted)'}}>No hay sonidos disponibles.</p>}
      {list.map(s => {
        const isPlaying = !!playing[s.id];
        return (
          <div key={s.id} className={`sound-item ${isPlaying ? 'playing' : ''}`} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 0'}}>
            <div className="sound-info-group" style={{display:'flex', alignItems:'center', gap:8}}>
              <button className="sound-toggle-btn" onClick={() => toggle(s)} title={isPlaying ? 'Pausar' : 'Reproducir'}>
                {isPlaying ? (
                  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                )}
              </button>
              <span>{s.name}</span>
              {s.id.startsWith('srv_user_') && (
                <button className="delete-sound-btn" title="Eliminar" onClick={() => deleteUser(s.id)}>
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              )}
            </div>
            <div className="volume-control-group" style={{display: isPlaying ? 'flex' : 'none', alignItems:'center', gap:6}}>
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon></svg>
              <input type="range" min="0" max="1" step="0.01" defaultValue={0.5} onInput={e => setVolume(s.id, parseFloat(e.target.value))} />
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Simple Backgrounds placeholder ---
function Backgrounds() {
  return (
    <div className="react-backgrounds" style={{marginTop:8}}>
      <p style={{color:'var(--clr-text-muted)'}}>React activo: la galería de fondos se integrará aquí.</p>
    </div>
  );
}

// --- Mount selected components if root nodes exist ---
function mountIfPresent(id, element) {
  const rootEl = document.getElementById(id);
  if (rootEl) {
    const root = ReactDOM.createRoot(rootEl);
    root.render(element);
  }
}

// Auto-mount when document is ready
document.addEventListener('DOMContentLoaded', () => {
  mountIfPresent('react-root-timer', React.createElement(Timer));
  mountIfPresent('react-root-notes', React.createElement(Notes));
  mountIfPresent('react-root-sounds', React.createElement(Sounds));
  mountIfPresent('react-root-backgrounds', React.createElement(Backgrounds));
});