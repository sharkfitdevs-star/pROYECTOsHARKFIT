import React, { useState, useEffect } from 'react';
import './InventarioStyles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const ProveedoresSection = () => {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    cargarProveedores();
  }, []);

  const cargarProveedores = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/inventario/proveedores`, {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Error al cargar proveedores');
      const data = await response.json();
      setProveedores(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const proveedoresFiltrados = proveedores.filter(p =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.rut?.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (loading) {
    return (
      <div className="inventario-section">
        <div className="loading-state">
          <i className="bi bi-arrow-repeat spin"></i>
          <p>Cargando proveedores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inventario-section">
      <div className="section-header">
        <div>
          <h1>Proveedores</h1>
          <p>Gestión de proveedores y contactos</p>
        </div>
        <button className="btn-primary">
          <i className="bi bi-plus"></i>
          Nuevo Proveedor
        </button>
        <button className="btn-danger" style={{marginLeft:'10px'}} onClick={async()=>{if(!window.confirm('¿Eliminar TODOS los proveedores importados?'))return;try{const token=localStorage.getItem('authToken');const res=await fetch((import.meta.env.VITE_API_URL||'http://localhost:3005/api')+'/inventario/proveedores/importados',{method:'DELETE',headers:{Authorization:'Bearer '+token}});const json=await res.json();if(json.ok){alert(json.deleted+' proveedores eliminados');window.location.reload();}else{alert('Error: '+(json.error||'No se pudo limpiar'));}}catch(e){alert('Error: '+e.message);}}}>🗑️ Limpiar importados</button>
      </div>
      <div className="filtros-bar">
        <div className="search-input">
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder="Buscar por nombre o RUT..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {error ? (
        <div className="error-state">
          <i className="bi bi-exclamation-triangle"></i>
          <p>{error}</p>
          <button onClick={cargarProveedores}>Reintentar</button>
        </div>
      ) : proveedoresFiltrados.length === 0 ? (
        <div className="empty-state">
          <i className="bi bi-truck"></i>
          <h3>No hay proveedores</h3>
          <p>Registra tus proveedores para gestionar compras</p>
        </div>
      ) : (
        <div className="cards-grid">
          {proveedoresFiltrados.map(proveedor => (
            <div key={proveedor._id} className="proveedor-card">
              <div className="proveedor-header">
                <div className="proveedor-avatar">
                  <i className="bi bi-building"></i>
                </div>
                <div className="proveedor-info">
                  <h3>{proveedor.nombre}</h3>
                  <span className="proveedor-rut">{proveedor.rut}</span>
                </div>
                <span className={`status-badge ${proveedor.activo ? 'activo' : 'inactivo'}`}>
                  {proveedor.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              
              <div className="proveedor-contacto">
                {proveedor.email && (
                  <div className="contacto-item">
                    <i className="bi bi-envelope"></i>
                    <span>{proveedor.email}</span>
                  </div>
                )}
                {proveedor.telefono && (
                  <div className="contacto-item">
                    <i className="bi bi-telephone"></i>
                    <span>{proveedor.telefono}</span>
                  </div>
                )}
                {proveedor.direccion && (
                  <div className="contacto-item">
                    <i className="bi bi-geo-alt"></i>
                    <span>{proveedor.direccion}</span>
                  </div>
                )}
              </div>
              
              <div className="proveedor-actions">
                <button className="btn-icon" title="Editar">
                  <i className="bi bi-pencil"></i>
                </button>
                <button className="btn-icon" title="Ver compras">
                  <i className="bi bi-cart"></i>
                </button>
                <button className="btn-icon" title="Contactar">
                  <i className="bi bi-chat"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProveedoresSection;

