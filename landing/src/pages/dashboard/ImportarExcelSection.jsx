import { useState, useEffect, useRef } from 'react';
import {
  previewImport,
  commitImport,
  fetchImportHistory,
  setImportVisibility,
  deleteImport,
  checkDuplicates,
  resolveAndCommit,
} from '../../services/importApi';
import { createToast } from '@/components/ui/use-toast';
import { useAuth } from '../../context/AuthContext';

function normalizeHeader(str) {
  if (!str) return '';
  return String(str).trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s\-]+/g, '_').replace(/[^a-z0-9_]/g, '');
}

const MAPPING_PRESETS = {
  clientes: {
    'ID Miembro': 'idMember', 'Nombre': 'name', 'Apellido': 'lastName',
    'Teléfono': 'cellPhone', 'Email': 'email',
  },
  ventas: {
    'Nombre y Apellido': 'memberName', 'WhatsApp': 'cellPhone',
    'Fecha de Ingreso': 'saleDate', 'Fecha de Visita + Hora': 'dueDate',
    'Tipo de Invitación': 'saleType', 'Estado (Asistió/No asistió)': 'paymentStatus',
    'Vendedor': 'employeeName', 'Fecha de Compra': 'saleDate',
    'Plan': 'planName', 'Monto': 'amount', 'Descuento': 'discount',
    'Inscripción': 'tax', 'Sede': 'branchName',
  },
};

const ENTITY_FIELDS = {
  ventas: [
    { key: 'memberName', label: 'Cliente' }, { key: 'saleDate', label: 'Fecha Compra' },
    { key: 'dueDate', label: 'Fecha Visita' }, { key: 'saleType', label: 'Tipo Invitación' },
    { key: 'paymentStatus', label: 'Estado' }, { key: 'employeeName', label: 'Vendedor' },
    { key: 'planName', label: 'Plan' }, { key: 'amount', label: 'Monto' },
    { key: 'discount', label: 'Descuento' }, { key: 'tax', label: 'Inscripción' },
    { key: 'branchName', label: 'Sede' }, { key: 'cellPhone', label: 'WhatsApp' },
  ],
  clientes: [
    { key: 'name', label: 'Nombre' }, { key: 'lastName', label: 'Apellido' },
    { key: 'email', label: 'Email' }, { key: 'cellPhone', label: 'Teléfono' },
    { key: 'idMember', label: 'ID Miembro' },
  ],
};

