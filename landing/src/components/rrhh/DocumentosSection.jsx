import React, { useState, useEffect } from 'react';
import './DocumentosSection.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005/api';

const DocumentosSection = () => {
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [colaboradores, setColaboradores] = useState([]);

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);

  // Vista
  const [vistaActual, setVistaActual] = useState('todos');

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    cargarDocumentos();
    cargarResumen();
    cargarColaboradores();
  }, [filtroTipo, filtroCategoria, filtroEstado, vistaActual]);

  const cargarDocumentos = async () => {
    try {
      setLoading(true);
      let url = `${API_URL}/documentos`;

      if (vistaActual === 'por_vencer') {
        url = `${API_URL}/documentos/por-vencer?dias=30`;
      } else if (vistaActual === 'vencidos') {
        url = `${API_URL}/documentos/vencidos`;
      } else {
        const params = new URLSearchParams();
        if (filtroTipo) params.append('tipo', filtroTipo);
        if (filtroCategoria) params.append('categoria', filtroCategoria);
        if (filtroEstado) params.append('estado', filtroEstado);
        url = `${API_URL}/documentos?${params}`;
      }

      const response = await fetch(url, { headers: getHeaders() });
      if (!response.ok) throw new Error('Error al cargar documentos');
      const data = await response.json();
      setDocumentos(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarResumen = async () => {
    try {
      const response = await fetch(`${API_URL}/documentos/resumen`, { headers: getHeaders() });
      if (response.ok) {
        const data = await response.json();
        setResumen(data.data);
      }
    } catch (err) {
      console.error('Error al cargar resumen:', err);
    }
  };

  const cargarColaboradores = async () => {
    try {
      const response = await fetch(`${API_URL}/colaboradores?limit=100`, { headers: getHeaders() });
      if (response.ok) {
        const data = await response.json();
        setColaboradores(data.data || []);
      }
    } catch (err) {
      console.error('Error al cargar colaboradores:', err);
    }
  };

  const abrirModalNuevo = () => {
    setDocumentoSeleccionado(null);
    setModoEdicion(true);
    setModalAbierto(true);
  };

  const abrirModalVer = (documento) => {
    setDocumentoSeleccionado(documento);
    setModoEdicion(false);
    setModalAbierto(true);
  };

  const abrirModalEditar = (documento) => {
    setDocumentoSeleccionado(documento);
    setModoEdicion(true);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setDocumentoSeleccionado(null);
  };

  const guardarDocumento = async (datos) => {
    try {
      const url = documentoSeleccionado
        ? `${API_URL}/documentos/${documentoSeleccionado._id}`
        : `${API_URL}/documentos`;

      const response = await fetch(url, {
        method: documentoSeleccionado ? 'PUT' : 'POST',
        headers: getHeaders(),
        body: JSON.stringify(datos)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al guardar');
      }

      cerrarModal();
      cargarDocumentos();
      cargarResumen();
    } catch (err) {
      alert(err.message);
    }
  };

  const verificarDocumento = async (id) => {
    try {
      const response = await fetch(`${API_URL}/documentos/${id}/verificar`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Error al verificar');
      cargarDocumentos();
      cargarResumen();
    } catch (err) {
      alert(err.message);
    }
  };

  const archivarDocumento = async (id) => {
    if (!confirm('¿Está seguro de archivar este documento?')) return;
    try {
      const response = await fetch(`${API_URL}/documentos/${id}/archivar`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Error al archivar');
      cargarDocumentos();
      cargarResumen();
    } catch (err) {
      alert(err.message);
    }
  };

  const eliminarDocumento = async (id) => {
    if (!confirm('¿Está seguro de eliminar este documento?')) return;
    try {
      const response = await fetch(`${API_URL}/documentos/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Error al eliminar');
      cargarDocumentos();
      cargarResumen();
    } catch (err) {
      alert(err.message);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-CL');
  };

  const getEstadoBadge = (estado) => {
    const config = {
      vigente: { clase: 'badge-success', label: 'Vigente' },
      por_vencer: { clase: 'badge-warning', label: 'Por Vencer' },
      vencido: { clase: 'badge-danger', label: 'Vencido' },
      anulado: { clase: 'badge-secondary', label: 'Anulado' },
      archivado: { clase: 'badge-dark', label: 'Archivado' }
    };
    return config[estado] || { clase: 'badge-secondary', label: estado };
  };

  const getTipoLabel = (tipo) => {
    const labels = {
      contrato: 'Contrato',
      anexo_contrato: 'Anexo Contrato',
      finiquito: 'Finiquito',
      cedula_identidad: 'Cédula Identidad',
      certificado_antecedentes: 'Cert. Antecedentes',
      certificado_afp: 'Cert. AFP',
      certificado_salud: 'Cert. Salud',
      licencia_conducir: 'Licencia Conducir',
      titulo_profesional: 'Título Profesional',
      certificacion: 'Certificación',
      licencia_medica: 'Licencia Médica',
      permiso: 'Permiso',
      vacaciones: 'Vacaciones',
      amonestacion: 'Amonestación',
      felicitacion: 'Felicitación',
      memorandum: 'Memorándum',
      liquidacion: 'Liquidación',
      certificado_trabajo: 'Cert. Trabajo',
      curriculum: 'Currículum',
      carta_recomendacion: 'Carta Recomendación',
      otro: 'Otro'
    };
    return labels[tipo] || tipo;
  };

  const getCategoriaIcon = (categoria) => {
    const icons = {
      legal: 'bi-file-earmark-text',
      identificacion: 'bi-person-badge',
      salud: 'bi-heart-pulse',
      laboral: 'bi-briefcase',
      formacion: 'bi-mortarboard',
      otro: 'bi-file-earmark'
    };
    return icons[categoria] || 'bi-file-earmark';
  };

  if (loading && documentos.length === 0) {
    return (
      <div className="documentos-section">
        <div className="loading-state">
          <i className="bi bi-arrow-repeat spin"></i>
          <p>Cargando documentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="documentos-section">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1>Documentos</h1>
          <p>Gestión documental de colaboradores</p>
        </div>
        <button className="btn-primary" onClick={abrirModalNuevo}>
          <i className="bi bi-plus-lg"></i>
          Nuevo Documento
        </button>
        <button className="btn-danger" style={{marginLeft:'10px'}} onClick={async()=>{if(!window.confirm('¿Eliminar TODOS los documentos importados?'))return;try{const token=localStorage.getItem('authToken');const res=await fetch((import.meta.env.VITE_API_URL||'http://localhost:3005/api')+'/documentos/importados',{method:'DELETE',headers:{Authorization:'Bearer '+token}});const json=await res.json();if(json.ok){alert(json.deleted+' documentos eliminados');window.location.reload();}else{alert('Error: '+(json.error||'No se pudo limpiar'));}}catch(e){alert('Error: '+e.message);}}}>🗑️ Limpiar importados</button>
      </div>
      {/* Resumen Cards */}
      {resumen && (
        <div className="resumen-cards">
          <div className="resumen-card clickable" onClick={() => setVistaActual('todos')}>
            <div className="resumen-icon total">
              <i className="bi bi-folder"></i>
            </div>
            <div className="resumen-info">
              <span className="resumen-valor">{resumen.totales?.total || 0}</span>
              <span className="resumen-label">Total Documentos</span>
            </div>
          </div>
          <div className="resumen-card clickable" onClick={() => setVistaActual('todos')}>
            <div className="resumen-icon success">
              <i className="bi bi-check-circle"></i>
            </div>
            <div className="resumen-info">
              <span className="resumen-valor">{resumen.totales?.vigentes || 0}</span>
              <span className="resumen-label">Vigentes</span>
            </div>
          </div>
          <div className="resumen-card clickable" onClick={() => setVistaActual('por_vencer')}>
            <div className="resumen-icon warning">
              <i className="bi bi-exclamation-triangle"></i>
            </div>
            <div className="resumen-info">
              <span className="resumen-valor">{resumen.totales?.por_vencer || 0}</span>
              <span className="resumen-label">Por Vencer</span>
            </div>
          </div>
          <div className="resumen-card clickable" onClick={() => setVistaActual('vencidos')}>
            <div className="resumen-icon danger">
              <i className="bi bi-x-circle"></i>
            </div>
            <div className="resumen-info">
              <span className="resumen-valor">{resumen.totales?.vencidos || 0}</span>
              <span className="resumen-label">Vencidos</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs de Vista */}
      <div className="vista-tabs">
        <button
          className={`tab-btn ${vistaActual === 'todos' ? 'active' : ''}`}
          onClick={() => setVistaActual('todos')}
        >
          <i className="bi bi-grid"></i> Todos
        </button>
        <button
          className={`tab-btn ${vistaActual === 'por_vencer' ? 'active' : ''}`}
          onClick={() => setVistaActual('por_vencer')}
        >
          <i className="bi bi-clock-history"></i> Por Vencer
        </button>
        <button
          className={`tab-btn ${vistaActual === 'vencidos' ? 'active' : ''}`}
          onClick={() => setVistaActual('vencidos')}
        >
          <i className="bi bi-x-octagon"></i> Vencidos
        </button>
      </div>

      {/* Filtros (solo en vista todos) */}
      {vistaActual === 'todos' && (
        <div className="filtros-section">
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="filtro-select">
            <option value="">Todas las categorías</option>
            <option value="legal">Legal</option>
            <option value="identificacion">Identificación</option>
            <option value="salud">Salud</option>
            <option value="laboral">Laboral</option>
            <option value="formacion">Formación</option>
          </select>

          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="filtro-select">
            <option value="">Todos los tipos</option>
            <option value="contrato">Contrato</option>
            <option value="cedula_identidad">Cédula Identidad</option>
            <option value="licencia_medica">Licencia Médica</option>
            <option value="certificacion">Certificación</option>
            <option value="liquidacion">Liquidación</option>
          </select>

          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="filtro-select">
            <option value="">Todos los estados</option>
            <option value="vigente">Vigente</option>
            <option value="por_vencer">Por Vencer</option>
            <option value="vencido">Vencido</option>
            <option value="archivado">Archivado</option>
          </select>
        </div>
      )}

      {/* Lista de Documentos */}
      {error ? (
        <div className="error-state">
          <i className="bi bi-exclamation-triangle"></i>
          <p>{error}</p>
          <button onClick={cargarDocumentos} className="btn-retry">Reintentar</button>
        </div>
      ) : documentos.length === 0 ? (
        <div className="empty-state">
          <i className="bi bi-folder-x"></i>
          <h3>No hay documentos</h3>
          <p>{vistaActual === 'todos' ? 'Agrega el primer documento' : 'No hay documentos en esta categoría'}</p>
          {vistaActual === 'todos' && (
            <button className="btn-primary" onClick={abrirModalNuevo}>
              <i className="bi bi-plus-lg"></i>
              Nuevo Documento
            </button>
          )}
        </div>
      ) : (
        <div className="documentos-grid">
          {documentos.map((doc) => {
            const estadoBadge = getEstadoBadge(doc.estado);
            return (
              <div key={doc._id} className="documento-card">
                <div className="documento-header">
                  <div className={`documento-icon ${doc.categoria}`}>
                    <i className={`bi ${getCategoriaIcon(doc.categoria)}`}></i>
                  </div>
                  <div className="documento-badges">
                    {doc.verificado && (
                      <span className="verificado-badge" title="Verificado">
                        <i className="bi bi-patch-check-fill"></i>
                      </span>
                    )}
                    <span className={`estado-badge ${estadoBadge.clase}`}>
                      {estadoBadge.label}
                    </span>
                  </div>
                </div>

                <div className="documento-body">
                  <h4 className="documento-nombre">{doc.nombre}</h4>
                  <span className="documento-tipo">{getTipoLabel(doc.tipo)}</span>

                  <div className="documento-colaborador">
                    <i className="bi bi-person"></i>
                    <span>{doc.colaborador?.nombres} {doc.colaborador?.apellido_paterno}</span>
                  </div>

                  {doc.fecha_vencimiento && (
                    <div className={`documento-vencimiento ${doc.estado === 'vencido' ? 'vencido' : doc.estado === 'por_vencer' ? 'por-vencer' : ''}`}>
                      <i className="bi bi-calendar-event"></i>
                      <span>Vence: {formatearFecha(doc.fecha_vencimiento)}</span>
                    </div>
                  )}
                </div>

                <div className="documento-footer">
                  <button className="btn-icon" title="Ver" onClick={() => abrirModalVer(doc)}>
                    <i className="bi bi-eye"></i>
                  </button>
                  <button className="btn-icon" title="Editar" onClick={() => abrirModalEditar(doc)}>
                    <i className="bi bi-pencil"></i>
                  </button>
                  {!doc.verificado && (
                    <button className="btn-icon success" title="Verificar" onClick={() => verificarDocumento(doc._id)}>
                      <i className="bi bi-check-lg"></i>
                    </button>
                  )}
                  <button className="btn-icon warning" title="Archivar" onClick={() => archivarDocumento(doc._id)}>
                    <i className="bi bi-archive"></i>
                  </button>
                  <button className="btn-icon danger" title="Eliminar" onClick={() => eliminarDocumento(doc._id)}>
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalAbierto && (
        <ModalDocumento
          documento={documentoSeleccionado}
          colaboradores={colaboradores}
          modoEdicion={modoEdicion}
          onClose={cerrarModal}
          onSave={guardarDocumento}
          formatearFecha={formatearFecha}
          getTipoLabel={getTipoLabel}
        />
      )}
    </div>
  );
};

// ============================================================================
// MODAL DOCUMENTO
// ============================================================================

const ModalDocumento = ({ documento, colaboradores, modoEdicion, onClose, onSave, formatearFecha, getTipoLabel }) => {
  const [formData, setFormData] = useState({
    colaborador: '',
    tipo: 'otro',
    categoria: 'otro',
    nombre: '',
    descripcion: '',
    fecha_documento: '',
    fecha_vencimiento: '',
    confidencial: false,
    visible_colaborador: true,
    notificar_vencimiento: true,
    dias_aviso_vencimiento: 30,
    notas: ''
  });

  useEffect(() => {
    if (documento) {
      setFormData({
        colaborador: documento.colaborador?._id || '',
        tipo: documento.tipo || 'otro',
        categoria: documento.categoria || 'otro',
        nombre: documento.nombre || '',
        descripcion: documento.descripcion || '',
        fecha_documento: documento.fecha_documento?.split('T')[0] || '',
        fecha_vencimiento: documento.fecha_vencimiento?.split('T')[0] || '',
        confidencial: documento.confidencial || false,
        visible_colaborador: documento.visible_colaborador !== false,
        notificar_vencimiento: documento.notificar_vencimiento !== false,
        dias_aviso_vencimiento: documento.dias_aviso_vencimiento || 30,
        notas: documento.notas || ''
      });
    }
  }, [documento]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleTipoChange = (e) => {
    const tipo = e.target.value;
    const categorias = {
      contrato: 'legal', anexo_contrato: 'legal', finiquito: 'legal',
      cedula_identidad: 'identificacion', certificado_antecedentes: 'identificacion', licencia_conducir: 'identificacion',
      certificado_salud: 'salud', licencia_medica: 'salud',
      titulo_profesional: 'formacion', certificacion: 'formacion'
    };
    setFormData((prev) => ({
      ...prev,
      tipo,
      categoria: categorias[tipo] || 'otro'
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.colaborador || !formData.nombre) {
      alert('Complete los campos requeridos');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {modoEdicion
              ? (documento ? 'Editar Documento' : 'Nuevo Documento')
              : 'Detalle del Documento'
            }
          </h2>
          <button className="modal-close" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Colaborador *</label>
                <select name="colaborador" value={formData.colaborador} onChange={handleChange}
                  disabled={!modoEdicion || documento} required>
                  <option value="">Seleccionar...</option>
                  {colaboradores.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.nombres} {c.apellido_paterno} - {c.cargo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Tipo de Documento *</label>
                <select name="tipo" value={formData.tipo} onChange={handleTipoChange} disabled={!modoEdicion}>
                  <optgroup label="Legal">
                    <option value="contrato">Contrato de Trabajo</option>
                    <option value="anexo_contrato">Anexo de Contrato</option>
                    <option value="finiquito">Finiquito</option>
                  </optgroup>
                  <optgroup label="Identificación">
                    <option value="cedula_identidad">Cédula de Identidad</option>
                    <option value="certificado_antecedentes">Cert. Antecedentes</option>
                    <option value="licencia_conducir">Licencia de Conducir</option>
                  </optgroup>
                  <optgroup label="Salud">
                    <option value="certificado_salud">Certificado de Salud</option>
                    <option value="licencia_medica">Licencia Médica</option>
                  </optgroup>
                  <optgroup label="Formación">
                    <option value="titulo_profesional">Título Profesional</option>
                    <option value="certificacion">Certificación</option>
                  </optgroup>
                  <optgroup label="Laboral">
                    <option value="liquidacion">Liquidación de Sueldo</option>
                    <option value="certificado_trabajo">Certificado de Trabajo</option>
                    <option value="vacaciones">Solicitud Vacaciones</option>
                    <option value="permiso">Permiso</option>
                    <option value="amonestacion">Amonestación</option>
                    <option value="felicitacion">Felicitación</option>
                  </optgroup>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div className="form-group col-span-2">
                <label>Nombre del Documento *</label>
                <input type="text" name="nombre" value={formData.nombre} onChange={handleChange}
                  placeholder="Ej: Contrato Indefinido Juan Pérez" disabled={!modoEdicion} required />
              </div>

              <div className="form-group col-span-2">
                <label>Descripción</label>
                <textarea name="descripcion" value={formData.descripcion} onChange={handleChange}
                  rows={2} placeholder="Descripción opcional..." disabled={!modoEdicion} />
              </div>

              <div className="form-group">
                <label>Fecha del Documento</label>
                <input type="date" name="fecha_documento" value={formData.fecha_documento}
                  onChange={handleChange} disabled={!modoEdicion} />
              </div>

              <div className="form-group">
                <label>Fecha de Vencimiento</label>
                <input type="date" name="fecha_vencimiento" value={formData.fecha_vencimiento}
                  onChange={handleChange} disabled={!modoEdicion} />
              </div>

              {formData.fecha_vencimiento && (
                <div className="form-group">
                  <label>Días de Aviso</label>
                  <input type="number" name="dias_aviso_vencimiento" value={formData.dias_aviso_vencimiento}
                    onChange={handleChange} min="1" max="90" disabled={!modoEdicion} />
                </div>
              )}

              <div className="form-group col-span-2">
                <label>Notas</label>
                <textarea name="notas" value={formData.notas} onChange={handleChange}
                  rows={2} placeholder="Notas internas..." disabled={!modoEdicion} />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" name="confidencial" checked={formData.confidencial}
                    onChange={handleChange} disabled={!modoEdicion} />
                  <span>Documento Confidencial</span>
                </label>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" name="visible_colaborador" checked={formData.visible_colaborador}
                    onChange={handleChange} disabled={!modoEdicion} />
                  <span>Visible para el Colaborador</span>
                </label>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              {modoEdicion ? 'Cancelar' : 'Cerrar'}
            </button>
            {modoEdicion && (
              <button type="submit" className="btn-primary">
                <i className="bi bi-check-lg"></i>
                {documento ? 'Guardar Cambios' : 'Crear Documento'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentosSection;


