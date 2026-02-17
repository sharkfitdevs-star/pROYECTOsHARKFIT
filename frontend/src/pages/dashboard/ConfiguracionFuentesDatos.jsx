/**
 * PÁGINA: Configuración → Fuentes de Datos
 * 
 * MVP con 4 funcionalidades:
 * 1. Upload Excel/CSV
 * 2. Configuración EVO (backend guarda secrets)
 * 3. Historial de sincronizaciones
 * 4. Sync Now (manual)
 */

import { useState, useEffect } from 'react';
import axios from 'axios';
import APIIntegrationSetup from '../../components/APIIntegrationSetup';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

function ConfiguracionFuentesDatos() {
  // ==================== ESTADO ====================
  const [activeTab, setActiveTab] = useState('upload'); // 'upload', 'evo', 'apis', 'historial'
  
  // Upload
  const [archivo, setArchivo] = useState(null);
  const [tipoArchivo, setTipoArchivo] = useState('excel'); // 'excel' o 'csv'
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  
  // EVO Config
  const [evoConfig, setEvoConfig] = useState({
    nombre: 'EVO Principal',
    baseURL: '',
    apiKey: '',
    instance: ''
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState(null);
  
  // Historial
  const [historial, setHistorial] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  
  // Sync Now
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // ==================== EFECTOS ====================
  
  useEffect(() => {
    if (activeTab === 'historial') {
      cargarHistorial();
    }
  }, [activeTab]);

  // ==================== FUNCIONES ====================

  /**
   * Subir archivo Excel/CSV
   */
  const handleUploadFile = async () => {
    if (!archivo) {
      alert('Por favor selecciona un archivo');
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', archivo);
      formData.append('entidad', 'clientes');
      
      // Mapeo básico (puedes mejorarlo con UI de mapeo)
      const mapeo = {
        'Nombre': 'nombre',
        'Nom Cliente': 'nombre',
        'Correo': 'email',
        'Email': 'email',
        'Teléfono': 'telefono',
        'Telefono': 'telefono',
        'RFC': 'rfc',
        'Empresa': 'empresa',
        'Estado': 'estado'
      };
      formData.append('mapeo', JSON.stringify(mapeo));

      const endpoint = tipoArchivo === 'excel' 
        ? `${API_BASE_URL}/import/excel`
        : `${API_BASE_URL}/import/csv`;

      const response = await axios.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploadResult({
        exito: true,
        ...response.data.datos
      });

      // Refrescar stats después de importar
      setTimeout(() => {
        window.dispatchEvent(new Event('refreshStats'));
      }, 1000);

    } catch (error) {
      console.error('Error subiendo archivo:', error);
      setUploadResult({
        exito: false,
        error: error.response?.data?.error || error.message
      });
    } finally {
      setUploading(false);
    }
  };

  /**
   * Probar conexión a EVO
   */
  const handleTestConnection = async () => {
    if (!evoConfig.baseURL || !evoConfig.apiKey) {
      alert('Por favor completa URL base y API Key');
      return;
    }

    setTestingConnection(true);
    setConnectionResult(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/sources/api/test`, {
        baseURL: evoConfig.baseURL,
        headers: {
          'Authorization': `Bearer ${evoConfig.apiKey}`
        },
        testEndpoint: '/clientes'
      });

      setConnectionResult({
        exito: response.data.datos.conectado,
        latencia: response.data.datos.latencia,
        mensaje: response.data.datos.mensaje
      });

    } catch (error) {
      console.error('Error testeando conexión:', error);
      setConnectionResult({
        exito: false,
        mensaje: error.response?.data?.error || 'No se pudo conectar'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  /**
   * Guardar configuración EVO (backend guarda secrets)
   */
  const handleSaveEVOConfig = async () => {
    if (!evoConfig.baseURL || !evoConfig.apiKey) {
      alert('Por favor completa todos los campos');
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/sources/api/save`, {
        nombre: evoConfig.nombre,
        baseURL: evoConfig.baseURL,
        headers: {
          'Authorization': `Bearer ${evoConfig.apiKey}` // Backend lo encriptará
        },
        tipo: 'EVO',
        mapeo: {
          // Mapeo EVO → Schema
          'id': 'eventoId',
          'razonSocial': 'nombre',
          'email': 'email',
          'rfc': 'rfc'
        }
      });

      alert('✅ Configuración guardada correctamente');
      
      // Limpiar API key del estado (ya está en backend)
      setEvoConfig({ ...evoConfig, apiKey: '' });

    } catch (error) {
      console.error('Error guardando config:', error);
      alert('❌ Error al guardar: ' + (error.response?.data?.error || error.message));
    }
  };

  /**
   * Cargar historial de sincronizaciones
   */
  const cargarHistorial = async () => {
    setLoadingHistorial(true);

    try {
      const response = await axios.get(`${API_BASE_URL}/sync/logs?limit=50`);
      setHistorial(response.data.datos || []);
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoadingHistorial(false);
    }
  };

  /**
   * Ejecutar sincronización manual
   */
  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncResult(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/sync/run`, {
        sourceId: 'evo-principal',
        modo: 'incremental',
        entidades: ['clientes', 'ventas']
      });

      setSyncResult({
        exito: true,
        ...response.data.datos
      });

      // Refrescar historial
      setTimeout(() => {
        cargarHistorial();
      }, 1000);

    } catch (error) {
      console.error('Error sincronizando:', error);
      setSyncResult({
        exito: false,
        error: error.response?.data?.error || error.message
      });
    } finally {
      setSyncing(false);
    }
  };

  /**
   * Formatear fecha
   */
  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    const d = new Date(fecha);
    return d.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ==================== RENDER ====================

  return (
    <div className="configuracion-fuentes-datos" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '10px' }}>
          ⚙️ Configuración de Fuentes de Datos
        </h1>
        <p style={{ color: '#666' }}>
          Importa datos, conecta sistemas externos y sincroniza automáticamente
        </p>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '2px solid #e5e7eb', marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button
            onClick={() => setActiveTab('upload')}
            style={{
              padding: '10px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'upload' ? '3px solid #2563eb' : '3px solid transparent',
              color: activeTab === 'upload' ? '#2563eb' : '#666',
              fontWeight: activeTab === 'upload' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            📁 Importar Archivos
          </button>
          
          <button
            onClick={() => setActiveTab('evo')}
            style={{
              padding: '10px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'evo' ? '3px solid #2563eb' : '3px solid transparent',
              color: activeTab === 'evo' ? '#2563eb' : '#666',
              fontWeight: activeTab === 'evo' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            🔌 Configurar EVO
          </button>

          <button
            onClick={() => setActiveTab('apis')}
            style={{
              padding: '10px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'apis' ? '3px solid #2563eb' : '3px solid transparent',
              color: activeTab === 'apis' ? '#2563eb' : '#666',
              fontWeight: activeTab === 'apis' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            🔗 Conectar APIs
          </button>
          
          <button
            onClick={() => setActiveTab('historial')}
            style={{
              padding: '10px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'historial' ? '3px solid #2563eb' : '3px solid transparent',
              color: activeTab === 'historial' ? '#2563eb' : '#666',
              fontWeight: activeTab === 'historial' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            📊 Historial
          </button>
        </div>
      </div>

      {/* CONTENIDO: Upload */}
      {activeTab === 'upload' && (
        <div style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
            📂 Importar Clientes desde Excel/CSV
          </h2>

          {/* Selector tipo */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: '500' }}>
              Tipo de archivo:
            </label>
            <div style={{ display: 'flex', gap: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="excel"
                  checked={tipoArchivo === 'excel'}
                  onChange={(e) => setTipoArchivo(e.target.value)}
                />
                <span>Excel (.xlsx)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  value="csv"
                  checked={tipoArchivo === 'csv'}
                  onChange={(e) => setTipoArchivo(e.target.value)}
                />
                <span>CSV (.csv)</span>
              </label>
            </div>
          </div>

          {/* File input */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: '500' }}>
              Seleccionar archivo:
            </label>
            <input
              type="file"
              accept={tipoArchivo === 'excel' ? '.xlsx,.xls' : '.csv'}
              onChange={(e) => setArchivo(e.target.files[0])}
              style={{
                padding: '10px',
                border: '2px dashed #d1d5db',
                borderRadius: '4px',
                width: '100%',
                cursor: 'pointer'
              }}
            />
            {archivo && (
              <p style={{ marginTop: '10px', color: '#059669', fontSize: '14px' }}>
                ✓ {archivo.name} ({(archivo.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Botón upload */}
          <button
            onClick={handleUploadFile}
            disabled={!archivo || uploading}
            style={{
              padding: '12px 24px',
              background: uploading ? '#9ca3af' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: uploading ? 'not-allowed' : 'pointer',
              opacity: !archivo || uploading ? 0.6 : 1
            }}
          >
            {uploading ? '⏳ Importando...' : '🚀 Importar Ahora'}
          </button>

          {/* Resultado */}
          {uploadResult && (
            <div
              style={{
                marginTop: '20px',
                padding: '15px',
                borderRadius: '6px',
                background: uploadResult.exito ? '#d1fae5' : '#fee2e2',
                border: `1px solid ${uploadResult.exito ? '#10b981' : '#ef4444'}`
              }}
            >
              {uploadResult.exito ? (
                <>
                  <p style={{ fontWeight: 'bold', color: '#065f46', marginBottom: '10px' }}>
                    ✅ Importación Exitosa
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, color: '#065f46' }}>
                    <li>• {uploadResult.registosProcesados} registros procesados</li>
                    <li>• {uploadResult.registosInseridos} clientes nuevos</li>
                    <li>• {uploadResult.registosActualizados} actualizados</li>
                    {uploadResult.registosFallidos > 0 && (
                      <li style={{ color: '#dc2626' }}>• {uploadResult.registosFallidos} errores</li>
                    )}
                  </ul>
                </>
              ) : (
                <p style={{ fontWeight: 'bold', color: '#991b1b' }}>
                  ❌ Error: {uploadResult.error}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO: EVO Config */}
      {activeTab === 'evo' && (
        <div style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
            🔌 Configurar Conexión EVO
          </h2>

          <div style={{ display: 'grid', gap: '20px', marginBottom: '20px' }}>
            {/* Nombre */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Nombre de la conexión:
              </label>
              <input
                type="text"
                value={evoConfig.nombre}
                onChange={(e) => setEvoConfig({ ...evoConfig, nombre: e.target.value })}
                placeholder="Ej: EVO Principal"
                style={{
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  width: '100%',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Instance/DNS */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Instance / DNS (opcional):
              </label>
              <input
                type="text"
                value={evoConfig.instance}
                onChange={(e) => setEvoConfig({ ...evoConfig, instance: e.target.value })}
                placeholder="Ej: miempresa.evo.com"
                style={{
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  width: '100%',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Base URL */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Base URL: <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="url"
                value={evoConfig.baseURL}
                onChange={(e) => setEvoConfig({ ...evoConfig, baseURL: e.target.value })}
                placeholder="https://api.evo.com"
                style={{
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  width: '100%',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* API Key */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                API Key / Token: <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="password"
                value={evoConfig.apiKey}
                onChange={(e) => setEvoConfig({ ...evoConfig, apiKey: e.target.value })}
                placeholder="••••••••••••••••••••"
                style={{
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  width: '100%',
                  fontSize: '14px'
                }}
              />
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '5px' }}>
                🔒 Se guardará encriptado en el backend. El frontend nunca lo expone.
              </p>
            </div>
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
            <button
              onClick={handleTestConnection}
              disabled={testingConnection}
              style={{
                padding: '12px 24px',
                background: testingConnection ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: testingConnection ? 'not-allowed' : 'pointer'
              }}
            >
              {testingConnection ? '⏳ Probando...' : '🔍 Probar Conexión'}
            </button>

            <button
              onClick={handleSaveEVOConfig}
              style={{
                padding: '12px 24px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              💾 Guardar Configuración
            </button>
          </div>

          {/* Resultado test */}
          {connectionResult && (
            <div
              style={{
                padding: '15px',
                borderRadius: '6px',
                background: connectionResult.exito ? '#d1fae5' : '#fee2e2',
                border: `1px solid ${connectionResult.exito ? '#10b981' : '#ef4444'}`
              }}
            >
              <p style={{ fontWeight: 'bold', color: connectionResult.exito ? '#065f46' : '#991b1b' }}>
                {connectionResult.exito ? '✅' : '❌'} {connectionResult.mensaje}
              </p>
              {connectionResult.latencia && (
                <p style={{ fontSize: '14px', color: '#065f46', marginTop: '5px' }}>
                  Latencia: {connectionResult.latencia}ms
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO: APIs externas */}
      {activeTab === 'apis' && (
        <APIIntegrationSetup />
      )}

      {/* CONTENIDO: Historial */}
      {activeTab === 'historial' && (
        <div style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>
              📊 Historial de Sincronizaciones
            </h2>

            <button
              onClick={handleSyncNow}
              disabled={syncing}
              style={{
                padding: '10px 20px',
                background: syncing ? '#9ca3af' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: syncing ? 'not-allowed' : 'pointer'
              }}
            >
              {syncing ? '⏳ Sincronizando...' : '🔄 Sync Now'}
            </button>
          </div>

          {/* Resultado Sync Now */}
          {syncResult && (
            <div
              style={{
                marginBottom: '20px',
                padding: '15px',
                borderRadius: '6px',
                background: syncResult.exito ? '#d1fae5' : '#fee2e2',
                border: `1px solid ${syncResult.exito ? '#10b981' : '#ef4444'}`
              }}
            >
              {syncResult.exito ? (
                <>
                  <p style={{ fontWeight: 'bold', color: '#065f46', marginBottom: '10px' }}>
                    ✅ Sincronización Exitosa
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, color: '#065f46', fontSize: '14px' }}>
                    <li>• Clientes nuevos: {syncResult.cambios?.clientesNuevos || 0}</li>
                    <li>• Clientes actualizados: {syncResult.cambios?.clientesActualizados || 0}</li>
                    <li>• Ventas nuevas: {syncResult.cambios?.ventasNuevas || 0}</li>
                    <li>• Duración: {syncResult.duracionMs}ms</li>
                  </ul>
                </>
              ) : (
                <p style={{ fontWeight: 'bold', color: '#991b1b' }}>
                  ❌ Error: {syncResult.error}
                </p>
              )}
            </div>
          )}

          {/* Tabla historial */}
          {loadingHistorial ? (
            <p style={{ textAlign: 'center', color: '#666' }}>Cargando historial...</p>
          ) : historial.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666' }}>No hay sincronizaciones registradas</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Fecha/Hora</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Fuente</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Registros</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Insertados</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Actualizados</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Estado</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>Duración</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((log, index) => (
                    <tr key={log.syncId || index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px' }}>{formatearFecha(log.iniciado)}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: '#dbeafe',
                          color: '#1e40af',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {log.fuente}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{log.registosProcesados}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#059669' }}>{log.registosInseridos}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#2563eb' }}>{log.registosActualizados}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {log.estatus === 'Exitoso' && <span style={{ color: '#059669' }}>✅ Éxito</span>}
                        {log.estatus === 'Parcial' && <span style={{ color: '#f59e0b' }}>⚠️ Parcial</span>}
                        {log.estatus === 'Fallido' && <span style={{ color: '#ef4444' }}>❌ Error</span>}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#6b7280' }}>
                        {log.duracionMs ? `${(log.duracionMs / 1000).toFixed(2)}s` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={cargarHistorial}
            style={{
              marginTop: '20px',
              padding: '8px 16px',
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            🔄 Refrescar
          </button>
        </div>
      )}

    </div>
  );
}

export default ConfiguracionFuentesDatos;
