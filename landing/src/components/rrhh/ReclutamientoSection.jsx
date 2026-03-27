import React, { useState, useEffect } from 'react';
import './ReclutamientoSection.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005/api';

const ETAPAS_PIPELINE = [
  { id: 'nuevo', label: 'Nuevos', color: '#6366f1' },
  { id: 'revision_cv', label: 'Revisión CV', color: '#8b5cf6' },
  { id: 'entrevista_telefonica', label: 'Entrevista Tel.', color: '#3b82f6' },
  { id: 'entrevista_presencial', label: 'Entrevista Pres.', color: '#06b6d4' },
  { id: 'prueba_tecnica', label: 'Prueba Técnica', color: '#f59e0b' },
  { id: 'entrevista_final', label: 'Entrevista Final', color: '#10b981' },
  { id: 'oferta', label: 'Oferta', color: '#22c55e' }
];

const ReclutamientoSection = () => {
  const [pipeline, setPipeline] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resumen, setResumen] = useState(null);
  
  // Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [candidatoSeleccionado, setCandidatoSeleccionado] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);

    // Embudo visual de reclutamiento
    const ETAPAS = [
      { key: 'postulacion', label: 'Postulación', color: '#94a3b8' },
      { key: 'screening', label: 'Screening', color: '#60a5fa' },
      { key: 'entrevista', label: 'Entrevista', color: '#fbbf24' },
      { key: 'prueba', label: 'Prueba', color: '#f97316' },
      { key: 'contratado', label: 'Contratado', color: '#22c55e' },
    ];

    // Mapeo de ids de pipeline a etapas del embudo
    const etapaMap = {
      nuevo: 'postulacion',
      revision_cv: 'screening',
      entrevista_telefonica: 'entrevista',
      entrevista_presencial: 'entrevista',
      prueba_tecnica: 'prueba',
      entrevista_final: 'entrevista',
      oferta: 'prueba', // o 'entrevista' según flujo real
      contratado: 'contratado',
    };

    // Agrupar candidatos por etapa del embudo
    const candidatosPorEtapa = ETAPAS.reduce((acc, etapa) => {
      acc[etapa.key] = 0;
      return acc;
    }, {});
    let totalCandidatos = 0;
    Object.entries(pipeline).forEach(([key, arr]) => {
      const etapa = etapaMap[key];
      if (etapa && Array.isArray(arr)) {
        candidatosPorEtapa[etapa] += arr.length;
        totalCandidatos += arr.length;
      }
    });

    // Calcular porcentajes de conversión
    let prev = totalCandidatos;
    const embudoData = ETAPAS.map((etapa, idx) => {
      const cantidad = candidatosPorEtapa[etapa.key];
      const porcentaje = totalCandidatos > 0 ? Math.round((cantidad / totalCandidatos) * 100) : 0;
      const conversion = prev > 0 ? Math.round((cantidad / prev) * 100) : 0;
      prev = cantidad;
      return { ...etapa, cantidad, porcentaje, conversion };
    });

    // Filtro por etapa del embudo
    const [etapaFiltro, setEtapaFiltro] = useState(null);

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    cargarPipeline();
    cargarResumen();
  }, []);

  const cargarPipeline = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/reclutamiento/pipeline`, { headers: getHeaders() });
      if (!response.ok) throw new Error('Error al cargar pipeline');
      const data = await response.json();
      setPipeline(data.data || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarResumen = async () => {
    try {
      const response = await fetch(`${API_URL}/reclutamiento/resumen`, { headers: getHeaders() });
      if (response.ok) {
        const data = await response.json();
        setResumen(data.data);
      }
    } catch (err) {
      console.error('Error al cargar resumen:', err);
    }
  };

  const abrirModalNuevo = () => {
    setCandidatoSeleccionado(null);
    setModoEdicion(true);
    setModalAbierto(true);
  };

  const abrirModalVer = async (candidatoId) => {
    try {
      const response = await fetch(`${API_URL}/reclutamiento/${candidatoId}`, { headers: getHeaders() });
      if (response.ok) {
        const data = await response.json();
        setCandidatoSeleccionado(data.data);
        setModoEdicion(false);
        setModalAbierto(true);
      }
    } catch (err) {
      console.error('Error al cargar candidato:', err);
    }
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setCandidatoSeleccionado(null);
  };

  const guardarCandidato = async (datos) => {
    try {
      const url = candidatoSeleccionado 
        ? `${API_URL}/reclutamiento/${candidatoSeleccionado._id}`
        : `${API_URL}/reclutamiento`;
      
      const response = await fetch(url, {
        method: candidatoSeleccionado ? 'PUT' : 'POST',
        headers: getHeaders(),
        body: JSON.stringify(datos)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al guardar');
      }

      cerrarModal();
      cargarPipeline();
      cargarResumen();
    } catch (err) {
      alert(err.message);
    }
  };

  const moverCandidato = async (candidatoId, nuevoEstado) => {
    try {
      const response = await fetch(`${API_URL}/reclutamiento/${candidatoId}/cambiar-estado`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ estado: nuevoEstado })
      });

      if (!response.ok) throw new Error('Error al mover candidato');
      cargarPipeline();
      cargarResumen();
    } catch (err) {
      alert(err.message);
    }
  };

  const descartarCandidato = async (candidatoId) => {
    const motivo = prompt('Motivo del descarte:');
    if (!motivo) return;

    try {
      const response = await fetch(`${API_URL}/reclutamiento/${candidatoId}/cambiar-estado`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ estado: 'descartado', motivo })
      });

      if (!response.ok) throw new Error('Error al descartar');
      cargarPipeline();
      cargarResumen();
    } catch (err) {
      alert(err.message);
    }
  };

  const contratarCandidato = async (candidatoId) => {
    if (!confirm('¿Confirmar contratación de este candidato?')) return;

    try {
      const response = await fetch(`${API_URL}/reclutamiento/${candidatoId}/contratar`, {
        method: 'POST',
        headers: getHeaders()
      });

      if (!response.ok) throw new Error('Error al contratar');
      cargarPipeline();
      cargarResumen();
      alert('¡Candidato contratado exitosamente!');
    } catch (err) {
      alert(err.message);
    }
  };

  const getFuenteLabel = (fuente) => {
    const labels = {
      portal_empleo: 'Portal Empleo',
      linkedin: 'LinkedIn',
      referido: 'Referido',
      web: 'Web',
      agencia: 'Agencia',
      feria_laboral: 'Feria',
      espontaneo: 'Espontáneo',
      otro: 'Otro'
    };
    return labels[fuente] || fuente;
  };

  if (loading) {
    return (
      <div className="reclutamiento-section">
        <div className="loading-state">
          <i className="bi bi-arrow-repeat spin"></i>
          <p>Cargando pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reclutamiento-section">
      {/* Embudo visual de reclutamiento */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 10px 0', fontWeight: 700, fontSize: '1.1rem', color: '#64748b' }}>Embudo de Reclutamiento</h3>
        {totalCandidatos === 0 ? (
          <div style={{ opacity: 0.7, fontStyle: 'italic', color: '#64748b', padding: '12px 0' }}>
            No hay candidatos en el embudo.
            {ETAPAS.map((etapa, idx) => (
              <div key={etapa.key} style={{
                width: Math.max(40, 220 - idx * 32),
                background: etapa.color,
                color: '#fff',
                borderRadius: 8,
                padding: '10px 16px',
                marginBottom: 4,
                transition: 'width 0.3s',
                display: 'flex',
                alignItems: 'center',
                fontWeight: 600,
                fontSize: '1rem',
                opacity: 0.5
              }}>
                <span style={{ flex: 1 }}>{etapa.label}</span>
                <span style={{ marginLeft: 12 }}>0</span>
                <span style={{ marginLeft: 16, fontSize: '0.95em', fontWeight: 400 }}>0%</span>
              </div>
            ))}
          </div>
        ) : (
          embudoData.map((etapa, idx) => {
            // Ancho proporcional al porcentaje, mínimo 40px
            const width = Math.max(40, Math.round(220 * (etapa.porcentaje / 100)));
            return (
              <div
                key={etapa.key}
                onClick={() => setEtapaFiltro(etapaFiltro === etapa.key ? null : etapa.key)}
                style={{
                  width,
                  background: etapa.color,
                  color: '#fff',
                  borderRadius: 8,
                  padding: '10px 16px',
                  marginBottom: 4,
                  transition: 'width 0.3s',
                  cursor: 'pointer',
                  boxShadow: etapaFiltro === etapa.key ? '0 0 0 3px #c7d2fe' : undefined,
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: 600,
                  fontSize: '1rem',
                  border: etapaFiltro === etapa.key ? '2px solid #6366f1' : 'none',
                  outline: 'none',
                  opacity: etapa.cantidad === 0 ? 0.5 : 1
                }}
                tabIndex={0}
                title={`Filtrar por ${etapa.label}`}
              >
                <span style={{ flex: 1 }}>{etapa.label}</span>
                <span style={{ marginLeft: 12 }}>{etapa.cantidad}</span>
                <span style={{ marginLeft: 16, fontSize: '0.95em', fontWeight: 400 }}>{etapa.conversion}%</span>
                {etapaFiltro === etapa.key && <span style={{ marginLeft: 10, fontSize: '0.9em', fontWeight: 400 }}>(Filtro)</span>}
              </div>
            );
          })
        )}
      </div>
      {/* Header */}
      <div className="section-header">
        <div>
          <h1>Reclutamiento</h1>
          <p>Pipeline de selección de candidatos</p>
        </div>
        <button className="btn-primary" onClick={abrirModalNuevo}>
          <i className="bi bi-plus-lg"></i>
          Nuevo Candidato
        </button>
        <button className="btn-danger" style={{marginLeft:'10px'}} onClick={async()=>{if(!window.confirm('¿Eliminar TODOS los candidatos importados?'))return;try{const token=localStorage.getItem('authToken');const res=await fetch((import.meta.env.VITE_API_URL||'http://localhost:3005/api')+'/reclutamiento/importados',{method:'DELETE',headers:{Authorization:'Bearer '+token}});const json=await res.json();if(json.ok){alert(json.deleted+' candidatos eliminados');window.location.reload();}else{alert('Error: '+(json.error||'No se pudo limpiar'));}}catch(e){alert('Error: '+e.message);}}}>🗑️ Limpiar importados</button>
      </div>
      {/* Resumen Cards */}
      {resumen && (
        <div className="resumen-cards">
          <div className="resumen-card">
            <div className="resumen-icon total">
              <i className="bi bi-people"></i>
            </div>
            <div className="resumen-info">
              <span className="resumen-valor">{resumen.totales?.total || 0}</span>
              <span className="resumen-label">Total Candidatos</span>
            </div>
          </div>
          <div className="resumen-card">
            <div className="resumen-icon nuevo">
              <i className="bi bi-person-plus"></i>
            </div>
            <div className="resumen-info">
              <span className="resumen-valor">{resumen.totales?.nuevos || 0}</span>
              <span className="resumen-label">Nuevos</span>
            </div>
          </div>
          <div className="resumen-card">
            <div className="resumen-icon proceso">
              <i className="bi bi-hourglass-split"></i>
            </div>
            <div className="resumen-info">
              <span className="resumen-valor">{resumen.totales?.en_proceso || 0}</span>
              <span className="resumen-label">En Proceso</span>
            </div>
          </div>
          <div className="resumen-card">
            <div className="resumen-icon contratado">
              <i className="bi bi-person-check"></i>
            </div>
            <div className="resumen-info">
              <span className="resumen-valor">{resumen.totales?.contratados || 0}</span>
              <span className="resumen-label">Contratados</span>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Kanban */}
      {error ? (
        <div>
          <i className="bi bi-exclamation-triangle"></i>
          <p>{error}</p>
          <button onClick={cargarPipeline} className="btn-retry">Reintentar</button>
        </div>
      ) : (
        <div className="pipeline-container">
          <div className="pipeline-board">
            {ETAPAS_PIPELINE.map(etapa => (
              <div key={etapa.id} className="pipeline-column">
                <div className="column-header" style={{ borderColor: etapa.color }}>
                  <span className="column-title">{etapa.label}</span>
                  <span className="column-count" style={{ background: etapa.color }}>
                    {pipeline[etapa.id]?.length || 0}
                  </span>
                </div>
                <div className="column-body">
                  {(pipeline[etapa.id] || []).map(candidato => (
                    <div key={candidato._id} className="candidato-card" onClick={() => abrirModalVer(candidato._id)}>
                      <div className="candidato-header">
                        <div className="candidato-avatar">
                          {candidato.nombres?.charAt(0)}{candidato.apellido_paterno?.charAt(0)}
                        </div>
                        <div className="candidato-info">
                          <span className="candidato-nombre">
                            {candidato.nombres} {candidato.apellido_paterno}
                          </span>
                          <span className="candidato-cargo">{candidato.cargo_postulado}</span>
                        </div>
                      </div>
                      <div className="candidato-meta">
                        <span className="meta-item">
                          <i className="bi bi-geo-alt"></i>
                          {candidato.ciudad || 'No especificada'}
                        </span>
                        <span className="meta-item">
                          <i className="bi bi-calendar"></i>
                          {candidato.dias_en_proceso}d
                        </span>
                      </div>
                      <div className="candidato-footer">
                        <span className="fuente-badge">{getFuenteLabel(candidato.fuente)}</span>
                        <div className="candidato-actions" onClick={e => e.stopPropagation()}>
                          {etapa.id !== 'oferta' && (
                            <button 
                              className="btn-mini success" 
                              title="Avanzar"
                              onClick={() => {
                                const idx = ETAPAS_PIPELINE.findIndex(e => e.id === etapa.id);
                                if (idx < ETAPAS_PIPELINE.length - 1) {
                                  moverCandidato(candidato._id, ETAPAS_PIPELINE[idx + 1].id);
                                }
                              }}
                            >
                              <i className="bi bi-arrow-right"></i>
                            </button>
                          )}
                          {etapa.id === 'oferta' && (
                            <button 
                              className="btn-mini success" 
                              title="Contratar"
                              onClick={() => contratarCandidato(candidato._id)}
                            >
                              <i className="bi bi-check-lg"></i>
                            </button>
                          )}
                          <button 
                            className="btn-mini danger" 
                            title="Descartar"
                            onClick={() => descartarCandidato(candidato._id)}
                          >
                            <i className="bi bi-x-lg"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!pipeline[etapa.id] || pipeline[etapa.id].length === 0) && (
                    <div className="empty-column">
                      <i className="bi bi-inbox"></i>
                      <span>Sin candidatos</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {modalAbierto && (
        <ModalCandidato
          candidato={candidatoSeleccionado}
          modoEdicion={modoEdicion}
          onClose={cerrarModal}
          onSave={guardarCandidato}
          setModoEdicion={setModoEdicion}
        />
      )}
    </div>
  );
};

// ============================================================================
// MODAL CANDIDATO
// ============================================================================

const ModalCandidato = ({ candidato, modoEdicion, onClose, onSave, setModoEdicion }) => {
  const [formData, setFormData] = useState({
    nombres: '',
    apellido_paterno: '',
    apellido_materno: '',
    email: '',
    telefono: '',
    ciudad: '',
    cargo_postulado: '',
    fuente: 'web',
    años_experiencia: 0,
    titulo_profesional: '',
    expectativa_salarial: '',
    disponibilidad_inicio: 'inmediata',
    cv_url: '',
    linkedin_url: '',
    notas: ''
  });

  useEffect(() => {
    if (candidato) {
      setFormData({
        nombres: candidato.nombres || '',
        apellido_paterno: candidato.apellido_paterno || '',
        apellido_materno: candidato.apellido_materno || '',
        email: candidato.email || '',
        telefono: candidato.telefono || '',
        ciudad: candidato.ciudad || '',
        cargo_postulado: candidato.cargo_postulado || '',
        fuente: candidato.fuente || 'web',
        años_experiencia: candidato.años_experiencia || 0,
        titulo_profesional: candidato.titulo_profesional || '',
        expectativa_salarial: candidato.expectativa_salarial || '',
        disponibilidad_inicio: candidato.disponibilidad_inicio || 'inmediata',
        cv_url: candidato.cv_url || '',
        linkedin_url: candidato.linkedin_url || '',
        notas: candidato.notas || ''
      });
    }
  }, [candidato]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nombres || !formData.apellido_paterno || !formData.email || !formData.cargo_postulado) {
      alert('Complete los campos requeridos');
      return;
    }
    onSave(formData);
  };

  const getEstadoLabel = (estado) => {
    const labels = {
      nuevo: 'Nuevo',
      revision_cv: 'Revisión CV',
      entrevista_telefonica: 'Entrevista Telefónica',
      entrevista_presencial: 'Entrevista Presencial',
      prueba_tecnica: 'Prueba Técnica',
      entrevista_final: 'Entrevista Final',
      oferta: 'Oferta',
      contratado: 'Contratado',
      rechazado: 'Rechazado',
      descartado: 'Descartado'
    };
    return labels[estado] || estado;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {modoEdicion 
              ? (candidato ? 'Editar Candidato' : 'Nuevo Candidato')
              : 'Detalle del Candidato'
            }
          </h2>
          <button className="modal-close" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Info del candidato en modo ver */}
            {candidato && !modoEdicion && (
              <div className="candidato-detail-header">
                <div className="detail-avatar">
                  {candidato.nombres?.charAt(0)}{candidato.apellido_paterno?.charAt(0)}
                </div>
                <div className="detail-info">
                  <h3>{candidato.nombres} {candidato.apellido_paterno} {candidato.apellido_materno}</h3>
                  <p>{candidato.cargo_postulado}</p>
                  <span className="detail-estado">{getEstadoLabel(candidato.estado)}</span>
                </div>
              </div>
            )}

            <div className="form-grid">
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
                <label>Email *</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  disabled={!modoEdicion} required />
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange}
                  disabled={!modoEdicion} />
              </div>
              <div className="form-group">
                <label>Ciudad</label>
                <input type="text" name="ciudad" value={formData.ciudad} onChange={handleChange}
                  disabled={!modoEdicion} />
              </div>
              <div className="form-group">
                <label>Cargo Postulado *</label>
                <input type="text" name="cargo_postulado" value={formData.cargo_postulado}
                  onChange={handleChange} disabled={!modoEdicion} required />
              </div>
              <div className="form-group">
                <label>Fuente</label>
                <select name="fuente" value={formData.fuente} onChange={handleChange} disabled={!modoEdicion}>
                  <option value="portal_empleo">Portal de Empleo</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="referido">Referido</option>
                  <option value="web">Página Web</option>
                  <option value="agencia">Agencia</option>
                  <option value="feria_laboral">Feria Laboral</option>
                  <option value="espontaneo">Espontáneo</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="form-group">
                <label>Título Profesional</label>
                <input type="text" name="titulo_profesional" value={formData.titulo_profesional}
                  onChange={handleChange} disabled={!modoEdicion} />
              </div>
              <div className="form-group">
                <label>Años de Experiencia</label>
                <input type="number" name="años_experiencia" value={formData.años_experiencia}
                  onChange={handleChange} min="0" disabled={!modoEdicion} />
              </div>
              <div className="form-group">
                <label>Expectativa Salarial</label>
                <input type="number" name="expectativa_salarial" value={formData.expectativa_salarial}
                  onChange={handleChange} disabled={!modoEdicion} />
              </div>
              <div className="form-group">
                <label>Disponibilidad</label>
                <select name="disponibilidad_inicio" value={formData.disponibilidad_inicio}
                  onChange={handleChange} disabled={!modoEdicion}>
                  <option value="inmediata">Inmediata</option>
                  <option value="15_dias">15 días</option>
                  <option value="1_mes">1 mes</option>
                  <option value="2_meses">2 meses</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="form-group">
                <label>URL CV</label>
                <input type="url" name="cv_url" value={formData.cv_url} onChange={handleChange}
                  disabled={!modoEdicion} placeholder="https://..." />
              </div>
              <div className="form-group">
                <label>LinkedIn</label>
                <input type="url" name="linkedin_url" value={formData.linkedin_url} onChange={handleChange}
                  disabled={!modoEdicion} placeholder="https://linkedin.com/in/..." />
              </div>
              <div className="form-group col-span-2">
                <label>Notas</label>
                <textarea name="notas" value={formData.notas} onChange={handleChange}
                  rows={3} disabled={!modoEdicion} />
              </div>
            </div>

            {/* Evaluaciones (solo en modo ver) */}
            {candidato && !modoEdicion && candidato.evaluaciones?.length > 0 && (
              <div className="evaluaciones-section">
                <h4>Evaluaciones</h4>
                {candidato.evaluaciones.map((ev, idx) => (
                  <div key={idx} className="evaluacion-item">
                    <span className="ev-etapa">{ev.etapa}</span>
                    <span className="ev-puntuacion">{ev.puntuacion}/5</span>
                    <span className="ev-recomendacion">{ev.recomendacion}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="modal-footer">
            {candidato && !modoEdicion && (
              <button type="button" className="btn-secondary" onClick={() => setModoEdicion(true)}>
                <i className="bi bi-pencil"></i> Editar
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={onClose}>
              {modoEdicion ? 'Cancelar' : 'Cerrar'}
            </button>
            {modoEdicion && (
              <button type="submit" className="btn-primary">
                <i className="bi bi-check-lg"></i>
                {candidato ? 'Guardar Cambios' : 'Crear Candidato'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReclutamientoSection;


