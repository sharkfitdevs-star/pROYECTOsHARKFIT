import React, { useState, useEffect } from 'react';
import './ColaboradoresSection.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005/api';

const ColaboradoresSection = () => {
  const [colaboradores, setColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resumen, setResumen] = useState(null);
  
  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroDepartamento, setFiltroDepartamento] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('activo');
  const [filtroContrato, setFiltroContrato] = useState('');
  
  // Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [colaboradorSeleccionado, setColaboradorSeleccionado] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  
  // Paginación
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    cargarColaboradores();
    cargarResumen();
  }, [pagina, filtroDepartamento, filtroEstado, filtroContrato]);

  const cargarColaboradores = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagina,
        limit: 20,
        estado: filtroEstado || 'activo'
      });
      if (filtroDepartamento) params.append('departamento', filtroDepartamento);
      if (filtroContrato) params.append('tipo_contrato', filtroContrato);
      if (busqueda) params.append('busqueda', busqueda);

      const response = await fetch(`${API_URL}/colaboradores?${params}`, {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Error al cargar colaboradores');
      const data = await response.json();
      setColaboradores(data.data || []);
      setTotalPaginas(data.pagination?.pages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarResumen = async () => {
    try {
      const response = await fetch(`${API_URL}/colaboradores/resumen`, {
        headers: getHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setResumen(data.data);
      }
    } catch (err) {
      console.error('Error al cargar resumen:', err);
    }
  };

  const buscarColaboradores = (e) => {
    e.preventDefault();
    setPagina(1);
    cargarColaboradores();
  };

  const abrirModalNuevo = () => {
    setColaboradorSeleccionado(null);
    setModoEdicion(true);
    setModalAbierto(true);
  };

  const abrirModalVer = (colaborador) => {
    setColaboradorSeleccionado(colaborador);
    setModoEdicion(false);
    setModalAbierto(true);
  };

  const abrirModalEditar = (colaborador) => {
    setColaboradorSeleccionado(colaborador);
    setModoEdicion(true);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setColaboradorSeleccionado(null);
    setModoEdicion(false);
  };

  const guardarColaborador = async (datos) => {
    try {
      const url = colaboradorSeleccionado 
        ? `${API_URL}/colaboradores/${colaboradorSeleccionado._id}`
        : `${API_URL}/colaboradores`;
      
      const response = await fetch(url, {
        method: colaboradorSeleccionado ? 'PUT' : 'POST',
        headers: getHeaders(),
        body: JSON.stringify(datos)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al guardar');
      }

      cerrarModal();
      cargarColaboradores();
      cargarResumen();
    } catch (err) {
      alert(err.message);
    }
  };

  const formatearSueldo = (monto) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(monto || 0);
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-CL');
  };

  const getEstadoBadge = (estado) => {
    const clases = {
      activo: 'badge-success',
      inactivo: 'badge-secondary',
      vacaciones: 'badge-info',
      licencia: 'badge-warning',
      suspendido: 'badge-danger',
      finiquitado: 'badge-dark'
    };
    return clases[estado] || 'badge-secondary';
  };

  const getDepartamentoLabel = (dept) => {
    const labels = {
      administracion: 'Administración',
      ventas: 'Ventas',
      operaciones: 'Operaciones',
      rrhh: 'RRHH',
      finanzas: 'Finanzas',
      marketing: 'Marketing',
      ti: 'TI',
      mantenimiento: 'Mantenimiento',
      recepcion: 'Recepción',
      instructores: 'Instructores',
      otro: 'Otro'
    };
    return labels[dept] || dept;
  };

  if (loading && colaboradores.length === 0) {
    return (
      <div className="colaboradores-section">
        <div className="loading-state">
          <i className="bi bi-arrow-repeat spin"></i>
          <p>Cargando colaboradores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="colaboradores-section">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1>Colaboradores</h1>
          <p>Gestión del personal de la empresa</p>
        </div>
        <button className="btn-primary" onClick={abrirModalNuevo}>
          <i className="bi bi-plus-lg"></i>
          Nuevo Colaborador
        </button>
        <button 
          className="btn-danger" 
          style={{marginLeft: '10px'}}
          onClick={async () => {
            if (!window.confirm('¿Eliminar TODOS los colaboradores importados? Esta acción no se puede deshacer.')) return;
            try {
              const token = localStorage.getItem('authToken');
              const res = await fetch(API_URL + '/colaboradores/importados', {
                method: 'DELETE',
                headers: { Authorization: 'Bearer ' + token }
              });
              const json = await res.json();
              if (json.ok) {
                alert(json.deleted + ' colaboradores eliminados');
                cargarColaboradores();
                cargarResumen();
              } else {
                alert('Error: ' + (json.error || 'No se pudo limpiar'));
              }
            } catch (e) {
              alert('Error: ' + e.message);
            }
          }}
        >
          🗑️ Limpiar importados
        </button>
      </div>

      {/* Resumen Cards */}
      {resumen && (
        <div className="resumen-cards">
          <div className="resumen-card">
            <div className="resumen-icon total">
              <i className="bi bi-people-fill"></i>
            </div>
            <div className="resumen-info">
              <span className="resumen-valor">{resumen.totales?.total || 0}</span>
              <span className="resumen-label">Total Colaboradores</span>
            </div>
          </div>
          <div className="resumen-card">
            <div className="resumen-icon money">
              <i className="bi bi-cash-stack"></i>
            </div>
            <div className="resumen-info">
              <span className="resumen-valor">{formatearSueldo(resumen.totales?.sueldo_promedio)}</span>
              <span className="resumen-label">Sueldo Promedio</span>
            </div>
          </div>
          <div className="resumen-card">
            <div className="resumen-icon time">
              <i className="bi bi-calendar-check"></i>
            </div>
            <div className="resumen-info">
              <span className="resumen-valor">{Math.round(resumen.totales?.antiguedad_promedio || 0)} meses</span>
              <span className="resumen-label">Antigüedad Promedio</span>
            </div>
          </div>
          <div className="resumen-card">
            <div className="resumen-icon cost">
              <i className="bi bi-wallet2"></i>
            </div>
            <div className="resumen-info">
              <span className="resumen-valor">{formatearSueldo(resumen.totales?.sueldo_total)}</span>
              <span className="resumen-label">Costo Mensual</span>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="sf-filters">
        <form onSubmit={buscarColaboradores} className="search-form">
          <div className="search-input">
            <i className="bi bi-search"></i>
            <input
              type="text"
              placeholder="Buscar por nombre, RUT, cargo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="sf-search"
            />
          </div>
          <button type="submit" className="btn-search">Buscar</button>
        </form>
        
        <div className="sf-filters">
          <select 
            value={filtroDepartamento} 
            onChange={(e) => { setFiltroDepartamento(e.target.value); setPagina(1); }}
            className="sf-filter-select"
          >
            <option value="">Todos los departamentos</option>
            <option value="administracion">Administración</option>
            <option value="ventas">Ventas</option>
            <option value="operaciones">Operaciones</option>
            <option value="rrhh">RRHH</option>
            <option value="finanzas">Finanzas</option>
            <option value="instructores">Instructores</option>
            <option value="recepcion">Recepción</option>
            <option value="mantenimiento">Mantenimiento</option>
          </select>

          <select 
            value={filtroContrato} 
            onChange={(e) => { setFiltroContrato(e.target.value); setPagina(1); }}
            className="sf-filter-select"
          >
            <option value="">Todos los contratos</option>
            <option value="indefinido">Indefinido</option>
            <option value="plazo_fijo">Plazo Fijo</option>
            <option value="honorarios">Honorarios</option>
            <option value="part_time">Part Time</option>
          </select>

          <select 
            value={filtroEstado} 
            onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1); }}
            className="sf-filter-select"
          >
            <option value="activo">Activos</option>
            <option value="todos">Todos</option>
            <option value="vacaciones">En Vacaciones</option>
            <option value="licencia">Con Licencia</option>
            <option value="finiquitado">Finiquitados</option>
          </select>
        </div>
      </div>

      {/* Tabla de Colaboradores */}
      {error ? (
        <div className="error-state">
          <i className="bi bi-exclamation-triangle"></i>
          <p>{error}</p>
          <button onClick={cargarColaboradores} className="btn-retry">Reintentar</button>
        </div>
      ) : colaboradores.length === 0 ? (
        <div className="empty-state">
          <i className="bi bi-people"></i>
          <h3>No hay colaboradores</h3>
          <p>Agrega tu primer colaborador para comenzar</p>
          <button className="btn-primary" onClick={abrirModalNuevo}>
            <i className="bi bi-plus-lg"></i>
            Agregar Colaborador
          </button>
        </div>
      ) : (
        <>
          <div className="sf-table-wrapper">
            <table className="sf-table">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>RUT</th>
                  <th>Cargo</th>
                  <th>Departamento</th>
                  <th>Ingreso</th>
                  <th>Sueldo Base</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {colaboradores.map(col => (
                  <tr key={col._id}>
                    <td className="col-colaborador">
                      <div className="colaborador-info">
                        <div className="colaborador-avatar">
                          {col.foto ? (
                            <img src={col.foto} alt={col.nombres} />
                          ) : (
                            <span>{col.nombres?.charAt(0)}{col.apellido_paterno?.charAt(0)}</span>
                          )}
                        </div>
                        <div className="colaborador-datos">
                          <span className="nombre">{col.nombres} {col.apellido_paterno}</span>
                          <span className="codigo">{col.codigo_empleado}</span>
                        </div>
                      </div>
                    </td>
                    <td>{col.rut}</td>
                    <td>{col.cargo}</td>
                    <td>{getDepartamentoLabel(col.departamento)}</td>
                    <td>{formatearFecha(col.fecha_ingreso)}</td>
                    <td className="col-sueldo">{formatearSueldo(col.sueldo_base)}</td>
                    <td>
                      <span className={`sf-badge ${col.estado?.toLowerCase()}`}>{col.estado}</span>
                    </td>
                    <td className="col-acciones">
                      <button className="sf-btn-action" title="Ver detalle" onClick={() => abrirModalVer(col)}>
                        <i className="bi bi-eye"></i>
                      </button>
                      <button className="sf-btn-action" title="Editar" onClick={() => abrirModalEditar(col)}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="sf-btn-action" title="Más opciones">
                        <i className="bi bi-three-dots-vertical"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="paginacion">
              <button 
                disabled={pagina === 1} 
                onClick={() => setPagina(p => p - 1)}
                className="btn-pag"
              >
                <i className="bi bi-chevron-left"></i>
              </button>
              <span className="pag-info">Página {pagina} de {totalPaginas}</span>
              <button 
                disabled={pagina === totalPaginas} 
                onClick={() => setPagina(p => p + 1)}
                className="btn-pag"
              >
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {modalAbierto && (
        <ModalColaborador
          colaborador={colaboradorSeleccionado}
          modoEdicion={modoEdicion}
          onClose={cerrarModal}
          onSave={guardarColaborador}
          formatearSueldo={formatearSueldo}
          formatearFecha={formatearFecha}
        />
      )}
    </div>
  );
};

// ============================================================================
// MODAL COLABORADOR
// ============================================================================

const ModalColaborador = ({ colaborador, modoEdicion, onClose, onSave, formatearSueldo, formatearFecha }) => {
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState({
    // Datos personales
    rut: '',
    nombres: '',
    apellido_paterno: '',
    apellido_materno: '',
    fecha_nacimiento: '',
    genero: 'no_especifica',
    estado_civil: 'soltero',
    nacionalidad: 'Chilena',
    // Contacto
    email: '',
    email_personal: '',
    telefono: '',
    telefono_emergencia: '',
    contacto_emergencia: '',
    // Dirección
    direccion: '',
    numero: '',
    depto: '',
    comuna: '',
    ciudad: '',
    region: '',
    // Laborales
    cargo: '',
    departamento: 'otro',
    tipo_contrato: 'indefinido',
    jornada: 'completa',
    fecha_ingreso: '',
    // Compensación
    sueldo_base: 0,
    colacion: 0,
    movilizacion: 0,
    bono_asistencia: 0,
    // Previsión
    afp: 'sin_afp',
    tipo_salud: 'fonasa',
    isapre: '',
    // Banco
    banco: '',
    tipo_cuenta: 'corriente',
    numero_cuenta: '',
    email_banco: ''
  });

  useEffect(() => {
    if (colaborador) {
      setFormData({
        rut: colaborador.rut || '',
        nombres: colaborador.nombres || '',
        apellido_paterno: colaborador.apellido_paterno || '',
        apellido_materno: colaborador.apellido_materno || '',
        fecha_nacimiento: colaborador.fecha_nacimiento?.split('T')[0] || '',
        genero: colaborador.genero || 'no_especifica',
        estado_civil: colaborador.estado_civil || 'soltero',
        nacionalidad: colaborador.nacionalidad || 'Chilena',
        email: colaborador.email || '',
        email_personal: colaborador.email_personal || '',
        telefono: colaborador.telefono || '',
        telefono_emergencia: colaborador.telefono_emergencia || '',
        contacto_emergencia: colaborador.contacto_emergencia || '',
        direccion: colaborador.direccion || '',
        numero: colaborador.numero || '',
        depto: colaborador.depto || '',
        comuna: colaborador.comuna || '',
        ciudad: colaborador.ciudad || '',
        region: colaborador.region || '',
        cargo: colaborador.cargo || '',
        departamento: colaborador.departamento || 'otro',
        tipo_contrato: colaborador.tipo_contrato || 'indefinido',
        jornada: colaborador.jornada || 'completa',
        fecha_ingreso: colaborador.fecha_ingreso?.split('T')[0] || '',
        sueldo_base: colaborador.sueldo_base || 0,
        colacion: colaborador.colacion || 0,
        movilizacion: colaborador.movilizacion || 0,
        bono_asistencia: colaborador.bono_asistencia || 0,
        afp: colaborador.afp || 'sin_afp',
        tipo_salud: colaborador.tipo_salud || 'fonasa',
        isapre: colaborador.isapre || '',
        banco: colaborador.banco || '',
        tipo_cuenta: colaborador.tipo_cuenta || 'corriente',
        numero_cuenta: colaborador.numero_cuenta || '',
        email_banco: colaborador.email_banco || ''
      });
    }
  }, [colaborador]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.rut || !formData.nombres || !formData.apellido_paterno || !formData.cargo || !formData.fecha_ingreso) {
      alert('Complete los campos requeridos: RUT, Nombres, Apellido Paterno, Cargo y Fecha de Ingreso');
      return;
    }
    onSave(formData);
  };

  const tabs = [
    { id: 'personal', label: 'Datos Personales', icon: 'bi-person' },
    { id: 'contacto', label: 'Contacto', icon: 'bi-telephone' },
    { id: 'laboral', label: 'Laboral', icon: 'bi-briefcase' },
    { id: 'compensacion', label: 'Compensación', icon: 'bi-cash' },
    { id: 'prevision', label: 'Previsión', icon: 'bi-shield-check' },
    { id: 'banco', label: 'Banco', icon: 'bi-bank' }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-xl" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {modoEdicion
              ? (colaborador ? 'Editar Colaborador' : 'Nuevo Colaborador')
              : 'Detalle del Colaborador'
            }
          </h2>
          <button className="modal-close" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <i className={`bi ${tab.icon}`}></i>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Tab: Datos Personales */}
            {activeTab === 'personal' && (
              <div className="form-grid">
                <div className="form-group">
                  <label>RUT *</label>
                  <input type="text" name="rut" value={formData.rut} onChange={handleChange}
                    placeholder="12.345.678-9" disabled={!modoEdicion} required />
                </div>
                <div className="form-group">
                  <label>Nombres *</label>
                  <input type="text" name="nombres" value={formData.nombres} onChange={handleChange}
                    disabled={!modoEdicion} required />
                </div>
                <div className="form-group">
                  <label>Apellido Paterno *</label>
                  <input type="text" name="apellido_paterno" value={formData.apellido_paterno}
                    onChange={handleChange} disabled={!modoEdicion} required />
                </div>
                <div className="form-group">
                  <label>Apellido Materno</label>
                  <input type="text" name="apellido_materno" value={formData.apellido_materno}
                    onChange={handleChange} disabled={!modoEdicion} />
                </div>
                <div className="form-group">
                  <label>Fecha Nacimiento</label>
                  <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento}
                    onChange={handleChange} disabled={!modoEdicion} />
                </div>
                <div className="form-group">
                  <label>Género</label>
                  <select name="genero" value={formData.genero} onChange={handleChange} disabled={!modoEdicion}>
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                    <option value="otro">Otro</option>
                    <option value="no_especifica">No especifica</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Estado Civil</label>
                  <select name="estado_civil" value={formData.estado_civil} onChange={handleChange} disabled={!modoEdicion}>
                    <option value="soltero">Soltero/a</option>
                    <option value="casado">Casado/a</option>
                    <option value="divorciado">Divorciado/a</option>
                    <option value="viudo">Viudo/a</option>
                    <option value="conviviente">Conviviente</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Nacionalidad</label>
                  <input type="text" name="nacionalidad" value={formData.nacionalidad}
                    onChange={handleChange} disabled={!modoEdicion} />
                </div>
              </div>
            )}

            {/* Tab: Contacto */}
            {activeTab === 'contacto' && (
              <div className="form-grid">
                <div className="form-group">
                  <label>Email Corporativo</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange}
                    disabled={!modoEdicion} />
                </div>
                <div className="form-group">
                  <label>Email Personal</label>
                  <input type="email" name="email_personal" value={formData.email_personal}
                    onChange={handleChange} disabled={!modoEdicion} />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange}
                    placeholder="+56 9 1234 5678" disabled={!modoEdicion} />
                </div>
                <div className="form-group">
                  <label>Teléfono Emergencia</label>
                  <input type="tel" name="telefono_emergencia" value={formData.telefono_emergencia}
                    onChange={handleChange} disabled={!modoEdicion} />
                </div>
                <div className="form-group col-span-2">
                  <label>Contacto de Emergencia</label>
                  <input type="text" name="contacto_emergencia" value={formData.contacto_emergencia}
                    onChange={handleChange} placeholder="Nombre y parentesco" disabled={!modoEdicion} />
                </div>
                <div className="form-group col-span-2">
                  <label>Dirección</label>
                  <input type="text" name="direccion" value={formData.direccion} onChange={handleChange}
                    disabled={!modoEdicion} />
                </div>
                <div className="form-group">
                  <label>Número</label>
                  <input type="text" name="numero" value={formData.numero} onChange={handleChange}
                    disabled={!modoEdicion} />
                </div>
                <div className="form-group">
                  <label>Depto/Casa</label>
                  <input type="text" name="depto" value={formData.depto} onChange={handleChange}
                    disabled={!modoEdicion} />
                </div>
                <div className="form-group">
                  <label>Comuna</label>
                  <input type="text" name="comuna" value={formData.comuna} onChange={handleChange}
                    disabled={!modoEdicion} />
                </div>
                <div className="form-group">
                  <label>Ciudad</label>
                  <input type="text" name="ciudad" value={formData.ciudad} onChange={handleChange}
                    disabled={!modoEdicion} />
                </div>
                <div className="form-group">
                  <label>Región</label>
                  <input type="text" name="region" value={formData.region} onChange={handleChange}
                    disabled={!modoEdicion} />
                </div>
              </div>
            )}

            {/* Tab: Laboral */}
            {activeTab === 'laboral' && (
              <div className="form-grid">
                <div className="form-group">
                  <label>Cargo *</label>
                  <input type="text" name="cargo" value={formData.cargo} onChange={handleChange}
                    disabled={!modoEdicion} required />
                </div>
                <div className="form-group">
                  <label>Departamento</label>
                  <select name="departamento" value={formData.departamento} onChange={handleChange}
                    disabled={!modoEdicion}>
                    <option value="administracion">Administración</option>
                    <option value="ventas">Ventas</option>
                    <option value="operaciones">Operaciones</option>
                    <option value="rrhh">RRHH</option>
                    <option value="finanzas">Finanzas</option>
                    <option value="marketing">Marketing</option>
                    <option value="ti">TI</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="recepcion">Recepción</option>
                    <option value="instructores">Instructores</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo de Contrato</label>
                  <select name="tipo_contrato" value={formData.tipo_contrato} onChange={handleChange}
                    disabled={!modoEdicion}>
                    <option value="indefinido">Indefinido</option>
                    <option value="plazo_fijo">Plazo Fijo</option>
                    <option value="honorarios">Honorarios</option>
                    <option value="practicas">Prácticas</option>
                    <option value="part_time">Part Time</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Jornada</label>
                  <select name="jornada" value={formData.jornada} onChange={handleChange}
                    disabled={!modoEdicion}>
                    <option value="completa">Completa</option>
                    <option value="parcial">Parcial</option>
                    <option value="turnos">Turnos</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Fecha de Ingreso *</label>
                  <input type="date" name="fecha_ingreso" value={formData.fecha_ingreso}
                    onChange={handleChange} disabled={!modoEdicion} required />
                </div>
              </div>
            )}

            {/* Tab: Compensación */}
            {activeTab === 'compensacion' && (
              <div className="form-grid">
                <div className="form-group">
                  <label>Sueldo Base</label>
                  <input type="number" name="sueldo_base" value={formData.sueldo_base}
                    onChange={handleChange} min="0" disabled={!modoEdicion} />
                </div>
                <div className="form-group">
                  <label>Colación</label>
                  <input type="number" name="colacion" value={formData.colacion}
                    onChange={handleChange} min="0" disabled={!modoEdicion} />
                </div>
                <div className="form-group">
                  <label>Movilización</label>
                  <input type="number" name="movilizacion" value={formData.movilizacion}
                    onChange={handleChange} min="0" disabled={!modoEdicion} />
                </div>
                <div className="form-group">
                  <label>Bono Asistencia</label>
                  <input type="number" name="bono_asistencia" value={formData.bono_asistencia}
                    onChange={handleChange} min="0" disabled={!modoEdicion} />
                </div>
                <div className="form-group col-span-2">
                  <div className="total-compensacion">
                    <span>Total Bruto Mensual:</span>
                    <strong>{formatearSueldo(
                      (formData.sueldo_base || 0) +
                      (formData.colacion || 0) +
                      (formData.movilizacion || 0) +
                      (formData.bono_asistencia || 0)
                    )}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Previsión */}
            {activeTab === 'prevision' && (
              <div className="form-grid">
                <div className="form-group">
                  <label>AFP</label>
                  <select name="afp" value={formData.afp} onChange={handleChange} disabled={!modoEdicion}>
                    <option value="capital">AFP Capital</option>
                    <option value="cuprum">AFP Cuprum</option>
                    <option value="habitat">AFP Habitat</option>
                    <option value="modelo">AFP Modelo</option>
                    <option value="planvital">AFP Planvital</option>
                    <option value="provida">AFP Provida</option>
                    <option value="uno">AFP Uno</option>
                    <option value="sin_afp">Sin AFP</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Sistema de Salud</label>
                  <select name="tipo_salud" value={formData.tipo_salud} onChange={handleChange}
                    disabled={!modoEdicion}>
                    <option value="fonasa">Fonasa</option>
                    <option value="isapre">Isapre</option>
                  </select>
                </div>
                {formData.tipo_salud === 'isapre' && (
                  <div className="form-group">
                    <label>Isapre</label>
                    <input type="text" name="isapre" value={formData.isapre} onChange={handleChange}
                      disabled={!modoEdicion} />
                  </div>
                )}
              </div>
            )}

            {/* Tab: Banco */}
            {activeTab === 'banco' && (
              <div className="form-grid">
                <div className="form-group">
                  <label>Banco</label>
                  <select name="banco" value={formData.banco} onChange={handleChange} disabled={!modoEdicion}>
                    <option value="">Seleccionar banco</option>
                    <option value="banco_chile">Banco de Chile</option>
                    <option value="banco_estado">Banco Estado</option>
                    <option value="santander">Santander</option>
                    <option value="bci">BCI</option>
                    <option value="scotiabank">Scotiabank</option>
                    <option value="itau">Itaú</option>
                    <option value="security">Banco Security</option>
                    <option value="falabella">Banco Falabella</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo de Cuenta</label>
                  <select name="tipo_cuenta" value={formData.tipo_cuenta} onChange={handleChange}
                    disabled={!modoEdicion}>
                    <option value="corriente">Cuenta Corriente</option>
                    <option value="vista">Cuenta Vista</option>
                    <option value="ahorro">Cuenta Ahorro</option>
                    <option value="rut">Cuenta RUT</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Número de Cuenta</label>
                  <input type="text" name="numero_cuenta" value={formData.numero_cuenta}
                    onChange={handleChange} disabled={!modoEdicion} />
                </div>
                <div className="form-group">
                  <label>Email para Transferencias</label>
                  <input type="email" name="email_banco" value={formData.email_banco}
                    onChange={handleChange} disabled={!modoEdicion} />
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              {modoEdicion ? 'Cancelar' : 'Cerrar'}
            </button>
            {modoEdicion && (
              <button type="submit" className="btn-primary">
                <i className="bi bi-check-lg"></i>
                {colaborador ? 'Guardar Cambios' : 'Crear Colaborador'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ColaboradoresSection;
