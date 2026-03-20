import React, { useState, useEffect } from 'react';
import './InventarioStyles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const EntregasSection = () => {
  const [entregas, setEntregas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('');

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    cargarEntregas();
  }, []);

  const cargarEntregas = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/inventario/entregas`, {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Error al cargar entregas');
      const data = await response.json();
      setEntregas(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoInfo = (estado) => {
    const estados = {
      'pendiente': { class: 'estado-pendiente', label: 'Pendiente', icon: 'bi-clock' },
      'en_transito': { class: 'estado-transito', label: 'En Tránsito', icon: 'bi-truck' },
      'entregado': { class: 'estado-entregado', label: 'Entregado', icon: 'bi-check-circle' },
      'cancelado': { class: 'estado-cancelado', label: 'Cancelado', icon: 'bi-x-circle' }
    };
    return estados[estado] || estados['pendiente'];
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const entregasFiltradas = entregas.filter(e => 
    !filtroEstado || e.estado === filtroEstado
  );

  if (loading) {
    return (
      <div className="inventario-section">
        <div className="loading-state">
          <i className="bi bi-arrow-repeat spin"></i>
          <p>Cargando entregas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inventario-section">
      <div className="section-header">
        <div>
          <h1>Entregas</h1>
          <p>Seguimiento de entregas de mercadería</p>
        </div>
        <button className="btn-primary">
          <i className="bi bi-plus"></i>
          Nueva Entrega
        </button>
        <button className="btn-danger" style={{marginLeft:'10px'}} onClick={async()=>{if(!window.confirm('¿Eliminar TODAS las entregas importadas?'))return;try{const token=localStorage.getItem('authToken');const res=await fetch((import.meta.env.VITE_API_URL||'http://localhost:3005/api')+'/inventario/entregas/importados',{method:'DELETE',headers:{Authorization:'Bearer '+token}});const json=await res.json();if(json.ok){alert(json.deleted+' entregas eliminadas');window.location.reload();}else{alert('Error: '+(json.error||'No se pudo limpiar'));}}catch(e){alert('Error: '+e.message);}}}>🗑️ Limpiar importados</button>
      </div>
      <div className="stats-row">
        <div className="stat-card">
          <i className="bi bi-box-seam"></i>
          <div className="stat-info">
            <span className="stat-value">{entregas.length}</span>
            <span className="stat-label">Total</span>
          </div>
        </div>
        <div className="stat-card warning">
          <i className="bi bi-clock"></i>
          <div className="stat-info">
            <span className="stat-value">
              {entregas.filter(e => e.estado === 'pendiente').length}
            </span>
            <span className="stat-label">Pendientes</span>
          </div>
        </div>
        <div className="stat-card info">
          <i className="bi bi-truck"></i>
          <div className="stat-info">
            <span className="stat-value">
              {entregas.filter(e => e.estado === 'en_transito').length}
            </span>
            <span className="stat-label">En Tránsito</span>
          </div>
        </div>
        <div className="stat-card success">
          <i className="bi bi-check-circle"></i>
          <div className="stat-info">
            <span className="stat-value">
              {entregas.filter(e => e.estado === 'entregado').length}
            </span>
            <span className="stat-label">Entregados</span>
          </div>
        </div>
      </div>

      <div className="filtros-bar">
        <select 
          value={filtroEstado} 
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="filtro-select"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="en_transito">En Tránsito</option>
          <option value="entregado">Entregado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {error ? (
        <div className="error-state">
          <i className="bi bi-exclamation-triangle"></i>
          <p>{error}</p>
          <button onClick={cargarEntregas}>Reintentar</button>
        </div>
      ) : entregasFiltradas.length === 0 ? (
        <div className="empty-state">
          <i className="bi bi-box-seam"></i>
          <h3>No hay entregas</h3>
          <p>Registra entregas de mercadería</p>
        </div>
      ) : (
        <div className="entregas-list">
          {entregasFiltradas.map(entrega => {
            const estadoInfo = getEstadoInfo(entrega.estado);
            return (
              <div key={entrega._id} className="entrega-card">
                <div className="entrega-header">
                  <div className="entrega-numero">
                    <span className="numero">#{entrega.numero || entrega._id?.slice(-6)}</span>
                    <span className="fecha">{formatFecha(entrega.fecha_entrega)}</span>
                  </div>
                  <span className={`status-badge ${estadoInfo.class}`}>
                    <i className={`bi ${estadoInfo.icon}`}></i>
                    {estadoInfo.label}
                  </span>
                </div>
                
                <div className="entrega-body">
                  <div className="entrega-info">
                    <div className="info-item">
                      <i className="bi bi-building"></i>
                      <span>{entrega.proveedor?.nombre || 'Sin proveedor'}</span>
                    </div>
                    <div className="info-item">
                      <i className="bi bi-geo-alt"></i>
                      <span>{entrega.sede?.nombre || 'Sin sede'}</span>
                    </div>
                    <div className="info-item">
                      <i className="bi bi-boxes"></i>
                      <span>{entrega.items?.length || 0} productos</span>
                    </div>
                  </div>
                </div>
                
                <div className="entrega-actions">
                  <button className="btn-icon" title="Ver detalle">
                    <i className="bi bi-eye"></i>
                  </button>
                  {entrega.estado === 'pendiente' && (
                    <button className="btn-icon success" title="Marcar en tránsito">
                      <i className="bi bi-truck"></i>
                    </button>
                  )}
                  {entrega.estado === 'en_transito' && (
                    <button className="btn-icon success" title="Confirmar entrega">
                      <i className="bi bi-check-circle"></i>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EntregasSection;

