import { useState, useEffect } from 'react'
import { fetchAuth } from '../../api/fetchAuth'
import { getAccessToken } from '../../config/authStorage'

const API_BASE = import.meta.env.VITE_API_URL || '/api'
const STEPS = ['URL', 'Auth', 'Endpoints', 'Confirmar']

export default function ApiImportSection() {
  const [step, setStep] = useState(0)
  const [configs, setConfigs] = useState([])
  const [loadingConfigs, setLoadingConfigs] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [extractResult, setExtractResult] = useState(null)
  const [apiName, setApiName] = useState('')
  const [baseURL, setBaseURL] = useState('')
  const [authType, setAuthType] = useState('basic')
  const [authData, setAuthData] = useState({ username: '', password: '', token: '', headerName: 'X-API-Key', key: '' })
  const [endpoints, setEndpoints] = useState([{ path: '', dataType: 'ventas', method: 'GET' }])
  const [evoSuggestions, setEvoSuggestions] = useState([])
  const [urlStatus, setUrlStatus] = useState(null)
  const [authStatus, setAuthStatus] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState(null)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setLoadingConfigs(true);
    Promise.all([
      fetchAuth(API_BASE + '/setup/list'),
      fetchAuth(API_BASE + '/setup/evo-suggestions')
    ])
      .then(([listRes, evoRes]) => {
        setConfigs(listRes.configs || []);
        setEvoSuggestions(evoRes.suggestions || []);
      })
      .catch(() => {})
      .finally(() => setLoadingConfigs(false));
  }, [])

  const validate = (s) => {
    const e = {}
    if (s === 0) {
      if (!apiName.trim()) e.apiName = 'El nombre de la API es obligatorio'
      if (!baseURL.trim()) e.baseURL = 'La URL base es obligatoria'
      else if (!/^https?:\/\/.+/.test(baseURL.trim())) e.baseURL = 'La URL debe comenzar con http:// o https://'
    }
    if (s === 1) {
      if (authType === 'basic') {
        if (!authData.username.trim()) e.username = 'El usuario es obligatorio'
        if (!authData.password.trim()) e.password = 'La contraseña es obligatoria'
      }
      if (authType === 'bearer' && !authData.token.trim()) e.token = 'El token es obligatorio'
      if (authType === 'apikey') {
        if (!authData.headerName.trim()) e.headerName = 'El nombre del header es obligatorio'
        if (!authData.key.trim()) e.key = 'La API Key es obligatoria'
      }
    }
    if (s === 2) {
      endpoints.forEach((ep, i) => {
        if (!ep.path.trim()) e['path_' + i] = 'El path es obligatorio'
        else if (!ep.path.startsWith('/')) e['path_' + i] = 'El path debe comenzar con /'
      })
    }
    return e
  }

  const goNext = (next) => {
    const e = validate(step)
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setErrors({})
    setStep(next)
  }

  const validateURL = async () => {
    if (!baseURL.trim()) { setErrors({ baseURL: 'Ingresa una URL antes de validar' }); return }
    setUrlStatus({ loading: true, msg: 'Validando...' })
    try {
      const r = await fetchAuth(API_BASE + '/setup/validate-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: baseURL }) })
      setUrlStatus({ ok: r.success, msg: r.success ? 'URL accesible' : r.error })
    } catch { setUrlStatus({ ok: false, msg: 'Error de red' }) }
  }

  const testAuth = async () => {
    const e = validate(1)
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setAuthStatus({ loading: true, msg: 'Probando...' })
    const auth = authType === 'basic' ? { type: 'basic', username: authData.username, password: authData.password }
      : authType === 'bearer' ? { type: 'bearer', token: authData.token }
      : { type: 'apikey', headerName: authData.headerName, key: authData.key }
    try {
      const r = await fetchAuth(API_BASE + '/setup/test-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseURL, auth }) })
      setAuthStatus({ ok: r.success, msg: r.success ? 'Autenticacion correcta' : r.error })
    } catch { setAuthStatus({ ok: false, msg: 'Error de red' }) }
  }

  const addEndpoint = () => setEndpoints([...endpoints, { path: '', dataType: 'ventas', method: 'GET' }])
  const removeEndpoint = (i) => setEndpoints(endpoints.filter((_, idx) => idx !== i))
  const updateEndpoint = (i, key, val) => setEndpoints(endpoints.map((e, idx) => idx === i ? { ...e, [key]: val } : e))

  // agregar endpoint sugerido por Evo
  const addEvoEndpoint = (suggestion) => {
    setEndpoints(prev => {
      const yaExiste = prev.some(e => e.path === suggestion.path);
      if (yaExiste) return prev;
      return [...prev, { 
        path: suggestion.path, 
        dataType: suggestion.dataType, 
        method: 'GET',
        name: suggestion.name
      }];
    });
  }

  const saveConfig = async () => {
    setSaving(true); setSaveResult(null)
    const auth = authType === 'basic' ? { type: 'basic', username: authData.username, password: authData.password }
      : authType === 'bearer' ? { type: 'bearer', token: authData.token }
      : { type: 'apikey', headerName: authData.headerName, key: authData.key }
    try {
      const r = await fetchAuth(API_BASE + '/setup/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiName, baseURL, auth, endpoints }) })
      setSaveResult(r)
      if (r.success) setConfigs(prev => [...prev, { id: r.configName, name: apiName, baseURL, endpoints: endpoints.length }])
    } catch { setSaveResult({ success: false, error: 'Error de red' }) }
    finally { setSaving(false) }
  }

  const runExtract = async (configName) => {
    setExtracting(true); setExtractResult(null)
    try {
      const r = await fetchAuth(API_BASE + '/setup/extract', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ configName }) })
      setExtractResult(r)
      if (r.success) {
        // trigger global refresh so tables update
        window.dispatchEvent(new Event('clientes-refresh'));
        window.dispatchEvent(new Event('ventas-refresh'));
      }
    } catch { setExtractResult({ success: false, error: 'Error de red' }) }
    finally { setExtracting(false) }
  }

  const card = { background: '#1e293b', borderRadius: '12px', padding: '1.5rem', border: '1px solid #2d3748', marginBottom: '1.5rem' }
  const input = (hasErr) => ({ padding: '0.6rem 0.85rem', background: '#0f172a', border: '1px solid ' + (hasErr ? '#f87171' : '#334155'), borderRadius: '7px', color: '#e2e8f0', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' })
  const label = { color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }
  const errMsg = { color: '#f87171', fontSize: '0.78rem', marginTop: '0.3rem', display: 'block' }
  const btnP = { padding: '0.6rem 1.25rem', background: '#1e3a5f', border: '1px solid #60a5fa', borderRadius: '7px', color: '#60a5fa', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }
  const btnS = { padding: '0.6rem 1.25rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '7px', color: '#94a3b8', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }
  const btnG = { padding: '0.6rem 1rem', background: 'transparent', border: '1px solid #334155', borderRadius: '7px', color: '#64748b', fontSize: '0.85rem', cursor: 'pointer' }

  return (
    <div style={{ padding: '1.5rem' }}>
      <p style={{ color: '#1a202c', fontSize: '0.9rem', marginBottom: '2rem' }}>Conecta cualquier API REST y sincroniza datos hacia clientes, ventas o alertas.</p>

      <div style={card}>
        <h3 style={{ color: '#e2e8f0', fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>APIs configuradas</h3>
        {loadingConfigs ? <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Cargando...</p>
          : configs.length === 0 ? <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No hay APIs conectadas aun.</p>
          : configs.map(cfg => (
            <div key={cfg.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', marginBottom: '0.5rem' }}>
              <div>
                <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.9rem' }}>{cfg.name}</span>
                <span style={{ color: '#64748b', fontSize: '0.78rem', marginLeft: '0.75rem' }}>{cfg.baseURL}</span>
                <span style={{ color: '#60a5fa', fontSize: '0.75rem', marginLeft: '0.5rem' }}>{cfg.endpoints} endpoints</span>
              </div>
              <button style={btnP} onClick={() => runExtract(cfg.id)} disabled={extracting}>{extracting ? 'Extrayendo...' : 'Sincronizar'}</button>
            </div>
          ))}
        {extractResult && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '8px', background: extractResult.success ? '#4ade8022' : '#f8717122', border: '1px solid ' + (extractResult.success ? '#4ade8044' : '#f8717144'), color: extractResult.success ? '#4ade80' : '#f87171', fontSize: '0.85rem' }}>
            {extractResult.success ? 'Sincronizacion completada' : extractResult.error}
          </div>
        )}
      </div>

      <div style={card}>
        <h3 style={{ color: '#e2e8f0', fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1.5rem' }}>Conectar nueva API</h3>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, background: i === step ? '#1e3a5f' : '#1e293b', border: '2px solid ' + (i === step ? '#60a5fa' : i < step ? '#4ade80' : '#334155'), color: i === step ? '#60a5fa' : i < step ? '#4ade80' : '#64748b' }}>{i < step ? '✓' : i + 1}</div>
              <span style={{ fontSize: '0.8rem', color: i === step ? '#e2e8f0' : '#64748b' }}>{s}</span>
              {i < STEPS.length - 1 && <span style={{ color: '#334155' }}>›</span>}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={label}>Nombre de la API</label>
              <input style={input(errors.apiName)} value={apiName} onChange={e => { setApiName(e.target.value); setErrors(prev => ({ ...prev, apiName: null })) }} placeholder="Ej: EVO W12, Mi CRM..." />
              {errors.apiName && <span style={errMsg}>⚠ {errors.apiName}</span>}
            </div>
            <div>
              <label style={label}>URL Base</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input style={{ ...input(errors.baseURL), flex: 1 }} value={baseURL} onChange={e => { setBaseURL(e.target.value); setErrors(prev => ({ ...prev, baseURL: null })) }} placeholder="https://api.ejemplo.com" />
                <button style={btnS} onClick={validateURL}>Validar</button>
              </div>
              {errors.baseURL && <span style={errMsg}>⚠ {errors.baseURL}</span>}
              {urlStatus && <span style={{ fontSize: '0.82rem', color: urlStatus.ok ? '#4ade80' : '#f87171', marginTop: '0.35rem', display: 'block' }}>{urlStatus.ok ? '✓ URL accesible' : '✗ ' + urlStatus.msg}</span>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button style={btnP} onClick={() => goNext(1)}>Siguiente</button></div>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={label}>Tipo de autenticacion</label>
              <select style={input(false)} value={authType} onChange={e => { setAuthType(e.target.value); setErrors({}) }}>
                <option value="basic">Basic Auth (usuario / contrasena)</option>
                <option value="bearer">Bearer Token</option>
                <option value="apikey">API Key (header)</option>
              </select>
            </div>
            {authType === 'basic' && (
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={label}>Usuario / DNS</label>
                  <input style={input(errors.username)} value={authData.username} onChange={e => { setAuthData({ ...authData, username: e.target.value }); setErrors(prev => ({ ...prev, username: null })) }} placeholder="usuario" />
                  {errors.username && <span style={errMsg}>⚠ {errors.username}</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={label}>Contrasena / Token</label>
                  <input style={input(errors.password)} type="password" value={authData.password} onChange={e => { setAuthData({ ...authData, password: e.target.value }); setErrors(prev => ({ ...prev, password: null })) }} placeholder="..." />
                  {errors.password && <span style={errMsg}>⚠ {errors.password}</span>}
                </div>
              </div>
            )}
            {authType === 'bearer' && (
              <div>
                <label style={label}>Bearer Token</label>
                <input style={input(errors.token)} value={authData.token} onChange={e => { setAuthData({ ...authData, token: e.target.value }); setErrors(prev => ({ ...prev, token: null })) }} placeholder="eyJ..." />
                {errors.token && <span style={errMsg}>⚠ {errors.token}</span>}
              </div>
            )}
            {authType === 'apikey' && (
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={label}>Header Name</label>
                  <input style={input(errors.headerName)} value={authData.headerName} onChange={e => { setAuthData({ ...authData, headerName: e.target.value }); setErrors(prev => ({ ...prev, headerName: null })) }} />
                  {errors.headerName && <span style={errMsg}>⚠ {errors.headerName}</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={label}>API Key</label>
                  <input style={input(errors.key)} value={authData.key} onChange={e => { setAuthData({ ...authData, key: e.target.value }); setErrors(prev => ({ ...prev, key: null })) }} placeholder="sk-..." />
                  {errors.key && <span style={errMsg}>⚠ {errors.key}</span>}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button style={btnS} onClick={testAuth}>Probar conexion</button>
              {authStatus && <span style={{ fontSize: '0.82rem', color: authStatus.ok ? '#4ade80' : '#f87171' }}>{authStatus.ok ? '✓ ' : '✗ '}{authStatus.msg}</span>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button style={btnG} onClick={() => { setStep(0); setErrors({}) }}>Atras</button>
              <button style={btnP} onClick={() => goNext(2)}>Siguiente</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {evoSuggestions.length > 0 && (
              <div style={card}>
                <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>⚡ Endpoints EVO detectados</p>
                {evoSuggestions.map((sug, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', marginBottom: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{sug.name}</span>
                      <span style={{ color: '#64748b', fontSize: '0.78rem', marginLeft: '0.5rem' }}>{sug.path}</span>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{sug.description}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        background: sug.dataType === 'ventas' ? '#4ade80' : sug.dataType === 'clientes' ? '#60a5fa' : '#facc15',
                        color: '#1e293b',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>{sug.dataType}</span>
                      <button style={btnP} onClick={() => addEvoEndpoint(sug)}>Agregar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {endpoints.map((ep, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '1rem', background: '#0f172a', borderRadius: '8px', border: '1px solid ' + (errors['path_' + i] ? '#f87171' : '#1e293b') }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 2, minWidth: 140 }}>
                    <label style={label}>Path</label>
                    <input style={input(errors['path_' + i])} value={ep.path} onChange={e => { updateEndpoint(i, 'path', e.target.value); setErrors(prev => ({ ...prev, ['path_' + i]: null })) }} placeholder="/api/v1/sales" />
                  </div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <label style={label}>Tipo de datos</label>
                    <select style={input(false)} value={ep.dataType} onChange={e => updateEndpoint(i, 'dataType', e.target.value)}>
                      <option value="ventas">Ventas</option>
                      <option value="clientes">Clientes</option>
                      <option value="prospectos">Prospectos</option>
                      <option value="accesos">Accesos</option>
                      <option value="miembros">Miembros</option>
                    </select>
                  </div>
                  {endpoints.length > 1 && <button style={{ ...btnG, color: '#f87171' }} onClick={() => removeEndpoint(i)}>✕</button>}
                </div>
                {errors['path_' + i] && <span style={errMsg}>⚠ {errors['path_' + i]}</span>}
              </div>
            ))}
            <button style={btnS} onClick={addEndpoint}>+ Agregar endpoint</button>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button style={btnG} onClick={() => { setStep(1); setErrors({}) }}>Atras</button>
              <button style={btnP} onClick={() => goNext(3)}>Siguiente</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Resumen</p>
              <p style={{ color: '#e2e8f0', fontSize: '0.9rem', margin: '0.25rem 0' }}><strong>API:</strong> {apiName}</p>
              <p style={{ color: '#e2e8f0', fontSize: '0.9rem', margin: '0.25rem 0' }}><strong>URL:</strong> {baseURL}</p>
              <p style={{ color: '#e2e8f0', fontSize: '0.9rem', margin: '0.25rem 0' }}><strong>Auth:</strong> {authType}</p>
              <p style={{ color: '#e2e8f0', fontSize: '0.9rem', margin: '0.25rem 0' }}><strong>Endpoints:</strong></p>
              <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0 }}>
                {endpoints.map((e, i) => {
                  const isEvo = e.name && e.name.toLowerCase().includes('evo');
                  return (
                    <li key={i} style={{ color: '#60a5fa', fontSize: '0.82rem' }}>
                      {e.path} {isEvo && <span style={{ background: '#4ade80', color: '#1e293b', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.72rem', marginLeft: '0.4rem' }}>Auto-mapeado ⚡</span>}
                      <span style={{ color: '#64748b' }}>→ {e.dataType}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
            {saveResult && (
              <div style={{ padding: '0.75rem', borderRadius: '8px', background: saveResult.success ? '#4ade8022' : '#f8717122', border: '1px solid ' + (saveResult.success ? '#4ade8044' : '#f8717144'), color: saveResult.success ? '#4ade80' : '#f87171', fontSize: '0.85rem' }}>
                {saveResult.success ? '✓ ' + saveResult.message : '✗ ' + saveResult.error}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
              <button style={btnG} onClick={() => { setStep(2); setErrors({}) }}>Atras</button>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button style={btnS} onClick={saveConfig} disabled={saving}>{saving ? 'Guardando...' : 'Guardar config'}</button>
                {saveResult?.success && <button style={btnP} onClick={() => runExtract(saveResult.configName)} disabled={extracting}>{extracting ? 'Extrayendo...' : 'Sincronizar ahora'}</button>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}






