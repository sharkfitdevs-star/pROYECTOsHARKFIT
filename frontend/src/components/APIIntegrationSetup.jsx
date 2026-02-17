/**
 * 🚀 SETUP DE INTEGRACIONES API
 * 
 * Componente React para configurar conexiones a APIs externas
 * - Validar URL
 * - Probar autenticación
 * - Mapear endpoints y campos
 * - Guardar configuración
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './APIIntegrationSetup.css';
import { useToast } from './ui/use-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const APIIntegrationSetup = () => {
  const [step, setStep] = useState(1); // 1: Datos, 2: Auth, 3: Endpoints, 4: Resumen
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { toast } = useToast();

  // Paso 1: Datos generales
  const [apiName, setApiName] = useState('');
  const [baseURL, setBaseURL] = useState('');
  const [historicalStartDate, setHistoricalStartDate] = useState('');
  const [historicalEndDate, setHistoricalEndDate] = useState('');
  const [historicalWarning, setHistoricalWarning] = useState(false);
  const [showHistoricalConfirm, setShowHistoricalConfirm] = useState(false);

  // Paso 2: Autenticación
  const [authType, setAuthType] = useState('none');
  const [supportsWebhooks, setSupportsWebhooks] = useState(false);
  const [authData, setAuthData] = useState({
    headerName: '',
    key: '',
    token: '',
    username: '',
    password: '',
    clientId: '',
    clientSecret: '',
    tokenURL: ''
  });

  // Paso 3: Endpoints
  const [endpoints, setEndpoints] = useState([]);
  const [currentEndpoint, setCurrentEndpoint] = useState({
    path: '',
    collectionName: '',
    fields: '',
    dataPath: '',
    dataType: '' // NEW: Tipo de dato (clientes, ventas, alertas, etc)
  });
  const [suggestedDataTypes, setSuggestedDataTypes] = useState([]); // NEW: Detectados

  // Modal de selección de tipos
  const [showDataTypeSelector, setShowDataTypeSelector] = useState(false); // NEW
  const [selectedSecConfig, setSelectedSecConfig] = useState(null); // NEW
  const [selectedDataTypesForExtraction, setSelectedDataTypesForExtraction] = useState([]); // NEW
  const [extractionLoading, setExtractionLoading] = useState(false); // NEW

  // Configs existentes
  const [configs, setConfigs] = useState([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [syncingConfig, setSyncingConfig] = useState('');

  // Usar axios o fetch
  const api = async (method, url, data) => {
    const token = localStorage.getItem('token');
    const response = await axios({
      method,
      url: `${API_BASE_URL}${url}`,
      data,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  };

  const loadConfigs = async () => {
    setLoadingConfigs(true);
    setError('');

    try {
      const result = await api('GET', '/setup/list');
      setConfigs(result.configs || []);
    } catch (err) {
      setError('No se pudo cargar configuraciones');
    } finally {
      setLoadingConfigs(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  // ════════════════════════════════════════════════════════════════════
  // PASO 1: Información General
  // ════════════════════════════════════════════════════════════════════
  const handleValidateURL = async () => {
    if (!baseURL.trim()) {
      setError('Ingresa una URL');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await api('POST', '/setup/validate-url', { url: baseURL });
      if (result.success) {
        setSuccess('✅ ' + result.message);
        setError('');
        toast({
          title: 'URL validada',
          description: 'La URL es accesible',
          variant: 'success'
        });
      } else {
        setError('❌ ' + result.error);
        toast({
          title: 'Error validando URL',
          description: result.error,
          variant: 'error'
        });
      }
    } catch (err) {
      setError('Error: ' + err.message);
      toast({
        title: 'Error validando URL',
        description: err.message,
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep1 = () => {
    if (!apiName.trim() || !baseURL.trim()) {
      setError('Completa todos los campos');
      return;
    }

    if (!historicalStartDate && !historicalEndDate) {
      setHistoricalWarning(true);
      setShowHistoricalConfirm(true);
      toast({
        title: 'Rango historico completo',
        description: 'Se extraera todo el historico. Esto puede tardar bastante.',
        variant: 'warning'
      });
      return;
    }
    setStep(2);
    setError('');
  };

  const handleConfirmHistoricalFull = () => {
    setShowHistoricalConfirm(false);
    setStep(2);
    setError('');
  };

  const handleCancelHistoricalFull = () => {
    setShowHistoricalConfirm(false);
  };

  // ════════════════════════════════════════════════════════════════════
  // PASO 2: Autenticación
  // ════════════════════════════════════════════════════════════════════
  const handleTestAuth = async () => {
    setLoading(true);
    setError('');

    const authConfig = {
      type: authType
    };

    if (authType === 'apikey') {
      authConfig.headerName = authData.headerName;
      authConfig.key = authData.key;
    } else if (authType === 'bearer') {
      authConfig.token = authData.token;
    } else if (authType === 'basic') {
      authConfig.username = authData.username;
      authConfig.password = authData.password;
    } else if (authType === 'oauth') {
      authConfig.clientId = authData.clientId;
      authConfig.clientSecret = authData.clientSecret;
      authConfig.tokenURL = authData.tokenURL;
    }

    try {
      const result = await api('POST', '/setup/test-auth', {
        baseURL,
        auth: authConfig
      });

      if (result.success) {
        setSuccess('✅ ' + result.message);
        setError('');
        toast({
          title: 'Autenticacion correcta',
          description: 'Credenciales validadas',
          variant: 'success'
        });
      } else {
        setError('❌ ' + result.error);
        toast({
          title: 'Auth fallida',
          description: result.error,
          variant: 'error'
        });
      }
    } catch (err) {
      setError('Error: ' + err.message);
      toast({
        title: 'Auth fallida',
        description: err.message,
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep2 = () => {
    if (authType !== 'none') {
      // Validar que haya datos de auth
      if (authType === 'apikey' && (!authData.headerName || !authData.key)) {
        setError('Completa los datos de API Key');
        return;
      }
      if (authType === 'bearer' && !authData.token) {
        setError('Ingresa el token Bearer');
        return;
      }
      if (authType === 'basic' && (!authData.username || !authData.password)) {
        setError('Ingresa usuario y contraseña');
        return;
      }
    }
    setStep(3);
    setError('');
  };

  // ════════════════════════════════════════════════════════════════════
  // PASO 3: Endpoints
  // ════════════════════════════════════════════════════════════════════
  const handleAddEndpoint = async () => {
    if (!currentEndpoint.path || !currentEndpoint.collectionName || !currentEndpoint.fields) {
      setError('Completa todos los campos del endpoint');
      return;
    }

    setLoading(true);
    setError('');

    const authConfig = {
      type: authType
    };

    if (authType === 'apikey') {
      authConfig.headerName = authData.headerName;
      authConfig.key = authData.key;
    } else if (authType === 'bearer') {
      authConfig.token = authData.token;
    } else if (authType === 'basic') {
      authConfig.username = authData.username;
      authConfig.password = authData.password;
    }

    try {
      const result = await api('POST', '/setup/test-endpoint', {
        baseURL,
        path: currentEndpoint.path,
        auth: authConfig
      });

      if (result.success) {
        const fieldsArray = currentEndpoint.fields
          .split(',')
          .map(f => f.trim())
          .filter(f => f);

        // Usar tipo detectado o el ingresado por el usuario
        const dataType = currentEndpoint.dataType || (result.suggestedDataTypes?.[0] || 'otros');

        const newEndpoint = {
          path: currentEndpoint.path,
          method: 'GET',
          collectionName: currentEndpoint.collectionName,
          fields: fieldsArray,
          dataType, // NEW: Tipo de dato detectado/seleccionado
          targetSection: currentEndpoint.dataType ? currentEndpoint.dataType : dataType // NEW: Destino en dashboard
        };

        if (currentEndpoint.dataPath) {
          newEndpoint.dataPath = currentEndpoint.dataPath;
        }

        // Mostrar tipos detectados si los hay
        if (result.suggestedDataTypes && result.suggestedDataTypes.length > 0) {
          setSuggestedDataTypes(result.suggestedDataTypes);
          toast({
            title: 'Tipos detectados',
            description: `Detectados: ${result.suggestedDataTypes.join(', ')}`,
            variant: 'warning'
          });
        }

        setEndpoints([...endpoints, newEndpoint]);
        setCurrentEndpoint({
          path: '',
          collectionName: '',
          fields: '',
          dataPath: '',
          dataType: '' // Reset
        });
        setSuccess(`✅ Endpoint agregado: ${currentEndpoint.path}`);
        toast({
          title: 'Endpoint agregado',
          description: currentEndpoint.path,
          variant: 'success'
        });
      } else {
        setError('❌ ' + result.error);
        toast({
          title: 'Error en endpoint',
          description: result.error,
          variant: 'error'
        });
      }
    } catch (err) {
      setError('Error: ' + err.message);
      toast({
        title: 'Error en endpoint',
        description: err.message,
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveEndpoint = (index) => {
    setEndpoints(endpoints.filter((_, i) => i !== index));
  };

  const handleNextStep3 = () => {
    if (endpoints.length === 0) {
      setError('Agrega al menos un endpoint');
      return;
    }
    setStep(4);
    setError('');
  };

  // ════════════════════════════════════════════════════════════════════
  // PASO 4: Guardar
  // ════════════════════════════════════════════════════════════════════
  const handleSave = async () => {
    setLoading(true);
    setError('');

    const authConfig = {
      type: authType
    };

    if (authType === 'apikey') {
      authConfig.headerName = authData.headerName;
      authConfig.key = `\${API_KEY_${apiName.toUpperCase().replace(/\s+/g, '_')}}`;
    } else if (authType === 'bearer') {
      authConfig.token = `\${API_TOKEN_${apiName.toUpperCase().replace(/\s+/g, '_')}}`;
    } else if (authType === 'basic') {
      authConfig.username = `\${API_USER_${apiName.toUpperCase().replace(/\s+/g, '_')}}`;
      authConfig.password = `\${API_PASS_${apiName.toUpperCase().replace(/\s+/g, '_')}}`;
    }

    try {
      const result = await api('POST', '/setup/create', {
        apiName,
        baseURL,
        auth: authConfig,
        endpoints,
        webhooksEnabled: supportsWebhooks,
        historicalStartDate,
        historicalEndDate
      });

      if (result.success) {
        setSuccess(`✅ ${result.message}`);
        toast({
          title: 'Integracion guardada',
          description: result.message,
          variant: 'success'
        });
        await loadConfigs();
        // Reset form
        setTimeout(() => {
          setStep(1);
          setApiName('');
          setBaseURL('');
          setHistoricalStartDate('');
          setHistoricalEndDate('');
          setAuthType('none');
          setEndpoints([]);
          setSupportsWebhooks(false);
        }, 2000);
      } else {
        setError('❌ ' + result.error);
        toast({
          title: 'Error guardando',
          description: result.error,
          variant: 'error'
        });
      }
    } catch (err) {
      setError('Error: ' + err.message);
      toast({
        title: 'Error guardando',
        description: err.message,
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncConfig = async (configId) => {
    // Cargar la configuración para obtener tipos de datos
    try {
      setLoading(true);
      const configResult = await api('GET', `/setup/config/${configId}`);
      if (configResult.success && configResult.config.endpoints) {
        const allDataTypes = [...new Set(
          configResult.config.endpoints.map(ep => ep.dataType || 'otros')
        )];
        setSelectedSecConfig(configId);
        setSelectedDataTypesForExtraction(allDataTypes); // Pre-seleccionar todos
        setShowDataTypeSelector(true); // Mostrar modal
      }
    } catch (err) {
      setError('No se pudo cargar configuración: ' + err.message);
      toast({
        title: 'Error cargando config',
        description: err.message,
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmExtraction = async () => {
    if (selectedDataTypesForExtraction.length === 0) {
      setError('Selecciona al menos un tipo de dato para extraer');
      return;
    }

    setExtractionLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        configName: selectedSecConfig,
        selectedDataTypes: selectedDataTypesForExtraction
      };

      const result = await api('POST', '/setup/extract-selective', payload);

      if (result.success) {
        setSuccess(`✅ Sincronización iniciada: ${selectedDataTypesForExtraction.join(', ')}`);
        toast({
          title: 'Sincronizacion iniciada',
          description: selectedDataTypesForExtraction.join(', '),
          variant: 'success'
        });
        setShowDataTypeSelector(false);
        // Reload configs
        await loadConfigs();
      } else {
        setError('❌ ' + result.error);
        toast({
          title: 'Error al sincronizar',
          description: result.error,
          variant: 'error'
        });
      }
    } catch (err) {
      setError('Error al sincronizar: ' + err.message);
      toast({
        title: 'Error al sincronizar',
        description: err.message,
        variant: 'error'
      });
    } finally {
      setExtractionLoading(false);
    }
  };

  return (
    <div className="api-setup-container">
      <div className="setup-header">
        <h1>🚀 Integración de APIs</h1>
        <p>Conecta tus datos desde APIs externas hacia MongoDB</p>
      </div>

      <div className="integration-list">
        <div className="integration-list-header">
          <h2>Integraciones existentes</h2>
          {configs.length > 0 && (
            <button
              className="btn btn-sync-all"
              onClick={() => {
                // Mostrar modal para seleccionar qué integraciones sincronizar
                // Por ahora, puedes sincronizar una a una desde las tarjetas
                toast({
                  title: 'Sincronización individual',
                  description: 'Selecciona una integración para sincronizar',
                  variant: 'info'
                });
              }}
              disabled={loadingConfigs}
              title="Sincroniza cada integración individualmente seleccionando los tipos deseados"
            >
              📋 Todas
            </button>
          )}
        </div>

        {loadingConfigs ? (
          <p className="muted">Cargando integraciones...</p>
        ) : configs.length === 0 ? (
          <p className="muted">Aún no hay integraciones configuradas.</p>
        ) : (
          <div className="integration-grid">
            {configs.map((cfg) => (
              <div key={cfg.id} className="integration-card">
                <div>
                  <h3>{cfg.name || cfg.id}</h3>
                  <p className="muted">{cfg.baseURL}</p>
                  <p className="muted">Endpoints: {cfg.endpoints}</p>
                </div>
                <button
                  className="btn btn-sync-one"
                  onClick={() => handleSyncConfig(cfg.id)}
                  disabled={syncingConfig === cfg.id}
                >
                  {syncingConfig === cfg.id ? '⏳ Sincronizando...' : 'Actualizar ahora'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="steps-indicator">
        <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Info</div>
        <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Auth</div>
        <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Endpoints</div>
        <div className={`step ${step >= 4 ? 'active' : ''}`}>4. Resumen</div>
      </div>

      {/* PASO 1 */}
      {step === 1 && (
        <div className="step-content">
          <h2>Paso 1: Información General</h2>
          <div className="form-group">
            <label>¿Nombre del proveedor?</label>
            <input
              type="text"
              placeholder="Ej: Shopify, WooCommerce, Mi API"
              value={apiName}
              onChange={(e) => setApiName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>URL Base de la API</label>
            <div className="input-with-button">
              <input
                type="text"
                placeholder="https://api.ejemplo.com"
                value={baseURL}
                onChange={(e) => setBaseURL(e.target.value)}
              />
              <button onClick={handleValidateURL} disabled={loading} className="btn-validate">
                {loading ? '⏳' : '✓'} Validar
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Rango historico de extraccion</label>
            <div className="date-range">
              <div>
                <span>Desde</span>
                <input
                  type="date"
                  value={historicalStartDate}
                  onChange={(e) => {
                    setHistoricalStartDate(e.target.value);
                    setHistoricalWarning(false);
                  }}
                />
              </div>
              <div>
                <span>Hasta</span>
                <input
                  type="date"
                  value={historicalEndDate}
                  onChange={(e) => {
                    setHistoricalEndDate(e.target.value);
                    setHistoricalWarning(false);
                  }}
                />
              </div>
            </div>
            <p className="help-text">Opcional: si se deja vacio, se extrae todo el historico disponible.</p>
            {historicalWarning && (
              <p className="help-text warning-text">
                ⚠️ Tomar todo el historico puede ralentizar la extraccion.
              </p>
            )}
            {showHistoricalConfirm && (
              <div className="confirm-overlay" role="dialog" aria-modal="true">
                <div className="confirm-modal">
                  <h3>Confirmar rango historico completo</h3>
                  <p>Se extraera todo el historico disponible. Esto puede tardar bastante.</p>
                  <div className="confirm-actions">
                    <button type="button" className="btn btn-secondary" onClick={handleCancelHistoricalFull}>
                      Cancelar
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleConfirmHistoricalFull}>
                      Confirmar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button onClick={handleNextStep1} className="btn btn-primary">
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* PASO 2 */}
      {step === 2 && (
        <div className="step-content">
          <h2>Paso 2: Autenticación</h2>
          <div className="form-group">
            <label>¿Cómo se autentica?</label>
            <select value={authType} onChange={(e) => setAuthType(e.target.value)}>
              <option value="none">Sin autenticación</option>
              <option value="apikey">API Key (en header)</option>
              <option value="bearer">Bearer Token</option>
              <option value="basic">Basic Auth (usuario/password)</option>
              <option value="oauth">OAuth 2.0</option>
            </select>
          </div>

          {authType === 'apikey' && (
            <>
              <div className="form-group">
                <label>Nombre del header</label>
                <input
                  type="text"
                  placeholder="X-API-Key"
                  value={authData.headerName}
                  onChange={(e) => setAuthData({ ...authData, headerName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Valor de la API Key</label>
                <input
                  type="password"
                  placeholder="Tu API Key"
                  value={authData.key}
                  onChange={(e) => setAuthData({ ...authData, key: e.target.value })}
                />
              </div>
            </>
          )}

          {authType === 'bearer' && (
            <div className="form-group">
              <label>Token Bearer</label>
              <input
                type="password"
                placeholder="Tu token"
                value={authData.token}
                onChange={(e) => setAuthData({ ...authData, token: e.target.value })}
              />
            </div>
          )}

          {authType === 'basic' && (
            <>
              <div className="form-group">
                <label>Usuario</label>
                <input
                  type="text"
                  value={authData.username}
                  onChange={(e) => setAuthData({ ...authData, username: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Contraseña</label>
                <input
                  type="password"
                  value={authData.password}
                  onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>¿Tu proveedor permite Webhooks?</label>
            <select
              value={supportsWebhooks ? 'si' : 'no'}
              onChange={(e) => setSupportsWebhooks(e.target.value === 'si')}
            >
              <option value="si">Sí, permite webhooks</option>
              <option value="no">No, o no estoy seguro</option>
            </select>
          </div>

          <div className="form-actions">
            <button onClick={() => setStep(1)} className="btn btn-secondary">
              ← Atrás
            </button>
            <button onClick={handleTestAuth} disabled={loading} className="btn btn-success">
              {loading ? '⏳' : '✓'} Probar Auth
            </button>
            <button onClick={handleNextStep2} className="btn btn-primary">
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* PASO 3 */}
      {step === 3 && (
        <div className="step-content">
          <h2>Paso 3: Endpoints</h2>

          {endpoints.length > 0 && (
            <div className="endpoints-list">
              <h3>Endpoints agregados:</h3>
              {endpoints.map((ep, idx) => (
                <div key={idx} className="endpoint-item">
                  <div>
                    <strong>{ep.path}</strong> → {ep.collectionName}
                  </div>
                  <button
                    onClick={() => handleRemoveEndpoint(idx)}
                    className="btn-remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="endpoint-form">
            <h3>Agregar endpoint:</h3>
            <div className="form-group">
              <label>Ruta del endpoint</label>
              <input
                type="text"
                placeholder="/productos"
                value={currentEndpoint.path}
                onChange={(e) => setCurrentEndpoint({ ...currentEndpoint, path: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Colección en MongoDB</label>
              <input
                type="text"
                placeholder="productos"
                value={currentEndpoint.collectionName}
                onChange={(e) =>
                  setCurrentEndpoint({ ...currentEndpoint, collectionName: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Campos a extraer (separados por coma)</label>
              <input
                type="text"
                placeholder="id, name, email, price"
                value={currentEndpoint.fields}
                onChange={(e) => setCurrentEndpoint({ ...currentEndpoint, fields: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Tipo de dato 📊 {suggestedDataTypes.length > 0 && `(Sugeridos: ${suggestedDataTypes.join(', ')})`}</label>
              <select
                value={currentEndpoint.dataType}
                onChange={(e) => setCurrentEndpoint({ ...currentEndpoint, dataType: e.target.value })}
              >
                <option value="">-- Seleccionar o dejar vacío --</option>
                <option value="clientes">👥 Clientes</option>
                <option value="ventas">💰 Ventas</option>
                <option value="alertas">⚠️ Alertas</option>
                <option value="cuenta">💳 Cuenta</option>
                <option value="estados">📋 Estados</option>
                <option value="otros">📦 Otros</option>
              </select>
            </div>

            <div className="form-group">
              <label>Ruta JSON de datos (opcional)</label>
              <input
                type="text"
                placeholder="data, results, data.items"
                value={currentEndpoint.dataPath}
                onChange={(e) =>
                  setCurrentEndpoint({ ...currentEndpoint, dataPath: e.target.value })
                }
              />
            </div>

            <button onClick={handleAddEndpoint} disabled={loading} className="btn btn-success">
              {loading ? '⏳' : '➕'} Agregar Endpoint
            </button>
          </div>

          <div className="form-actions">
            <button onClick={() => setStep(2)} className="btn btn-secondary">
              ← Atrás
            </button>
            <button onClick={handleNextStep3} className="btn btn-primary">
              Resumen →
            </button>
          </div>
        </div>
      )}

      {/* PASO 4 */}
      {step === 4 && (
        <div className="step-content">
          <h2>Resumen de Configuración</h2>

          <div className="summary">
            <div className="summary-item">
              <label>Nombre:</label>
              <p>{apiName}</p>
            </div>

            <div className="summary-item">
              <label>URL:</label>
              <p>{baseURL}</p>
            </div>

            <div className="summary-item">
              <label>Autenticación:</label>
              <p>{authType === 'none' ? 'Sin autenticación' : authType.toUpperCase()}</p>
            </div>

            <div className="summary-item">
              <label>Rango historico:</label>
              <p>
                {historicalStartDate ? historicalStartDate : 'Sin inicio'}
                {'  →  '}
                {historicalEndDate ? historicalEndDate : 'Sin fin'}
              </p>
            </div>

            <div className="summary-item">
              <label>Webhooks:</label>
              <p>{supportsWebhooks ? 'Sí, permite webhooks' : 'No / No seguro'}</p>
            </div>

            <div className="summary-item">
              <label>Endpoints ({endpoints.length}):</label>
              <ul>
                {endpoints.map((ep, idx) => (
                  <li key={idx}>
                    <strong>{ep.path}</strong> → {ep.collectionName}
                    <br />
                    <small>📊 Tipo: <span style={{ color: '#667eea', fontWeight: 'bold' }}>{ep.dataType || 'otros'}</span> | 📋 Campos: {ep.fields.length}</small>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="security-notice">
            <strong>🔐 Seguridad:</strong>
            <p>Las credenciales se guardarán en tu archivo .env local (no en GitHub)</p>
          </div>

          <div className="form-actions">
            <button onClick={() => setStep(3)} className="btn btn-secondary">
              ← Editar
            </button>
            <button onClick={handleSave} disabled={loading} className="btn btn-success">
              {loading ? '⏳' : '✓'} Guardar Configuración
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE SELECCIÓN DE TIPOS DE DATOS */}
      {showDataTypeSelector && (
        <div className="data-type-modal-overlay">
          <div className="data-type-modal">
            <h2>📊 Seleccionar tipos de datos a extraer</h2>
            <p>Elige qué información quieres extraer de esta integración:</p>

            <div className="data-type-checkboxes">
              {/* Opciones comunes de tipos */}
              <div className="checkbox-group">
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedDataTypesForExtraction.includes('clientes')}
                    onChange={(e) => {
                      setSelectedDataTypesForExtraction(
                        e.target.checked
                          ? [...selectedDataTypesForExtraction, 'clientes']
                          : selectedDataTypesForExtraction.filter(t => t !== 'clientes')
                      );
                    }}
                  />
                  <span>👥 Clientes</span>
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedDataTypesForExtraction.includes('ventas')}
                    onChange={(e) => {
                      setSelectedDataTypesForExtraction(
                        e.target.checked
                          ? [...selectedDataTypesForExtraction, 'ventas']
                          : selectedDataTypesForExtraction.filter(t => t !== 'ventas')
                      );
                    }}
                  />
                  <span>💰 Ventas</span>
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedDataTypesForExtraction.includes('alertas')}
                    onChange={(e) => {
                      setSelectedDataTypesForExtraction(
                        e.target.checked
                          ? [...selectedDataTypesForExtraction, 'alertas']
                          : selectedDataTypesForExtraction.filter(t => t !== 'alertas')
                      );
                    }}
                  />
                  <span>⚠️ Alertas</span>
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedDataTypesForExtraction.includes('cuenta')}
                    onChange={(e) => {
                      setSelectedDataTypesForExtraction(
                        e.target.checked
                          ? [...selectedDataTypesForExtraction, 'cuenta']
                          : selectedDataTypesForExtraction.filter(t => t !== 'cuenta')
                      );
                    }}
                  />
                  <span>💳 Cuenta</span>
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedDataTypesForExtraction.includes('estados')}
                    onChange={(e) => {
                      setSelectedDataTypesForExtraction(
                        e.target.checked
                          ? [...selectedDataTypesForExtraction, 'estados']
                          : selectedDataTypesForExtraction.filter(t => t !== 'estados')
                      );
                    }}
                  />
                  <span>📋 Estados</span>
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedDataTypesForExtraction.includes('otros')}
                    onChange={(e) => {
                      setSelectedDataTypesForExtraction(
                        e.target.checked
                          ? [...selectedDataTypesForExtraction, 'otros']
                          : selectedDataTypesForExtraction.filter(t => t !== 'otros')
                      );
                    }}
                  />
                  <span>📦 Otros</span>
                </label>
              </div>
            </div>

            <div className="data-type-info">
              <p><strong>Seleccionados:</strong> {selectedDataTypesForExtraction.join(', ') || 'Ninguno'}</p>
            </div>

            <div className="modal-actions">
              <button
                onClick={() => setShowDataTypeSelector(false)}
                className="btn btn-secondary"
                disabled={extractionLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmExtraction}
                className="btn btn-success"
                disabled={extractionLoading || selectedDataTypesForExtraction.length === 0}
              >
                {extractionLoading ? '⏳ Extrayendo...' : '✓ Extraer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default APIIntegrationSetup;
