import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer
} from 'recharts'
import { getAccessToken } from '../../config/authStorage'
import { fetchAuth } from '../../api/fetchAuth'

// local helper deleted; using centralized fetchAuth from api module

function TooltipText({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div style={{ background: '#1e293b', padding: '8px', color: '#f1f5f9', borderRadius: 4 }}>
      <p style={{ margin: 0 }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ margin: 0, color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
      Cargando gráfico...
    </div>
  )
}

export default function DynamicChart({ config }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!config?.dataSource) {
      setError('Este widget no tiene fuente de datos configurada.');
      setLoading(false);
      return;
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    const queryString = '' // no extra params currently
    fetchAuth(config.dataSource + queryString)
      .then(res => {
        if (cancelled) return
        // fetchAuth returns parsed JSON; extract requested key
        const keys = config.dataKey ? config.dataKey.split('.') : []
        let val = res?.data ?? res
        for (const k of keys) {
          if (val == null) break
          val = val[k]
        }
        setData(val ?? res?.data ?? res)
      })
      .catch(err => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [config])

  if (loading) return <Skeleton />
  if (error) return <div style={{ color: '#f87171', padding: '1rem' }}>Error: {error}</div>
  if (data == null) return null

  const stroke = config.color || '#a78bfa'
  const fill = config.color || '#a78bfa'

  const common = { data: Array.isArray(data) ? data : [data], stroke, fill }

  switch (config.type) {
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart {...common}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0f" />
            <XAxis dataKey="mes" tick={{ fill: '#94a3b8' }} />
            <YAxis tick={{ fill: '#94a3b8' }} />
            <ReTooltip content={<TooltipText />} />
            <Bar dataKey={Object.keys(common.data[0] || {})[1] || 'value'} fill={fill} />
          </BarChart>
        </ResponsiveContainer>
      )
    case 'line':
      return (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart {...common}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0f" />
            <XAxis dataKey="mes" tick={{ fill: '#94a3b8' }} />
            <YAxis tick={{ fill: '#94a3b8' }} />
            <ReTooltip content={<TooltipText />} />
            <Line type="monotone" dataKey={Object.keys(common.data[0] || {})[1] || 'value'} stroke={stroke} />
          </LineChart>
        </ResponsiveContainer>
      )
    case 'area':
      return (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart {...common}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0f" />
            <XAxis dataKey="mes" tick={{ fill: '#94a3b8' }} />
            <YAxis tick={{ fill: '#94a3b8' }} />
            <ReTooltip content={<TooltipText />} />
            <Area type="monotone" dataKey={Object.keys(common.data[0] || {})[1] || 'value'} stroke={stroke} fill={fill} />
          </AreaChart>
        </ResponsiveContainer>
      )
    case 'pie':
      return (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={common.data}
              dataKey={Object.keys(common.data[0] || {})[1] || 'value'}
              nameKey={Object.keys(common.data[0] || {})[0] || ''}
              outerRadius={60}
              fill={fill}
            />
            <ReTooltip content={<TooltipText />} />
          </PieChart>
        </ResponsiveContainer>
      )
    case 'kpi_card':
      // show number + variation + sparkline if array
      const val = Array.isArray(data) ? data[0] && Object.values(data[0])[1] : data
      return (
        <div style={{ color: stroke, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{val != null ? val : '-'}</div>
          {Array.isArray(data) && data.length > 1 && <LineChart width={100} height={40} data={data} style={{ margin: '0 auto' }}>
            <Line type="monotone" dataKey={Object.keys(data[0]||{})[1] || 'value'} stroke={stroke} dot={false} />
          </LineChart>}
        </div>
      )
    case 'heatmap':
      if (!Array.isArray(data) || data.length === 0) {
        return <div style={{ color: '#94a3b8', textAlign: 'center' }}>No hay datos de heatmap</div>
      }
      // assume data is [{day:0,hour0:val,...}] or similar; create simple grid
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24,1fr)', gap: '1px' }}>
          {data.map((row, i) => {
            const values = Object.values(row).filter(v => typeof v === 'number')
            return values.map((v, j) => {
              const intensity = Math.min(1, v / Math.max(...values))
              const bg = `rgba(167,139,250,${intensity})`
              return <div key={`${i}-${j}`} style={{ width: '100%', paddingTop: '100%', background: bg }} />
            })
          })}
        </div>
      )
    case 'sparkline':
      return (
        <ResponsiveContainer width="100%" height={60}>
          <LineChart {...common}>
            <Line type="monotone" dataKey={Object.keys(common.data[0] || {})[1] || 'value'} stroke={stroke} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )
    default:
      return <div>Tipo desconocido</div>
  }
}

