import { useState, useEffect } from 'react'
import { fetchAuth } from '../../api/fetchAuth'
import './VentasSection.css'

function fmt(n) {
  if (n == null) return '-'
  return Number(n).toLocaleString('es-CL')
}

function fmt$(n) {
  if (n == null) return '-'
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'K'
  return '$' + Number(n).toLocaleString('es-CL')
}

function DeltaBadge({ value }) {
  if (value == null) return null
  const pos = value >= 0
  return (
    <span className={'vt-delta ' + (pos ? 'pos' : 'neg')}>
      {pos ? '+' : ''}{value}%
    </span>
  )
}

function RankingList({ items, showDelta }) {
  if (!items || items.length === 0) return <p className="vt-empty">Sin datos de sedes</p>
  return (
    <div className="vt-ranking-list">
      {items.map(s => (
        <div key={s.nombre} className="vt-ranking-item">
          <div className="vt-ranking-pos">{s.posicion}</div>
          <div className="vt-ranking-info">
            <span className="vt-ranking-nombre">{s.nombre}</span>
            <span className="vt-ranking-montos">
              Actual: {fmt(s.actual)}
              {s.anterior != null && <span className="vt-sep"> / Mes Pasado: {fmt(s.anterior)}</span>}
            </span>
          </div>
          {showDelta && <DeltaBadge value={s.variacion} />}
        </div>
      ))}
    </div>
  )
}

export default function ClientesOverview() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('activos')

  useEffect(() => {
    fetchAuth('/api/dashboard/clientes')
      .then(res => {
        if (res?.success && res?.data) setData(res.data)
        else throw new Error(res?.error || 'Sin datos')
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="vt-skeleton"><div className="vt-skeleton-block" style={{ height: 200 }} /></div>
  if (error) return <div className="vt-error">Error: {error}</div>
  if (!data) return null

  const { clientesActivos, planes, ticketMedio, rankingActivos, rankingCancelados } = data

  return (
    <div className="vt-container" style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {['activos', 'planes'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '0.4rem 1rem', borderRadius: '20px', border: '1px solid',
              borderColor: tab === t ? '#a78bfa' : '#3d3d58',
              background: tab === t ? '#a78bfa22' : 'transparent',
              color: tab === t ? '#a78bfa' : '#94a3b8',
              fontSize: '0.82rem', fontWeight: tab === t ? 600 : 400, cursor: 'pointer'
            }}>
            {t === 'activos' ? 'Clientes Activos' : 'Planes'}
          </button>
        ))}
      </div>

      {tab === 'activos' && (
        <div className="vt-grid">
          <div className="vt-kpi-col">
            <span className="vt-kpi-label">CLIENTES ACTIVOS</span>
            <span className="vt-kpi-value">{fmt(clientesActivos.total)}</span>
            <span className="vt-kpi-sub">{clientesActivos.periodo}</span>
            {clientesActivos.variacion != null && (
              <div className="vt-variacion">
                <DeltaBadge value={clientesActivos.variacion} />
                <span className="vt-variacion-text">vs mes anterior</span>
              </div>
            )}
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#16162a', borderRadius: '8px', border: '1px solid #2d2d44' }}>
              <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '0 0 0.4rem 0', textTransform: 'uppercase' }}>Nuevos este mes</p>
              <p style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{fmt(clientesActivos.nuevosEsteMes)}</p>
              {clientesActivos.variacionNuevos != null && <DeltaBadge value={clientesActivos.variacionNuevos} />}
            </div>
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#16162a', borderRadius: '8px', border: '1px solid #2d2d44' }}>
              <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '0 0 0.4rem 0', textTransform: 'uppercase' }}>Ticket Medio</p>
              <p style={{ fontSize: '1.4rem', fontWeight: 700, color: '#a78bfa', margin: 0 }}>{fmt$(ticketMedio)}</p>
            </div>
          </div>
          <div className="vt-donut-col" style={{ gridColumn: 'span 2' }}>
            <span className="vt-col-label">RANKING DE SEDES</span>
            <RankingList items={rankingActivos} showDelta={true} />
          </div>
        </div>
      )}

      {tab === 'planes' && (
        <div className="vt-grid">
          <div className="vt-kpi-col">
            <span className="vt-kpi-label">PLANES ACTIVOS</span>
            <span className="vt-kpi-value">{fmt(planes.activos)}</span>
            {planes.variacionActivos != null && (
              <div className="vt-variacion">
                <DeltaBadge value={planes.variacionActivos} />
                <span className="vt-variacion-text">vs mes anterior</span>
              </div>
            )}
          </div>
          <div className="vt-kpi-col">
            <span className="vt-kpi-label">PLANES CANCELADOS</span>
            <span className="vt-kpi-value" style={{ color: '#f87171' }}>{fmt(planes.cancelados)}</span>
            {planes.variacionCancelados != null && (
              <div className="vt-variacion">
                <DeltaBadge value={planes.variacionCancelados} />
                <span className="vt-variacion-text">vs mes anterior</span>
              </div>
            )}
          </div>
          <div className="vt-ranking-col">
            <span className="vt-col-label">RANKING SEDES CANCELADOS</span>
            <RankingList items={rankingCancelados} showDelta={false} />
          </div>
        </div>
      )}
    </div>
  )
}