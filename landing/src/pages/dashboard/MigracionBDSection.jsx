import { useState } from 'react';
import { getAccessToken } from '../../config/authStorage';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3005/api';

const DB_TYPES = [
  { key: 'mongodb', label: 'MongoDB', icon: '🍃', hasFile: false },
  { key: 'postgres', label: 'PostgreSQL', icon: '🐘', hasFile: false },
  { key: 'sqlite', label: 'SQLite (.db)', icon: '📦', hasFile: true },
];

const SHARKFIT_ENTITIES = [
  { key: 'clientes', label: 'Clientes' },
  { key: 'ventas', label: 'Ventas' },
  { key: 'colaboradores', label: 'Colaboradores' },
  { key: 'productos', label: 'Productos' },
  { key: 'prospectos', label: 'Prospectos' },
  { key: 'ignorar', label: '— Ignorar tabla —' },
];

export default function MigracionBDSection() {
  const [step, setStep] = useState(1);
  const [dbType, setDbType] = useState('mongodb');
  const [connForm, setConnForm] = useState({ host: 'localhost', port: '', database: '', user: '', password: '', uri: '' });
  const [sqliteFile, setSqliteFile] = useState(null);
  const [tables, setTables] = useState([]);
  const [mappings, setMappings] = useState({});
  const [filePath, setFilePath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  const selectedType = DB_TYPES.find(d => d.key === dbType);
  const token = getAccessToken();
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const handleAnalyze = async () => {
    setLoading(true); setError('');
    try {
      let res, data;
      if (selectedType.hasFile) {
        if (!sqliteFile) { setError('Selecciona un archivo .db'); setLoading(false); return; }
        const form = new FormData();
        form.append('file', sqliteFile);
        res = await fetch(`${API_BASE}/migration/analyze-sqlite`, {
          method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: form
        });
      } else {
        res = await fetch(`${API_BASE}/migration/analyze`, {
          method: 'POST', headers,
          body: JSON.stringify({ type: dbType, ...connForm })
        });
      }
      data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Error al analizar');
      setTables(data.tables);
      setFilePath(data.filePath || '');
      const initialMappings = {};
      data.tables.forEach(t => { initialMappings[t.name] = 'ignorar'; });
      setMappings(initialMappings);
      setStep(2);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleImport = async () => {
    setLoading(true); setError('');
    try {
      const tableMappings = Object.entries(mappings)
        .filter(([, entity]) => entity !== 'ignorar')
        .map(([tableName, entity]) => ({ tableName, entity, columnMappings: {} }));
      if (!tableMappings.length) { setError('Selecciona al menos una tabla para importar'); setLoading(false); return; }
      const res = await fetch(`${API_BASE}/migration/import`, {
        method: 'POST', headers,
        body: JSON.stringify({ type: dbType, connectionConfig: connForm, tableMappings, filePath })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Error al importar');
      setResults(data);
      setStep(3);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '900px' }}>
      <h2 style={{ marginBottom: '0.25rem', fontSize: '1.4rem', fontWeight: 700 }}>Migración de Base de Datos</h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Conecta tu base de datos existente e importa los datos a SharkFit automáticamente.
      </p>

      {/* Indicador de pasos */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '2rem' }}>
        {['Conectar', 'Mapear tablas', 'Resultado'].map((label, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700,
              background: step > idx + 1 ? '#10b981' : step === idx + 1 ? '#3b82f6' : 'var(--color-border)',
              color: step >= idx + 1 ? '#fff' : 'var(--color-text-muted)',
              flexShrink: 0
            }}>{step > idx + 1 ? '✓' : idx + 1}</div>
            <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: step === idx + 1 ? 'var(--color-text-primary)' : 'var(--color-text-muted)', fontWeight: step === idx + 1 ? 600 : 400 }}>{label}</span>
            {idx < 2 && <div style={{ flex: 1, height: '2px', background: step > idx + 1 ? '#10b981' : 'var(--color-border)', margin: '0 0.75rem' }} />}
          </div>
        ))}
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#dc2626', fontSize: '0.875rem' }}>{error}</div>}

      {/* PASO 1 — Conectar */}
      {step === 1 && (
        <div style={{ background: 'var(--color-bg-card)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--color-border)' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem', fontWeight: 600 }}>Tipo de base de datos</h3>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {DB_TYPES.map(db => (
              <button key={db.key} onClick={() => setDbType(db.key)} style={{
                padding: '0.6rem 1.2rem', borderRadius: '8px', border: '2px solid',
                borderColor: dbType === db.key ? '#3b82f6' : 'var(--color-border)',
                background: dbType === db.key ? 'rgba(59,130,246,0.1)' : 'transparent',
                color: dbType === db.key ? '#3b82f6' : 'var(--color-text-secondary)',
                cursor: 'pointer', fontWeight: dbType === db.key ? 600 : 400, fontSize: '0.9rem'
              }}>
                {db.icon} {db.label}
              </button>
            ))}
          </div>

          {selectedType.hasFile ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                Archivo SQLite (.db)
              </label>
              <input type="file" accept=".db,.sqlite,.sqlite3"
                onChange={e => setSqliteFile(e.target.files[0])}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }} />
              {sqliteFile && <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#10b981' }}>✓ {sqliteFile.name}</p>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {dbType === 'mongodb' && (
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.4rem' }}>URI de conexión (opcional)</label>
                  <input type="text" placeholder="mongodb+srv://usuario:pass@cluster.mongodb.net/" value={connForm.uri}
                    onChange={e => setConnForm(p => ({ ...p, uri: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
                </div>
              )}
              {[
                { key: 'host', label: 'Host', placeholder: 'localhost' },
                { key: 'port', label: 'Puerto', placeholder: dbType === 'postgres' ? '5432' : '27017' },
                { key: 'database', label: 'Base de datos', placeholder: 'nombre_bd' },
                { key: 'user', label: 'Usuario', placeholder: 'usuario' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.4rem' }}>{f.label}</label>
                  <input type="text" placeholder={f.placeholder} value={connForm[f.key]}
                    onChange={e => setConnForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.4rem' }}>Contraseña</label>
                <input type="password" value={connForm.password}
                  onChange={e => setConnForm(p => ({ ...p, password: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }} />
              </div>
            </div>
          )}

          <button onClick={handleAnalyze} disabled={loading}
            style={{ marginTop: '1.5rem', padding: '0.7rem 2rem', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}>
            {loading ? 'Analizando...' : '🔍 Analizar base de datos'}
          </button>
        </div>
      )}

      {/* PASO 2 — Mapear tablas */}
      {step === 2 && (
        <div style={{ background: 'var(--color-bg-card)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--color-border)' }}>
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: 600 }}>
            {tables.length} tabla(s) detectadas — Asigna cada una a una sección de SharkFit
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Selecciona "Ignorar" para las tablas que no quieres importar.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {tables.map(table => (
              <div key={table.name} style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>{table.name}</strong>
                    <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      ~{table.rowCount} filas · {table.columns.length} columnas
                    </span>
                  </div>
                  <select value={mappings[table.name] || 'ignorar'}
                    onChange={e => setMappings(p => ({ ...p, [table.name]: e.target.value }))}
                    style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', fontSize: '0.875rem' }}>
                    {SHARKFIT_ENTITIES.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
                  </select>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Columnas: {table.columns.slice(0, 6).join(' · ')}{table.columns.length > 6 ? ` +${table.columns.length - 6} más` : ''}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button onClick={() => setStep(1)} style={{ padding: '0.7rem 1.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
              ← Volver
            </button>
            <button onClick={handleImport} disabled={loading}
              style={{ padding: '0.7rem 2rem', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}>
              {loading ? 'Importando...' : '⬆️ Importar tablas seleccionadas'}
            </button>
          </div>
        </div>
      )}

      {/* PASO 3 — Resultado */}
      {step === 3 && results && (
        <div style={{ background: 'var(--color-bg-card)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--color-border)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981' }}>Migración completada</h3>
            <p style={{ color: 'var(--color-text-secondary)' }}>{results.totalRows?.toLocaleString()} filas procesadas</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {results.results?.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--color-bg-primary)', borderRadius: '8px' }}>
                <span style={{ fontWeight: 500 }}>{r.tableName} → {r.entity}</span>
                <span style={{ color: '#10b981', fontWeight: 600 }}>{r.rowCount?.toLocaleString()} filas</span>
              </div>
            ))}
          </div>
          <button onClick={() => { setStep(1); setResults(null); setTables([]); setSqliteFile(null); }}
            style={{ padding: '0.7rem 2rem', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            Nueva migración
          </button>
        </div>
      )}
    </div>
  );
}