export default function ImportarExcelSection() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [importId, setImportId] = useState(null);
  const [mappingObj, setMappingObj] = useState({});
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [entity, setEntity] = useState('clientes');
  const [delimiter, setDelimiter] = useState(',');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showHidden, setShowHidden] = useState(false);
  const [btnLoading, setBtnLoading] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');

  // --- new step flow state ---
  const [paso, setPaso] = useState(1); // 1 = upload/preview, 2 = resolve duplicates, 3 = summary
  const [duplicados, setDuplicados] = useState(null);
  const [decisiones, setDecisiones] = useState({});
  const [resultado, setResultado] = useState(null);
  const fileInputRef = useRef(null);

  const { importsConnected, syncImportsConnected, importsReloadKey } = useAuth();

  useEffect(() => { loadHistory(); }, [showHidden, importsConnected, importsReloadKey]);

  const loadHistory = async () => {
    try {
      const resp = await fetchImportHistory();
      if (typeof resp.importsConnected === 'boolean') syncImportsConnected(resp.importsConnected);
      let datos = resp.datos || [];
      if (!showHidden) datos = datos.filter((h) => h.visible !== false);
      setHistory(datos);
    } catch (err) {
      if (err.status === 503)
        createToast({ title: 'Historial no disponible', description: 'BD no está lista', variant: 'warning' });
    }
  };

  const handleFileChange = (file) => {
    setPreviewData(null); setImportId(null);
    setSelectedFile(file || null); setError(null); setSuccess(null);
    setMappingObj({});
    // reset step flow
    setPaso(1);
    setDuplicados(null);
    setDecisiones({});
    setResultado(null);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && /\.(xlsx|xls|csv)$/i.test(file.name)) handleFileChange(file);
    else createToast({ title: 'Archivo no válido', description: 'Solo .xlsx, .xls o .csv', variant: 'destructive' });
  };

  const handlePreview = async () => {
    if (!selectedFile || isPreviewing) return;
    // start over flow
    setPaso(1);
    setDuplicados(null);
    setDecisiones({});
    setResultado(null);
    setError(null); setIsPreviewing(true);
    try {
      const resp = await previewImport(selectedFile, { entity, mapping: {} });
      if (!resp.ok) throw new Error(resp.error || "Vista previa fallida");
      setImportId(resp.importId || resp.syncId || null);
      setPreviewData({
        columnas: resp.columnas || resp.headers || [],
        primerosRegistros: resp.previewRows || resp.sampleRows || [],
      });
      const headers = resp.headers || [];
      setPreviewHeaders(headers);
      if (headers.length > 0) {
        const preset = MAPPING_PRESETS[entity] || {};
        const autoMap = {};
        Object.entries(preset).forEach(([excelCol, internalField]) => {
          const matched = headers.find(h => normalizeHeader(h) === normalizeHeader(excelCol));
          if (matched) autoMap[matched] = internalField;
        });
        if (Object.keys(autoMap).length > 0) {
          setMappingObj(autoMap);
        } else if (resp.suggestedMapping) {
          const filtered = Object.fromEntries(
            Object.entries(resp.suggestedMapping)
              .filter(([, v]) => v !== null && v !== undefined)
              .map(([field, col]) => [col, field])
          );
          setMappingObj(filtered);
        }
      }
    } catch (err) {
      setError(err.message || "Error inesperado");
      createToast({ title: "Error en vista previa", description: err.message, variant: "destructive" });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleDecision = (rowIndex, clienteIdBD, accion) => {
    setDecisiones(prev => ({ ...prev, [rowIndex]: { clienteIdBD, accion } }));
  };

  const handleIgnorarTodos = () => {
    if (!duplicados || !duplicados.grupos) return;
    const todas = {};
    duplicados.grupos.forEach(g => g.registros.forEach(r => {
      todas[r.rowIndex] = { clienteIdBD: r.clienteIdBD, accion: 'ignorar' };
    }));
    setDecisiones(todas);
  };

  const handleConfirmDecisions = async () => {
    if (!importId) return;
    setIsCommitting(true);
    try {
      const payload = {
        importId,
        accionGlobal: null,
        decisiones: Object.entries(decisiones).map(([rowIndex, d]) => ({
          rowIndex: Number(rowIndex),
          clienteIdBD: d.clienteIdBD,
          accion: d.accion
        }))
      };
      const resp = await resolveAndCommit(payload);
      setResultado(resp);
      setPaso(3);
      createToast({ title: 'Importación finalizada', description: '' });
      await loadHistory();
    } catch (err) {
      setError(err.message || 'Error al resolver duplicados');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleImport = async () => {
    const currentMapping = mappingObj || {};
    const internalFields = new Set(Object.values(currentMapping).filter(Boolean));
    const meetsMinimum = entity === 'ventas'
      ? internalFields.size >= 1
      : (internalFields.has('email') || internalFields.has('idMember') ||
        (internalFields.has('name') && internalFields.has('lastName')) ||
        internalFields.size >= 2);
    if (!meetsMinimum) {
      setError(entity === 'ventas' ? 'Debe mapear al menos un campo.' : 'Debe mapear email, idMember, o nombre + apellido.');
      return;
    }
    if (!selectedFile || !importsConnected || !importId) {
      setError('Debe generar una vista previa antes de confirmar.');
      return;
    }
    setError(null); setSuccess(null); setIsCommitting(true);
    try {
      const resp = await commitImport(selectedFile, {
        mapping: currentMapping,
        entity,
        delimiter,
        importId,
      });
      if (!resp.ok) throw new Error(resp.error || 'La importación retornó ok: false');

      // store importId in case backend returns new one
      const id = resp.importId || resp.syncId || importId;
      setImportId(id);

      // after commit, check duplicates
      const dupResp = await checkDuplicates(id);
      setDuplicados(dupResp);

      if (dupResp.totalDuplicados && dupResp.totalDuplicados > 0) {
        // move to step 2 for resolution
        setPaso(2);
        setDecisiones({});
      } else {
        // no duplicates, finish immediately
        const inserted = resp.insertedCount ?? 0;
        const updated = resp.updatedCount ?? 0;
        const skipped = resp.skippedCount ?? 0;
        setResultado({
          insertedCount: inserted,
          updatedCount: updated,
          skippedCount: skipped,
          totalProcesados: resp.totalRows || resp.totalRows || 0
        });
        setPaso(3);
        const msg = `Insertados: ${inserted} | Omitidos: ${skipped}`;
        setSuccess(msg);
        createToast({ title: 'Importación completada', description: msg });
        // clear preview & file only after duplicates processed
        setPreviewData(null); setSelectedFile(null);
        setMappingObj({});
        window.dispatchEvent(new Event('clientes-refresh')); 
        window.dispatchEvent(new Event('ventas-refresh'));
      }
      await loadHistory();
    } catch (err) {
      setError(err.message || 'Error inesperado al importar.');
      if (err.details) createToast({ title: 'Detalle del error', description: String(err.details) });
      await loadHistory();
    } finally { setIsCommitting(false); }
  };

  const toggleVisibility = async (syncId, visible) => {
    if (!window.confirm(visible ? '¿Mostrar los datos de este Excel?' : '¿Ocultar los datos de este Excel?')) return;
    setBtnLoading(p => ({ ...p, [syncId]: true }));
    try {
      const resp = await setImportVisibility(syncId, visible);
      if (resp?.importsConnected != null) syncImportsConnected(resp.importsConnected);
      createToast({ title: 'Visibilidad actualizada' });
      loadHistory();
    } catch (err) { createToast({ title: 'Error', description: err.message }); }
    finally { setBtnLoading(p => ({ ...p, [syncId]: false })); }
  };

  const removeImport = async (syncId) => {
    if (!window.confirm('¿Eliminar permanentemente este lote? No se puede deshacer.')) return;
    setBtnLoading(p => ({ ...p, [`del-${syncId}`]: true }));
    try {
      const resp = await deleteImport(syncId);
      if (resp?.importsConnected != null) syncImportsConnected(resp.importsConnected);
      createToast({ title: 'Lote eliminado' });
      loadHistory();
    } catch (err) { createToast({ title: 'Error', description: err.message }); }
    finally { setBtnLoading(p => ({ ...p, [`del-${syncId}`]: false })); }
  };

  const totalImports = history.length;
  const exitosos = history.filter(h => h.estatus === 'Exitoso').length;
  const fallidos = history.filter(h => h.estatus === 'Fallido').length;
  const totalInserted = history.reduce((a, h) => a + (h.insertedCount || h.registosInseridos || 0), 0);

  const statusStyles = {
    Exitoso:    { bg: 'rgba(52,210,122,0.12)', color: '#34d27a', dot: '#34d27a' },
    Fallido:    { bg: 'rgba(248,113,113,0.12)', color: '#f87171', dot: '#f87171' },
    Procesando: { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24', dot: '#fbbf24' },
  };
  const getStatus = (s) => statusStyles[s] || { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', dot: '#94a3b8' };

  return (
    <div style={S.page}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .imp-row:hover td  { background: rgba(255,255,255,0.02) !important; }
        .imp-btn:hover     { opacity: 0.78 !important; }
        .imp-sel:focus     { border-color: #58a6ff !important; outline: none; }
      `}</style>

      {/* Header */}
      <div style={S.header}>
        <div>
          <h2 style={S.title}><span style={S.titleIcon}>↑</span>Importar datos</h2>
          <p style={S.subtitle}>Sube archivos Excel o CSV para sincronizar clientes y ventas</p>
        </div>
        <div style={S.connBadge(importsConnected)}>
          <span style={{...S.connDot, background: importsConnected?'#34d27a':'#f87171',
            boxShadow: importsConnected?'0 0 8px #34d27a88':'0 0 8px #f8717188', animation:'pulse 2s infinite'}} />
          {importsConnected ? 'BD conectada' : 'BD desconectada'}
        </div>
      </div>

      {/* Stats */}
      <div style={S.statsGrid}>
        {[
          { label:'Importaciones',       value:totalImports,                    color:'#58a6ff', icon:'⬆' },
          { label:'Exitosas',            value:exitosos,                        color:'#34d27a', icon:'✓' },
          { label:'Fallidas',            value:fallidos,                        color:'#f87171', icon:'✗' },
          { label:'Registros insertados',value:totalInserted.toLocaleString(), color:'#a78bfa', icon:'#' },
        ].map((s,i) => (
          <div key={i} style={S.statCard}>
            <div style={{...S.statIcon, color:s.color}}>{s.icon}</div>
            <div style={{...S.statVal,  color:s.color}}>{s.value}</div>
            <div style={S.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      {/* Tabs */}
      <div style={S.tabBar}>
        <button className="imp-btn" onClick={()=>{ setActiveTab('upload'); setTimeout(()=>fileInputRef.current?.click(), 80); }} style={S.tabBtn(activeTab==='upload')}>↑ Subir archivo</button>
        <button className="imp-btn" onClick={()=>setActiveTab('history')} style={S.tabBtn(activeTab==='history')}>◷ Historial</button>
      </div>

      {/* UPLOAD */}

      {/* UPLOAD */}
      {activeTab==='upload' && (
        <div style={S.card}>
          {paso === 1 && (
            <>
            <div style={S.row}>
            <div style={S.fieldGroup}>
              <label style={S.label}>Entidad destino</label>
              <select value={entity} onChange={e=>{setEntity(e.target.value);setMappingObj({});}}
                style={S.select} className="imp-sel">
                <option value="clientes">👥  Clientes</option>
                <option value="ventas">💰  Ventas</option>
                <option value="leads">🎯  Leads</option>
                <option value="colaboradores">👔  Colaboradores</option>
                <option value="productos">📦  Productos</option>
                <option value="proveedores">🏭  Proveedores</option>
                <option value="stock">📊  Stock/Inventario</option>
                <option value="compras">🛒  Compras</option>
                <option value="entregas">🚚  Entregas</option>
                <option value="candidatos">📋  Candidatos</option>
              </select>
            </div>
            <div style={S.fieldGroup}>
              <label style={S.label}>Delimitador CSV</label>
              <select value={delimiter} onChange={e=>setDelimiter(e.target.value)}
                style={S.select} className="imp-sel">
                <option value=",">Coma ,</option>
                <option value=";">Punto y coma ;</option>
                <option value={'\t'}>Tabulación →</option>
              </select>
            </div>
          </div>

          <div style={S.dropzone(isDragging,!!selectedFile)}
            onDragOver={e=>{e.preventDefault();setIsDragging(true);}}
            onDragLeave={()=>setIsDragging(false)}
            onDrop={handleDrop}
            onClick={()=>fileInputRef.current?.click()}>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv"
              style={{display:'none'}} onChange={e=>handleFileChange(e.target.files?.[0])} />
            {selectedFile ? (
              <div style={S.fileRow}>
                <span style={{fontSize:28}}>📄</span>
                <div style={{flex:1,textAlign:'left'}}>
                  <div style={{fontWeight:600,color:'var(--color-text)',fontSize:'0.9rem'}}>{selectedFile.name}</div>
                  <div style={{color:'var(--color-text-secondary)',fontSize:'0.72rem',marginTop:2}}>
                    {(selectedFile.size/1024).toFixed(1)} KB · {selectedFile.name.split('.').pop().toUpperCase()}
                  </div>
                </div>
                <button className="imp-btn" style={S.clearBtn}
                  onClick={e=>{e.stopPropagation();handleFileChange(null);}}>✕</button>
              </div>
            ) : (
              <>
                <div style={{fontSize:'2.2rem',marginBottom:10,opacity:0.5}}>☁</div>
                <div style={{color:'var(--color-text)',fontSize:'0.9rem'}}>
                  Arrastra tu archivo aquí o <span style={{color:'#58a6ff',textDecoration:'underline'}}>selecciona</span>
                </div>
                <div style={{color:'var(--color-text-secondary)',fontSize:'0.72rem',marginTop:6}}>.xlsx · .xls · .csv — máx. 50 MB</div>
              </>
            )}
          </div>

          {previewHeaders.length > 0 && (
            <div style={S.mappingBox}>
              <div style={S.mappingTitle}>
                Mapeo de columnas
                <span style={S.mappingBadge}>
                  {Object.values(mappingObj).filter(Boolean).length} / {previewHeaders.length} mapeadas
                </span>
              </div>
              <div style={S.mappingGrid}>
                {previewHeaders.map(header => {
                  const fields = ENTITY_FIELDS[entity] || [];
                  return (
                    <div key={header} style={S.mappingRow}>
                      <div style={S.mappingColName} title={header}>{header}</div>
                      <span style={{color:'var(--color-text-secondary)',fontSize:'0.8rem'}}>→</span>
                      <select value={mappingObj[header]||''} className="imp-sel"
                        onChange={e=>setMappingObj(prev=>({...prev,[header]:e.target.value||undefined}))}
                        style={S.mappingSelect}>
                        <option value="">— ignorar —</option>
                        {fields.map(f=><option key={f.key} value={f.key}>{f.label}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={S.actions}>
            <button className="imp-btn" style={S.btnSecondary(!selectedFile||isPreviewing)}
              onClick={handlePreview} disabled={!selectedFile||isPreviewing}>
              {isPreviewing ? <><span style={S.spinner}/> Analizando…</> : '🔍  Vista previa'}
            </button>
            <button className="imp-btn" style={S.btnPrimary(!previewData||!importsConnected||isCommitting)}
              onClick={handleImport} disabled={!previewData||!importsConnected||isCommitting}>
              {isCommitting ? <><span style={S.spinner}/> Importando…</> : '↑  Confirmar importación'}
            </button>
          </div>

          {error   && <div style={S.alert('error')}>  <span>⚠</span><span>{error}</span></div>}
          {success && <div style={S.alert('success')}><span>✓</span><span>{success}</span></div>}

          {previewData && (
            <div style={{marginTop:'1.25rem',animation:'fadeIn 0.3s ease'}}>
              <div style={S.sectionHeader}>
                <span style={S.sectionTitle}>Vista previa · primeras filas</span>
                <span style={{padding:'2px 10px',borderRadius:20,fontSize:'0.7rem',fontWeight:700,
                  background:'rgba(88,166,255,0.12)',color:'#58a6ff'}}>
                  {previewData.primerosRegistros?.length} filas
                </span>
              </div>
              <div style={S.tableWrap}>
                <table style={S.table}>
                  <thead><tr>
                    <th style={{...S.th,width:36,textAlign:'center'}}>#</th>
                    {previewData.columnas.map((col,i)=><th key={i} style={S.th}>{col}</th>)}
                  </tr></thead>
                  <tbody>
                    {previewData.primerosRegistros.map((row,ri)=>(
                      <tr key={ri} className="imp-row">
                        <td style={{...S.td,textAlign:'center',color:'var(--color-text-secondary)',fontWeight:700}}>{ri+1}</td>
                        {previewData.columnas.map((col,ci)=>(
                          <td key={ci} style={S.td}>{row[col]??'—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

            </>
          )}

          {paso === 2 && duplicados && (
            <>
              <div style={S.sectionHeader}>
                <h3 style={{color:'#fbbf24'}}>⚠️ Se encontraron {duplicados.totalDuplicados} clientes duplicados</h3>
                <button className="imp-btn" onClick={handleIgnorarTodos} style={{...S.btnSecondary(false)}}>
                  Ignorar todos los duplicados
                </button>
              </div>
              {duplicados.grupos.map(g => (
                <div key={g.tipo} style={{marginBottom:'1rem'}}>
                  <div style={{fontWeight:700,marginBottom:'0.5rem'}}>Grupo: coincidencia por {g.tipo} ({g.cantidad})</div>
                  {g.registros.map(r => (
                    <div key={r.rowIndex} style={{border:'1px solid #30363d',borderRadius:8,padding:'0.75rem',marginBottom:'0.5rem'}}>
                      <div>Cliente: {r.nombreBD || '—'} ({r.identificador})</div>
                      {r.camposDiferentes && r.camposDiferentes.length > 0 ? (
                        <ul className="ml-4 list-disc" style={{color:'#c9d1d9',fontSize:'0.8rem',marginTop:'0.25rem'}}>
                          {r.camposDiferentes.map((c,i)=>(
                            <li key={i}>{c.campo}: {c.valorBD} → {c.valorExcel}</li>
                          ))}
                        </ul>
                      ) : (
                        <div style={{fontSize:'0.8rem',color:'var(--color-text-secondary)',marginTop:'0.25rem'}}>Sin cambios detectados</div>
                      )}
                      <div className="mt-2 flex gap-2">
                        <button className="imp-btn" onClick={()=>handleDecision(r.rowIndex,r.clienteIdBD,'actualizar')}
                          style={decisiones[r.rowIndex]?.accion==='actualizar'?{background:'#34d27a',color:'var(--color-text)'}:{}}>
                          Actualizar
                        </button>
                        <button className="imp-btn" onClick={()=>handleDecision(r.rowIndex,r.clienteIdBD,'ignorar')}
                          style={decisiones[r.rowIndex]?.accion==='ignorar'?{background:'#f87171',color:'var(--color-text)'}:{}}>
                          Ignorar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div style={S.actions}>
                <button className="imp-btn" style={S.btnPrimary(isCommitting)} onClick={handleConfirmDecisions} disabled={isCommitting}>
                  {isCommitting ? 'Procesando…' : 'Confirmar decisiones y terminar importación'}
                </button>
              </div>
            </>
          )}

          {paso === 3 && resultado && (
            <div style={{textAlign:'center',padding:'2rem'}}>
              <h3 style={{fontSize:'1.1rem',marginBottom:'1rem'}}>✅ Importación completada</h3>
              <div style={{display:'inline-block',textAlign:'left',background:'var(--color-surface)',padding:'1rem 1.5rem',borderRadius:8,border:'1px solid var(--color-border)'}}>
                <div>➕ {resultado.insertedCount} insertados</div>
                <div>✏️ {resultado.updatedCount} actualizados</div>
                <div>⏭️ {resultado.skippedCount} ignorados</div>
                <div>🧾 {resultado.totalProcesados} procesados</div>
              </div>
              <div className="mt-4">
                <button className="imp-btn" style={S.btnPrimary(false)} onClick={()=>window.location.href='/clientes?filter=today'}>
                  Ver clientes importados →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* HISTORY */}
      {activeTab==='history' && (
        <div style={S.card}>
          <div style={S.sectionHeader}>
            <span style={S.sectionTitle}>Historial de importaciones</span>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.78rem',color:'var(--color-text-secondary)',cursor:'pointer',userSelect:'none'}}>
              <input type="checkbox" checked={showHidden} onChange={e=>setShowHidden(e.target.checked)} />
              Mostrar ocultos
            </label>
          </div>
          {history.length===0 ? (
            <div style={{padding:'3rem 1rem',textAlign:'center',color:'var(--color-text-secondary)',fontSize:'0.9rem'}}>
              <div style={{fontSize:36,marginBottom:8}}>📭</div>
              <div>No hay importaciones registradas</div>
            </div>
          ) : (
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead><tr>
                  {['Fecha','Fuente','Entidad','Estatus','Insertados','Omitidos','Acciones']
                    .map(h=><th key={h} style={S.th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {history.map((h,i)=>{
                    const st  = getStatus(h.estatus);
                    const sid = h.syncId||h._id;
                    return (
                      <tr key={i} className="imp-row">
                        <td style={S.td}>
                          {h.iniciado ? new Date(h.iniciado).toLocaleString('es-CL',
                            {day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—'}
                        </td>
                        <td style={S.td}>
                          <span style={{padding:'2px 8px',borderRadius:4,fontSize:'0.72rem',fontWeight:700,
                            background:h.fuente==='Excel'?'rgba(52,210,122,0.12)':'rgba(88,166,255,0.12)',
                            color:h.fuente==='Excel'?'#34d27a':'#58a6ff'}}>
                            {h.fuente||'—'}
                          </span>
                        </td>
                        <td style={{...S.td,textTransform:'capitalize'}}>{h.entidad||'—'}</td>
                        <td style={S.td}>
                          <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 10px',
                            borderRadius:20,fontSize:'0.72rem',fontWeight:700,background:st.bg,color:st.color}}>
                            <span style={{width:6,height:6,borderRadius:'50%',background:st.dot,flexShrink:0}}/>
                            {h.estatus||'Pendiente'}
                          </span>
                        </td>
                        <td style={{...S.td,color:'#34d27a',fontWeight:700}}>
                          {h.insertedCount??h.registosInseridos??'—'}
                        </td>
                        <td style={{...S.td,color:'#f87171'}}>
                          {h.skippedCount??h.registosFallidos??'—'}
                        </td>
                        <td style={S.td}>
                          <div style={{display:'flex',gap:4}}>
                            <button className="imp-btn" style={S.iconBtn}
                              onClick={()=>toggleVisibility(sid,h.visible!==false)}
                              disabled={btnLoading[sid]} title={h.visible===false?'Mostrar':'Ocultar'}>
                              {h.visible===false?'👁':'🙈'}
                            </button>
                            <button className="imp-btn"
                              style={{...S.iconBtn,background:'rgba(218,54,51,0.12)',color:'#f87171',borderColor:'rgba(218,54,51,0.3)'}}
                              onClick={()=>removeImport(sid)} disabled={btnLoading[`del-${sid}`]} title="Eliminar">
                              🗑
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const S = {
  page:       { padding:'1.5rem 1.25rem', background:'var(--color-bg)', minHeight:'100%',
                fontFamily:"'JetBrains Mono','Fira Code',monospace", color:'var(--color-text)', boxSizing:'border-box' },
  header:     { display:'flex', justifyContent:'space-between', alignItems:'flex-start',
                marginBottom:'1.5rem', flexWrap:'wrap', gap:'0.75rem' },
  title:      { margin:0, fontSize:'1.35rem', fontWeight:800, color:'var(--color-text)',
                display:'flex', alignItems:'center', gap:'0.5rem', letterSpacing:'-0.02em' },
  titleIcon:  { display:'inline-flex', alignItems:'center', justifyContent:'center',
                width:32, height:32, borderRadius:8, fontSize:'0.95rem', fontWeight:900,
                background:'linear-gradient(135deg,#238636 0%,#1f6feb 100%)', color:'var(--color-text)' },
  subtitle:   { margin:'4px 0 0', fontSize:'0.8rem', color:'var(--color-text-secondary)' },
  connBadge:  ok=>({ display:'inline-flex', alignItems:'center', gap:7, padding:'6px 14px',
                borderRadius:20, fontSize:'0.75rem', fontWeight:700,
                background: ok?'rgba(52,210,122,0.1)':'rgba(248,113,113,0.1)',
                color: ok?'#34d27a':'#f87171',
                border:`1px solid ${ok?'rgba(52,210,122,0.3)':'rgba(248,113,113,0.3)'}`, flexShrink:0 }),
  connDot:    { width:7, height:7, borderRadius:'50%', flexShrink:0 },
  statsGrid:  { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',
                gap:'0.75rem', marginBottom:'1.25rem' },
  statCard:   { background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:10,
                padding:'1rem 0.75rem', textAlign:'center', transition:'border-color 0.2s' },
  statIcon:   { fontSize:'1.1rem', marginBottom:6 },
  statVal:    { fontSize:'1.7rem', fontWeight:800, lineHeight:1 },
  statLabel:  { fontSize:'0.68rem', color:'var(--color-text-secondary)', marginTop:5, lineHeight:1.3 },
  tabBar:     { display:'flex', gap:'0.5rem', borderBottom:'1px solid var(--color-border)',
                paddingBottom:'0.75rem', marginBottom:'1rem' },
  tabBtn:     active=>({ padding:'6px 18px', borderRadius:6, border:'none', cursor:'pointer',
                fontSize:'0.8rem', fontWeight:700, fontFamily:'inherit',
                background: active?'var(--color-primary)':'transparent', color: active?'var(--color-text)':'var(--color-text-secondary)',
                transition:'all 0.15s' }),
  card:       { background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:12,
                padding:'1.25rem', animation:'fadeIn 0.25s ease' },
  row:        { display:'flex', gap:'1rem', marginBottom:'1rem', flexWrap:'wrap' },
  fieldGroup: { flex:1, minWidth:140 },
  label:      { display:'block', fontSize:'0.7rem', fontWeight:700, color:'var(--color-text-secondary)', marginBottom:6,
                textTransform:'uppercase', letterSpacing:'0.08em' },
  select:     { width:'100%', padding:'8px 12px', background:'var(--color-surface)', border:'1px solid var(--color-border)',
                borderRadius:7, color:'var(--color-text)', fontSize:'0.84rem', fontFamily:'inherit',
                cursor:'pointer', transition:'border-color 0.15s' },
  dropzone:   (drag,hasFile)=>({ border:`2px dashed ${drag?'var(--color-primary)':hasFile?'var(--color-success)':'var(--color-border)'}`,
                borderRadius:10, padding:'2rem 1.5rem', textAlign:'center', cursor:'pointer',
                marginBottom:'1rem', transition:'all 0.2s',
                background: drag?'rgba(var(--color-primary-rgb),0.12)':hasFile?'rgba(74,222,128,0.08)':'var(--color-surface)' }),
  fileRow:    { display:'flex', alignItems:'center', gap:'0.75rem', textAlign:'left' },
  clearBtn:   { width:26, height:26, borderRadius:'50%', border:'1px solid var(--color-border)',
                background:'var(--color-surface-card)', color:'var(--color-text-secondary)', cursor:'pointer', fontSize:'0.75rem',
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  mappingBox: { background:'var(--color-surface-card)', border:'1px solid var(--color-border)', borderRadius:8,
                padding:'1rem', marginBottom:'1rem' },
  mappingTitle: { fontSize:'0.75rem', fontWeight:700, color:'var(--color-text-secondary)', textTransform:'uppercase',
                  letterSpacing:'0.08em', marginBottom:'0.75rem', display:'flex',
                  alignItems:'center', gap:'0.5rem' },
  mappingBadge: { padding:'2px 8px', borderRadius:20, fontSize:'0.7rem', fontWeight:700,
                  background:'rgba(88,166,255,0.12)', color:'#58a6ff' },
  mappingGrid:  { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'0.5rem' },
  mappingRow:   { display:'flex', alignItems:'center', gap:'0.5rem', background:'var(--color-surface)',
                  border:'1px solid var(--color-border)', borderRadius:6, padding:'6px 10px' },
  mappingColName: { flex:1, fontSize:'0.78rem', color:'var(--color-text)', whiteSpace:'nowrap',
                    overflow:'hidden', textOverflow:'ellipsis', minWidth:0 },
  mappingSelect:  { flex:1, padding:'4px 8px', background:'var(--color-surface-card)', border:'1px solid var(--color-border)',
                    borderRadius:5, color:'var(--color-text)', fontSize:'0.78rem', fontFamily:'inherit',
                    cursor:'pointer', minWidth:0 },
  actions:    { display:'flex', gap:'0.75rem', flexWrap:'wrap', marginBottom:'0.75rem' },
  btnSecondary: disabled=>({ flex:1, minWidth:140, padding:'10px 18px', border:'1px solid var(--color-border)',
                borderRadius:8, cursor:disabled?'not-allowed':'pointer', background:'var(--color-surface-card)',
                color:disabled?'var(--color-text-muted)':'var(--color-text)', fontSize:'0.84rem', fontWeight:700,
                fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center',
                gap:8, opacity:disabled?0.55:1, transition:'all 0.15s' }),
  btnPrimary:  disabled=>({ flex:1, minWidth:180, padding:'10px 18px', border:'none',
                borderRadius:8, cursor:disabled?'not-allowed':'pointer',
                background:disabled?'#1a2d1a':'linear-gradient(135deg,#238636 0%,#2ea043 100%)',
                color:disabled?'var(--color-text-muted)':'var(--color-text)', fontSize:'0.84rem', fontWeight:800,
                fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center',
                gap:8, opacity:disabled?0.55:1, transition:'all 0.15s',
                boxShadow:disabled?'none':'0 2px 12px rgba(35,134,54,0.35)' }),
  spinner:    { display:'inline-block', width:13, height:13, border:'2px solid rgba(255,255,255,0.25)',
                borderTopColor:'var(--color-text)', borderRadius:'50%', animation:'spin 0.6s linear infinite', flexShrink:0 },
  alert:      type=>({ display:'flex', alignItems:'flex-start', gap:'0.6rem', padding:'10px 14px',
                borderRadius:8, fontSize:'0.82rem', fontFamily:'inherit', marginBottom:'0.5rem',
                animation:'fadeIn 0.2s ease',
                background:type==='error'?'rgba(218,54,51,0.1)':'rgba(52,210,122,0.1)',
                color:type==='error'?'#f87171':'#34d27a',
                border:`1px solid ${type==='error'?'rgba(218,54,51,0.25)':'rgba(52,210,122,0.25)'}` }),
  sectionHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' },
  sectionTitle:  { fontSize:'0.78rem', fontWeight:700, color:'var(--color-text-secondary)', textTransform:'uppercase', letterSpacing:'0.08em' },
  tableWrap:  { overflowX:'auto', borderRadius:8, border:'1px solid var(--color-border)' },
  table:      { width:'100%', borderCollapse:'collapse', fontSize:'0.8rem', fontFamily:'inherit' },
  th:         { padding:'9px 14px', textAlign:'left', fontWeight:700, color:'var(--color-text-secondary)', fontSize:'0.7rem',
                textTransform:'uppercase', letterSpacing:'0.06em', background:'var(--color-surface-card)',
                borderBottom:'1px solid var(--color-border)', whiteSpace:'nowrap' },
  td:         { padding:'9px 14px', color:'var(--color-text)', borderBottom:'1px solid var(--color-border)', fontSize:'0.8rem',
                maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                transition:'background 0.1s' },
  iconBtn:    { padding:'5px 9px', borderRadius:6, border:'1px solid var(--color-border)',
                background:'rgba(139,148,158,0.08)', color:'var(--color-text-secondary)', cursor:'pointer',
                fontSize:'0.85rem', transition:'opacity 0.15s' },
};




