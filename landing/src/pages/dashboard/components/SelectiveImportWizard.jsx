

/**
 * SelectiveImportWizard.jsx  v2
 * Wizard completo con estimación de hits EVO antes de ejecutar.
 * Mapeo automático EVO → columnas de Ventas / Clientes / Overview.
 */
import React, { useState, useMemo } from 'react';
import ExtractorService from '../../../api/services/ExtractorService';

const PAGE_SIZE = 50;

const DATASETS = [
  { id:'ventas',    label:'Ventas',             icon:'💰', description:'Rellena las 13 columnas de la sección Ventas', destination:'ventas',   destLabel:'Sección Ventas',   destColor:'#1D9E75', columns:['Fecha Ingreso','Cliente','WhatsApp','Fecha Visita','Tipo','Estado','Vendedor','Fecha Compra','Plan','Monto','Descuento','Inscripción','Sede'], evoEndpoint:'/api/v2/sales' },
  { id:'clientes',  label:'Clientes / Miembros',icon:'👥', description:'Nombre, email, teléfono, plan activo, sede y vencimiento',  destination:'clientes', destLabel:'Sección Clientes', destColor:'#7B9CFF', columns:['Nombre','Email','Teléfono','Plan Activo','Sede','Estado','Vencimiento'], evoEndpoint:'/api/v1/members' },
  { id:'prospectos',label:'Prospectos / Leads',  icon:'🎯', description:'Embudo de conversión y análisis de captación',             destination:'overview', destLabel:'Overview (gráficos)', destColor:'#F59E0B', columns:['Nombre','Origen','Fecha','Estado lead'], evoEndpoint:'/api/v1/prospects' },
  { id:'membresias',label:'Membresías',           icon:'🏷️', description:'Activos, cancelados y retención de planes',               destination:'overview', destLabel:'Overview (gráficos)', destColor:'#06B6D4', columns:['Plan','Inicio','Fin','Estado'], evoEndpoint:'/api/v1/membermembership' },
  { id:'pagos',     label:'Pagos / Deudas',       icon:'📋', description:'Deuda pendiente y flujo de caja',                        destination:'overview', destLabel:'Overview (gráficos)', destColor:'#EC4899', columns:['Cliente','Monto deuda','Fecha vencimiento','Estado pago'], evoEndpoint:'/api/v1/payables' },
  { id:'entradas',  label:'Accesos / Entradas',   icon:'🚪', description:'Afluencia diaria, horaria y por sede',                   destination:'overview', destLabel:'Overview (gráficos)', destColor:'#8B5CF6', columns:['Miembro','Hora','Sede','Tipo acceso'], evoEndpoint:'/api/v1/entries' },
];

function estimateHits(count) { return (!count || count <= 0) ? 1 : Math.ceil(count / PAGE_SIZE); }

function buildErrorMessage(error) {
  const status    = error?.response?.status;
  const serverMsg = error?.response?.data?.message || error?.response?.data?.error;
  if (serverMsg && typeof serverMsg === 'string') return serverMsg;
  if (status === 400) return '⚠️ Conexión sin credenciales completas. Edita la conexión y verifica DNS y API Key.';
  if (status === 401) return '❌ Credenciales incorrectas. Verifica DNS y API Key en la configuración.';
  if (status === 403) return '❌ Sin permisos. Ajusta los permisos en EVO Settings → Integrations.';
  if (status === 404) return '❌ Conexión no encontrada.';
  if (status === 429) return '❌ Límite de requests EVO alcanzado.';
  if (status === 500) return '❌ Error interno del servidor (500). Revisa logs del backend en la consola.';
  if (status === 504) return '❌ EVO no respondió. Intenta más tarde.';
  if (error?.message?.includes('Network Error')) return '❌ No se pudo conectar al backend (localhost:3005).';
  return error?.message || 'Error inesperado.';
}

