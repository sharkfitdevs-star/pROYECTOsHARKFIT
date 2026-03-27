import React, { useState, useEffect } from 'react';
import './EvaluacionSection.css';
import EvaluacionGrupal from './EvaluacionGrupal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005/api';

const EvaluacionSection = () => {
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [colaboradores, setColaboradores] = useState([]);
  
  // Filtros
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroAño, setFiltroAño] = useState(new Date().getFullYear());
  
  // Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [evaluacionSeleccionada, setEvaluacionSeleccionada] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    cargarEvaluaciones();
    cargarResumen();
    cargarColaboradores();
  }, [filtroEstado, filtroTipo, filtroAño]);

  const cargarEvaluaciones = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtroEstado) params.append('estado', filtroEstado);
      if (filtroTipo) params.append('tipo', filtroTipo);
      if (filtroAño) params.append('año', filtroAño);

      const response = await fetch(`${API_URL}/evaluaciones?${params}`, {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Error al cargar evaluaciones');
      const data = await response.json();
      setEvaluaciones(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarResumen = async () => {
    try {
      const response = await fetch(`${API_URL}/evaluaciones/resumen?año=${filtroAño}`, {
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

  const cargarColaboradores = async () => {
    try {
      const response = await fetch(`${API_URL}/colaboradores?limit=100`, {
        headers: getHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setColaboradores(data.data || []);
      }
    } catch (err) {
      console.error('Error al cargar colaboradores:', err);
    }
  };

  const abrirModalNueva = () => {
    setEvaluacionSeleccionada(null);
    setModoEdicion(true);
    setModalAbierto(true);
  };

  const abrirModalVer = (evaluacion) => {
    setEvaluacionSeleccionada(evaluacion);
    setModoEdicion(false);
    setModalAbierto(true);
  };

  const abrirModalEditar = (evaluacion) => {
    setEvaluacionSeleccionada(evaluacion);
    setModoEdicion(true);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEvaluacionSeleccionada(null);
  };

  const guardarEvaluacion = async (datos) => {
    try {
      const url = evaluacionSeleccionada 
        ? `${API_URL}/evaluaciones/${evaluacionSeleccionada._id}`
        : `${API_URL}/evaluaciones`;
      
      const response = await fetch(url, {
        method: evaluacionSeleccionada ? 'PUT' : 'POST',
        headers: getHeaders(),
        body: JSON.stringify(datos)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al guardar');
      }

      cerrarModal();
      cargarEvaluaciones();
      cargarResumen();
    } catch (err) {
      alert(err.message);
    }
  };

  const completarEvaluacion = async (id) => {
    if (!confirm('¿Está seguro de completar esta evaluación? No podrá modificarla después.')) return;
    
    try {
      const response = await fetch(`${API_URL}/evaluaciones/${id}/completar`, {
        method: 'POST',
        headers: getHeaders()
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al completar');
      }

      cargarEvaluaciones();
      cargarResumen();
    } catch (err) {
      alert(err.message);
    }
  };

  const eliminarEvaluacion = async (id) => {
    if (!confirm('¿Está seguro de eliminar esta evaluación?')) return;
    
    try {
      const response = await fetch(`${API_URL}/evaluaciones/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al eliminar');
      }

      cargarEvaluaciones();
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
    const clases = {
      borrador: 'badge-secondary',
      en_progreso: 'badge-info',
      pendiente_revision: 'badge-warning',
      completada: 'badge-success',
      cancelada: 'badge-danger'
    };
    const labels = {
      borrador: 'Borrador',
      en_progreso: 'En Progreso',
      pendiente_revision: 'Pendiente Revisión',
      completada: 'Completada',
      cancelada: 'Cancelada'
    };
    return { clase: clases[estado] || 'badge-secondary', label: labels[estado] || estado };
  };

  const getClasificacionBadge = (clasificacion) => {
    const clases = {
      excepcional: 'badge-purple',
      superior: 'badge-success',
      satisfactorio: 'badge-info',
      necesita_mejora: 'badge-warning',
      insatisfactorio: 'badge-danger'
    };
    const labels = {
      excepcional: 'Excepcional',
      superior: 'Superior',
      satisfactorio: 'Satisfactorio',
      necesita_mejora: 'Necesita Mejora',
      insatisfactorio: 'Insatisfactorio'
    };
    return { clase: clases[clasificacion] || 'badge-secondary', label: labels[clasificacion] || clasificacion };
  };

  const getTipoLabel = (tipo) => {
    const labels = {
      desempeno: 'Desempeño',
      competencias: 'Competencias',
      objetivos: 'Objetivos',
      periodo_prueba: 'Período Prueba',
      '360': '360°',
      autoevaluacion: 'Autoevaluación'
    };
    return labels[tipo] || tipo;
  };

  const [showGrupal, setShowGrupal] = useState(false);

  const handleShowGrupal = async () => {
    if (!colaboradores.length) {
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`${API_URL}/colaboradores`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        setColaboradores(json.data || []);
      } catch {}
    }
    setShowGrupal(s => !s);
  };

  if (loading && evaluaciones.length === 0) {
    return (
      <div className="evaluacion-section">
        <div className="loading-state">
          <i className="bi bi-arrow-repeat spin"></i>
          <p>Cargando evaluaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="evaluacion-section">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1>Evaluaciones</h1>
          <p>Gestión de evaluaciones de desempeño</p>
        </div>
        <button className="btn-primary" onClick={abrirModalNueva}>
          <i className="bi bi-plus-lg"></i>
          Nueva Evaluación
        </button>
        <button className="btn-danger" style={{marginLeft:'10px'}} onClick={async()=>{if(!window.confirm('¿Eliminar TODAS las evaluaciones importadas?'))return;try{const token=localStorage.getItem('authToken');const res=await fetch((import.meta.env.VITE_API_URL||'http://localhost:3005/api')+'/evaluaciones/importados',{method:'DELETE',headers:{Authorization:'Bearer '+token}});const json=await res.json();if(json.ok){alert(json.deleted+' evaluaciones eliminadas');window.location.reload();}else{alert('Error: '+(json.error||'No se pudo limpiar'));}}catch(e){alert('Error: '+e.message);}}}>🗑️ Limpiar importados</button>
      </div>
      {/* Resumen Cards */}
      {resumen && (
        <div className="resumen-cards">
          <div className="resumen-card">
            <div className="resumen-icon total">
              <i className="bi bi-clipboard-check"></i>
            </div>
            <div className="resumen-info">
              <span className="resumen-valor">{resumen.totales?.total || 0}</span>
              <span className="resumen-label">Total {filtroAño}</span>
            </div>
          </div>
          <div className="resumen-card">
            <div className="resumen-icon success">
              <i className="bi bi-check-circle"></i>
            </div>
            <div className="resumen-info">
              <span className="resumen-valor">{resumen.totales?.completadas || 0}</span>
              <span className="resumen-label">Completadas</span>
            </div>
          </div>
          <div className="resumen-card">
            <div className="resumen-icon warning">
              <i className="bi bi-hourglass-split"></i>
            </div>
            <div className="resumen-info">
              <span className="resumen-valor">{resumen.totales?.pendientes || 0}</span>
              <span className="resumen-label">Pendientes</span>
            </div>
          </div>
          <div className="resumen-card">
            <div className="resumen-icon info">
              <i className="bi bi-star-half"></i>
            </div>
            <div className="resumen-info">
              <span className="resumen-valor">
                {resumen.totales?.promedio_general ? resumen.totales.promedio_general.toFixed(1) : '-'}
              </span>
              <span className="resumen-label">Promedio General</span>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="filtros-section">
        <select 
          value={filtroAño} 
          onChange={(e) => setFiltroAño(e.target.value)}
          className="filtro-select"
        >
          {[2026, 2025, 2024, 2023].map(año => (
            <option key={año} value={año}>{año}</option>
          ))}
        </select>

        <select 
          value={filtroTipo} 
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="filtro-select"
        >
          <option value="">Todos los tipos</option>
          <option value="desempeno">Desempeño</option>
          <option value="competencias">Competencias</option>
          <option value="objetivos">Objetivos</option>
          <option value="periodo_prueba">Período Prueba</option>
          <option value="360">360°</option>
        </select>

        <select 
          value={filtroEstado} 
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="filtro-select"
        >
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="en_progreso">En Progreso</option>
          <option value="pendiente_revision">Pendiente Revisión</option>
          <option value="completada">Completada</option>
        </select>
      </div>

      {/* Tabla de Evaluaciones */}
      {error ? (
        <div className="error-state">
          <i className="bi bi-exclamation-triangle"></i>
          <p>{error}</p>
          <button onClick={cargarEvaluaciones} className="btn-retry">Reintentar</button>
        </div>
      ) : evaluaciones.length === 0 ? (
        <div className="empty-state">
          <i className="bi bi-clipboard-x"></i>
          <h3>No hay evaluaciones</h3>
          <p>Crea una nueva evaluación para comenzar</p>
          <button className="btn-primary" onClick={abrirModalNueva}>
            <i className="bi bi-plus-lg"></i>
            Nueva Evaluación
          </button>
        </div>
      ) : (
        <div className="tabla-container">
          <table className="tabla-evaluaciones">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Tipo</th>
                <th>Período</th>
                <th>Evaluador</th>
                <th>Puntuación</th>
                <th>Clasificación</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {evaluaciones.map(ev => {
                const estadoBadge = getEstadoBadge(ev.estado);
                const clasificacionBadge = getClasificacionBadge(ev.clasificacion);
                return (
                  <tr key={ev._id}>
                    <td className="col-colaborador">
                      <div className="colaborador-info">
                        <div className="colaborador-avatar">
                          {ev.colaborador?.foto ? (
                            <img src={ev.colaborador.foto} alt="" />
                          ) : (
                            <span>
                              {ev.colaborador?.nombres?.charAt(0)}
                              {ev.colaborador?.apellido_paterno?.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="colaborador-datos">
                          <span className="nombre">
                            {ev.colaborador?.nombres} {ev.colaborador?.apellido_paterno}
                          </span>
                          <span className="cargo">{ev.colaborador?.cargo}</span>
                        </div>
                      </div>
                    </td>
                    <td>{getTipoLabel(ev.tipo)}</td>
                    <td>
                      {ev.periodo?.año}
                      {ev.periodo?.trimestre && ` - Q${ev.periodo.trimestre}`}
                    </td>
                    <td>
                      {ev.evaluador?.nombres} {ev.evaluador?.apellido_paterno}
                    </td>
                    <td className="col-puntuacion">
                      {ev.puntuacion_general ? (
                        <div className="puntuacion">
                          <span className="valor">{ev.puntuacion_general.toFixed(1)}</span>
                          <span className="max">/5</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td>
                      {ev.estado === 'completada' && (
                        <span className={`estado-badge ${clasificacionBadge.clase}`}>
                          {clasificacionBadge.label}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`estado-badge ${estadoBadge.clase}`}>
                        {estadoBadge.label}
                      </span>
                    </td>
                    <td className="col-acciones">
                      <button className="btn-icon" title="Ver" onClick={() => abrirModalVer(ev)}>
                        <i className="bi bi-eye"></i>
                      </button>
                      {ev.estado !== 'completada' && (
                        <>
                          <button className="btn-icon" title="Editar" onClick={() => abrirModalEditar(ev)}>
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button className="btn-icon success" title="Completar" onClick={() => completarEvaluacion(ev._id)}>
                            <i className="bi bi-check-lg"></i>
                          </button>
                          <button className="btn-icon danger" title="Eliminar" onClick={() => eliminarEvaluacion(ev._id)}>
                            <i className="bi bi-trash"></i>
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalAbierto && (
        <ModalEvaluacion
          evaluacion={evaluacionSeleccionada}
          colaboradores={colaboradores}
          modoEdicion={modoEdicion}
          onClose={cerrarModal}
          onSave={guardarEvaluacion}
        />
      )}
      <button
        style={{ margin: '18px 0', background: 'var(--color-primary-light, #6366f1)', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 22px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
        onClick={handleShowGrupal}
      >
        {showGrupal ? 'Ocultar Evaluación Grupal' : 'Evaluación Grupal'}
      </button>
      {showGrupal && <EvaluacionGrupal colaboradores={colaboradores} />}
    </div>
  );
};

// ============================================================================
// MODAL EVALUACIÓN
// ============================================================================

const ModalEvaluacion = ({ evaluacion, colaboradores, modoEdicion, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    colaborador: '',
    evaluador: '',
    tipo: 'desempeno',
    periodo: {
      año: new Date().getFullYear(),
      trimestre: Math.ceil((new Date().getMonth() + 1) / 3)
    },
    estado: 'borrador',
    criterios: [
      { nombre: 'Calidad del trabajo', categoria: 'competencias', peso: 20, puntuacion: null, comentario: '' },
      { nombre: 'Productividad', categoria: 'competencias', peso: 20, puntuacion: null, comentario: '' },
      { nombre: 'Puntualidad y asistencia', categoria: 'valores', peso: 15, puntuacion: null, comentario: '' },
      { nombre: 'Trabajo en equipo', categoria: 'habilidades', peso: 15, puntuacion: null, comentario: '' },
      { nombre: 'Comunicación', categoria: 'habilidades', peso: 10, puntuacion: null, comentario: '' },
      { nombre: 'Iniciativa', categoria: 'competencias', peso: 10, puntuacion: null, comentario: '' },
      { nombre: 'Compromiso', categoria: 'valores', peso: 10, puntuacion: null, comentario: '' }
    ],
    puntuacion_general: null,
    fortalezas: [],
    areas_mejora: [],
    comentario_evaluador: ''
  });

  const [nuevaFortaleza, setNuevaFortaleza] = useState('');
  const [nuevaAreaMejora, setNuevaAreaMejora] = useState('');

  useEffect(() => {
    if (evaluacion) {
      setFormData({
        colaborador: evaluacion.colaborador?._id || '',
        evaluador: evaluacion.evaluador?._id || '',
        tipo: evaluacion.tipo || 'desempeno',
        periodo: evaluacion.periodo || { año: new Date().getFullYear(), trimestre: 1 },
        estado: evaluacion.estado || 'borrador',
        criterios: evaluacion.criterios?.length > 0 ? evaluacion.criterios : formData.criterios,
        puntuacion_general: evaluacion.puntuacion_general || null,
        fortalezas: evaluacion.fortalezas || [],
        areas_mejora: evaluacion.areas_mejora || [],
        comentario_evaluador: evaluacion.comentario_evaluador || ''
      });
    }
  }, [evaluacion]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('periodo.')) {
      const campo = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        periodo: { ...prev.periodo, [campo]: parseInt(value) }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCriterioChange = (index, campo, valor) => {
    setFormData(prev => {
      const criterios = [...prev.criterios];
      criterios[index] = { ...criterios[index], [campo]: campo === 'puntuacion' ? parseInt(valor) : valor };
      return { ...prev, criterios };
    });
  };

  const calcularPromedio = () => {
    const puntuaciones = formData.criterios.filter(c => c.puntuacion).map(c => c.puntuacion);
    if (puntuaciones.length === 0) return 0;
    return (puntuaciones.reduce((a, b) => a + b, 0) / puntuaciones.length).toFixed(1);
  };

  const agregarFortaleza = () => {
    if (nuevaFortaleza.trim()) {
      setFormData(prev => ({
        ...prev,
        fortalezas: [...prev.fortalezas, nuevaFortaleza.trim()]
      }));
      setNuevaFortaleza('');
    }
  };

  const eliminarFortaleza = (index) => {
    setFormData(prev => ({
      ...prev,
      fortalezas: prev.fortalezas.filter((_, i) => i !== index)
    }));
  };

  const agregarAreaMejora = () => {
    if (nuevaAreaMejora.trim()) {
      setFormData(prev => ({
        ...prev,
        areas_mejora: [...prev.areas_mejora, nuevaAreaMejora.trim()]
      }));
      setNuevaAreaMejora('');
    }
  };

  const eliminarAreaMejora = (index) => {
    setFormData(prev => ({
      ...prev,
      areas_mejora: prev.areas_mejora.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.colaborador || !formData.evaluador) {
      alert('Seleccione colaborador y evaluador');
      return;
    }
    
    const promedio = calcularPromedio();
    onSave({
      ...formData,
      puntuacion_general: parseFloat(promedio) || formData.puntuacion_general
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-xl" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {modoEdicion 
              ? (evaluacion ? 'Editar Evaluación' : 'Nueva Evaluación')
              : 'Detalle de Evaluación'
            }
          </h2>
          <button className="modal-close" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Datos Generales */}
            <div className="form-section">
              <h3>Datos Generales</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Colaborador *</label>
                  <select name="colaborador" value={formData.colaborador} onChange={handleChange}
                    disabled={!modoEdicion || evaluacion} required>
                    <option value="">Seleccionar...</option>
                    {colaboradores.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.nombres} {c.apellido_paterno} - {c.cargo}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Evaluador *</label>
                  <select name="evaluador" value={formData.evaluador} onChange={handleChange}
                    disabled={!modoEdicion} required>
                    <option value="">Seleccionar...</option>
                    {colaboradores.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.nombres} {c.apellido_paterno} - {c.cargo}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo de Evaluación</label>
                  <select name="tipo" value={formData.tipo} onChange={handleChange} disabled={!modoEdicion}>
                    <option value="desempeno">Desempeño</option>
                    <option value="competencias">Competencias</option>
                    <option value="objetivos">Objetivos</option>
                    <option value="periodo_prueba">Período de Prueba</option>
                    <option value="360">360°</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Año</label>
                  <select name="periodo.año" value={formData.periodo.año} onChange={handleChange}
                    disabled={!modoEdicion}>
                    {[2026, 2025, 2024].map(año => (
                      <option key={año} value={año}>{año}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Trimestre</label>
                  <select name="periodo.trimestre" value={formData.periodo.trimestre} onChange={handleChange}
                    disabled={!modoEdicion}>
                    <option value={1}>Q1 (Ene-Mar)</option>
                    <option value={2}>Q2 (Abr-Jun)</option>
                    <option value={3}>Q3 (Jul-Sep)</option>
                    <option value={4}>Q4 (Oct-Dic)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Criterios de Evaluación */}
            <div className="form-section">
              <h3>Criterios de Evaluación</h3>
              <div className="criterios-list">
                {formData.criterios.map((criterio, index) => (
                  <div key={index} className="criterio-item">
                    <div className="criterio-header">
                      <span className="criterio-nombre">{criterio.nombre}</span>
                      <span className="criterio-peso">{criterio.peso}%</span>
                    </div>
                    <div className="criterio-puntuacion">
                      {[1, 2, 3, 4, 5].map(num => (
                        <button
                          key={num}
                          type="button"
                          className={`star-btn ${criterio.puntuacion >= num ? 'active' : ''}`}
                          onClick={() => modoEdicion && handleCriterioChange(index, 'puntuacion', num)}
                          disabled={!modoEdicion}
                        >
                          <i className={`bi bi-star${criterio.puntuacion >= num ? '-fill' : ''}`}></i>
                        </button>
                      ))}
                      <span className="puntuacion-valor">
                        {criterio.puntuacion || '-'}/5
                      </span>
                    </div>
                    {modoEdicion && (
                      <input
                        type="text"
                        placeholder="Comentario (opcional)"
                        value={criterio.comentario || ''}
                        onChange={(e) => handleCriterioChange(index, 'comentario', e.target.value)}
                        className="criterio-comentario"
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="promedio-general">
                <span>Promedio General:</span>
                <strong>{calcularPromedio()}/5</strong>
              </div>
            </div>

            {/* Fortalezas y Áreas de Mejora */}
            <div className="form-section">
              <div className="form-grid">
                <div className="form-group">
                  <h3>Fortalezas</h3>
                  {modoEdicion && (
                    <div className="add-item-row">
                      <input
                        type="text"
                        value={nuevaFortaleza}
                        onChange={(e) => setNuevaFortaleza(e.target.value)}
                        placeholder="Agregar fortaleza..."
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), agregarFortaleza())}
                      />
                      <button type="button" onClick={agregarFortaleza} className="btn-add">
                        <i className="bi bi-plus"></i>
                      </button>
                    </div>
                  )}
                  <ul className="tags-list">
                    {formData.fortalezas.map((f, i) => (
                      <li key={i} className="tag-item success">
                        {f}
                        {modoEdicion && (
                          <button type="button" onClick={() => eliminarFortaleza(i)}>
                            <i className="bi bi-x"></i>
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="form-group">
                  <h3>Áreas de Mejora</h3>
                  {modoEdicion && (
                    <div className="add-item-row">
                      <input
                        type="text"
                        value={nuevaAreaMejora}
                        onChange={(e) => setNuevaAreaMejora(e.target.value)}
                        placeholder="Agregar área de mejora..."
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), agregarAreaMejora())}
                      />
                      <button type="button" onClick={agregarAreaMejora} className="btn-add">
                        <i className="bi bi-plus"></i>
                      </button>
                    </div>
                  )}
                  <ul className="tags-list">
                    {formData.areas_mejora.map((a, i) => (
                      <li key={i} className="tag-item warning">
                        {a}
                        {modoEdicion && (
                          <button type="button" onClick={() => eliminarAreaMejora(i)}>
                            <i className="bi bi-x"></i>
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Comentarios */}
            <div className="form-section">
              <h3>Comentarios del Evaluador</h3>
              <textarea
                name="comentario_evaluador"
                value={formData.comentario_evaluador}
                onChange={handleChange}
                disabled={!modoEdicion}
                rows={4}
                placeholder="Observaciones generales sobre el desempeño..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              {modoEdicion ? 'Cancelar' : 'Cerrar'}
            </button>
            {modoEdicion && (
              <button type="submit" className="btn-primary">
                <i className="bi bi-check-lg"></i>
                {evaluacion ? 'Guardar Cambios' : 'Crear Evaluación'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default EvaluacionSection;

