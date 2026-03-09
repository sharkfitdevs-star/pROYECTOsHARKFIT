import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Dashboard.css';

const PRIORIDAD_ORDEN = { urgente: 4, alta: 3, media: 2, baja: 1 };

const PRIORIDAD_COLOR = {
  urgente: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' },
  alta:    { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' },
  media:   { background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' },
  baja:    { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' },
};

const ESTADO_COLOR = {
  pendiente:   { background: '#fef9c3', color: '#854d0e' },
  en_proceso:  { background: '#dbeafe', color: '#1e40af' },
  completada:  { background: '#dcfce7', color: '#166534' },
  cancelada:   { background: '#f3f4f6', color: '#6b7280' },
};

function Badge({ texto, style }) {
  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: 600,
      display: 'inline-block',
      ...style
    }}>{texto}</span>
  );
}

function calcularVencimiento(fechaLimite) {
  if (!fechaLimite) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const limite = new Date(fechaLimite);
  limite.setHours(0, 0, 0, 0);
  const diff = Math.round((limite - hoy) / (1000 * 60 * 60 * 24));
  if (diff === 0) return { texto: 'Vence hoy', vencida: false, hoy: true };
  if (diff < 0)  return { texto: `Vencida hace ${Math.abs(diff)} día${Math.abs(diff) > 1 ? 's' : ''}`, vencida: true, hoy: false };
  return { texto: `${diff} día${diff > 1 ? 's' : ''} restante${diff > 1 ? 's' : ''}`, vencida: false, hoy: false };
}

