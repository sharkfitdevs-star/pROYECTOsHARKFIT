import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

const PRIORIDAD_COLOR = {
  urgente: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' },
  alta:    { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' },
  media:   { background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' },
  baja:    { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' },
};

const ESTADOS_ACTIVOS = ['pendiente', 'en_proceso'];

export default function NotificationsDropdown({ onNavigateToAlertas }) {
  const [open, setOpen]       = useState(false);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef          = useRef(null);
  const { token }             = useAuth();

  // ── Carga de alertas activas ────────────────────────────────────────────
  useEffect(() => {
    cargarAlertas();
    const interval = setInterval(cargarAlertas, 60000);
    return () => clearInterval(interval);
  }, []);

  async function cargarAlertas() {
    setLoading(true);
    try {
      const authToken = token || localStorage.getItem('authToken');
      const res = await fetch('/api/alertas?limit=5000', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const lista = (json.data || json.alertas || [])
        .filter(a => ESTADOS_ACTIVOS.includes(a.status))
        .sort((a, b) => {
          const orden = { urgente: 4, alta: 3, media: 2, baja: 1 };
          return (orden[b.priority] || 0) - (orden[a.priority] || 0);
        });
      setAlertas(lista);
    } catch (e) {
      console.warn('[NotificationsDropdown] Error cargando alertas:', e.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Cerrar con click afuera y Escape ────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    function handleKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const total    = alertas.length;
  const resumen  = alertas.slice(0, 5);

  function handleNavegar(alertaId) {
    setOpen(false);
    onNavigateToAlertas(alertaId);
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>

      {/* ── Botón trigger ─────────────────────────────────────────── */}
      <button
        className="btn-icon"
        onClick={() => setOpen(p => !p)}
        aria-label={`Notificaciones — ${total} alertas activas`}
        aria-expanded={open}
        style={{
          outline: open ? '2px solid #cbd5e1' : 'none',
          outlineOffset: '2px',
        }}
      >
        {/* Icono campana SVG (reemplaza el texto vacío actual) */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="#f1f5f9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>

        {/* Badge dinámico */}
        {total > 0 && (
          <span className="notification-badge" style={{ background: '#3b82f6' }}>
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {/* ── Panel dropdown ────────────────────────────────────────── */}
      {open && (
        <div
          role="dialog"
          aria-label="Alertas activas"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 10px)',
            width: '340px',
            background: '#1e1e3a',
            border: '1px solid #93509e',
            borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'sfDropIn 0.14s ease-out',
          }}
        >
          {/* Header del panel */}
          <div style={{
            padding: '12px 16px 10px',
            borderBottom: '1px solid rgba(147,80,158,0.4)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            background: 'rgba(118,75,162,0.3)',
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>
                Alertas activas
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                {loading ? 'Cargando…' : `${total} alerta${total !== 1 ? 's' : ''} pendiente${total !== 1 ? 's' : ''}`}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#94a3b8', padding: '2px 4px', borderRadius: '4px',
                fontSize: '16px', lineHeight: 1,
              }}
            >×</button>
          </div>

          {/* Lista de alertas */}
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {resumen.length === 0 && !loading && (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>✓</div>
                <p style={{ margin: 0, fontSize: '13px' }}>No hay alertas activas</p>
              </div>
            )}
            {resumen.map((alerta, idx) => {
              const pColor = PRIORIDAD_COLOR[alerta.priority] || PRIORIDAD_COLOR.baja;
              return (
                <button
                  key={alerta._id || idx}
                  onClick={() => handleNavegar(alerta._id)}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '10px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: idx < resumen.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                    display: 'block',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    {/* Badge prioridad */}
                    <span style={{
                      ...pColor,
                      padding: '1px 7px',
                      borderRadius: '9999px',
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}>
                      {alerta.priority || '—'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Título */}
                      <p style={{
                        margin: 0,
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#f1f5f9',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {alerta.title || alerta.titulo || '(sin título)'}
                      </p>
                      {/* Meta */}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          Estado: <span style={{ color: '#94a3b8', fontWeight: 500 }}>{alerta.status}</span>
                        </span>
                        {alerta.type && (
                          <span style={{ fontSize: '11px', color: '#475569' }}>
                            · {alerta.type.replace(/_/g, ' ')}
                          </span>
                        )}
                        {(alerta.idBranch || alerta.sede) && (
                          <span style={{ fontSize: '11px', color: '#475569' }}>
                            · {alerta.idBranch || alerta.sede}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Flecha */}
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                      stroke="#475569" strokeWidth="2.5" style={{ marginTop: '3px', flexShrink: 0 }}>
                      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer — Ver todas */}
          {total > 0 && (
            <div style={{
              padding: '8px 16px',
              borderTop: '1px solid rgba(147,80,158,0.4)',
              background: 'rgba(118,75,162,0.15)',
            }}>
              <button
                onClick={() => handleNavegar(null)}
                style={{
                  width: '100%', background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                  color: '#a78bfa', padding: '3px 0', textAlign: 'center',
                  transition: 'color 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#c4b5fd'}
                onMouseLeave={e => e.currentTarget.style.color = '#a78bfa'}
              >
                Ver todas las alertas
                {total > 5 && (
                  <span style={{ color: '#475569', marginLeft: '4px', fontWeight: 400 }}>
                    (+{total - 5} más)
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Animación inline */}
      <style>{`
        @keyframes sfDropIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
