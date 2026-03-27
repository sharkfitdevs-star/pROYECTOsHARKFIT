

import React, { useState, useEffect } from 'react';
import OverviewBIService from '../../services/OverviewBIService';
import './OverviewBI.css';
import {
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Tooltip, XAxis, YAxis, CartesianGrid, BarChart, Bar
} from 'recharts';

// Iconos Bootstrap Icons requeridos (asegúrate de tenerlos en el proyecto)
const KPI_ICONS = {
  ventaTotal: 'bi-cash-stack',
  clientesActivos: 'bi-people-fill',
  clientesNuevos: 'bi-person-plus-fill',
  bajasMes: 'bi-person-dash-fill',
};

function OverviewBI() {
  // Estados principales
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSemaforo, setExpandedSemaforo] = useState(null);
  const [tendenciaMetrica, setTendenciaMetrica] = useState('ventas');
  const [distribucionMetrica, setDistribucionMetrica] = useState('clientesPorStatus');
  // Generador BI
  const [biEntity, setBiEntity] = useState('');
  const [biFieldX, setBiFieldX] = useState('');
  const [biFieldY, setBiFieldY] = useState('');
  const [biAggregation, setBiAggregation] = useState('');
  const [biChartType, setBiChartType] = useState('bar');
  const [biData, setBiData] = useState(null);
  const [biLoading, setBiLoading] = useState(false);

  // Cargar datos al montar
  useEffect(() => {
    setLoading(true);
    setError(null);
    OverviewBIService.getOverviewBI()
      .then(res => {
        if (res && res.success) setData(res.data);
        else setError('Error al cargar datos');
      })
      .catch(() => setError('Error al cargar datos'))
      .finally(() => setLoading(false));
  }, []);

  // 1. KPIs principales
  const renderKPIs = () => {
    if (loading) return <div className="cc-kpi-grid">{Array(4).fill(0).map((_,i) => <div className="cc-kpi skeleton" key={i}/>)}</div>;
    if (error || !data?.kpis) return null;
    const kpis = [
      {
        key: 'ventaTotal',
        label: 'Venta Total',
        icon: KPI_ICONS.ventaTotal,
        value: data.kpis.ventaTotal?.monto || 0,
        variation: data.kpis.ventaTotal?.variacion,
        format: 'currency',
        subtitle: data.kpis.ventaTotal?.detalle,
      },
      {
        key: 'clientesActivos',
        label: 'Clientes Activos',
        icon: KPI_ICONS.clientesActivos,
        value: data.kpis.clientesActivos?.total || 0,
        variation: data.kpis.clientesActivos?.variacion,
        format: 'number',
        subtitle: data.kpis.clientesActivos?.detalle,
      },
      {
        key: 'clientesNuevos',
        label: 'Clientes Nuevos',
        icon: KPI_ICONS.clientesNuevos,
        value: data.kpis.clientesNuevos?.total || 0,
        variation: data.kpis.clientesNuevos?.variacion,
        format: 'number',
        subtitle: data.kpis.clientesNuevos?.detalle,
      },
      {
        key: 'bajasMes',
        label: 'Bajas del Mes',
        icon: KPI_ICONS.bajasMes,
        value: data.kpis.bajasMes?.total || 0,
        variation: data.kpis.bajasMes?.variacion,
        format: 'number',
        subtitle: data.kpis.bajasMes?.detalle,
      },
    ];
    return (
      <div className="cc-kpi-grid">
        {kpis.map((kpi, i) => (
          <div className="cc-kpi" key={kpi.key}>
            <div className="cc-kpi-ico"><i className={`bi ${kpi.icon}`}/></div>
            <div className="cc-kpi-lbl">{kpi.label}</div>
            <div className="cc-kpi-val">{kpi.format === 'currency' ? OverviewBIService.formatCurrency(kpi.value) : kpi.value}</div>
            {kpi.variation !== undefined && (
              <span className={`cc-var ${kpi.variation > 0 ? 'cc-var--success' : kpi.variation < 0 ? 'cc-var--danger' : 'cc-var--neutral'}`}>{kpi.variation > 0 ? '+' : ''}{kpi.variation}%</span>
            )}
            {kpi.subtitle && <div className="cc-kpi-sub">{kpi.subtitle}</div>}
            <div style={{width:'100%',height:32,marginTop:6}}>
              <ResponsiveContainer width="100%" height={32}>
                <AreaChart data={data.sparklines?.[i] || []} margin={{top:8,right:0,left:0,bottom:0}}>
                  <Area type="monotone" dataKey="v" stroke="#6366f1" fill="#6366f1" fillOpacity={0.13} strokeWidth={2} dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 2. Indicadores de porcentaje (barras)
  const renderIndicadores = () => {
    if (loading) return <div className="cc-ind-grid">{Array(4).fill(0).map((_,i) => <div className="cc-ind skeleton" key={i}/>)}</div>;
    if (error || !data?.indicadores) return null;
    return (
      <div className="cc-ind-grid">
        {data.indicadores.map((ind, i) => (
          <div className={`cc-ind cc-ind--${ind.tipo || 'success'}`} key={i}>
            <span className="cc-ind-lbl">{ind.label}</span>
            <span className={`cc-ind-val cc-ind-val--${ind.tipo || 'success'}`}>{ind.valor}%</span>
            {ind.detalle && <span className="cc-ind-det">{ind.detalle}</span>}
            <div className="cc-bar"><div className="cc-bar-fill" style={{width: `${ind.valor}%`}}/></div>
          </div>
        ))}
      </div>
    );
  };

  // 3. Funnel comercial
  const renderFunnel = () => {
    if (loading) return <div className="cc-funnel"><div className="skeleton" style={{width:'100%',height:48}}/></div>;
    if (error || !data?.funnelComercial) return null;
    const funnelArr = Array.isArray(data.funnelComercial) ? data.funnelComercial : Object.values(data.funnelComercial);
    return (
      <div className="cc-funnel">
        {funnelArr.map((stage, i) => (
          <div className="cc-funnel-step" key={i} style={{minWidth:60}}>
            <span className="cc-funnel-num">{stage.valor}</span>
            <span className="cc-funnel-lbl">{stage.label}</span>
            {i < funnelArr.length-1 && <span className="cc-funnel-arr">→</span>}
          </div>
        ))}
      </div>
    );
  };

  // 4. Semáforos por área
  const renderSemaforos = () => {
    if (loading) return <div className="semaforo-row">{Array(4).fill(0).map((_,i) => <div className="semaforo-panel skeleton" key={i}/>)}</div>;
    if (error || !data?.semaforos) return null;
    return (
      <div className="semaforo-row">
        {data.semaforos.map((s, i) => {
          const expanded = expandedSemaforo === i;
          const estadoCls = s.estado === 'rojo' ? 'critico' : s.estado === 'amarillo' ? 'alerta' : 'normal';
          return (
            <div className={`semaforo-panel ${estadoCls}${expanded ? ' expanded' : ''}`} key={i} onClick={() => setExpandedSemaforo(expanded ? null : i)}>
              <div className="semaforo-header">
                <span className={`semaforo-indicador ${estadoCls}`}/>
                <span>{s.label}</span>
                <span className={`semaforo-badge ${estadoCls}`}>{OverviewBIService.getEstadoLabel(s.estado)}</span>
              </div>
              <div className="semaforo-expand">
                {expanded && <div>{s.detalle || 'Sin detalles.'}</div>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 5. Gráficos de tendencia y distribución
  const tendenciaOptions = [
    { value: 'ventas', label: 'Ventas' },
    { value: 'clientes', label: 'Clientes' },
    { value: 'ingresos', label: 'Ingresos' },
  ];
  const distribucionOptions = [
    { value: 'clientesPorStatus', label: 'Clientes por status' },
    { value: 'ventasPorTipo', label: 'Ventas por tipo' },
    { value: 'clientesPorPlan', label: 'Clientes por plan' },
  ];
  const renderCharts = () => {
    if (loading) return <div className="charts-row"><div className="chart-panel skeleton"/><div className="chart-panel skeleton"/></div>;
    if (error || !data) return null;
    return (
      <div className="charts-row">
        <div className="chart-panel">
          <div className="chart-header">
            <span>Tendencia 6 meses</span>
            <select className="chart-selector" value={tendenciaMetrica} onChange={e => setTendenciaMetrica(e.target.value)}>
              {tendenciaOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          {data?.tendencia6Meses?.[tendenciaMetrica]?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.tendencia6Meses[tendenciaMetrica]} margin={{top:16,right:16,left:0,bottom:0}}>
                <defs>
                  <linearGradient id="colorTend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="mes"/>
                <YAxis/>
                <CartesianGrid strokeDasharray="3 3"/>
                <Tooltip/>
                <Area type="monotone" dataKey="valor" stroke="#6366f1" fill="url(#colorTend)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="empty-chart">Sin datos</div>}
        </div>
        <div className="chart-panel">
          <div className="chart-header">
            <span>Distribución</span>
            <select className="chart-selector" value={distribucionMetrica} onChange={e => setDistribucionMetrica(e.target.value)}>
              {distribucionOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          {Array.isArray(data?.distribucion?.[distribucionMetrica]) && data.distribucion[distribucionMetrica].length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.distribucion[distribucionMetrica]} dataKey="valor" nameKey="label" cx="50%" cy="50%" outerRadius={70} fill="#6366f1">
                  {data.distribucion[distribucionMetrica].map((entry, i) => (
                    <Cell key={i} fill={OverviewBIService.getChartColors()[i%8]}/>
                  ))}
                </Pie>
                <Tooltip/>
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="empty-chart">Sin datos</div>}
        </div>
      </div>
    );
  };

  // 6. Generador BI
  const biEntities = ['ventas', 'clientes', 'productos'];
  const biFields = ['campo1', 'campo2', 'campo3'];
  const biAggregations = ['suma', 'promedio', 'conteo'];
  const biChartTypes = [
    { value: 'bar', label: 'Barra' },
    { value: 'area', label: 'Área' },
    { value: 'pie', label: 'Torta' },
  ];
  const handleBIGenerate = async () => {
    setBiLoading(true);
    setBiData(null);
    try {
      const res = await OverviewBIService.getBIQuery({
        entity: biEntity,
        fieldX: biFieldX,
        fieldY: biFieldY,
        aggregation: biAggregation,
        chartType: biChartType,
      });
      if (res && res.success) setBiData(res.data);
      else setBiData([]);
    } catch {
      setBiData([]);
    } finally {
      setBiLoading(false);
    }
  };
  const renderBIGenerator = () => (
    <div className="bi-generator">
      <div className="bi-controls">
        <select className="bi-select" value={biEntity} onChange={e => setBiEntity(e.target.value)}>
          <option value="">Entidad</option>
          {biEntities.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select className="bi-select" value={biFieldX} onChange={e => setBiFieldX(e.target.value)}>
          <option value="">Campo X</option>
          {biFields.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className="bi-select" value={biFieldY} onChange={e => setBiFieldY(e.target.value)}>
          <option value="">Campo Y</option>
          {biFields.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className="bi-select" value={biAggregation} onChange={e => setBiAggregation(e.target.value)}>
          <option value="">Agregación</option>
          {biAggregations.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="bi-select" value={biChartType} onChange={e => setBiChartType(e.target.value)}>
          {biChartTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button className="bi-button-generate" onClick={handleBIGenerate} disabled={biLoading || !biEntity || !biFieldX || !biFieldY || !biAggregation}>Generar</button>
      </div>
      <div className="bi-preview">
        {biLoading ? <div className="skeleton" style={{height:200}}/> : (
          biData && biData.length ? (
            biChartType === 'bar' ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={biData} margin={{top:16,right:16,left:0,bottom:0}}>
                  <XAxis dataKey="x"/>
                  <YAxis/>
                  <CartesianGrid strokeDasharray="3 3"/>
                  <Tooltip/>
                  <Bar dataKey="y" fill="#6366f1"/>
                </BarChart>
              </ResponsiveContainer>
            ) : biChartType === 'area' ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={biData} margin={{top:16,right:16,left:0,bottom:0}}>
                  <XAxis dataKey="x"/>
                  <YAxis/>
                  <CartesianGrid strokeDasharray="3 3"/>
                  <Tooltip/>
                  <Area type="monotone" dataKey="y" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={biData} dataKey="y" nameKey="x" cx="50%" cy="50%" outerRadius={70} fill="#6366f1">
                    {biData.map((entry, i) => (
                      <Cell key={i} fill={OverviewBIService.getChartColors()[i%8]}/>
                    ))}
                  </Pie>
                  <Tooltip/>
                </PieChart>
              </ResponsiveContainer>
            )
          ) : <div className="empty-chart">Sin datos</div>
        )}
      </div>
    </div>
  );

  // 7. Resumen operativo
  const renderResumen = () => {
    if (loading) return <div className="resumen-row">{Array(3).fill(0).map((_,i) => <div className="resumen-panel skeleton" key={i}/>)}</div>;
    if (error || !data) return null;
    return (
      <div className="resumen-row">
        <div className="resumen-panel">
          <div className="resumen-header"><span>Últimas alertas</span></div>
          <ul>
            {data.ultimasAlertas?.length ? data.ultimasAlertas.map((a,i) => <li key={i}>{a.mensaje} <span className="resumen-badge">{a.severidad}</span></li>) : <li>Sin alertas</li>}
          </ul>
        </div>
        <div className="resumen-panel">
          <div className="resumen-header"><span>Movimientos recientes</span></div>
          <ul>
            {data.movimientos?.length ? data.movimientos.map((m,i) => <li key={i}>{m.descripcion} <span className="resumen-badge">{m.fecha}</span></li>) : <li>Sin movimientos</li>}
          </ul>
        </div>
        <div className="resumen-panel">
          <div className="resumen-header"><span>Pendientes</span></div>
          <ul>
            {data.pendientesUrgentes?.length ? data.pendientesUrgentes.map((p,i) => <li key={i}>{p.tarea} <span className="resumen-badge">{p.estado}</span></li>) : <li>Sin pendientes</li>}
          </ul>
        </div>
      </div>
    );
  };

  // Estado error global
  if (error) {
    return (
      <div className="dashboard-error">
        <div className="skeleton" style={{height:48,marginBottom:16}}/>
        <div style={{color:'#ef4444',marginBottom:12}}>{error}</div>
        <button onClick={() => window.location.reload()} className="bi-button-generate">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="cc-root">
      <div className="cc-header">
        <h1>Centro de Comando CEO</h1>
        <span className="cc-sub">Panel ejecutivo</span>
      </div>
      {renderKPIs()}
      {renderIndicadores()}
      {renderFunnel()}
      {renderSemaforos()}
      {renderCharts()}
      {renderBIGenerator()}
      {renderResumen()}
    </div>
  );
}

export default OverviewBI;
