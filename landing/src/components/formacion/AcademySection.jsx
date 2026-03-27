import React, { useState, useEffect } from 'react';
import './AcademySection.css';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005/api';
const AcademySection = () => {
const [cursos, setCursos] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
const [resumen, setResumen] = useState(null);
const [colaboradores, setColaboradores] = useState([]);
const [filtroCategoria, setFiltroCategoria] = useState('');
const [filtroNivel, setFiltroNivel] = useState('');
const [modalAbierto, setModalAbierto] = useState(false);
const [cursoSeleccionado, setCursoSeleccionado] = useState(null);
const [modoEdicion, setModoEdicion] = useState(false);
const getHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
'Content-Type': 'application/json'
});
useEffect(() => {
cargarCursos();
cargarResumen();
cargarColaboradores();
}, [filtroCategoria, filtroNivel]);
const cargarCursos = async () => {
try {
setLoading(true);
const params = new URLSearchParams();
if (filtroCategoria) params.append('categoria', filtroCategoria);
if (filtroNivel) params.append('nivel', filtroNivel);
params.append('estado', 'activo');
  const response = await fetch(`${API_URL}/academy/cursos?${params}`, { headers: getHeaders() });
  if (!response.ok) throw new Error('Error al cargar cursos');
  const data = await response.json();
  setCursos(data.data || []);
} catch (err) {
  setError(err.message);
} finally {
  setLoading(false);
}
};
const cargarResumen = async () => {
try {
const response = await fetch(`${API_URL}/academy/resumen`, { headers: getHeaders() });
if (response.ok) {
const data = await response.json();
setResumen(data.data);
}
} catch (err) {
console.error('Error:', err);
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
setCursoSeleccionado(null);
setModoEdicion(true);
setModalAbierto(true);
};
const abrirModalVer = async (id) => {
try {
const response = await fetch(`${API_URL}/academy/cursos/${id}`, { headers: getHeaders() });
if (response.ok) {
const data = await response.json();
setCursoSeleccionado(data.data);
setModoEdicion(false);
setModalAbierto(true);
}
} catch (err) {
console.error('Error:', err);
}
};
const cerrarModal = () => {
setModalAbierto(false);
setCursoSeleccionado(null);
};
const guardarCurso = async (datos) => {
try {
const url = cursoSeleccionado
? `${API_URL}/academy/cursos/${cursoSeleccionado._id}`
: `${API_URL}/academy/cursos`;
  const response = await fetch(url, {
    method: cursoSeleccionado ? 'PUT' : 'POST',
    headers: getHeaders(),
    body: JSON.stringify(datos)
  });

  if (!response.ok) throw new Error('Error al guardar');
  cerrarModal();
  cargarCursos();
  cargarResumen();
} catch (err) {
  alert(err.message);
}
};
const eliminarCurso = async (id) => {
if (!confirm('¿Eliminar este curso?')) return;
try {
await fetch(`${API_URL}/academy/cursos/${id}`, { method: 'DELETE', headers: getHeaders() });
cargarCursos();
cargarResumen();
} catch (err) {
alert(err.message);
}
};
const getCategoriaLabel = (cat) => {
const labels = {
onboarding: 'Onboarding', tecnico: 'Técnico', liderazgo: 'Liderazgo',
ventas: 'Ventas', servicio_cliente: 'Servicio al Cliente', seguridad: 'Seguridad',
compliance: 'Compliance', desarrollo_personal: 'Desarrollo Personal', otro: 'Otro'
};
return labels[cat] || cat;
};
const getNivelBadge = (nivel) => {
const config = {
basico: { clase: 'badge-success', label: 'Básico' },
intermedio: { clase: 'badge-warning', label: 'Intermedio' },
avanzado: { clase: 'badge-danger', label: 'Avanzado' }
};
return config[nivel] || { clase: 'badge-secondary', label: nivel };
};
if (loading && cursos.length === 0) {
return (
<div className="academy-section">
<div className="loading-state">
<i className="bi bi-arrow-repeat spin"></i>
<p>Cargando cursos...</p>
</div>
</div>
);
}
return (
<div className="academy-section">
{/* Header */}
<div className="section-header">
<div className="header-content">
<div className="header-icon">
<i className="bi bi-mortarboard-fill"></i>
</div>
<div>
<h1>Shark Academy</h1>
<p>Plataforma de formación y desarrollo</p>
</div>
</div>
<button className="btn-primary" onClick={abrirModalNuevo}>
<i className="bi bi-plus-lg"></i>
Nuevo Curso
</button>
<button className="btn-danger" style={{marginLeft:'10px'}} onClick={async()=>{if(!window.confirm('¿Eliminar TODOS los cursos importados?'))return;try{const token=localStorage.getItem('authToken');const res=await fetch((import.meta.env.VITE_API_URL||'http://localhost:3005/api')+'/academy/importados',{method:'DELETE',headers:{Authorization:'Bearer '+token}});const json=await res.json();if(json.ok){alert(json.deleted+' registros eliminados');window.location.reload();}else{alert('Error: '+(json.error||'No se pudo limpiar'));}}catch(e){alert('Error: '+e.message);}}}>🗑️ Limpiar importados</button>
</div>
  {resumen && (
    <div className="resumen-cards">
      <div className="resumen-card">
        <div className="resumen-icon cursos"><i className="bi bi-book"></i></div>
        <div className="resumen-info">
          <span className="resumen-valor">{resumen.cursos_activos || 0}</span>
          <span className="resumen-label">Cursos Activos</span>
        </div>
      </div>
      <div className="resumen-card">
        <div className="resumen-icon inscripciones"><i className="bi bi-people"></i></div>
        <div className="resumen-info">
          <span className="resumen-valor">{resumen.total_inscripciones || 0}</span>
          <span className="resumen-label">Inscripciones</span>
        </div>
      </div>
      <div className="resumen-card">
        <div className="resumen-icon en-progreso"><i className="bi bi-hourglass-split"></i></div>
        <div className="resumen-info">
          <span className="resumen-valor">{resumen.en_progreso || 0}</span>
          <span className="resumen-label">En Progreso</span>
        </div>
      </div>
      <div className="resumen-card">
        <div className="resumen-icon completados"><i className="bi bi-trophy"></i></div>
        <div className="resumen-info">
          <span className="resumen-valor">{resumen.completado || 0}</span>
          <span className="resumen-label">Completados</span>
        </div>
      </div>
    </div>
  )}

  {/* Filtros */}
  <div className="filtros-section">
    <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="filtro-select">
      <option value="">Todas las categorías</option>
      <option value="onboarding">Onboarding</option>
      <option value="tecnico">Técnico</option>
      <option value="liderazgo">Liderazgo</option>
      <option value="ventas">Ventas</option>
      <option value="servicio_cliente">Servicio al Cliente</option>
      <option value="seguridad">Seguridad</option>
      <option value="compliance">Compliance</option>
    </select>
    <select value={filtroNivel} onChange={e => setFiltroNivel(e.target.value)} className="filtro-select">
      <option value="">Todos los niveles</option>
      <option value="basico">Básico</option>
      <option value="intermedio">Intermedio</option>
      <option value="avanzado">Avanzado</option>
    </select>
  </div>

  {/* Cursos Grid */}
  {error ? (
    <div className="error-state">
      <i className="bi bi-exclamation-triangle"></i>
      <p>{error}</p>
      <button onClick={cargarCursos} className="btn-retry">Reintentar</button>
    </div>
  ) : cursos.length === 0 ? (
    <div className="empty-state">
      <i className="bi bi-journal-x"></i>
      <h3>No hay cursos</h3>
      <p>Crea el primer curso para comenzar</p>
      <button className="btn-primary" onClick={abrirModalNuevo}>
        <i className="bi bi-plus-lg"></i>Nuevo Curso
      </button>
    </div>
  ) : (
    <div className="cursos-grid">
      {cursos.map(curso => {
        const nivelBadge = getNivelBadge(curso.nivel);
        return (
          <div key={curso._id} className="curso-card" onClick={() => abrirModalVer(curso._id)}>
            <div className="curso-imagen">
              {curso.imagen_url ? (
                <img src={curso.imagen_url} alt={curso.nombre} />
              ) : (
                <div className="curso-placeholder">
                  <i className="bi bi-book"></i>
                </div>
              )}
              <span className={`nivel-badge ${nivelBadge.clase}`}>{nivelBadge.label}</span>
            </div>
            <div className="curso-body">
              <span className="curso-categoria">{getCategoriaLabel(curso.categoria)}</span>
              <h4 className="curso-nombre">{curso.nombre}</h4>
              <p className="curso-descripcion">{curso.descripcion}</p>
              <div className="curso-meta">
                <span><i className="bi bi-clock"></i> {curso.duracion_horas}h</span>
                <span><i className="bi bi-display"></i> {curso.modalidad}</span>
              </div>
            </div>
            <div className="curso-footer" onClick={e => e.stopPropagation()}>
              <button className="btn-mini" title="Ver" onClick={() => abrirModalVer(curso._id)}>
                <i className="bi bi-eye"></i>
              </button>
              <button className="btn-mini danger" title="Eliminar" onClick={() => eliminarCurso(curso._id)}>
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
    <ModalCurso
      curso={cursoSeleccionado}
      modoEdicion={modoEdicion}
      onClose={cerrarModal}
      onSave={guardarCurso}
      setModoEdicion={setModoEdicion}
    />
  )}
</div>
);
};
// ============================================================================
// MODAL CURSO
// ============================================================================
const ModalCurso = ({ curso, modoEdicion, onClose, onSave, setModoEdicion }) => {
const [formData, setFormData] = useState({
nombre: '', descripcion: '', categoria: 'otro', nivel: 'basico',
duracion_horas: 1, modalidad: 'presencial', tiene_evaluacion: false,
puntaje_aprobacion: 70, otorga_certificado: true, estado: 'activo',
imagen_url: ''
});
useEffect(() => {
if (curso) {
setFormData({
nombre: curso.nombre || '',
descripcion: curso.descripcion || '',
categoria: curso.categoria || 'otro',
nivel: curso.nivel || 'basico',
duracion_horas: curso.duracion_horas || 1,
modalidad: curso.modalidad || 'presencial',
tiene_evaluacion: curso.tiene_evaluacion || false,
puntaje_aprobacion: curso.puntaje_aprobacion || 70,
otorga_certificado: curso.otorga_certificado !== false,
estado: curso.estado || 'activo',
imagen_url: curso.imagen_url || ''
});
}
}, [curso]);
const handleChange = (e) => {
const { name, value, type, checked } = e.target;
setFormData(prev => ({
...prev,
[name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) : value
}));
};
const handleSubmit = (e) => {
e.preventDefault();
if (!formData.nombre) { alert('El nombre es requerido'); return; }
onSave(formData);
};
return (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h2>{modoEdicion ? (curso ? 'Editar' : 'Nuevo') : 'Detalle del'} Curso</h2>
        <button className="modal-close" onClick={onClose}><i className="bi bi-x-lg"></i></button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          <label>Nombre del Curso *
            <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} disabled={!modoEdicion} required />
          </label>
          <label>Descripción
            <textarea name="descripcion" value={formData.descripcion} onChange={handleChange} rows={3} disabled={!modoEdicion} />
          </label>
          <label>Categoría
            <select name="categoria" value={formData.categoria} onChange={handleChange} disabled={!modoEdicion}>
              <option value="onboarding">Onboarding</option>
              <option value="tecnico">Técnico</option>
              <option value="liderazgo">Liderazgo</option>
              <option value="ventas">Ventas</option>
              <option value="servicio_cliente">Servicio al Cliente</option>
              <option value="seguridad">Seguridad</option>
              <option value="compliance">Compliance</option>
              <option value="desarrollo_personal">Desarrollo Personal</option>
              <option value="otro">Otro</option>
            </select>
          </label>
          <label>Nivel
            <select name="nivel" value={formData.nivel} onChange={handleChange} disabled={!modoEdicion}>
              <option value="basico">Básico</option>
              <option value="intermedio">Intermedio</option>
              <option value="avanzado">Avanzado</option>
            </select>
          </label>
          <label>Duración (horas)
            <input type="number" name="duracion_horas" value={formData.duracion_horas} onChange={handleChange} min="0.5" step="0.5" disabled={!modoEdicion} />
          </label>
          <label>Modalidad
            <select name="modalidad" value={formData.modalidad} onChange={handleChange} disabled={!modoEdicion}>
              <option value="presencial">Presencial</option>
              <option value="online">Online</option>
              <option value="mixto">Mixto</option>
            </select>
          </label>
          <label className="checkbox-label">
            <input type="checkbox" name="tiene_evaluacion" checked={formData.tiene_evaluacion} onChange={handleChange} disabled={!modoEdicion} />
            <span>Tiene Evaluación</span>
          </label>
          <label className="checkbox-label">
            <input type="checkbox" name="otorga_certificado" checked={formData.otorga_certificado} onChange={handleChange} disabled={!modoEdicion} />
            <span>Otorga Certificado</span>
          </label>
          {formData.tiene_evaluacion && (
            <label>Puntaje Aprobación (%)
              <input type="number" name="puntaje_aprobacion" value={formData.puntaje_aprobacion} onChange={handleChange} min="0" max="100" disabled={!modoEdicion} />
            </label>
          )}
          <label>URL Imagen
            <input type="url" name="imagen_url" value={formData.imagen_url} onChange={handleChange} placeholder="https://..." disabled={!modoEdicion} />
          </label>
        </div>
        <div className="modal-footer">
          {curso && !modoEdicion && (
            <button type="button" className="btn-secondary" onClick={() => setModoEdicion(true)}>
              <i className="bi bi-pencil"></i> Editar
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={onClose}>{modoEdicion ? 'Cancelar' : 'Cerrar'}</button>
          {modoEdicion && (
            <button type="submit" className="btn-primary">
              <i className="bi bi-check-lg"></i> {curso ? 'Guardar' : 'Crear Curso'}
            </button>
          )}
        </div>
      </form>
    </div>
  </div>
);
};
export default AcademySection;









