import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { fetchAuth } from '../../api/fetchAuth'
import './VentasSection.css'

const COLORS = ['#a78bfa', '#34d399', '#fb923c', '#60a5fa', '#f472b6']

function fmt$(n) {
  if (n == null) return '-'
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'K'
  return '$' + Number(n).toLocaleString('es-CL')
}

function fmtFull$(n) {
  return n != null ? '$' + Number(n).toLocaleString('es-CL') : '-'
}

function DeltaBadge({ value }) {
  if (value == null) return null
  const pos = value >= 0
  return <span className={'vt-delta ' + (pos ? 'pos' : 'neg')}>{pos ? 'A' : 'B'} {Math.abs(value)}%</span>
}

function ProgressBar({ actual, anterior }) {
  if (!anterior || anterior === 0) return null
  const pct = Math.min((actual / anterior) * 100, 200)
  const pos = actual >= anterior
  return (
    <div className="vt-progress-wrap">
      <div className={'vt-progress-bar ' + (pos ? 'pos' : 'neg')} style={{ width: Math.min(pct, 100) + '%' }} />
    </div>
  )
}

function CustomPieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="vt-tooltip">
      <p className="vt-tooltip-label">{d.name}</p>
      <p style={{ color: d.payload.fill }}>{fmtFull$(d.value)}</p>
    </div>
  )
}

export default function VentasOverview() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAuth('/api/dashboard/ventas')
      .then(res => {
        if (res?.success && res?.data) setData(res.data)
        else throw new Error(res?.error || 'Sin datos')
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="vt-skeleton"><div className="vt-skeleton-block" style={{height:200}} /></div>
  if (error) return <div className="vt-error">Error: {error}</div>
  if (!data) return null

  const { totalMes, composicion, ranking } = data
  const pieData = (composicion || []).map(c => ({ name: c._id, value: c.monto }))

  return (
    <div className="vt-container" style={{marginTop: '1.5rem'}}>
      <p className="vt-periodo">{totalMes.periodo}</p>
      <div className="vt-grid">
        <div className="vt-kpi-col">
          <span className="vt-kpi-label">TOTAL DE VENTAS</span>
          <span className="vt-kpi-value">{fmtFull$(totalMes.monto)}</span>
          <span className="vt-kpi-sub">{totalMes.cantidad} ventas registradas</span>
          {totalMes.variacion != null && (
            <div className="vt-variacion">
              <DeltaBadge value={totalMes.variacion} />
              <span className="vt-variacion-text">En relacion al mes pasado</span>
            </div>
          )}
          <ProgressBar actual={totalMes.monto} anterior={totalMes.montoAnterior} />
          <div className="vt-comparativa">
            <span>Actual: {fmtFull$(totalMes.monto)}</span>
            <span className="vt-sep"> / </span>
            <span>Mes Pasado: {fmtFull$(totalMes.montoAnterior)}</span>
          </div>
        </div>
        <div className="vt-donut-col">
          <span className="vt-col-label">COMPOSICION DE VENTAS</span>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {pieData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="vt-empty">Sin datos</p>}
        </div>
        <div className="vt-ranking-col">
          <span className="vt-col-label">RANKING DE SEDES</span>
          <div className="vt-ranking-list">
            {(ranking || []).length === 0 && <p className="vt-empty">Sin datos de sedes</p>}
            {(ranking || []).map(sede => (
              <div key={sede.nombre} className="vt-ranking-item">
                <div className="vt-ranking-pos">{sede.posicion}</div>
                <div className="vt-ranking-info">
                  <span className="vt-ranking-nombre">{sede.nombre}</span>
                  <span className="vt-ranking-montos">Actual: {fmt$(sede.montoActual)} / Mes Pasado: {fmt$(sede.montoAnterior)}</span>
                </div>
                <DeltaBadge value={sede.variacion} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}