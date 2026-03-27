import { useState, useEffect } from 'react';
import { getAccessToken } from '../../config/authStorage';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3005/api';

const DB_CONFIGS = {
  mongodb: {
    label: 'MongoDB', icon: '🍃', hasFile: false, defaultPort: '27017',
    guide: {
      example: 'mongodb+srv://usuario:password@cluster.mongodb.net/mi_bd',
      tip: 'Si usas MongoDB Atlas, pega la URI completa. Verifica que tu IP esté autorizada en Atlas.',
    }
  },
  postgres: {
    label: 'PostgreSQL', icon: '🐘', hasFile: false, defaultPort: '5432',
    guide: {
      example: 'Host: localhost o db.midominio.com | Puerto: 5432',
      tip: 'Para Supabase, Neon o AWS activa SSL en modo avanzado.',
    }
  },
  sqlite: {
    label: 'SQLite (.db)', icon: '📦', hasFile: true, defaultPort: '',
    fileAccept: '.db,.sqlite,.sqlite3',
    guide: {
      example: 'archivo.db, app.sqlite, database.sqlite3',
      tip: 'Sube el archivo directamente. Extensiones válidas: .db .sqlite .sqlite3',
    }
  },
  sql: {
    label: 'Archivo SQL', icon: '📄', hasFile: true, defaultPort: '',
    fileAccept: '.sql,.txt',
    guide: {
      example: 'archivo.sql con sentencias INSERT INTO tabla (col1, col2) VALUES (...)',
      tip: 'Soporta exports de Agent.AI, AppSheet, Firebase y cualquier BaaS. Solo sentencias INSERT INTO.',
    }
  },
  csv: {
    label: 'CSV / TSV', icon: '📊', hasFile: true, defaultPort: '',
    fileAccept: '.csv,.tsv,.txt',
    guide: {
      example: 'datos.csv con headers en la primera fila',
      tip: 'Detecta automaticamente delimitador (coma, punto y coma, tabulacion).',
    }
  },
  excel: {
    label: 'Excel', icon: '📗', hasFile: true, defaultPort: '',
    fileAccept: '.xlsx,.xls',
    guide: {
      example: 'reporte.xlsx — si tiene multiples hojas, cada una se importa como tabla separada',
      tip: 'Usa el formato .xlsx para mejor compatibilidad.',
    }
  },
};

const SHARCKNEGOCIOS_ENTITIES = [
  { key: 'ignorar', label: '— Ignorar tabla —', group: '' },
  { key: 'clientes', label: 'Clientes', group: 'Principal', icon: 'bi-people' },
  { key: 'ventas', label: 'Ventas', group: 'Principal', icon: 'bi-cart' },
  { key: 'alertas', label: 'Alertas', group: 'Principal', icon: 'bi-bell' },
  { key: 'colaboradores', label: 'Colaboradores', group: 'RRHH', icon: 'bi-person-badge' },
  { key: 'remuneraciones', label: 'Remuneraciones', group: 'RRHH', icon: 'bi-wallet2' },
  { key: 'evaluacion', label: 'Evaluacion', group: 'RRHH', icon: 'bi-clipboard-check' },
  { key: 'documentos', label: 'Documentos', group: 'RRHH', icon: 'bi-file-earmark-text' },
  { key: 'reclutamiento', label: 'Reclutamiento', group: 'RRHH', icon: 'bi-person-plus' },
  { key: 'distribucion', label: 'Distribucion', group: 'RRHH', icon: 'bi-diagram-3' },
  { key: 'productos', label: 'Productos', group: 'Inventario', icon: 'bi-box' },
  { key: 'stock', label: 'Stock', group: 'Inventario', icon: 'bi-boxes' },
  { key: 'proveedores', label: 'Proveedores', group: 'Inventario', icon: 'bi-truck' },
  { key: 'entregas', label: 'Entregas', group: 'Inventario', icon: 'bi-send' },
  { key: 'compras', label: 'Compras', group: 'Inventario', icon: 'bi-bag' },
  { key: 'academy', label: 'Shark Academy', group: 'Formacion', icon: 'bi-mortarboard' },
  { key: 'prospectos', label: 'Prospectos', group: 'Otro', icon: 'bi-bullseye' },
  { key: 'custom', label: 'Coleccion personalizada...', group: 'Otro', icon: 'bi-plus-circle' },
];

