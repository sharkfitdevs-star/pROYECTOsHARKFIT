import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { v4 as uuidv4 } from 'uuid'
import { getAccessToken } from '../../config/authStorage'
import { fetchAuth } from '../../api/fetchAuth'

const BASE = import.meta.env.VITE_API_URL || '/api'

// NOTE: local `fetchJson` helper removed; `fetchAuth` handles authentication
// and already returns parsed JSON.

// ── Modal helper (copied from Clientes.jsx) ─────────────────
function Modal({ children, open, onClose }) {
  useEffect(() => {
    if (!open) return
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: 8,
        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        maxWidth: 720, width: '100%', padding: '1.5rem',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {children}
      </div>
    </div>
  )
}

// ── configuration data ─────────────────────────────────────
const CHART_TYPES = [
  { id: 'bar', name: 'Barras/Columnas', emoji: '📊', temporal: false },
  { id: 'line', name: 'Líneas', emoji: '📈', temporal: true },
  { id: 'area', name: 'Área', emoji: '🗻', temporal: true },
  { id: 'pie', name: 'Circular/Dona', emoji: '🥧', temporal: false },
  { id: 'kpi', name: 'Tarjeta KPI', emoji: '🔢', temporal: false },
  { id: 'heatmap', name: 'Mapa de Calor', emoji: '🌡️', temporal: false },
  { id: 'sparkline', name: 'Sparkline', emoji: '💠', temporal: true },
]

const DATA_SOURCES = {
  ventas: { url: `${BASE}/dashboard/ventas`, fields: ['totalMes.monto','composicion','ranking'], label:'Ventas del Mes' },
  historico: { url: `${BASE}/dashboard/historico`, fields: ['ventas[].total','ventas[].planes','clientes[].activos'], label:'Historial' },
  clientes: { url: `${BASE}/dashboard/clientes`, fields: ['clientesActivos.total','ticketMedio','planes'], label:'Clientes' },
  prospectos: { url: `${BASE}/dashboard/prospectos`, fields: ['contactos.total','conversiones.total','tasaConversion'], label:'Prospectos' },
  overview: { url: `${BASE}/dashboard/overview`, fields: ['ventasEsteMes.monto','clientesActivos.total','tasaConversion.porcentaje'], label:'Resumen' },
}

const PERIOD_OPTIONS = [
  { label: '3M', value: 3 },
  { label: '6M', value: 6 },
  { label: '1A', value: 12 },
]

// ── chart preview component ─────────────────────────────────
function ChartPreview({ type, sourceUrl, period, color }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!sourceUrl) return
    let cancelled = false
    setLoading(true); setError(null)
    fetchAuth(sourceUrl + (period ? `?meses=${period}` : ''))
      .then(res => { if (!cancelled) setData(res.data || res) })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [sourceUrl, period])

  if (!type || !sourceUrl) return null
  if (loading) return <p>Cargando vista previa...</p>
  if (error) return <p>Error: {error}</p>
  if (!data) return null

  // simplify: try to guess an array of objects for temporal charts
  const arr = Array.isArray(data) ? data : (data.ventas || data.clientes || data.contactos || data.ventasEsteMes ? [data] : [])

  const commonProps = { data: arr, margin: { top: 5, right: 20, left: 0, bottom: 5 } }
  const strokeColor = color || '#a78bfa'

  switch (type) {
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height={150}>
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip />
            <Bar dataKey={Object.keys(arr[0]||{})[1] || 'value'} fill={strokeColor} />
          </BarChart>
        </ResponsiveContainer>
      )
    case 'line':
    case 'area':
    case 'sparkline':
      const Comp = type === 'area' ? Area : Line
      const ChartComp = type === 'area' ? AreaChart : LineChart
      return (
        <ResponsiveContainer width="100%" height={150}>
          <ChartComp {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" hide={type==='sparkline'} />
            <YAxis hide={type==='sparkline'} />
            <Tooltip />
            <Comp type="monotone" dataKey={Object.keys(arr[0]||{})[1] || 'value'} stroke={strokeColor} fill={type==='area'?strokeColor:'none'} />
          </ChartComp>
        </ResponsiveContainer>
      )
    case 'pie':
      return (
        <ResponsiveContainer width="100%" height={150}>
          <PieChart>
            <Pie data={arr} dataKey={Object.keys(arr[0]||{})[1] || 'value'} nameKey={Object.keys(arr[0]||{})[0] || 'name'} outerRadius={60} fill={strokeColor} />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      )
    case 'kpi':
      const val = arr[0] && arr[0][Object.keys(arr[0])[1]]
      return <div style={{ fontSize: '2rem', textAlign: 'center', color: strokeColor }}>{val != null ? val : '-'}</div>
    case 'heatmap':
      return <div style={{ textAlign: 'center', color: '#94a3b8' }}>(vista previa no disponible)</div>
    default:
      return null
  }
}

