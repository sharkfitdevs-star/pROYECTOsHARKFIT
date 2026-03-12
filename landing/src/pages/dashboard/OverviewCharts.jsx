import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { getAccessToken } from '../../config/authStorage'
import './OverviewCharts.css'

const BASE = import.meta.env.VITE_API_URL || '/api'

// ── Períodos disponibles ─────────────────────────────────────
const PERIODOS = [
  { label: '6 meses',       meses: 6   },
  { label: '1 año',         meses: 12  },
  { label: '1 año y medio', meses: 18  },
  { label: '2 años',        meses: 24  },
  { label: 'Todo',          meses: 999 },
]

// ── Fetch autenticado ────────────────────────────────────────
async function fetchHistorico(meses) {
  const token = getAccessToken()
  const res = await fetch(`${BASE}/dashboard/historico?meses=${meses}`, {
    headers: token ? { Authorization: 'Bearer ' + token } : {}
  })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return res.json()
}

// ── Tooltips ─────────────────────────────────────────────────
function TooltipMoney({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="ov-tooltip">
      <p className="ov-tooltip-label">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="ov-tooltip-row">
          {p.name}: <strong>${Number(p.value).toLocaleString('es-CL')}</strong>
        </p>
      ))}
    </div>
  )
}

function TooltipCount({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="ov-tooltip">
      <p className="ov-tooltip-label">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="ov-tooltip-row">
          {p.name}: <strong>{Number(p.value).toLocaleString('es-CL')}</strong>
        </p>
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="ov-skeleton">
      <div className="ov-skeleton-bar" style={{ width: '40%', height: '14px', marginBottom: '12px' }} />
      <div className="ov-skeleton-bar" style={{ width: '100%', height: '200px' }} />
    </div>
  )
}

// ── Selector de período ──────────────────────────────────────
function PeriodSelector({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
      {PERIODOS.map((p) => (
        <button
          key={p.meses}
          onClick={() => onChange(p.meses)}
          style={{
            padding: '4px 12px',
            fontSize: '0.78rem',
            borderRadius: '999px',
            border: '1px solid',
            cursor: 'pointer',
            transition: 'all 0.15s',
            borderColor:      value === p.meses ? '#a78bfa' : '#334155',
            background:       value === p.meses ? '#a78bfa20' : 'transparent',
            color:            value === p.meses ? '#a78bfa'   : '#94a3b8',
            fontWeight:       value === p.meses ? 600 : 400,
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────
export default function OverviewCharts({ ventasMes }) {
  const [ventasData,   setVentasData]   = useState([])
  const [clientesData, setClientesData] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [activeTab,    setActiveTab]    = useState('ventas')
  const [periodo,      setPeriodo]      = useState(6)

  // ── Carga datos reales al montar y al cambiar período ────
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchHistorico(periodo)
      .then((res) => {
        if (cancelled) return
        setVentasData(res.data?.ventas   || [])
        setClientesData(res.data?.clientes || [])
      })
      .catch((err) => {
        if (!cancelled) setError('No se pudieron cargar los datos: ' + err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [periodo]) // re-fetch cada vez que cambia el período

  const formatY = (v) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`
    return `$${v}`
  }

  const periodoLabel = PERIODOS.find(p => p.meses === periodo)?.label || ''

  return (
    <div className="ov-charts-wrapper">

      {/* ── Tabs ── */}
      <div className="ov-tabs">
        {['ventas', 'clientes'].map((tab) => (
          <button
            key={tab}
            className={`ov-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'ventas' ? '💰 Ventas' : '👥 Clientes'}
          </button>
        ))}
      </div>

      {/* ── Gráfico Ventas ── */}
      {activeTab === 'ventas' && (
        <div className="ov-chart-card">
          <div className="ov-chart-header">
            <div>
              <h3 className="ov-chart-title">Evolución de Ventas</h3>
              <p className="ov-chart-sub">Planes · Servicios — {periodoLabel}</p>
            </div>
            {ventasMes?.variacion != null && (
              <div className={`ov-badge ${parseFloat(ventasMes.variacion) >= 0 ? 'pos' : 'neg'}`}>
                {parseFloat(ventasMes.variacion) >= 0 ? '▲' : '▼'} {Math.abs(ventasMes.variacion)}% vs mes ant.
              </div>
            )}
          </div>

          {/* Selector de período */}
          <PeriodSelector value={periodo} onChange={setPeriodo} />

          {loading ? <ChartSkeleton /> : error ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0', fontSize: '0.85rem' }}>{error}</p>
          ) : ventasData.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0', fontSize: '0.85rem' }}>
              Sin datos de ventas para este período. Importa datos desde Excel.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={ventasData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradPlanes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradServicios" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#34d399" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0f" />
                <XAxis
                  dataKey="mes"
                  tick={{ fill: '#94a3b8', fontSize: periodo > 12 ? 10 : 12 }}
                  axisLine={false} tickLine={false}
                  interval={periodo > 18 ? 2 : 0}
                />
                <YAxis tickFormatter={formatY} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={62} />
                <Tooltip content={<TooltipMoney />} />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8', paddingTop: '8px' }}
                  formatter={(val) => val.charAt(0).toUpperCase() + val.slice(1)} />
                <Area type="monotone" dataKey="planes"    name="Planes"
                  stroke="#a78bfa" strokeWidth={2} fill="url(#gradPlanes)"
                  dot={{ fill: '#a78bfa', r: 2 }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="servicios" name="Servicios"
                  stroke="#34d399" strokeWidth={2} fill="url(#gradServicios)"
                  dot={{ fill: '#34d399', r: 2 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* ── Gráfico Clientes ── */}
      {activeTab === 'clientes' && (
        <div className="ov-chart-card">
          <div className="ov-chart-header">
            <div>
              <h3 className="ov-chart-title">Evolución de Clientes</h3>
              <p className="ov-chart-sub">Activos acumulados · Nuevos por mes — {periodoLabel}</p>
            </div>
          </div>

          {/* Selector de período */}
          <PeriodSelector value={periodo} onChange={setPeriodo} />

          {loading ? <ChartSkeleton /> : error ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0', fontSize: '0.85rem' }}>{error}</p>
          ) : clientesData.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0', fontSize: '0.85rem' }}>
              Sin datos de clientes para este período. Importa datos desde Excel.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={clientesData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0f" />
                <XAxis
                  dataKey="mes"
                  tick={{ fill: '#94a3b8', fontSize: periodo > 12 ? 10 : 12 }}
                  axisLine={false} tickLine={false}
                  interval={periodo > 18 ? 2 : 0}
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<TooltipCount />} />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8', paddingTop: '8px' }} />
                <Bar dataKey="activos" name="Activos" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                <Bar dataKey="nuevos"  name="Nuevos"  fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

    </div>
  )
}