function validateForm(dbType, form, file) {
  const errors = {};
  if (dbType === 'sqlite') {
    if (!file) errors.file = 'Selecciona un archivo .db';
    return errors;
  }
  if (dbType === 'mongodb') {
    if (!form.uri && !form.database) errors.database = 'Ingresa URI completa o nombre de BD';
    if (form.uri && !form.uri.startsWith('mongodb')) errors.uri = 'La URI debe empezar con mongodb:// o mongodb+srv://';
    return errors;
  }
  if (dbType === 'postgres') {
    if (!form.host) errors.host = 'Host requerido';
    if (!form.database) errors.database = 'Nombre de BD requerido';
    if (!form.user) errors.user = 'Usuario requerido';
    if (form.port && isNaN(Number(form.port))) errors.port = 'Puerto debe ser numérico';
    return errors;
  }
  return errors;
}

export default function MigracionBDSection() {
  const [step, setStep] = useState(1);
  const [dbType, setDbType] = useState('mongodb');
  const [advancedMode, setAdvancedMode] = useState(false);
  const [connForm, setConnForm] = useState({ host: 'localhost', port: '27017', database: '', user: '', password: '', uri: '', ssl: false });
  const [formErrors, setFormErrors] = useState({});
  const [uploadedFile, setUploadedFile] = useState(null);
  const [tables, setTables] = useState([]);
  const [mappings, setMappings] = useState({});
  const [filePath, setFilePath] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [testStatus, setTestStatus] = useState(null);
  const [testDiag, setTestDiag] = useState(null);

  const cfg = DB_CONFIGS[dbType];
  const token = getAccessToken();
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    setConnForm(prev => ({ ...prev, port: cfg.defaultPort }));
    setFormErrors({});
    setTestStatus(null);
    setTestDiag(null);
    setError('');
  }, [dbType]);

  const handleTest = async () => {
    const errs = validateForm(dbType, connForm, uploadedFile);
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    setTestStatus('testing'); setTestDiag(null); setError('');
    setProgress('Verificando conexión...');
    try {
      const res = await fetch(`${API_BASE}/migration/test-connection`, {
        method: 'POST', headers,
        body: JSON.stringify({ type: dbType, ...connForm })
      });
      const data = await res.json();
      setProgress('');
      if (!data.ok) {
        setTestStatus('error');
        setTestDiag({ steps: [{ label: 'Conexión al servidor', ok: false, detail: data.error }] });
        return;
      }
      setTestStatus('ok');
      setTestDiag({ steps: [
        { label: 'Host alcanzable', ok: true },
        { label: 'Autenticación correcta', ok: true },
        { label: 'Base de datos encontrada', ok: true },
        { label: `Latencia: ${data.latency}ms`, ok: true },
      ]});
    } catch (e) {
      setProgress('');
      setTestStatus('error');
      setTestDiag({ steps: [{ label: 'Conexión al servidor', ok: false, detail: e.message }] });
    }
  };

  const handleAnalyze = async () => {
    const errs = validateForm(dbType, connForm, uploadedFile);
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    setLoading(true); setError('');
    const steps = ['Conectando al servidor...', 'Validando credenciales...', 'Obteniendo esquema...', 'Analizando tablas...'];
    let si = 0;
    const interval = setInterval(() => { if (si < steps.length - 1) setProgress(steps[++si]); }, 1500);
    setProgress(steps[0]);
    function suggestEntity(tableName) {
      const name = tableName.toLowerCase();
      const hints = {
        clientes: ['cliente', 'client', 'customer', 'member', 'socio', 'afiliado'],
        ventas: ['venta', 'sale', 'order', 'pedido', 'transaccion', 'compra_cliente', 'purchase'],
        colaboradores: ['colaborador', 'empleado', 'employee', 'staff', 'personal', 'trabajador', 'responsable'],
        productos: ['producto', 'product', 'item', 'articulo', 'inventario'],
        alertas: ['alerta', 'alert', 'notificacion', 'notification', 'aviso'],
        remuneraciones: ['remuneracion', 'salario', 'sueldo', 'salary', 'payroll', 'pago_empleado', 'liquidacion'],
        evaluacion: ['evaluacion', 'evaluation', 'desempeno', 'performance', 'amonestacion', 'inasistencia'],
        documentos: ['documento', 'document', 'contrato', 'contract', 'certificado', 'finiquito'],
        reclutamiento: ['reclutamiento', 'recruitment', 'postulante', 'candidato', 'applicant', 'entrevista'],
        distribucion: ['distribucion', 'distribution', 'turno', 'shift', 'asignacion', 'rotacion', 'calendario', 'configuracion_responsable', 'tarea_sistema'],
        stock: ['stock', 'inventario_stock', 'bodega', 'warehouse', 'almacen'],
        proveedores: ['proveedor', 'supplier', 'vendor', 'provider'],
        entregas: ['entrega', 'delivery', 'envio', 'shipment', 'despacho'],
        compras: ['compra', 'purchase_order', 'orden_compra', 'adquisicion'],
        academy: ['academy', 'capacitacion', 'training', 'curso', 'formacion', 'programa'],
        prospectos: ['prospecto', 'prospect', 'lead', 'oportunidad'],
      };
      for (const [entity, keywords] of Object.entries(hints)) {
        if (keywords.some(k => name.includes(k))) return entity;
      }
      return 'ignorar';
    }
    try {
      let res, data;
      if (cfg.hasFile) {
        const form = new FormData();
        form.append('file', uploadedFile);
        const endpoint = {
          sqlite: 'analyze-sqlite',
          sql: 'analyze-sql',
          csv: 'analyze-csv',
          excel: 'analyze-excel'
        }[dbType];
        res = await fetch(`${API_BASE}/migration/${endpoint}`, {
          method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: form
        });
      } else {
        res = await fetch(`${API_BASE}/migration/analyze`, {
          method: 'POST', headers,
          body: JSON.stringify({ type: dbType, ...connForm })
        });
      }
      data = await res.json();
      clearInterval(interval); setProgress('');
      if (!data.ok) throw new Error(data.error || 'Error al analizar');
      setTables(data.tables);
      setFilePath(data.filePath || '');
      const m = {};
      data.tables.forEach(t => { m[t.name] = suggestEntity(t.name); });
      setMappings(m);
      setStep(2);
    } catch (e) {
      clearInterval(interval); setProgress('');
      setError(e.message);
    } finally { setLoading(false); }
  };

  const handleExportExcel = async () => {
    setLoading(true); setError('');
    setProgress('Preparando exportación...');
    try {
      const res = await fetch(`${API_BASE}/migration/export-excel`, {
        method: 'POST', headers,
        body: JSON.stringify({
          type: dbType, connectionConfig: connForm,
          collections: tables.map(t => t.name), filePath,
          title: `Exportación ${dbType.toUpperCase()} — ${connForm.database || ''}`
        })
      });
      setProgress('');
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error'); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `export_${dbType}_${Date.now()}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setProgress(''); setError(e.message); }
    finally { setLoading(false); }
  };

  const handleImport = async () => {
    setLoading(true); setError(''); setProgress('Importando datos...');
    try {
      const tableMappings = Object.entries(mappings)
        .filter(([, entity]) => entity !== 'ignorar')
        .map(([tableName, entity]) => ({ tableName, entity, columnMappings: {} }));
      if (!tableMappings.length) { setError('Selecciona al menos una tabla'); setLoading(false); return; }
      const res = await fetch(`${API_BASE}/migration/import`, {
        method: 'POST', headers,
        body: JSON.stringify({ type: dbType, connectionConfig: connForm, tableMappings, filePath })
      });
      const data = await res.json();
      setProgress('');
      if (!data.ok) throw new Error(data.error || 'Error al importar');
      setResults(data); setStep(3);
    } catch (e) { setProgress(''); setError(e.message); }
    finally { setLoading(false); }
  };

  const inputStyle = (key) => ({
    width: '100%', padding: '0.5rem', borderRadius: '6px',
    border: `1px solid ${formErrors[key] ? '#ef4444' : 'var(--color-border)'}`,
    background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
    boxSizing: 'border-box', fontSize: '0.875rem'
  });

  const renderField = (key, label, placeholder, type = 'text') => (
    <div key={key}>
      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.3rem' }}>{label}</label>
      <input type={type} placeholder={placeholder} value={connForm[key] || ''}
        onChange={e => { setConnForm(p => ({ ...p, [key]: e.target.value })); setFormErrors(p => ({ ...p, [key]: '' })); }}
        style={inputStyle(key)} />
      {formErrors[key] && <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.2rem 0 0' }}>{formErrors[key]}</p>}
    </div>
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '860px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.4rem', fontWeight: 700 }}>Migración de Base de Datos</h2>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          Conecta tu BD existente, analiza su estructura y exporta o importa a Sharcknegocios.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
        {['Conectar', 'Mapear tablas', 'Resultado'].map((label, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0, background: step > idx + 1 ? '#10b981' : step === idx + 1 ? '#3b82f6' : 'var(--color-border)', color: step >= idx + 1 ? '#fff' : 'var(--color-text-muted)' }}>
              {step > idx + 1 ? '✓' : idx + 1}
            </div>
            <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', fontWeight: step === idx + 1 ? 600 : 400, color: step === idx + 1 ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>{label}</span>
            {idx < 2 && <div style={{ flex: 1, height: '2px', margin: '0 0.75rem', background: step > idx + 1 ? '#10b981' : 'var(--color-border)' }} />}
          </div>
        ))}
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#ef4444', fontSize: '0.875rem' }}>❌ {error}</div>}
      {progress && <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#3b82f6', fontSize: '0.875rem' }}>⏳ {progress}</div>}

      {step === 1 && (
        <div style={{ background: 'var(--color-bg-card)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Selecciona el motor de base de datos</h3>
            <button onClick={() => setAdvancedMode(p => !p)} style={{ padding: '0.3rem 0.75rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}>
              {advancedMode ? '📋 Modo básico' : '⚙️ Modo avanzado'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {Object.entries(DB_CONFIGS).map(([key, c]) => (
              <button key={key} onClick={() => setDbType(key)} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '2px solid', borderColor: dbType === key ? '#3b82f6' : 'var(--color-border)', background: dbType === key ? 'rgba(59,130,246,0.1)' : 'transparent', color: dbType === key ? '#3b82f6' : 'var(--color-text-secondary)', cursor: 'pointer', fontWeight: dbType === key ? 600 : 400, fontSize: '0.9rem' }}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.8rem' }}>
            <div style={{ fontWeight: 600, color: '#3b82f6', marginBottom: '0.25rem' }}>💡 Guía de conexión</div>
            <code style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>{cfg.guide.example}</code>
            <div style={{ marginTop: '0.4rem', color: 'var(--color-text-muted)' }}>{cfg.guide.tip}</div>
          </div>

          {cfg.hasFile ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.4rem' }}>Archivo</label>
              <input type="file" accept={cfg.fileAccept || '.db,.sqlite,.sqlite3'}
                onChange={e => { setUploadedFile(e.target.files[0]); setFormErrors({}); }}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: `1px solid ${formErrors.file ? '#ef4444' : 'var(--color-border)'}`, background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }} />
              {formErrors.file && <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '0.2rem 0 0' }}>{formErrors.file}</p>}
              {uploadedFile && <p style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#10b981' }}>✓ {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)</p>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {dbType === 'mongodb' && (
                <div style={{ gridColumn: '1/-1' }}>{renderField('uri', 'URI de conexión (opcional)', 'mongodb+srv://usuario:pass@cluster.mongodb.net/')}</div>
              )}
              {renderField('host', 'Host', 'localhost')}
              {renderField('port', 'Puerto', cfg.defaultPort)}
              {renderField('database', 'Base de datos', 'nombre_bd')}
              {renderField('user', 'Usuario', 'usuario')}
              {renderField('password', 'Contraseña', '••••••••', 'password')}
              {advancedMode && dbType === 'postgres' && (
                <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={connForm.ssl || false} onChange={e => setConnForm(p => ({ ...p, ssl: e.target.checked }))} />
                  <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>Usar SSL (requerido para Supabase, Neon, AWS)</label>
                </div>
              )}
            </div>
          )}

          {testDiag && (
            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: testStatus === 'ok' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${testStatus === 'ok' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '8px' }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', color: testStatus === 'ok' ? '#10b981' : '#ef4444' }}>
                {testStatus === 'ok' ? '✅ Conexión exitosa' : '❌ Conexión fallida'}
              </div>
              {testDiag.steps.map((s, i) => (
                <div key={i} style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'flex', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span>{s.ok ? '✅' : '❌'}</span>
                  <span>{s.label}</span>
                  {s.detail && <span style={{ color: '#ef4444' }}>— {s.detail}</span>}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <button onClick={handleTest} disabled={loading || testStatus === 'testing'}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid #3b82f6', background: 'transparent', color: '#3b82f6', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
              {testStatus === 'testing' ? '⏳ Probando...' : '🔌 Probar conexión'}
            </button>
            <button onClick={handleAnalyze} disabled={loading}
              style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
              {loading ? '⏳ Analizando...' : '🔍 Analizar base de datos'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ background: 'var(--color-bg-card)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{tables.length} tabla(s) detectadas</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {Object.values(mappings).filter(v => v !== 'ignorar').length} seleccionadas para importar
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {tables.map(table => (
              <div key={table.name} style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: mappings[table.name] !== 'ignorar' ? 'rgba(16,185,129,0.05)' : 'var(--color-bg-card)' }}>
                  <div>
                    <strong style={{ fontSize: '0.9rem' }}>{table.name}</strong>
                    <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      ~{table.rowCount?.toLocaleString()} filas · {table.columns?.length} columnas
                    </span>
                  </div>
                  <select value={mappings[table.name] || 'ignorar'}
                    onChange={e => setMappings(p => ({ ...p, [table.name]: e.target.value }))}
                    style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', fontSize: '0.85rem' }}>
                    {SHARCKNEGOCIOS_ENTITIES.filter(e => e.key === 'ignorar').map(e => (
                      <option key={e.key} value={e.key}>{e.label}</option>
                    ))}
                    {['Principal', 'RRHH', 'Inventario', 'Formacion', 'Otro'].map(group => (
                      <optgroup key={group} label={group}>
                        {SHARCKNEGOCIOS_ENTITIES.filter(e => e.group === group).map(e => (
                          <option key={e.key} value={e.key}>{e.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid var(--color-border)', fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'var(--color-bg-primary)' }}>
                  <strong>Columnas:</strong> {table.columns?.slice(0, 8).map(c => (
                    <span key={c}>
                      {c}
                      {table.columnTypes?.[c] && (
                        <span style={{ fontSize: '0.65rem', marginLeft: '2px', padding: '1px 4px', borderRadius: '3px',
                          background: { date: 'rgba(59,130,246,0.15)', boolean: 'rgba(168,85,247,0.15)', number: 'rgba(16,185,129,0.15)', id: 'rgba(245,158,11,0.15)', string: 'rgba(100,116,139,0.1)' }[table.columnTypes[c]] || 'transparent',
                          color: { date: '#3b82f6', boolean: '#a855f7', number: '#10b981', id: '#f59e0b', string: '#64748b' }[table.columnTypes[c]] || 'inherit'
                        }}>
                          {table.columnTypes[c]}
                        </span>
                      )}
                      {' · '}
                    </span>
                  ))}{table.columns?.length > 8 ? ` +${table.columns.length - 8} más` : ''}
                </div>
                {table.preview?.length > 0 && (
                  <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid var(--color-border)', overflowX: 'auto' }}>
                    <table style={{ fontSize: '0.72rem', borderCollapse: 'collapse', width: '100%' }}>
                      <thead>
                        <tr>{table.columns?.slice(0, 5).map(c => <th key={c} style={{ padding: '0.2rem 0.5rem', textAlign: 'left', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>{c}</th>)}</tr>
                      </thead>
                      <tbody>
                        {table.preview.map((row, i) => (
                          <tr key={i}>{table.columns?.slice(0, 5).map(c => <td key={c} style={{ padding: '0.2rem 0.5rem', color: 'var(--color-text-secondary)' }}>{String(row[c] ?? '').slice(0, 30)}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={() => setStep(1)} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
              ← Volver
            </button>
            <button onClick={handleExportExcel} disabled={loading}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid #3b82f6', background: 'transparent', color: '#3b82f6', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>
              {loading ? '⏳...' : '📊 Exportar a Excel'}
            </button>
            <button onClick={handleImport} disabled={loading}
              style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>
              {loading ? '⏳ Importando...' : '⬆️ Importar a Sharcknegocios'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && results && (
        <div style={{ background: 'var(--color-bg-card)', borderRadius: '12px', padding: '2rem', border: '1px solid var(--color-border)', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
          <h3 style={{ color: '#10b981', marginBottom: '0.5rem' }}>Migración completada</h3>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>{results.totalRows?.toLocaleString()} filas procesadas</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>
            {results.results?.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 1rem', background: 'var(--color-bg-primary)', borderRadius: '8px' }}>
                <span style={{ fontWeight: 500 }}>{r.tableName} → {r.entity}</span>
                <span style={{ color: '#10b981', fontWeight: 600 }}>{r.rowCount?.toLocaleString()} filas</span>
              </div>
            ))}
          </div>
          <button onClick={() => { setStep(1); setResults(null); setTables([]); setUploadedFile(null); setTestStatus(null); setTestDiag(null); }}
            style={{ padding: '0.7rem 2rem', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            Nueva migración
          </button>
        </div>
      )}
    </div>
  );
}

