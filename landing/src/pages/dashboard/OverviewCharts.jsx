import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import './OverviewCharts.css'

// ── Tooltip personalizado ────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
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

function BarTooltip({ active, payload, label }) {
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

// ── Skeleton loader ──────────────────────────────────────────────────
function ChartSkeleton() {
  return (
    <div className="ov-skeleton">
      <div className="ov-skeleton-bar" style={{ width: '40%', height: '14px', marginBottom: '12px' }} />
      <div className="ov-skeleton-bar" style={{ width: '100%', height: '180px' }} />
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────
export default function OverviewCharts({ ventasMes }) {
  const [chartData, setChartData] = useState(null)
  const [clientesData, setClientesData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ventas')

  useEffect(() => {
    // Genera datos de los últimos 6 meses basándose en el mes actual real
    // Si tenemos el dato del mes actual lo usamos, sino generamos tendencia
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    const now = new Date()
    const currentMonth = now.getMonth() // 0-11

    // Últimos 6 meses incluyendo el actual
    const last6 = Array.from({ length: 6 }, (_, i) => {
      const monthIdx = (currentMonth - 5 + i + 12) % 12
      return meses[monthIdx]
    })

    // Usamos el valor real del mes actual si está disponible
    const ventaActual = ventasMes?.monto ?? 7706250

    // Simulamos tendencia creciente hacia el mes actual
    // En producción esto vendría del endpoint /api/dashboard/ventas-historico
    const factores = [0.42, 0.51, 0.63, 0.71, 0.85, 1.0]
    const baseData = last6.map((mes, i) => ({
      mes,
      ventas: Math.round(ventaActual * factores[i]),
      planes: Math.round(ventaActual * factores[i] * 0.65),
      servicios: Math.round(ventaActual * factores[i] * 0.25),
    }))
    setChartData(baseData)

    // Datos clientes últimos 6 meses (misma lógica)
    const clientesBase = 38
    const clientesFact = [0.55, 0.63, 0.72, 0.80, 0.91, 1.0]
    const clientesMonth = last6.map((mes, i) => ({
      mes,
      activos: Math.round(clientesBase * clientesFact[i]),
      nuevos: Math.round(clientesBase * 0.15 * (0.5 + i * 0.1)),
    }))
    setClientesData(clientesMonth)

    setLoading(false)
  }, [ventasMes])

  const formatYAxis = (value) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
    return `$${value}`
  }

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
            {tab === 'ventas' ? '💰 Ventas (6 meses)' : '👥 Clientes (6 meses)'}
          </button>
        ))}
      </div>

      {/* ── Gráfico Ventas ── */}
      {activeTab === 'ventas' && (
        <div className="ov-chart-card">
          <div className="ov-chart-header">
            <div>
              <h3 className="ov-chart-title">Evolución de Ventas</h3>
              <p className="ov-chart-sub">Últimos 6 meses — Planes · Servicios</p>
            </div>
            {ventasMes?.variacion != null && (
              <div className={`ov-badge ${parseFloat(ventasMes.variacion) >= 0 ? 'pos' : 'neg'}`}>
                {parseFloat(ventasMes.variacion) >= 0 ? '▲' : '▼'} {Math.abs(ventasMes.variacion)}% vs mes ant.
              </div>
            )}
          </div>

          {loading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradPlanes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradServicios" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0f" />
                <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatYAxis} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', color: '#94a3b8', paddingTop: '8px' }}
                  formatter={(val) => val.charAt(0).toUpperCase() + val.slice(1)}
                />
                <Area type="monotone" dataKey="planes" name="Planes" stroke="#a78bfa" strokeWidth={2} fill="url(#gradPlanes)" dot={{ fill: '#a78bfa', r: 3 }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="servicios" name="Servicios" stroke="#34d399" strokeWidth={2} fill="url(#gradServicios)" dot={{ fill: '#34d399', r: 3 }} activeDot={{ r: 5 }} />
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
              <p className="ov-chart-sub">Activos totales y nuevos por mes</p>
            </div>
          </div>

          {loading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={clientesData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0f" />
                <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<BarTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8', paddingTop: '8px' }} />
                <Bar dataKey="activos" name="Activos" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                <Bar dataKey="nuevos" name="Nuevos" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

    </div>
  )
}
