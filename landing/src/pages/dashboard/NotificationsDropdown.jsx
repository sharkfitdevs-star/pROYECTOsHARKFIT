import { useState, useEffect, useRef } from 'react';
import 'bootstrap-icons/font/bootstrap-icons.css';
import AlertasService from '../../api/services/AlertasService';

const PRIORIDAD_COLOR = {
  urgente: { background: 'rgba(248,113,113,0.15)', color: '#fca5a5', border: '1px solid rgba(248,113,113,0.35)' },
  critica: { background: 'rgba(248,113,113,0.15)', color: '#fca5a5', border: '1px solid rgba(248,113,113,0.35)' },
  alta:    { background: 'rgba(251,191,36,0.15)', color: '#fde68a', border: '1px solid rgba(251,191,36,0.35)' },
  media:   { background: 'rgba(96,165,250,0.15)', color: '#93c5fd', border: '1px solid rgba(96,165,250,0.35)' },
  baja:    { background: 'var(--color-surface)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' },
};


export default function NotificationsDropdown({ onNavigateToAlertas }) {
  const [open, setOpen]       = useState(false);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef          = useRef(null);
  // token no es necesario; AlertasService maneja autorización internamente

  // ── Carga de alertas activas ────────────────────────────────────────────
  useEffect(() => {
    cargarAlertas();
    const interval = setInterval(cargarAlertas, 60000);
    return () => clearInterval(interval);
  }, []);

  async function cargarAlertas() {
    setLoading(true);
    try {
      const json = await AlertasService.getPendientes({ limit: 100 });
      const lista = (json.data || []).sort((a, b) => {
        const orden = { urgente: 5, critica: 5, alta: 3, media: 2, baja: 1 };
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
        <i className="bi bi-bell-fill" style={{ fontSize: "18px", color: "#f1f5f9" }}></i>

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
            background: '#0f2340',
            border: '1px solid #2d5a8e',
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
            borderBottom: '1px solid rgba(45,90,142,0.5)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            background: 'rgba(30,58,95,0.6)',
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
              borderTop: '1px solid rgba(45,90,142,0.5)',
              background: 'rgba(15,35,64,0.8)',
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