function exportarCSV(alertas) {
  const fecha = new Date().toISOString().slice(0, 10);
  const cabeceras = ['Prioridad','Titulo','Tipo','Evento','Responsable','Sede','Cliente','Fecha Limite','Estado','Creada'];
  const filas = alertas.map(a => [
    a.priority || '',
    (a.title || a.titulo || '').replace(/,/g, ';'),
    a.type || '',
    a.evento_disparador || '',
    a.responsable || '',
    a.idBranch || a.sede || '',
    a.cliente || '',
    a.dueDate || a.fecha_limite || '',
    a.status || '',
    a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''
  ]);
  const csv = [cabeceras, ...filas].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `alertas_operativas_${fecha}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const PAGE_SIZE = 50;

export default function AlertasSection() {
  const [alertas, setAlertas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [filtroActivo, setFiltroActivo] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [menuAbierto, setMenuAbierto] = useState(null);

  // Filtros
  const [busqueda, setBusqueda]           = useState('');
  const [filtroTipo, setFiltroTipo]       = useState('');
  const [filtroEstado, setFiltroEstado]   = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState('');
  const [filtroSede, setFiltroSede]       = useState('');
  const [filtroDesde, setFiltroDesde]     = useState('');
  const [filtroHasta, setFiltroHasta]     = useState('');

  const { token } = useAuth();

  useEffect(() => {
    cargarAlertas();
  }, []);

  async function cargarAlertas() {
    setCargando(true);
    setError(null);
    try {
      const authToken = token || localStorage.getItem('authToken');
      const res = await fetch('/api/alertas?limit=5000', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const lista = json.data || json.alertas || [];
      setAlertas(lista);
    } catch (e) {
      setError('Error cargando alertas: ' + e.message);
    } finally {
      setCargando(false);
    }
  }

  async function cambiarEstado(id, nuevoEstado) {
    try {
      const authToken = token || localStorage.getItem('authToken');
      const res = await fetch(`/api/alertas/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ status: nuevoEstado })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAlertas(prev => prev.map(a => a._id === id ? { ...a, status: nuevoEstado } : a));
      setMenuAbierto(null);
    } catch (e) {
      alert('Error al actualizar: ' + e.message);
    }
  }

  // ── Counters ────────────────────────────────────────────────────────────
  const contadores = useMemo(() => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    return {
      activas:     alertas.filter(a => ['pendiente','en_proceso'].includes(a.status)).length,
      vencidas:    alertas.filter(a => a.dueDate && new Date(a.dueDate) < hoy && a.status !== 'completada' && a.status !== 'cancelada').length,
      urgentes:    alertas.filter(a => a.priority === 'urgente' && ['pendiente','en_proceso'].includes(a.status)).length,
      en_proceso:  alertas.filter(a => a.status === 'en_proceso').length,
      completadas: alertas.filter(a => a.status === 'completada').length,
    };
  }, [alertas]);

  // ── Filtrado + ordenamiento ──────────────────────────────────────────────
  const filtradas = useMemo(() => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    let lista = [...alertas];

    // filtro de counter activo
    if (filtroActivo === 'activas')     lista = lista.filter(a => ['pendiente','en_proceso'].includes(a.status));
    if (filtroActivo === 'vencidas')    lista = lista.filter(a => a.dueDate && new Date(a.dueDate) < hoy && a.status !== 'completada' && a.status !== 'cancelada');
    if (filtroActivo === 'urgentes')    lista = lista.filter(a => a.priority === 'urgente' && ['pendiente','en_proceso'].includes(a.status));
    if (filtroActivo === 'en_proceso')  lista = lista.filter(a => a.status === 'en_proceso');
    if (filtroActivo === 'completadas') lista = lista.filter(a => a.status === 'completada');

    // filtros de barra
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter(a =>
        (a.title || a.titulo || '').toLowerCase().includes(q) ||
        (a.description || a.descripcion || '').toLowerCase().includes(q) ||
        (a.cliente || '').toLowerCase().includes(q)
      );
    }
    if (filtroTipo)      lista = lista.filter(a => a.type === filtroTipo);
    if (filtroEstado)    lista = lista.filter(a => a.status === filtroEstado);
    if (filtroPrioridad) lista = lista.filter(a => a.priority === filtroPrioridad);
    if (filtroSede)      lista = lista.filter(a => (a.idBranch || a.sede || '') === filtroSede);
    if (filtroDesde)     lista = lista.filter(a => a.createdAt && new Date(a.createdAt) >= new Date(filtroDesde));
    if (filtroHasta)     lista = lista.filter(a => a.createdAt && new Date(a.createdAt) <= new Date(filtroHasta));

    // ordenamiento: urgentes primero, luego por prioridad desc, luego por fecha desc
    lista.sort((a, b) => {
      const pa = PRIORIDAD_ORDEN[a.priority] || 0;
      const pb = PRIORIDAD_ORDEN[b.priority] || 0;
      if (pb !== pa) return pb - pa;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    return lista;
  }, [alertas, filtroActivo, busqueda, filtroTipo, filtroEstado, filtroPrioridad, filtroSede, filtroDesde, filtroHasta]);

  // ── Paginación ───────────────────────────────────────────────────────────
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const paginadas = filtradas.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  // Opciones únicas para selects
  const tiposUnicos = useMemo(() => [...new Set(alertas.map(a => a.type).filter(Boolean))], [alertas]);
  const sedesUnicas = useMemo(() => [...new Set(alertas.map(a => a.idBranch || a.sede).filter(Boolean))], [alertas]);

  function resetFiltros() {
    setBusqueda('');
    setFiltroTipo('');
    setFiltroEstado('');
    setFiltroPrioridad('');
    setFiltroSede('');
    setFiltroDesde('');
    setFiltroHasta('');
    setFiltroActivo(null);
    setPagina(1);
  }

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    function handleClick() { setMenuAbierto(null); }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>

      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Alertas Operativas</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => exportarCSV(filtradas)} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>
            Exportar CSV
          </button>
          <button onClick={cargarAlertas} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>
            Actualizar
          </button>
        </div>
      </div>

      {/* Counters */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {[
          { key: 'activas',     label: 'Activas',     color: '#1e40af', bg: '#dbeafe' },
          { key: 'vencidas',    label: 'Vencidas',    color: '#991b1b', bg: '#fee2e2' },
          { key: 'urgentes',    label: 'Urgentes',    color: '#92400e', bg: '#fef3c7' },
          { key: 'en_proceso',  label: 'En Proceso',  color: '#065f46', bg: '#d1fae5' },
          { key: 'completadas', label: 'Completadas', color: '#374151', bg: '#f3f4f6' },
        ].map(({ key, label, color, bg }) => (
          <div
            key={key}
            onClick={() => { setFiltroActivo(filtroActivo === key ? null : key); setPagina(1); }}
            style={{
              padding: '12px 18px',
              borderRadius: '10px',
              background: filtroActivo === key ? color : bg,
              color: filtroActivo === key ? '#fff' : color,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              border: `2px solid ${filtroActivo === key ? color : 'transparent'}`,
              transition: 'all 0.15s',
              userSelect: 'none',
            }}
          >
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{contadores[key]}</div>
            <div>{label}</div>
          </div>
        ))}
      </div>

      {/* Barra de filtros */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Buscar por título, descripción o cliente..."
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', minWidth: '220px', flex: 1 }}
        />
        <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPagina(1); }} style={selectStyle}>
          <option value="">Todos los tipos</option>
          {tiposUnicos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPagina(1); }} style={selectStyle}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="en_proceso">En proceso</option>
          <option value="completada">Completada</option>
          <option value="cancelada">Cancelada</option>
        </select>
        <select value={filtroPrioridad} onChange={e => { setFiltroPrioridad(e.target.value); setPagina(1); }} style={selectStyle}>
          <option value="">Todas las prioridades</option>
          <option value="urgente">Urgente</option>
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>
        <select value={filtroSede} onChange={e => { setFiltroSede(e.target.value); setPagina(1); }} style={selectStyle}>
          <option value="">Todas las sedes</option>
          {sedesUnicas.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={filtroDesde} onChange={e => { setFiltroDesde(e.target.value); setPagina(1); }} style={selectStyle} title="Creada desde" />
        <input type="date" value={filtroHasta} onChange={e => { setFiltroHasta(e.target.value); setPagina(1); }} style={selectStyle} title="Creada hasta" />
        <button onClick={resetFiltros} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#f9fafb', cursor: 'pointer', fontSize: '0.82rem', color: '#6b7280' }}>
          Limpiar
        </button>
      </div>

      {/* Estado de carga / error */}
      {cargando && <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Cargando alertas…</div>}
      {error    && <div style={{ padding: '12px', borderRadius: '8px', background: '#fee2e2', color: '#991b1b', marginBottom: '12px' }}>{error}</div>}

      {/* Tabla */}
      {!cargando && (
        <>
          <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Prioridad','Título','Tipo','Responsable','Sede','Vencimiento','Estado','Acciones'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginadas.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>
                      No hay alertas que coincidan con los filtros.
                    </td>
                  </tr>
                )}
                {paginadas.map((alerta, idx) => {
                  const venc = calcularVencimiento(alerta.dueDate || alerta.fecha_limite);
                  return (
                    <tr
                      key={alerta._id || idx}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        background: idx % 2 === 0 ? '#fff' : '#fafafa',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
                    >
                      <td style={{ padding: '10px 12px' }}>
                        <Badge texto={alerta.priority || '—'} style={PRIORIDAD_COLOR[alerta.priority] || {}} />
                      </td>
                      <td style={{ padding: '10px 12px', maxWidth: '260px' }}>
                        <div style={{ fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {alerta.title || alerta.titulo || '(sin título)'}
                        </div>
                        {alerta.cliente && <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>{alerta.cliente}</div>}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#6b7280' }}>{alerta.type || '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#6b7280' }}>{alerta.responsable || '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#6b7280' }}>{alerta.idBranch || alerta.sede || '—'}</td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        {venc ? (
                          <span style={{
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color: venc.vencida ? '#dc2626' : venc.hoy ? '#d97706' : '#059669',
                          }}>
                            {venc.texto}
                          </span>
                        ) : <span style={{ color: '#d1d5db' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Badge texto={alerta.status || '—'} style={ESTADO_COLOR[alerta.status] || {}} />
                      </td>
                      <td style={{ padding: '10px 12px', position: 'relative' }}>
                        <button
                          onClick={e => { e.stopPropagation(); setMenuAbierto(menuAbierto === alerta._id ? null : alerta._id); }}
                          style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '1rem', color: '#6b7280' }}
                        >
                          ···
                        </button>
                        {menuAbierto === alerta._id && (
                          <div
                            onClick={e => e.stopPropagation()}
                            style={{
                              position: 'absolute', right: '8px', top: '36px', zIndex: 50,
                              background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.10)', minWidth: '150px', overflow: 'hidden',
                            }}
                          >
                            {['pendiente','en_proceso','completada','cancelada'].map(estado => (
                              <button
                                key={estado}
                                onClick={() => cambiarEstado(alerta._id, estado)}
                                style={{
                                  display: 'block', width: '100%', padding: '8px 14px',
                                  textAlign: 'left', background: alerta.status === estado ? '#f0f9ff' : 'none',
                                  border: 'none', cursor: 'pointer', fontSize: '0.83rem',
                                  color: alerta.status === estado ? '#1e40af' : '#374151',
                                  fontWeight: alerta.status === estado ? 700 : 400,
                                }}
                              >
                                {estado.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
              <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} style={paginaBtnStyle}>← Anterior</button>
              <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Página {pagina} de {totalPaginas} · {filtradas.length} alertas</span>
              <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} style={paginaBtnStyle}>Siguiente →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Estilos auxiliares ──────────────────────────────────────────────────────
const selectStyle = {
  padding: '6px 10px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  fontSize: '0.85rem',
  background: '#fff',
  color: '#374151',
};

const paginaBtnStyle = {
  padding: '6px 14px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  background: '#fff',
  cursor: 'pointer',
  fontSize: '0.83rem',
  color: '#374151',
};
