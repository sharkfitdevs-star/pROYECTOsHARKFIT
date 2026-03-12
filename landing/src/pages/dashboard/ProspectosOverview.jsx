import { useState, useEffect } from 'react'
import { fetchAuth } from '../../api/fetchAuth'
import './VentasSection.css'

function fmt(n) { return n == null ? '-' : Number(n).toLocaleString('es-CL') }

function DeltaBadge({ value }) {
  if (value == null) return null
  const pos = value >= 0
  return <span className={'vt-delta ' + (pos ? 'pos' : 'neg')}>{pos ? '+' : ''}{value}%</span>
}

function RankingList({ items }) {
  if (!items?.length) return <p className="vt-empty">Sin datos de sedes</p>
  return (
    <div className="vt-ranking-list">
      {items.map(s => (
        <div key={s.nombre} className="vt-ranking-item">
          <div className="vt-ranking-pos">{s.posicion}</div>
          <div className="vt-ranking-info">
            <span className="vt-ranking-nombre">{s.nombre}</span>
            <span className="vt-ranking-montos">
              Actual: {fmt(s.actual)} / Mes Pasado: {fmt(s.anterior)}
            </span>
          </div>
          <DeltaBadge value={s.variacion} />
        </div>
      ))}
    </div>
  )
}

export default function ProspectosOverview() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAuth('/api/dashboard/prospectos')
      
      .then(j => { if (j.success) setData(j.data); else setError(j.error) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="vt-loading">Cargando prospectos...</div>
  if (error) return <div className="vt-error">Error: {error}</div>
  if (!data) return null

  return (
    <div className="vt-section">
      <div className="vt-tabs">
        <span className="vt-tab active">PROSPECTOS</span>
      </div>
      <div className="vt-inner">
        <div className="vt-panel">
          <div className="vt-panel-header">CONTACTOS</div>
          <div className="vt-main-metric">
            <span className="vt-big-number">{fmt(data.contactos.total)}</span>
            <span className="vt-metric-label">VISITAS TOTALES</span>
            <span className="vt-metric-period">{data.contactos.periodo}</span>
            {data.contactos.variacion != null && (
              <div className="vt-variacion">
                <DeltaBadge value={data.contactos.variacion} />
                <span> En relación al mismo período del mes pasado</span>
              </div>
            )}
            <div className="vt-progress-wrap">
              <div className="vt-progress-bar pos" style={{ width: Math.min((data.contactos.total / Math.max(data.contactos.anterior, 1)) * 100, 100) + '%' }} />
            </div>
            <span className="vt-sub">Mes Actual {fmt(data.contactos.total)} / Mes Pasado {fmt(data.contactos.anterior)}</span>
          </div>
          <RankingList items={data.rankContactos} />
        </div>

        <div className="vt-panel">
          <div className="vt-panel-header">CONVERSIONES</div>
          <div className="vt-main-metric">
            <span className="vt-big-number">{fmt(data.conversiones.total)}</span>
            <span className="vt-metric-label">CANTIDAD DE CONVERSIONES</span>
            {data.conversiones.variacion != null && (
              <div className="vt-variacion">
                <DeltaBadge value={data.conversiones.variacion} />
                <span> En relación al mismo período del mes pasado</span>
              </div>
            )}
            <div className="vt-progress-wrap">
              {(data.conversiones.total > 0 || data.conversiones.anterior > 0) && <div className="vt-progress-bar pos" style={{ width: Math.min((data.conversiones.total / Math.max(data.conversiones.anterior, 1)) * 100, 100) + '%' }} />}
            </div>
            <span className="vt-sub">Mes Actual {fmt(data.conversiones.total)} / Mes Pasado {fmt(data.conversiones.anterior)}</span>
          </div>
          <RankingList items={data.rankConversiones} />
        </div>
      </div>
    </div>
  )
}


