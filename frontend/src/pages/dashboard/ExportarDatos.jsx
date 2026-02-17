import React, { useState, useEffect } from 'react';
import { 
  exportToCSV, 
  exportToXLSX, 
  exportToJSON,
  copyToClipboard,
  generarDatosEjemplo 
} from '../../utils/exportUtils';
import { obtenerMetricasClientes } from '../../utils/apiMetricasClientes';
import { obtenerTasasConversion } from '../../utils/apiTasasConversion';
import { obtenerMetricasComerciales } from '../../utils/apiMetricasComerciales';
import './ExportarDatos.css';

export default function ExportarDatos() {
  const [activeTab, setActiveTab] = useState('archivos');
  const [sedes, setSedes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estados para exportar archivos
  const [tipoExportacion, setTipoExportacion] = useState('clientes');
  const [datosExportacion, setDatosExportacion] = useState(null);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [sede, setSede] = useState('');

  // Estados para APIs
  const [filtrosClientes, setFiltrosClientes] = useState({ fecha_inicio: '', fecha_fin: '', sede: '' });
  const [filtrosTasas, setFiltrosTasas] = useState({ fecha_inicio: '', fecha_fin: '', sede: '' });
  const [filtrosComerciales, setFiltrosComerciales] = useState({ fecha_inicio: '', fecha_fin: '', sede: '' });
  const [resultadoClientes, setResultadoClientes] = useState(null);
  const [resultadoTasas, setResultadoTasas] = useState(null);
  const [resultadoComerciales, setResultadoComerciales] = useState(null);
  const [apiActiveTab, setApiActiveTab] = useState('clientes');

  useEffect(() => {
    cargarSedes();
  }, []);

  const cargarSedes = async () => {
    try {
      // Cargar sedes desde API o usar sedes por defecto
      // TODO: Conectar con endpoint de sedes cuando esté disponible
      setSedes([
        { id: 1, nombre_sede: 'Sede Principal' },
        { id: 2, nombre_sede: 'Sede 2' },
        { id: 3, nombre_sede: 'Sede 3' }
      ]);
    } catch (error) {
      console.error('Error cargando sedes:', error);
      setSedes([]);
    }
  };

  // ============ ARCHIVOS ============

  const cargarDatos = async () => {
    setLoading(true);
    try {
      let datos = [];
      
      switch (tipoExportacion) {
        case 'clientes':
          const metricas = await obtenerMetricasClientes({ fecha_inicio: fechaInicio, fecha_fin: fechaFin, sede });
          datos = metricas?.clientes || [];
          break;
        case 'tasas':
          const tasas = await obtenerTasasConversion({ fecha_inicio: fechaInicio, fecha_fin: fechaFin, sede });
          datos = [tasas] || [];
          break;
        case 'comerciales':
          const comerciales = await obtenerMetricasComerciales({ fecha_inicio: fechaInicio, fecha_fin: fechaFin, sede });
          datos = [comerciales] || [];
          break;
        default:
          datos = generarDatosEjemplo();
      }
      
      setDatosExportacion(datos);
    } catch (error) {
      console.error('Error cargando datos:', error);
      alert('Error al cargar datos: ' + (error.message || 'Error desconocido'));
    }
    setLoading(false);
  };

  const manejarExportacion = (formato) => {
    if (!datosExportacion || datosExportacion.length === 0) {
      alert('Carga datos primero');
      return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${tipoExportacion}-${timestamp}`;

    switch (formato) {
      case 'csv':
        exportToCSV(datosExportacion, filename);
        break;
      case 'xlsx':
        exportToXLSX(datosExportacion, filename, tipoExportacion);
        break;
      case 'json':
        exportToJSON(datosExportacion, filename);
        break;
      default:
        break;
    }
  };

  // ============ APIs ============

  const ejecutarMetricasClientes = async () => {
    setLoading(true);
    const resultado = await obtenerMetricasClientes(filtrosClientes);
    setResultadoClientes(resultado);
    setLoading(false);
  };

  const ejecutarTasasConversion = async () => {
    setLoading(true);
    const resultado = await obtenerTasasConversion(filtrosTasas);
    setResultadoTasas(resultado);
    setLoading(false);
  };

  const ejecutarMetricasComerciales = async () => {
    setLoading(true);
    const resultado = await obtenerMetricasComerciales(filtrosComerciales);
    setResultadoComerciales(resultado);
    setLoading(false);
  };

  const copiarJSON = (data) => {
    copyToClipboard(data).then(success => {
      if (success) alert('JSON copiado al portapapeles');
    });
  };

  const descargarJSON = (data, filename) => {
    exportToJSON(data, filename);
  };

  // ============ COMPONENTES ============

  const Button = ({ children, onClick, disabled, variant = 'primary', size = 'md', className = '' }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn ${variant} ${size} ${className}`}
    >
      {children}
    </button>
  );

  const Input = ({ type, value, onChange, placeholder }) => (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} className="input" />
  );

  const Label = ({ children, className = '' }) => (
    <label className={`label ${className}`}>{children}</label>
  );

  const Select = ({ value, onChange, children }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="select">
      {children}
    </select>
  );

  const FiltrosComunes = ({ filtros, setFiltros }) => (
    <div className="filtros-grid">
      <div>
        <Label>Fecha Inicio</Label>
        <Input type="date" value={filtros.fecha_inicio} onChange={(e) => setFiltros({ ...filtros, fecha_inicio: e.target.value })} />
      </div>
      <div>
        <Label>Fecha Fin</Label>
        <Input type="date" value={filtros.fecha_fin} onChange={(e) => setFiltros({ ...filtros, fecha_fin: e.target.value })} />
      </div>
      <div>
        <Label>Sede</Label>
        <Select value={filtros.sede || "todas"} onChange={(value) => setFiltros({ ...filtros, sede: value === "todas" ? "" : value })}>
          <option value="todas">Todas las sedes</option>
          {sedes.map(s => (
            <option key={s.id} value={s.nombre_sede}>{s.nombre_sede}</option>
          ))}
        </Select>
      </div>
    </div>
  );

  const ResultadoJSON = ({ data, filename }) => {
    if (!data) return null;

    return (
      <div className="resultado-json">
        <div className="resultado-buttons">
          <Button size="sm" variant="outline" onClick={() => copiarJSON(data)}>
            📋 Copiar
          </Button>
          <Button size="sm" variant="outline" onClick={() => descargarJSON(data, filename)}>
            📄 JSON
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportToCSV(Array.isArray(data) ? data : [data], filename)}>
            📊 CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportToXLSX(Array.isArray(data) ? data : [data], filename)}>
            📊 Excel
          </Button>
        </div>
        <pre className="resultado-pre">{JSON.stringify(data, null, 2)}</pre>
      </div>
    );
  };

  return (
    <div className="exportar-datos">
      <div className="exportar-header">
        <h1>📊 Exportar Datos</h1>
        <p>Exporta tus datos en múltiples formatos (XLS, CSV, JSON) o accede a las APIs</p>
      </div>

      <div className="tabs-container">
        <div className="tabs-list">
          <button className={`tabs-trigger ${activeTab === 'archivos' ? 'active' : ''}`} onClick={() => setActiveTab('archivos')}>
            📁 Exportar Archivos
          </button>
          <button className={`tabs-trigger ${activeTab === 'apis' ? 'active' : ''}`} onClick={() => setActiveTab('apis')}>
            🔌 APIs Disponibles
          </button>
        </div>

        {/* TAB: ARCHIVOS */}
        {activeTab === 'archivos' && (
          <div className="tabs-content">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Seleccionar Datos a Exportar</h3>
                <p className="card-description">Elige qué datos deseas exportar y en qué formato</p>
              </div>
              <div className="card-content">
                <div className="export-section">
                  <Label className="section-label">Tipo de Datos</Label>
                  <div className="tipo-exportacion-grid">
                    {[{ value: 'clientes', label: '👥 Métricas de Clientes' }, { value: 'tasas', label: '📈 Tasas de Conversión' }, { value: 'comerciales', label: '💼 Métricas Comerciales' }].map(opcion => (
                      <button key={opcion.value} onClick={() => setTipoExportacion(opcion.value)} className={`tipo-btn ${tipoExportacion === opcion.value ? 'active' : ''}`}>
                        {opcion.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="export-section">
                  <Label className="section-label">Filtros (Opcional)</Label>
                  <div className="filtros-grid">
                    <div>
                      <Label>Desde</Label>
                      <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                    </div>
                    <div>
                      <Label>Hasta</Label>
                      <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
                    </div>
                    <div>
                      <Label>Sede</Label>
                      <Select value={sede} onChange={setSede}>
                        <option value="">Todas</option>
                        {sedes.map(s => (<option key={s.id} value={s.nombre_sede}>{s.nombre_sede}</option>))}
                      </Select>
                    </div>
                  </div>
                </div>

                <Button onClick={cargarDatos} disabled={loading} className="btn-cargar-datos">
                  📥 {loading ? 'Cargando datos...' : 'Cargar Datos'}
                </Button>

                {datosExportacion && datosExportacion.length > 0 && (
                  <div className="export-section">
                    <Label className="section-label">Datos Cargados ({datosExportacion.length} registros)</Label>
                    <div className="datos-preview">
                      <table>
                        <thead>
                          <tr>
                            {Object.keys(datosExportacion[0] || {}).map(key => (<th key={key}>{key}</th>))}
                          </tr>
                        </thead>
                        <tbody>
                          {datosExportacion.slice(0, 5).map((row, idx) => (
                            <tr key={idx}>
                              {Object.values(row).map((val, i) => (<td key={i}>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</td>))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {datosExportacion.length > 5 && (<p className="preview-more">... y {datosExportacion.length - 5} registros más</p>)}
                    </div>

                    <Label className="section-label">Descargar Como</Label>
                    <div className="descarga-botones">
                    <Button onClick={() => manejarExportacion('csv')} variant="outline">📊 CSV</Button>
                    <Button onClick={() => manejarExportacion('xlsx')} variant="outline">📊 Excel</Button>
                    <Button onClick={() => manejarExportacion('json')} variant="outline">📄 JSON</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: APIs */}
        {activeTab === 'apis' && (
          <div className="tabs-content">
            <div className="alert-info">
              💻 Estas APIs están disponibles para integrar con aplicaciones externas
            </div>

            <div className="api-tabs">
              <div className="api-tabs-list">
                <button className={`api-tab ${apiActiveTab === 'clientes' ? 'active' : ''}`} onClick={() => setApiActiveTab('clientes')}>Métricas Clientes</button>
                <button className={`api-tab ${apiActiveTab === 'tasas' ? 'active' : ''}`} onClick={() => setApiActiveTab('tasas')}>Tasas Conversión</button>
                <button className={`api-tab ${apiActiveTab === 'comerciales' ? 'active' : ''}`} onClick={() => setApiActiveTab('comerciales')}>Métricas Comerciales</button>
              </div>

              {apiActiveTab === 'clientes' && (
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Métricas de Clientes</h3>
                    <p className="card-description">Obtén datos de clientes únicos, activos, tasas de renovación</p>
                  </div>
                  <div className="card-content">
                    <FiltrosComunes filtros={filtrosClientes} setFiltros={setFiltrosClientes} />
                    <Button onClick={ejecutarMetricasClientes} disabled={loading}>▶️ {loading ? 'Ejecutando...' : 'Ejecutar'}</Button>
                    <ResultadoJSON data={resultadoClientes} filename="metricas-clientes" />
                  </div>
                </div>
              )}

              {apiActiveTab === 'tasas' && (
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Tasas de Conversión</h3>
                    <p className="card-description">Métricas del embudo comercial: agendamiento, asistencia, conversión</p>
                  </div>
                  <div className="card-content">
                    <FiltrosComunes filtros={filtrosTasas} setFiltros={setFiltrosTasas} />
                    <Button onClick={ejecutarTasasConversion} disabled={loading}>▶️ {loading ? 'Ejecutando...' : 'Ejecutar'}</Button>
                    <ResultadoJSON data={resultadoTasas} filename="tasas-conversion" />
                  </div>
                </div>
              )}

              {apiActiveTab === 'comerciales' && (
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Métricas Comerciales</h3>
                    <p className="card-description">Leads, agendamientos, ventas, montos y evolución mensual</p>
                  </div>
                  <div className="card-content">
                    <FiltrosComunes filtros={filtrosComerciales} setFiltros={setFiltrosComerciales} />
                    <Button onClick={ejecutarMetricasComerciales} disabled={loading}>▶️ {loading ? 'Ejecutando...' : 'Ejecutar'}</Button>
                    <ResultadoJSON data={resultadoComerciales} filename="metricas-comerciales" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