// ── Main component ──────────────────────────────────────────
export default function ChartBuilder({ isOpen, onClose, onAdd }) {
  const [step, setStep] = useState(1)
  const [selectedType, setSelectedType] = useState(null)
  const [selectedSource, setSelectedSource] = useState(null)
  const [title, setTitle] = useState('')
  const [color, setColor] = useState('#a78bfa')
  const [period, setPeriod] = useState(6)

  const reset = () => {
    setStep(1); setSelectedType(null); setSelectedSource(null);
    setTitle(''); setColor('#a78bfa'); setPeriod(6)
  }

  const handleClose = () => {
    reset();
    onClose()
  }

  const handleAdd = () => {
    if (!selectedType || !selectedSource) return
    const widget = {
      id: uuidv4(),
      type: selectedType,
      title: title || CHART_TYPES.find(t=>t.id===selectedType)?.name,
      dataSource: selectedSource.url,
      dataKey: selectedSource.fields[0] || '',
      visible: true,
      size: 'medium',
      color,
      createdAt: new Date().toISOString(),
      isDefault: false,
    }
    onAdd(widget)
    handleClose()
  }

  if (!isOpen) return null

  return (
    <Modal open={isOpen} onClose={handleClose}>
      <h2>Nuevo widget</h2>
      <div style={{ marginTop: '1rem' }}>
        {step === 1 && (
          <div>
            <p>Selecciona el tipo de gráfico:</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: '12px' }}>
              {CHART_TYPES.map(t => (
                <button key={t.id} onClick={() => { setSelectedType(t.id); setStep(2) }}
                  style={{ padding: '12px', border: selectedType===t.id?'2px solid #a78bfa':'1px solid #ccc', borderRadius: 6, background: '#f9fafb', cursor: 'pointer' }}>
                  <div style={{ fontSize: '1.5rem' }}>{t.emoji}</div>
                  <div style={{ marginTop: '4px', fontSize: '0.85rem' }}>{t.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && selectedType && (
          <div>
            <p>Fuente de datos para <strong>{CHART_TYPES.find(t=>t.id===selectedType)?.name}</strong>:</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
              {Object.values(DATA_SOURCES).map(src => (
                <button key={src.url} onClick={() => { setSelectedSource(src); setStep(3) }}
                  style={{ padding: '10px', textAlign: 'left', border: '1px solid #ccc', borderRadius: 6, background: selectedSource===src?'#e5e7eb':'#fff' }}>
                  <strong>{src.label}</strong>
                  <div style={{ fontSize: '0.75rem', color: '#555' }}>{src.fields.join(', ')}</div>
                </button>
              ))}
            </div>
            <button style={{ marginTop: '1rem' }} onClick={() => setStep(1)}>← Volver</button>
          </div>
        )}

        {step === 3 && selectedType && selectedSource && (
          <div>
            <p>Configuración:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label>Título:
                <input value={title} onChange={e=>setTitle(e.target.value)} style={{ width: '100%' }} />
              </label>
              <label>Color:
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['#a78bfa','#34d399','#f87171','#fdba74','#60a5fa'].map(col => (
                    <div key={col} onClick={()=>setColor(col)}
                      style={{ width: '24px', height: '24px', borderRadius: '50%', background: col, cursor: 'pointer', border: color===col?'2px solid #000':'1px solid #ccc' }}></div>
                  ))}
                </div>
              </label>
              {CHART_TYPES.find(t=>t.id===selectedType)?.temporal && (
                <label>Período:
                  <select value={period} onChange={e=>setPeriod(Number(e.target.value))}>
                    {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              )}
            </div>
            <div style={{ margin: '1rem 0' }}>
              <strong>Vista previa:</strong>
              <ChartPreview type={selectedType} sourceUrl={selectedSource.url} period={CHART_TYPES.find(t=>t.id===selectedType)?.temporal ? period : null} color={color} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <button onClick={() => setStep(2)}>← Volver</button>
              <button onClick={handleAdd} style={{ background: '#2563eb', color: '#fff', padding: '6px 12px', border: 'none', borderRadius: 4 }}>Agregar</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
