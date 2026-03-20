import React, { useState, useEffect } from 'react';
import './InventarioStyles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const InventarioSection = () => {
  const [inventario, setInventario] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    cargarInventario();
  }, []);

  const cargarInventario = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/inventario`, {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Error al cargar inventario');
      const data = await response.json();
      setInventario(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (item) => {
    if (item.cantidad_actual <= 0) return { class: 'stock-agotado', label: 'Agotado' };
    if (item.cantidad_actual <= item.stock_minimo) return { class: 'stock-bajo', label: 'Stock Bajo' };
    if (item.cantidad_actual >= item.stock_maximo * 0.9) return { class: 'stock-alto', label: 'Stock Alto' };
    return { class: 'stock-normal', label: 'Normal' };
  };

  if (loading) {
    return (
      <div className="inventario-section">
        <div className="loading-state">
          <i className="bi bi-arrow-repeat spin"></i>
          <p>Cargando inventario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inventario-section">
      <div className="section-header">
        <div>
          <h1>Control de Stock</h1>
          <p>Gestión de existencias por sede</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary">
            <i className="bi bi-arrow-repeat"></i>
            Actualizar
          </button>
          <button className="btn-primary">
            <i className="bi bi-plus"></i>
            Ajuste de Stock
          </button>
          <button className="btn-danger" style={{marginLeft:'10px'}} onClick={async()=>{if(!window.confirm('¿Eliminar TODO el stock importado?'))return;try{const token=localStorage.getItem('authToken');const res=await fetch((import.meta.env.VITE_API_URL||'http://localhost:3005/api')+'/inventario/stock/importados',{method:'DELETE',headers:{Authorization:'Bearer '+token}});const json=await res.json();if(json.ok){alert(json.deleted+' registros eliminados');window.location.reload();}else{alert('Error: '+(json.error||'No se pudo limpiar'));}}catch(e){alert('Error: '+e.message);}}}>🗑️ Limpiar importados</button>
        </div>
      </div>
      <div className="stats-row">
        <div className="stat-card">
          <i className="bi bi-boxes"></i>
          <div className="stat-info">
            <span className="stat-value">{inventario.length}</span>
            <span className="stat-label">Total Items</span>
          </div>
        </div>
        <div className="stat-card warning">
          <i className="bi bi-exclamation-triangle"></i>
          <div className="stat-info">
            <span className="stat-value">
              {inventario.filter(i => i.cantidad_actual <= i.stock_minimo).length}
            </span>
            <span className="stat-label">Stock Bajo</span>
          </div>
        </div>
        <div className="stat-card danger">
          <i className="bi bi-x-circle"></i>
          <div className="stat-info">
            <span className="stat-value">
              {inventario.filter(i => i.cantidad_actual <= 0).length}
            </span>
            <span className="stat-label">Agotados</span>
          </div>
        </div>
      </div>

      {error ? (
        <div className="error-state">
          <i className="bi bi-exclamation-triangle"></i>
          <p>{error}</p>
          <button onClick={cargarInventario}>Reintentar</button>
        </div>
      ) : inventario.length === 0 ? (
        <div className="empty-state">
          <i className="bi bi-boxes"></i>
          <h3>Sin registros de inventario</h3>
          <p>Agrega productos y registra su stock</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Sede</th>
                <th>Stock Actual</th>
                <th>Mínimo</th>
                <th>Máximo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {inventario.map(item => {
                const status = getStockStatus(item);
                return (
                  <tr key={item._id}>
                    <td>{item.producto?.nombre || '-'}</td>
                    <td>{item.producto?.sku || '-'}</td>
                    <td>{item.sede?.nombre || '-'}</td>
                    <td className="text-center">{item.cantidad_actual}</td>
                    <td className="text-center">{item.stock_minimo}</td>
                    <td className="text-center">{item.stock_maximo}</td>
                    <td>
                      <span className={`status-badge ${status.class}`}>
                        {status.label}
                      </span>
                    </td>
                    <td>
                      <button className="btn-icon" title="Ajustar">
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn-icon" title="Historial">
                        <i className="bi bi-clock-history"></i>
                      </button>
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

export default InventarioSection;


