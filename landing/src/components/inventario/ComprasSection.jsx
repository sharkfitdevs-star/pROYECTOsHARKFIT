import React, { useState, useEffect } from 'react';
import './InventarioStyles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const ComprasSection = () => {
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('');

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    cargarCompras();
  }, []);

  const cargarCompras = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/inventario/compras`, {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Error al cargar compras');
      const data = await response.json();
      setCompras(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoInfo = (estado) => {
    const estados = {
      'borrador': { class: 'estado-borrador', label: 'Borrador' },
      'pendiente': { class: 'estado-pendiente', label: 'Pendiente' },
      'aprobada': { class: 'estado-aprobada', label: 'Aprobada' },
      'recibida': { class: 'estado-recibida', label: 'Recibida' },
      'cancelada': { class: 'estado-cancelada', label: 'Cancelada' }
    };
    return estados[estado] || estados['borrador'];
  };

  const formatMonto = (monto) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(monto || 0);
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-CL');
  };

  const comprasFiltradas = compras.filter(c => 
    !filtroEstado || c.estado === filtroEstado
  );

  const totalCompras = compras.reduce((sum, c) => sum + (c.total || 0), 0);

  if (loading) {
    return (
      <div className="inventario-section">
        <div className="loading-state">
          <i className="bi bi-arrow-repeat spin"></i>
          <p>Cargando compras...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inventario-section">
      <div className="section-header">
        <div>
          <h1>Órdenes de Compra</h1>
          <p>Gestión de compras a proveedores</p>
        </div>
        <button className="btn-primary">
          <i className="bi bi-plus"></i>
          Nueva Orden
        </button>
        <button className="btn-danger" style={{marginLeft:'10px'}} onClick={async()=>{if(!window.confirm('¿Eliminar TODAS las compras importadas?'))return;try{const token=localStorage.getItem('authToken');const res=await fetch((import.meta.env.VITE_API_URL||'http://localhost:3005/api')+'/inventario/compras/importados',{method:'DELETE',headers:{Authorization:'Bearer '+token}});const json=await res.json();if(json.ok){alert(json.deleted+' compras eliminadas');window.location.reload();}else{alert('Error: '+(json.error||'No se pudo limpiar'));}}catch(e){alert('Error: '+e.message);}}}>🗑️ Limpiar importados</button>
      </div>
      <div className="stats-row">
        <div className="stat-card">
          <i className="bi bi-cart"></i>
          <div className="stat-info">
            <span className="stat-value">{compras.length}</span>
            <span className="stat-label">Total Órdenes</span>
          </div>
        </div>
        <div className="stat-card warning">
          <i className="bi bi-clock"></i>
          <div className="stat-info">
            <span className="stat-value">
              {compras.filter(c => c.estado === 'pendiente').length}
            </span>
            <span className="stat-label">Pendientes</span>
          </div>
        </div>
        <div className="stat-card success">
          <i className="bi bi-check-circle"></i>
          <div className="stat-info">
            <span className="stat-value">
              {compras.filter(c => c.estado === 'recibida').length}
            </span>
            <span className="stat-label">Recibidas</span>
          </div>
        </div>
        <div className="stat-card primary">
          <i className="bi bi-cash-stack"></i>
          <div className="stat-info">
            <span className="stat-value">{formatMonto(totalCompras)}</span>
            <span className="stat-label">Total Comprado</span>
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
          <option value="borrador">Borrador</option>
          <option value="pendiente">Pendiente</option>
          <option value="aprobada">Aprobada</option>
          <option value="recibida">Recibida</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      {error ? (
        <div className="error-state">
          <i className="bi bi-exclamation-triangle"></i>
          <p>{error}</p>
          <button onClick={cargarCompras}>Reintentar</button>
        </div>
      ) : comprasFiltradas.length === 0 ? (
        <div className="empty-state">
          <i className="bi bi-cart"></i>
          <h3>No hay órdenes de compra</h3>
          <p>Crea órdenes de compra para tus proveedores</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>N° Orden</th>
                <th>Fecha</th>
                <th>Proveedor</th>
                <th>Items</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {comprasFiltradas.map(compra => {
                const estadoInfo = getEstadoInfo(compra.estado);
                return (
                  <tr key={compra._id}>
                    <td className="font-mono">#{compra.numero || compra._id?.slice(-6)}</td>
                    <td>{formatFecha(compra.fecha)}</td>
                    <td>{compra.proveedor?.nombre || '-'}</td>
                    <td className="text-center">{compra.items?.length || 0}</td>
                    <td className="text-right font-mono">{formatMonto(compra.total)}</td>
                    <td>
                      <span className={`status-badge ${estadoInfo.class}`}>
                        {estadoInfo.label}
                      </span>
                    </td>
                    <td>
                      <button className="btn-icon" title="Ver detalle">
                        <i className="bi bi-eye"></i>
                      </button>
                      <button className="btn-icon" title="Editar">
                        <i className="bi bi-pencil"></i>
                      </button>
                      {compra.estado === 'aprobada' && (
                        <button className="btn-icon success" title="Marcar recibida">
                          <i className="bi bi-check-circle"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ComprasSection;

