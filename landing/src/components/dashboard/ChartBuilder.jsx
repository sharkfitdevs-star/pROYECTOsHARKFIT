import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getAccessToken } from '../../config/authStorage';
const TIPOS = [{ tipo: 'bar', label: 'Barras', icon: 'bi-bar-chart' },{ tipo: 'line', label: 'Líneas', icon: 'bi-graph-up' },{ tipo: 'pie', label: 'Torta', icon: 'bi-pie-chart' },{ tipo: 'kpi', label: 'KPI', icon: 'bi-123' }];
const FUENTES = [{ key: 'VENTAS_MES', label: 'Ventas del Mes' },{ key: 'VENTAS_HOY', label: 'Ventas de Hoy' },{ key: 'CLIENTES_ACTIVOS', label: 'Clientes Activos' },{ key: 'CLIENTES_NUEVOS', label: 'Clientes Nuevos' }];
const MOCK = [{ name: 'Ene', value: 400 },{ name: 'Feb', value: 300 },{ name: 'Mar', value: 600 },{ name: 'Abr', value: 800 }];
const COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6'];
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3005/api';
const ChartBuilder = ({ isOpen, onClose, onSave }) => {
  const [tipo, setTipo] = useState('bar');
  const [fuente, setFuente] = useState('VENTAS_MES');
  const [titulo, setTitulo] = useState('');
  const [color, setColor] = useState('#10b981');
  const [leyenda, setLeyenda] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const renderPreview = () => {
    if (tipo === 'bar') return (<ResponsiveContainer width="100%" height={150}><BarChart data={MOCK}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip />{leyenda && <Legend />}<Bar dataKey="value" fill={color} /></BarChart></ResponsiveContainer>);
    if (tipo === 'line') return (<ResponsiveContainer width="100%" height={150}><LineChart data={MOCK}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip />{leyenda && <Legend />}<Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} /></LineChart></ResponsiveContainer>);
    if (tipo === 'pie') return (<ResponsiveContainer width="100%" height={150}><PieChart><Pie data={MOCK} dataKey="value" cx="50%" cy="50%" outerRadius={55}>{MOCK.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie>{leyenda && <Legend />}<Tooltip /></PieChart></ResponsiveContainer>);
    if (tipo === 'kpi') return (<div style={{ textAlign: 'center', padding: '1rem' }}><div style={{ fontSize: '2.5rem', fontWeight: 700, color: color }}>{1234}</div><div style={{ color: '#888' }}>{titulo || 'Métrica'}</div></div>);
    return null;
  };
  const guardar = async () => {
    if (!titulo.trim()) { setError('El título es obligatorio'); return; }
    setSaving(true); setError('');
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/dashboard/widgets`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ nombre: titulo, tipo, fuente_datos: fuente, color, mostrar_leyenda: leyenda, activo: true }) });
      if (!res.ok) throw new Error('Error al guardar');
      if (onSave) onSave();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--color-background-primary,#fff)', borderRadius: '12px', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>Agregar widget</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div style={{ minWidth: '110px', borderRight: '1px solid #eee', paddingRight: '1rem' }}>
            {TIPOS.map(t => (
              <button key={t.tipo} onClick={() => setTipo(t.tipo)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', width: '100%', padding: '0.6rem', marginBottom: '0.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer', background: tipo === t.tipo ? '#f0fdf4' : 'transparent', color: tipo === t.tipo ? '#10b981' : '#555' }}>
                <i className={`bi ${t.icon}`} style={{ fontSize: '1.3rem' }}></i>
                <span style={{ fontSize: '0.75rem' }}>{t.label}</span>
              </button>
            ))}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: '#666', display: 'block', marginBottom: '0.3rem' }}>Fuente de datos</label>
              <select value={fuente} onChange={e => setFuente(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd' }}>
                {FUENTES.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: '#666', display: 'block', marginBottom: '0.3rem' }}>Título</label>
              <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Nombre del widget" style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: '#666', display: 'block', marginBottom: '0.5rem' }}>Color</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {COLORS.map(c => <div key={c} onClick={() => setColor(c)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: c, cursor: 'pointer', border: color === c ? '3px solid #333' : '3px solid transparent' }} />)}
              </div>
            </div>
            {tipo !== 'kpi' && (<label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}><input type="checkbox" checked={leyenda} onChange={e => setLeyenda(e.target.checked)} /> Mostrar leyenda</label>)}
            <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '1rem', minHeight: '160px' }}>
              <p style={{ fontSize: '0.8rem', color: '#888', margin: '0 0 0.5rem' }}>Vista previa</p>
              {renderPreview()}
            </div>
            {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={onClose} disabled={saving} style={{ padding: '0.6rem 1.5rem', borderRadius: '6px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} style={{ padding: '0.6rem 1.5rem', borderRadius: '6px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>{saving ? 'Guardando...' : 'Guardar widget'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ChartBuilder;


