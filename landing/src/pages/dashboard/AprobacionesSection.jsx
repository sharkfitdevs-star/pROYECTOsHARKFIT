import React, { useState, useEffect } from 'react';
import { getAccessToken } from '../../config/authStorage';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3005/api';

const ESTADO_COLORS = {
  pendiente: { background: 'rgba(251,191,36,0.15)', color: '#eab308' },
  aprobada: { background: 'rgba(34,197,94,0.15)', color: '#22c55e' },
  rechazada: { background: 'rgba(239,68,68,0.15)', color: '#ef4444' },
};
const PRIORIDAD_COLORS = {
  baja: '#60a5fa',
  media: '#fbbf24',
  alta: '#f87171',
  urgente: '#a21caf',
};
const TIPOS = ['vacaciones', 'compra', 'presupuesto', 'licencia', 'permiso', 'otro'];
const MODULOS = ['rrhh', 'inventario', 'compras', 'formacion', 'operaciones'];

export default function AprobacionesSection() {
  const [aprobaciones, setAprobaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ estado: '', tipo: '', modulo_origen: '' });
  const [contadores, setContadores] = useState({ pendientes: 0, aprobadas: 0, rechazadas: 0 });

  useEffect(() => {
    cargarAprobaciones();
    // eslint-disable-next-line
  }, [filtros]);

  async function cargarAprobaciones() {
    setLoading(true);
    try {
      const token = getAccessToken?.();
      const params = new URLSearchParams();
      if (filtros.estado) params.append('estado', filtros.estado);
      if (filtros.tipo) params.append('tipo', filtros.tipo);
      if (filtros.modulo_origen) params.append('modulo_origen', filtros.modulo_origen);
      const res = await fetch(`${API_BASE}/aprobaciones?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setAprobaciones(json.data || []);
      // Contadores
      const ahora = new Date();
      const mes = ahora.getMonth();
      const anio = ahora.getFullYear();
      setContadores({
        pendientes: (json.data || []).filter(a => a.estado === 'pendiente').length,
        aprobadas: (json.data || []).filter(a => a.estado === 'aprobada' && new Date(a.fecha_resolucion || 0).getMonth() === mes && new Date(a.fecha_resolucion || 0).getFullYear() === anio).length,
        rechazadas: (json.data || []).filter(a => a.estado === 'rechazada' && new Date(a.fecha_resolucion || 0).getMonth() === mes && new Date(a.fecha_resolucion || 0).getFullYear() === anio).length,
      });
    } catch (e) {
      setAprobaciones([]);
    }
    setLoading(false);
  }

  async function resolverAprobacion(id, estado) {
    const comentario = window.prompt('Comentario');
    if (!comentario) return;
    const token = getAccessToken?.();
    await fetch(`${API_BASE}/aprobaciones/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ estado, comentario_resolucion: comentario }),
    });
    cargarAprobaciones();
  }

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 18 }}>Aprobaciones</h2>
      {/* Counters */}
      <div style={{ display: 'flex', gap: 18, marginBottom: 24 }}>
        <div style={{ flex: 1, background: 'rgba(251,191,36,0.10)', borderRadius: 10, padding: 18, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#eab308' }}>{contadores.pendientes}</div>
          <div style={{ fontSize: 14, color: '#eab308', fontWeight: 600 }}>Pendientes</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(34,197,94,0.10)', borderRadius: 10, padding: 18, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#22c55e' }}>{contadores.aprobadas}</div>
          <div style={{ fontSize: 14, color: '#22c55e', fontWeight: 600 }}>Aprobadas mes</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(239,68,68,0.10)', borderRadius: 10, padding: 18, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#ef4444' }}>{contadores.rechazadas}</div>
          <div style={{ fontSize: 14, color: '#ef4444', fontWeight: 600 }}>Rechazadas mes</div>
        </div>
      </div>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <select value={filtros.estado} onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))} style={{ padding: 8, borderRadius: 6, border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="aprobada">Aprobada</option>
          <option value="rechazada">Rechazada</option>
        </select>
        <select value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))} style={{ padding: 8, borderRadius: 6, border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
          <option value="">Todos los tipos</option>
          {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <select value={filtros.modulo_origen} onChange={e => setFiltros(f => ({ ...f, modulo_origen: e.target.value }))} style={{ padding: 8, borderRadius: 6, border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
          <option value="">Todos los módulos</option>
          {MODULOS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
        </select>
      </div>
      {/* Tabla */}
      <div style={{ overflowX: 'auto', background: 'var(--color-surface-card, #fff)', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-card)', color: 'var(--color-text-secondary)' }}>
              <th style={{ padding: 10, textAlign: 'left' }}>Tipo</th>
              <th style={{ padding: 10, textAlign: 'left' }}>Solicitante</th>
              <th style={{ padding: 10, textAlign: 'left' }}>Título</th>
              <th style={{ padding: 10, textAlign: 'left' }}>Módulo</th>
              <th style={{ padding: 10, textAlign: 'left' }}>Prioridad</th>
              <th style={{ padding: 10, textAlign: 'left' }}>Fecha</th>
              <th style={{ padding: 10, textAlign: 'left' }}>Estado</th>
              <th style={{ padding: 10, textAlign: 'left' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#888' }}>Cargando...</td></tr>
            ) : aprobaciones.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: '#888' }}>Sin aprobaciones</td></tr>
            ) : (
              aprobaciones.map(a => (
                <tr key={a._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 10 }}>{a.tipo}</td>
                  <td style={{ padding: 10 }}>{a.solicitante}</td>
                  <td style={{ padding: 10 }}>{a.titulo}</td>
                  <td style={{ padding: 10 }}>{a.modulo_origen}</td>
                  <td style={{ padding: 10 }}>
                    <span style={{ background: PRIORIDAD_COLORS[a.prioridad], color: '#fff', borderRadius: 8, fontSize: 13, padding: '2px 8px', fontWeight: 600 }}>
                      {a.prioridad}
                    </span>
                  </td>
                  <td style={{ padding: 10 }}>{new Date(a.fecha_solicitud).toLocaleDateString('es-CL')}</td>
                  <td style={{ padding: 10 }}>
                    <span style={{ ...ESTADO_COLORS[a.estado], borderRadius: 8, fontSize: 13, padding: '2px 10px', fontWeight: 600 }}>
                      {a.estado.charAt(0).toUpperCase() + a.estado.slice(1)}
                    </span>
                  </td>
                  <td style={{ padding: 10 }}>
                    {a.estado === 'pendiente' && (
                      <>
                        <button onClick={() => resolverAprobacion(a._id, 'aprobada')} style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', marginRight: 6, cursor: 'pointer', fontWeight: 600 }}>Aprobar</button>
                        <button onClick={() => resolverAprobacion(a._id, 'rechazada')} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>Rechazar</button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