/* ── DatasetCard ── */
function DatasetCard({ dataset, checked, count, hitsNeeded, onToggle }) {
  return (
    <div
      onClick={() => onToggle(dataset.id)}
      style={{
        border:`1.5px solid ${checked ? dataset.destColor : 'rgba(255,255,255,0.1)'}`,
        borderRadius:'10px', padding:'13px', cursor:'pointer', userSelect:'none', position:'relative',
        background: checked ? `${dataset.destColor}12` : 'rgba(255,255,255,0.02)',
        transition:'all 0.18s ease',
      }}
    >
      {checked && <div style={{ position:'absolute', inset:0, borderRadius:'10px', background:`radial-gradient(ellipse at top right,${dataset.destColor}1a,transparent 65%)`, pointerEvents:'none' }} />}
      <div style={{ display:'flex', alignItems:'flex-start', gap:'10px' }}>
        {/* Checkbox */}
        <div style={{ width:17, height:17, borderRadius:4, flexShrink:0, marginTop:3, border:`2px solid ${checked ? dataset.destColor : 'rgba(255,255,255,0.2)'}`, background:checked ? dataset.destColor : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
          {checked && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
        {/* Texto */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'7px', flexWrap:'wrap' }}>
            <span style={{ fontSize:'15px' }}>{dataset.icon}</span>
            <span style={{ fontWeight:700, fontSize:'13px', color:'#e8e8e8' }}>{dataset.label}</span>
            <span style={{ padding:'2px 7px', borderRadius:'999px', fontSize:'10px', fontWeight:700, background:`${dataset.destColor}20`, color:dataset.destColor, border:`1px solid ${dataset.destColor}45` }}>→ {dataset.destLabel}</span>
          </div>
          <p style={{ margin:'4px 0 0', fontSize:'11px', color:'rgba(255,255,255,0.4)', lineHeight:1.5 }}>{dataset.description}</p>
        </div>
        {/* Contador */}
        {count != null && (
          <div style={{ flexShrink:0, textAlign:'right', minWidth:56 }}>
            <div style={{ fontWeight:800, fontSize:'14px', color:dataset.destColor }}>{count.toLocaleString('es-CL')}</div>
            <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.3)' }}>registros</div>
            {hitsNeeded != null && (
              <div style={{ fontSize:'9px', fontWeight:700, marginTop:'3px', color: hitsNeeded > 10 ? '#F59E0B' : '#4ADE80' }}>
                ~{hitsNeeded} hit{hitsNeeded !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
      </div>
      {/* Columnas */}
      {checked && (
        <div style={{ marginTop:'9px', paddingTop:'9px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.3)', marginBottom:'5px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>Campos que se mapean automáticamente →</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'3px' }}>
            {dataset.columns.map(col => (
              <span key={col} style={{ padding:'2px 6px', borderRadius:'4px', fontSize:'10px', background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.55)', border:'1px solid rgba(255,255,255,0.09)' }}>{col}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── HitsEstimator ── */
function HitsEstimator({ selectedDatasets, counts, usage }) {
  const isPro            = usage?.isPro || false;
  const dailyRemaining   = usage?.dailyRemaining   ?? 100;
  const monthlyRemaining = usage?.monthlyRemaining ?? 1000;

  const breakdown = selectedDatasets.map(d => ({
    ...d, count: counts[d.id] ?? 0, hits: estimateHits(counts[d.id] ?? 0),
  }));
  const totalHits = breakdown.reduce((s, b) => s + b.hits, 0);
  const exceedsDaily   = !isPro && totalHits > dailyRemaining;
  const exceedsMonthly = !isPro && totalHits > monthlyRemaining;
  const isWarning      = !isPro && !exceedsDaily && totalHits > dailyRemaining * 0.5;

  const borderColor = exceedsDaily || exceedsMonthly ? '#EF4444' : isWarning ? '#F59E0B' : 'rgba(74,222,128,0.38)';
  const bgColor     = exceedsDaily || exceedsMonthly ? 'rgba(239,68,68,0.07)' : isWarning ? 'rgba(245,158,11,0.07)' : 'rgba(74,222,128,0.05)';

  return (
    <div style={{ padding:'13px', borderRadius:'10px', border:`1px solid ${borderColor}`, background:bgColor, marginTop:'12px' }}>
      <div style={{ fontSize:'11px', fontWeight:700, color:'#e8e8e8', marginBottom:'10px', display:'flex', alignItems:'center', gap:'7px' }}>
        📊 Estimación de consumo de API
        {isPro
          ? <span style={{ padding:'1px 7px', borderRadius:'999px', fontSize:'9px', fontWeight:800, background:'#3B82F618', color:'#93C5FD', border:'1px solid #3B82F648' }}>Plan Pro — ilimitado</span>
          : <span style={{ padding:'1px 7px', borderRadius:'999px', fontSize:'9px', fontWeight:800, background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.5)' }}>Plan Plus · 100/día · 1.000/mes</span>
        }
      </div>

      {/* Breakdown */}
      <div style={{ display:'grid', gap:'4px', marginBottom:'9px' }}>
        {breakdown.map(b => (
          <div key={b.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:'11px' }}>
            <span style={{ color:'rgba(255,255,255,0.58)' }}>{b.icon} {b.label}</span>
            <span style={{ color: b.hits > 20 ? '#FBBF24' : 'rgba(255,255,255,0.45)' }}>
              {b.count.toLocaleString('es-CL')} ÷ {PAGE_SIZE} = <strong style={{ color:'#e8e8e8' }}>{b.hits} req</strong>
            </span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:'8px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
        <span style={{ fontSize:'12px', fontWeight:700, color:'#e8e8e8' }}>Total estimado</span>
        <span style={{ fontSize:'14px', fontWeight:800, color: exceedsDaily || exceedsMonthly ? '#F87171' : '#4ADE80' }}>
          {totalHits} request{totalHits !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Disponibilidad (solo Plan Plus) */}
      {!isPro && (
        <div style={{ marginTop:'9px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
          {[
            { label:'Disponibles HOY', val:dailyRemaining, limit:'de 100/día', bad: exceedsDaily },
            { label:'Disponibles MES', val:monthlyRemaining, limit:'de 1.000/mes', bad: exceedsMonthly },
          ].map(item => (
            <div key={item.label} style={{ padding:'7px 10px', borderRadius:'7px', background: item.bad ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)', border:`1px solid ${item.bad ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)'}` }}>
              <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.38)', marginBottom:'2px' }}>{item.label}</div>
              <div style={{ fontSize:'15px', fontWeight:800, color: item.bad ? '#F87171' : '#4ADE80' }}>{item.val}</div>
              <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.28)' }}>{item.limit}</div>
            </div>
          ))}
        </div>
      )}

      {/* Alertas */}
      {exceedsMonthly && (
        <div style={{ marginTop:'8px', padding:'8px 10px', borderRadius:'7px', background:'rgba(239,68,68,0.13)', border:'1px solid rgba(239,68,68,0.45)', color:'#FCA5A5', fontSize:'11px', fontWeight:700 }}>
          🚫 Supera el límite mensual ({monthlyRemaining} disponibles). Selecciona menos datasets o espera al próximo mes.
        </div>
      )}
      {!exceedsMonthly && exceedsDaily && (
        <div style={{ marginTop:'8px', padding:'8px 10px', borderRadius:'7px', background:'rgba(239,68,68,0.13)', border:'1px solid rgba(239,68,68,0.45)', color:'#FCA5A5', fontSize:'11px', fontWeight:700 }}>
          🚫 Supera el límite diario ({dailyRemaining} disponibles hoy). Selecciona menos datasets o importa mañana.
        </div>
      )}
      {isWarning && !exceedsDaily && (
        <div style={{ marginTop:'8px', padding:'8px 10px', borderRadius:'7px', background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.38)', color:'#FDE68A', fontSize:'11px' }}>
          ⚠️ Usarás +50% de la cuota diaria. Considera importar entre 01:00–06:00 hora São Paulo.
        </div>
      )}
    </div>
  );
}

/* ── ProgressRow ── */
function ProgressRow({ item }) {
  const colors = { pending:'rgba(255,255,255,0.2)', running:'#F59E0B', done:'#4ADE80', error:'#F87171' };
  const labels = {
    pending: 'En espera…',
    running: `Importando… (pág ${item.currentPage||1}/${item.totalPages||'?'})`,
    done:    `✓ ${item.inserted} insertados · ${item.updated} actualizados`,
    error:   '✗ Error',
  };
  return (
    <div style={{ padding:'10px 12px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.02)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
        <span style={{ fontSize:'12px', fontWeight:600, color:'#d7dce8' }}>{item.icon} {item.label}</span>
        <span style={{ fontSize:'11px', color:colors[item.state]||'#888' }}>{labels[item.state]||item.state}</span>
      </div>
      <div style={{ background:'#181c2a', height:'5px', borderRadius:'999px', overflow:'hidden' }}>
        <div style={{ width:`${item.percent||0}%`, height:'100%', borderRadius:'999px', transition:'width 0.35s ease',
          background: item.state==='error' ? 'linear-gradient(90deg,#EF4444,#F87171)' : item.state==='done' ? 'linear-gradient(90deg,#1D9E75,#4ADE80)' : 'linear-gradient(90deg,#F59E0B,#FDE68A)' }} />
      </div>
      {item.state === 'running' && item.hitsEstimated > 0 && (
        <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.28)', marginTop:'3px' }}>
          ~{item.hitsEstimated} req · 700ms entre páginas (Plan Plus)
        </div>
      )}
    </div>
  );
}

/* ═══════════════ COMPONENTE PRINCIPAL ═══════════════ */
export default function SelectiveImportWizard({ selectedConfig, configs, onRefreshUsage, onImportComplete }) {
  const currentConfig = useMemo(
    () => configs?.find(c => String(c?._id || c?.connectionName || '') === selectedConfig),
    [configs, selectedConfig]
  );
  const isEvo = String(currentConfig?.provider || '').toLowerCase() === 'evo';

  const [step,          setStep]          = useState('select');
  const [selected,      setSelected]      = useState(new Set(['ventas', 'clientes']));
  const [counts,        setCounts]        = useState({});
  const [usageInfo,     setUsageInfo]     = useState(null);
  const [countsLoading, setCountsLoading] = useState(false);
  const [progress,      setProgress]      = useState([]);
  const [errorMsg,      setErrorMsg]      = useState('');
  const [summary,       setSummary]       = useState(null);

  // Hooks ANTES del early return (Rules of Hooks)
  const selectedDatasets = useMemo(
    () => DATASETS.filter(d => selected.has(d.id)),
    [selected]
  );

  const totalHitsEstimated = useMemo(
    () => selectedDatasets.reduce((s, d) => s + estimateHits(counts[d.id] ?? 0), 0),
    [selectedDatasets, counts]
  );

  const canConfirm = useMemo(() => {
    if (!usageInfo || usageInfo.isPro) return true;
    return totalHitsEstimated <= usageInfo.dailyRemaining && totalHitsEstimated <= usageInfo.monthlyRemaining;
  }, [usageInfo, totalHitsEstimated]);

  // Early return DESPUÉS de todos los hooks
  if (!isEvo) return null;

  const toggleDataset = id => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    setErrorMsg('');
  };

  /* Paso 1 → 2 */
  const handleAnalyze = async () => {
    if (selected.size === 0) { setErrorMsg('Selecciona al menos un dataset.'); return; }
    if (!selectedConfig)     { setErrorMsg('⚠️ Primero selecciona una conexión en el selector "Conexión" de abajo.'); return; }
    setCountsLoading(true); setErrorMsg('');
    try {
      const result = await ExtractorService.discoverData(selectedConfig);
      const map = {};
      (result?.items || []).forEach(item => { map[item.type] = Number(item.count) || 0; });
      setCounts(map);

      // Guardar info de uso
      const u = result?.usage;
      if (u) {
        const isPro          = String(u.plan || '').toLowerCase() === 'pro';
        const dailyLimit     = Number(u.dailyLimit)     || 100;
        const monthlyLimit   = Number(u.monthlyLimit)   || 1000;
        setUsageInfo({
          isPro,
          dailyUsed:        Number(u.dailyUsed)    || 0,
          dailyRemaining:   Math.max(0, dailyLimit   - (Number(u.dailyUsed)    || 0)),
          monthlyUsed:      Number(u.monthlyUsed)  || 0,
          monthlyRemaining: isPro ? Infinity : Math.max(0, monthlyLimit - (Number(u.monthlyUsed) || 0)),
        });
      }
      setStep('preview');
    } catch (err) {
      setErrorMsg(buildErrorMessage(err));
    } finally {
      setCountsLoading(false);
    }
  };

  /* Paso 2 → 3 */
  const handleConfirm = async () => {
    if (!canConfirm || selectedDatasets.length === 0) return;
    setStep('running'); setErrorMsg('');
    setProgress(selectedDatasets.map(d => ({
      id: d.id, label: d.label, icon: d.icon,
      state: 'pending', percent: 0, inserted: 0, updated: 0,
      hitsEstimated: estimateHits(counts[d.id] ?? 0),
      currentPage: 0, totalPages: estimateHits(counts[d.id] ?? 0),
    })));

    let totalInserted = 0, totalUpdated = 0;
    const errors = [];

    for (const dataset of selectedDatasets) {
      setProgress(prev => prev.map(r => r.id === dataset.id ? { ...r, state:'running', percent:20 } : r));
      try {
        const res = await ExtractorService.runSelective(selectedConfig, [{ type: dataset.id, targetSection: dataset.destination }]);
        const pt  = (res?.perType || [])[0] || {};
        const ins = Number(pt.inserted) || 0;
        const upd = Number(pt.updated)  || 0;
        totalInserted += ins; totalUpdated += upd;
        setProgress(prev => prev.map(r => r.id === dataset.id ? { ...r, state:'done', percent:100, inserted:ins, updated:upd } : r));
      } catch (err) {
        errors.push({ id: dataset.id, msg: buildErrorMessage(err) });
        setProgress(prev => prev.map(r => r.id === dataset.id ? { ...r, state:'error', percent:100 } : r));
      }
    }

    setSummary({ totalInserted, totalUpdated, errors });
    setStep('done');
    if (typeof onRefreshUsage   === 'function') onRefreshUsage();
    if (typeof onImportComplete === 'function') onImportComplete({ totalInserted, totalUpdated });
  };

  const handleReset = () => {
    setStep('select'); setProgress([]); setSummary(null);
    setErrorMsg(''); setCounts({}); setUsageInfo(null);
  };

  const navTo = section => window.dispatchEvent(new CustomEvent('navigate', { detail: section }));

  /* Stepper labels */
  const stepOrder = ['select','preview','running','done'];

  return (
    <>
      <style>{`
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes wizFI { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .wiz-root { animation: wizFI 0.25s ease; }
      `}</style>

      <div className="wiz-root" style={{ marginBottom:'18px', border:'1px solid rgba(123,156,255,0.18)', background:'rgba(10,14,24,0.92)', borderRadius:'14px', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'13px 18px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.02)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:'14px', color:'#e8e8e8' }}>🔗 Importación selectiva EVO</div>
            <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', marginTop:'2px' }}>Elige los datos · mapeo de campos automático · EVO devuelve máx. 50 reg/request</div>
          </div>
          <div style={{ display:'flex', gap:'5px', alignItems:'center' }}>
            {stepOrder.map(s => (
              <div key={s} style={{ width: s===step ? 20 : 7, height:7, borderRadius:'999px', transition:'all 0.3s ease',
                background: s===step ? '#7B9CFF' : stepOrder.indexOf(s) < stepOrder.indexOf(step) ? '#1D9E75' : 'rgba(255,255,255,0.1)' }} />
            ))}
          </div>
        </div>

        {/* Aviso EVO */}
        <div style={{ margin:'12px 18px 0', padding:'8px 11px', borderRadius:'7px', border:'1px solid rgba(125,211,252,0.25)', background:'rgba(56,189,248,0.06)', color:'#bae6fd', fontSize:'11px' }}>
          ℹ️ Importaciones masivas recomendadas entre <strong>01:00–06:00 hora São Paulo</strong> · <strong>Plan Plus: 100 req/día · 1.000/mes</strong> · cada request = 50 registros
        </div>

        {/* ═══ PASO 1 — Selección ═══ */}
        {step === 'select' && (
          <div style={{ padding:'14px 18px' }}>
            <div style={{ fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'11px' }}>¿Qué datos deseas importar?</div>
            <div style={{ display:'grid', gap:'7px' }}>
              {DATASETS.map(d => <DatasetCard key={d.id} dataset={d} checked={selected.has(d.id)} count={null} hitsNeeded={null} onToggle={toggleDataset} />)}
            </div>
            {errorMsg && <div style={{ marginTop:'11px', padding:'9px 12px', borderRadius:'8px', border:'1px solid rgba(248,113,113,0.4)', background:'rgba(248,113,113,0.08)', color:'#fecaca', fontSize:'12px', fontWeight:600 }}>{errorMsg}</div>}
            <div style={{ marginTop:'14px', display:'flex', justifyContent:'flex-end' }}>
              <button
                onClick={handleAnalyze}
                disabled={selected.size === 0 || countsLoading || !selectedConfig}
                style={{ padding:'10px 20px', borderRadius:'8px', fontWeight:700, fontSize:'13px', border:'none',
                  cursor: selected.size > 0 && selectedConfig && !countsLoading ? 'pointer' : 'not-allowed',
                  background: selected.size > 0 && selectedConfig ? '#7B9CFF' : 'rgba(255,255,255,0.07)',
                  color: selected.size > 0 && selectedConfig ? '#fff' : 'rgba(255,255,255,0.3)',
                  display:'flex', alignItems:'center', gap:'8px', transition:'all 0.18s ease' }}
              >
                {countsLoading
                  ? <><span style={{ width:13, height:13, border:'2px solid rgba(255,255,255,0.2)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/> Analizando…</>
                  : 'Analizar datos disponibles →'}
              </button>
            </div>
          </div>
        )}

        {/* ═══ PASO 2 — Preview + estimación ═══ */}
        {step === 'preview' && (
          <div style={{ padding:'14px 18px' }}>
            <div style={{ fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'11px' }}>Confirma los datos a importar</div>
            <div style={{ display:'grid', gap:'7px' }}>
              {DATASETS.map(d => (
                <DatasetCard key={d.id} dataset={d} checked={selected.has(d.id)}
                  count={counts[d.id] ?? null}
                  hitsNeeded={counts[d.id] != null ? estimateHits(counts[d.id]) : null}
                  onToggle={toggleDataset} />
              ))}
            </div>

            {selectedDatasets.length > 0 && (
              <HitsEstimator selectedDatasets={selectedDatasets} counts={counts} usage={usageInfo} />
            )}

            <div style={{ marginTop:'14px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
              <button onClick={() => setStep('select')} style={{ padding:'9px 16px', borderRadius:'8px', fontWeight:600, fontSize:'12px', cursor:'pointer', background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.48)', border:'1px solid rgba(255,255,255,0.1)' }}>
                ← Modificar selección
              </button>
              <button
                onClick={handleConfirm}
                disabled={!canConfirm || selectedDatasets.length === 0}
                style={{ padding:'10px 22px', borderRadius:'8px', fontWeight:700, fontSize:'13px', border:'none',
                  cursor: canConfirm ? 'pointer' : 'not-allowed',
                  background: canConfirm ? '#1D9E75' : 'rgba(255,255,255,0.06)',
                  color: canConfirm ? '#fff' : 'rgba(255,255,255,0.3)',
                  boxShadow: canConfirm ? '0 2px 14px rgba(29,158,117,0.32)' : 'none',
                  display:'flex', alignItems:'center', gap:'8px' }}
              >
                {canConfirm ? `✅ Confirmar e importar (~${totalHitsEstimated} req)` : '🚫 Límite excedido'}
              </button>
            </div>
          </div>
        )}

        {/* ═══ PASO 3 — Progreso ═══ */}
        {step === 'running' && (
          <div style={{ padding:'14px 18px' }}>
            <div style={{ fontSize:'11px', fontWeight:600, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'11px' }}>Importando datos…</div>
            <div style={{ display:'grid', gap:'7px' }}>
              {progress.map(item => <ProgressRow key={item.id} item={item} />)}
            </div>
          </div>
        )}

        {/* ═══ PASO 4 — Resultado ═══ */}
        {step === 'done' && summary && (
          <div style={{ padding:'14px 18px' }}>
            <div style={{ display:'grid', gap:'6px', marginBottom:'12px' }}>
              {progress.map(item => <ProgressRow key={item.id} item={item} />)}
            </div>

            <div style={{ padding:'13px', borderRadius:'10px', marginBottom:'12px',
              border: summary.errors.length === 0 ? '1px solid rgba(74,222,128,0.32)' : '1px solid rgba(251,191,36,0.32)',
              background: summary.errors.length === 0 ? 'rgba(74,222,128,0.06)' : 'rgba(251,191,36,0.06)' }}>
              <div style={{ fontSize:'13px', fontWeight:700, color:'#e8e8e8', marginBottom:'10px' }}>
                {summary.errors.length === 0 ? '✅ Importación completada correctamente' : `⚠️ Completada con ${summary.errors.length} error(es)`}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                {[
                  { val:summary.totalInserted, label:'Registros insertados',   color:'#4ADE80', bg:'rgba(74,222,128,0.1)' },
                  { val:summary.totalUpdated,  label:'Registros actualizados', color:'#7B9CFF', bg:'rgba(123,156,255,0.1)' },
                ].map(item => (
                  <div key={item.label} style={{ textAlign:'center', padding:'9px', borderRadius:'8px', background:item.bg }}>
                    <div style={{ fontSize:'22px', fontWeight:800, color:item.color }}>{item.val.toLocaleString('es-CL')}</div>
                    <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.38)', marginTop:'2px' }}>{item.label}</div>
                  </div>
                ))}
              </div>
              {/* Badges de destino */}
              <div style={{ marginTop:'9px', display:'flex', gap:'5px', flexWrap:'wrap' }}>
                {[...new Set(selectedDatasets.map(d => d.destination))].map(dest => {
                  const items = selectedDatasets.filter(d => d.destination === dest);
                  const color = items[0]?.destColor || '#888';
                  return (
                    <span key={dest} style={{ padding:'3px 9px', borderRadius:'999px', fontSize:'10px', fontWeight:700, background:`${color}18`, color, border:`1px solid ${color}42` }}>
                      {dest==='ventas' ? '💰 Ventas' : dest==='clientes' ? '👥 Clientes' : '📊 Overview'} — {items.map(i=>i.label).join(', ')}
                    </span>
                  );
                })}
              </div>
            </div>

            {summary.errors.length > 0 && (
              <div style={{ display:'grid', gap:'5px', marginBottom:'11px' }}>
                {summary.errors.map(e => {
                  const ds = DATASETS.find(d => d.id === e.id);
                  return (
                    <div key={e.id} style={{ padding:'8px 11px', borderRadius:'7px', border:'1px solid rgba(248,113,113,0.32)', background:'rgba(248,113,113,0.07)', color:'#fecaca', fontSize:'11px' }}>
                      {ds?.icon} <strong>{ds?.label}</strong>: {e.msg}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display:'flex', gap:'7px', flexWrap:'wrap' }}>
              <button onClick={handleReset} style={{ padding:'8px 15px', borderRadius:'8px', fontWeight:600, fontSize:'12px', cursor:'pointer', background:'rgba(255,255,255,0.07)', color:'#e8e8e8', border:'1px solid rgba(255,255,255,0.12)' }}>↺ Nueva importación</button>
              {selectedDatasets.some(d => d.destination === 'ventas')   && <button onClick={() => navTo('ventas')}   style={{ padding:'8px 13px', borderRadius:'8px', fontWeight:600, fontSize:'12px', cursor:'pointer', background:'rgba(29,158,117,0.16)',  color:'#4ADE80', border:'1px solid rgba(29,158,117,0.35)' }}>💰 Ver Ventas</button>}
              {selectedDatasets.some(d => d.destination === 'clientes') && <button onClick={() => navTo('clients')}  style={{ padding:'8px 13px', borderRadius:'8px', fontWeight:600, fontSize:'12px', cursor:'pointer', background:'rgba(123,156,255,0.15)', color:'#93BBFF', border:'1px solid rgba(123,156,255,0.35)' }}>👥 Ver Clientes</button>}
              {selectedDatasets.some(d => d.destination === 'overview') && <button onClick={() => navTo('overview')} style={{ padding:'8px 13px', borderRadius:'8px', fontWeight:600, fontSize:'12px', cursor:'pointer', background:'rgba(245,158,11,0.15)',  color:'#FDE68A', border:'1px solid rgba(245,158,11,0.35)' }}>📊 Ver Overview</button>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
