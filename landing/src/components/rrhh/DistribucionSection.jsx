import React, { useState, useEffect } from 'react';
import './DistribucionSection.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005/api';

const DistribucionSection = () => {
  const [distribuciones, setDistribuciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [colaboradores, setColaboradores] = useState([]);
  
  // Filtros
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  
  // Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [distribucionSeleccionada, setDistribucionSeleccionada] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    cargarDistribuciones();
    cargarResumen();
    cargarColaboradores();
  }, [filtroEstado, filtroTipo]);

  const cargarDistribuciones = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtroEstado) params.append('estado', filtroEstado);
      if (filtroTipo) params.append('tipo', filtroTipo);

      const response = await fetch(`${API_URL}/distribucion?${params}`, { headers: getHeaders() });
      if (!response.ok) throw new Error('Error al cargar distribuciones');
      const data = await response.json();
      setDistribuciones(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarResumen = async () => {
    try {
      const response = await fetch(`${API_URL}/distribucion/resumen`, { headers: getHeaders() });
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
      console.error('Error:', err);
    }
  };

  const abrirModalNuevo = () => {
    setDistribucionSeleccionada(null);
    setModoEdicion(true);
    setModalAbierto(true);
  };

  const abrirModalVer = async (id) => {
    try {
      const response = await fetch(`${API_URL}/distribucion/${id}`, { headers: getHeaders() });
      if (response.ok) {
        const data = await response.json();
        setDistribucionSeleccionada(data.data);
        setModoEdicion(false);
        setModalAbierto(true);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setDistribucionSeleccionada(null);
  };

  const guardarDistribucion = async (datos) => {
    try {
      const url = distribucionSeleccionada 
        ? `${API_URL}/distribucion/${distribucionSeleccionada._id}`
        : `${API_URL}/distribucion`;
      
      const response = await fetch(url, {
        method: distribucionSeleccionada ? 'PUT' : 'POST',
        headers: getHeaders(),
        body: JSON.stringify(datos)
      });

      if (!response.ok) throw new Error('Error al guardar');
      cerrarModal();
      cargarDistribuciones();
      cargarResumen();
    } catch (err) {
      alert(err.message);
    }
  };

  const publicarDistribucion = async (id) => {
    try {
      const response = await fetch(`${API_URL}/distribucion/${id}/publicar`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Error al publicar');
      cargarDistribuciones();
      cargarResumen();
    } catch (err) {
      alert(err.message);
    }
  };

  const eliminarDistribucion = async (id) => {
    if (!confirm('¿Eliminar esta distribución?')) return;
    try {
      const response = await fetch(`${API_URL}/distribucion/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Error al eliminar');
      cargarDistribuciones();
      cargarResumen();
    } catch (err) {
      alert(err.message);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const getEstadoBadge = (estado) => {
    const config = {
      borrador: { clase: 'badge-secondary', label: 'Borrador' },
      publicado: { clase: 'badge-info', label: 'Publicado' },
      en_curso: { clase: 'badge-success', label: 'En Curso' },
      completado: { clase: 'badge-dark', label: 'Completado' },
      cancelado: { clase: 'badge-danger', label: 'Cancelado' }
    };
    return config[estado] || { clase: 'badge-secondary', label: estado };
  };

  const getTipoLabel = (tipo) => {
    const labels = { turno: 'Turno', horario: 'Horario', asignacion: 'Asignación', ruta: 'Ruta', zona: 'Zona' };
    return labels[tipo] || tipo;
  };

  if (loading && distribuciones.length === 0) {
    return (
      <div className="distribucion-section">
        <div className="loading-state">
          <i className="bi bi-arrow-repeat spin"></i>
          <p>Cargando distribuciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="distribucion-section">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1>Distribución</h1>
          <p>Gestión de turnos y asignaciones</p>
        </div>
        <button className="btn-primary" onClick={abrirModalNuevo}>
          <i className="bi bi-plus-lg"></i>
          Nueva Distribución
        </button>
        <button className="btn-danger" style={{marginLeft:'10px'}} onClick={async()=>{if(!window.confirm('¿Eliminar TODAS las distribuciones importadas?'))return;try{const token=localStorage.getItem('authToken');const res=await fetch((import.meta.env.VITE_API_URL||'http://localhost:3005/api')+'/distribucion/importados',{method:'DELETE',headers:{Authorization:'Bearer '+token}});const json=await res.json();if(json.ok){alert(json.deleted+' distribuciones eliminadas');window.location.reload();}else{alert('Error: '+(json.error||'No se pudo limpiar'));}}catch(e){alert('Error: '+e.message);}}}>🗑️ Limpiar importados</button>
      </div>
      {/* Resumen */}
      {resumen && (
        <div className="resumen-cards">
          <div className="resumen-card">
            <div className="resumen-icon total"><i className="bi bi-calendar3"></i></div>
            <div className="resumen-info">
              <span className="resumen-valor">{resumen.totales?.total || 0}</span>
              <span className="resumen-label">Total</span>
            </div>
          </div>
          <div className="resumen-card">
            <div className="resumen-icon publicado"><i className="bi bi-send"></i></div>
            <div className="resumen-info">
              <span className="resumen-valor">{resumen.totales?.publicados || 0}</span>
              <span className="resumen-label">Publicados</span>
            </div>
          </div>
          <div className="resumen-card">
            <div className="resumen-icon en-curso"><i className="bi bi-play-circle"></i></div>
            <div className="resumen-info">
              <span className="resumen-valor">{resumen.totales?.en_curso || 0}</span>
              <span className="resumen-label">En Curso</span>
            </div>
          </div>
          <div className="resumen-card">
            <div className="resumen-icon asignaciones"><i className="bi bi-people"></i></div>
            <div className="resumen-info">
              <span className="resumen-valor">{resumen.totales?.total_asignaciones || 0}</span>
              <span className="resumen-label">Asignaciones</span>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="filtros-section">
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="filtro-select">
          <option value="">Todos los tipos</option>
          <option value="turno">Turno</option>
          <option value="horario">Horario</option>
          <option value="asignacion">Asignación</option>
          <option value="ruta">Ruta</option>
          <option value="zona">Zona</option>
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="filtro-select">
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="publicado">Publicado</option>
          <option value="en_curso">En Curso</option>
          <option value="completado">Completado</option>
        </select>
      </div>

      {/* Lista */}
      {error ? (
        <div className="error-state">
          <i className="bi bi-exclamation-triangle"></i>
          <p>{error}</p>
          <button onClick={cargarDistribuciones} className="btn-retry">Reintentar</button>
        </div>
      ) : distribuciones.length === 0 ? (
        <div className="empty-state">
          <i className="bi bi-calendar-x"></i>
          <h3>No hay distribuciones</h3>
          <p>Crea una nueva distribución para comenzar</p>
          <button className="btn-primary" onClick={abrirModalNuevo}>
            <i className="bi bi-plus-lg"></i>Nueva Distribución
          </button>
        </div>
      ) : (
        <div className="distribuciones-grid">
          {distribuciones.map(dist => {
            const estadoBadge = getEstadoBadge(dist.estado);
            return (
              <div key={dist._id} className="distribucion-card" onClick={() => abrirModalVer(dist._id)}>
                <div className="dist-header">
                  <div className="dist-tipo">{getTipoLabel(dist.tipo)}</div>
                  <span className={`estado-badge ${estadoBadge.clase}`}>{estadoBadge.label}</span>
                </div>
                <h4 className="dist-nombre">{dist.nombre}</h4>
                <div className="dist-fecha">
                  <i className="bi bi-calendar-event"></i>
                  {formatearFecha(dist.fecha_inicio)}
                  {dist.fecha_fin && ` - ${formatearFecha(dist.fecha_fin)}`}
                </div>
                <div className="dist-asignados">
                  <div className="avatars-stack">
                    {dist.asignaciones?.slice(0, 4).map((a, i) => (
                      <div key={i} className="mini-avatar" title={`${a.colaborador?.nombres} ${a.colaborador?.apellido_paterno}`}>
                        {a.colaborador?.nombres?.charAt(0)}{a.colaborador?.apellido_paterno?.charAt(0)}
                      </div>
                    ))}
                    {dist.asignaciones?.length > 4 && (
                      <div className="mini-avatar more">+{dist.asignaciones.length - 4}</div>
                    )}
                  </div>
                  <span>{dist.asignaciones?.length || 0} asignados</span>
                </div>
                <div className="dist-actions" onClick={e => e.stopPropagation()}>
                  {dist.estado === 'borrador' && (
                    <button className="btn-mini success" title="Publicar" onClick={() => publicarDistribucion(dist._id)}>
                      <i className="bi bi-send"></i>
                    </button>
                  )}
                  <button className="btn-mini danger" title="Eliminar" onClick={() => eliminarDistribucion(dist._id)}>
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
        <ModalDistribucion
          distribucion={distribucionSeleccionada}
          colaboradores={colaboradores}
          modoEdicion={modoEdicion}
          onClose={cerrarModal}
          onSave={guardarDistribucion}
          setModoEdicion={setModoEdicion}
        />
      )}
    </div>
  );
};

// ============================================================================
// MODAL
// ============================================================================

const ModalDistribucion = ({ distribucion, colaboradores, modoEdicion, onClose, onSave, setModoEdicion }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'turno',
    descripcion: '',
    fecha_inicio: '',
    fecha_fin: '',
    asignaciones: [],
    notas: ''
  });

  const [nuevaAsignacion, setNuevaAsignacion] = useState({ colaborador: '', rol: '', hora_inicio: '', hora_fin: '' });

  useEffect(() => {
    if (distribucion) {
      setFormData({
        nombre: distribucion.nombre || '',
        tipo: distribucion.tipo || 'turno',
        descripcion: distribucion.descripcion || '',
        fecha_inicio: distribucion.fecha_inicio?.split('T')[0] || '',
        fecha_fin: distribucion.fecha_fin?.split('T')[0] || '',
        asignaciones: distribucion.asignaciones || [],
        notas: distribucion.notas || ''
      });
    }
  }, [distribucion]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const agregarAsignacion = () => {
    if (!nuevaAsignacion.colaborador) return;
    const colObj = colaboradores.find(c => c._id === nuevaAsignacion.colaborador);
    setFormData(prev => ({
      ...prev,
      asignaciones: [...prev.asignaciones, { ...nuevaAsignacion, colaborador: colObj }]
    }));
    setNuevaAsignacion({ colaborador: '', rol: '', hora_inicio: '', hora_fin: '' });
  };

  const eliminarAsignacion = (index) => {
    setFormData(prev => ({
      ...prev,
      asignaciones: prev.asignaciones.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nombre || !formData.fecha_inicio) {
      alert('Complete los campos requeridos');
      return;
    }
    const dataToSave = {
      ...formData,
      asignaciones: formData.asignaciones.map(a => ({
        colaborador: a.colaborador?._id || a.colaborador,
        rol: a.rol,
        hora_inicio: a.hora_inicio,
        hora_fin: a.hora_fin
      }))
    };
    onSave(dataToSave);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{modoEdicion ? (distribucion ? 'Editar' : 'Nueva') : 'Detalle'} Distribución</h2>
          <button className="modal-close" onClick={onClose}><i className="bi bi-x-lg"></i></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Nombre *</label>
                <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} disabled={!modoEdicion} required />
              </div>
              <div className="form-group">
                <label>Tipo</label>
                <select name="tipo" value={formData.tipo} onChange={handleChange} disabled={!modoEdicion}>
                  <option value="turno">Turno</option>
                  <option value="horario">Horario</option>
                  <option value="asignacion">Asignación</option>
                  <option value="ruta">Ruta</option>
                  <option value="zona">Zona</option>
                </select>
              </div>
              <div className="form-group">
                <label>Fecha Inicio *</label>
                <input type="date" name="fecha_inicio" value={formData.fecha_inicio} onChange={handleChange} disabled={!modoEdicion} required />
              </div>
              <div className="form-group">
                <label>Fecha Fin</label>
                <input type="date" name="fecha_fin" value={formData.fecha_fin} onChange={handleChange} disabled={!modoEdicion} />
              </div>
              <div className="form-group col-span-2">
                <label>Descripción</label>
                <textarea name="descripcion" value={formData.descripcion} onChange={handleChange} rows={2} disabled={!modoEdicion} />
              </div>
            </div>

            {/* Asignaciones */}
            <div className="asignaciones-section">
              <h4>Asignaciones ({formData.asignaciones.length})</h4>
              {modoEdicion && (
                <div className="add-asignacion">
                  <select value={nuevaAsignacion.colaborador} onChange={e => setNuevaAsignacion(p => ({...p, colaborador: e.target.value}))}>
                    <option value="">Seleccionar colaborador...</option>
                    {colaboradores.map(c => (
                      <option key={c._id} value={c._id}>{c.nombres} {c.apellido_paterno}</option>
                    ))}
                  </select>
                  <input type="text" placeholder="Rol" value={nuevaAsignacion.rol} onChange={e => setNuevaAsignacion(p => ({...p, rol: e.target.value}))} />
                  <input type="time" value={nuevaAsignacion.hora_inicio} onChange={e => setNuevaAsignacion(p => ({...p, hora_inicio: e.target.value}))} />
                  <input type="time" value={nuevaAsignacion.hora_fin} onChange={e => setNuevaAsignacion(p => ({...p, hora_fin: e.target.value}))} />
                  <button type="button" onClick={agregarAsignacion} className="btn-add"><i className="bi bi-plus"></i></button>
                </div>
              )}
              <div className="asignaciones-list">
                {formData.asignaciones.map((a, idx) => (
                  <div key={idx} className="asignacion-item">
                    <div className="asig-avatar">{a.colaborador?.nombres?.charAt(0)}{a.colaborador?.apellido_paterno?.charAt(0)}</div>
                    <div className="asig-info">
                      <span className="asig-nombre">{a.colaborador?.nombres} {a.colaborador?.apellido_paterno}</span>
                      <span className="asig-rol">{a.rol || 'Sin rol'}</span>
                    </div>
                    <div className="asig-horario">
                      {a.hora_inicio && a.hora_fin ? `${a.hora_inicio} - ${a.hora_fin}` : '-'}
                    </div>
                    {modoEdicion && (
                      <button type="button" className="btn-remove" onClick={() => eliminarAsignacion(idx)}>
                        <i className="bi bi-x"></i>
                      </button>
                    )}
                  </div>
                ))}
                {formData.asignaciones.length === 0 && (
                  <p className="no-asignaciones">Sin asignaciones</p>
                )}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            {distribucion && !modoEdicion && (
              <button type="button" className="btn-secondary" onClick={() => setModoEdicion(true)}>
                <i className="bi bi-pencil"></i> Editar
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={onClose}>{modoEdicion ? 'Cancelar' : 'Cerrar'}</button>
            {modoEdicion && (
              <button type="submit" className="btn-primary">
                <i className="bi bi-check-lg"></i> {distribucion ? 'Guardar' : 'Crear'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default DistribucionSection;


