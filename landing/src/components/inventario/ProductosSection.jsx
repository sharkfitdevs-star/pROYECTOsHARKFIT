import React, { useState, useEffect } from 'react';
import './InventarioStyles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const ProductosSection = () => {
  console.log('>>> ProductosSection RENDERIZADO');
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json'
  });

  useEffect(() => {
    console.log('>>> ProductosSection useEffect - llamando cargarProductos');
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/inventario/productos`, {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Error al cargar productos');
      const data = await response.json();
      setProductos(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const productosFiltrados = productos.filter(p => {
    const matchBusqueda = p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
                          p.sku?.toLowerCase().includes(busqueda.toLowerCase());
    const matchCategoria = !categoriaFiltro || p.categoria === categoriaFiltro;
    return matchBusqueda && matchCategoria;
  });

  const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))];

  const formatMonto = (monto) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(monto || 0);
  };

  if (loading) {
    console.log('>>> ProductosSection - Estado: LOADING');
    return (
      <div className="inventario-section">
        <div className="loading-state">
          <i className="bi bi-arrow-repeat spin"></i>
          <p>Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inventario-section">
      <div className="section-header">
        <div>
          <h1>Productos</h1>
          <p>Catálogo de productos del inventario</p>
        </div>
        <button className="btn-primary">
          <i className="bi bi-plus"></i>
          Nuevo Producto
        </button>
        <button className="btn-danger" style={{marginLeft:'10px'}} onClick={async()=>{if(!window.confirm('¿Eliminar TODOS los productos importados?'))return;try{const token=localStorage.getItem('authToken');const res=await fetch((import.meta.env.VITE_API_URL||'http://localhost:3005/api')+'/inventario/productos/importados',{method:'DELETE',headers:{Authorization:'Bearer '+token}});const json=await res.json();if(json.ok){alert(json.deleted+' productos eliminados');window.location.reload();}else{alert('Error: '+(json.error||'No se pudo limpiar'));}}catch(e){alert('Error: '+e.message);}}}>🗑️ Limpiar importados</button>
      </div>
      <div className="sf-filters">
        <div className="search-input">
          <i className="bi bi-search"></i>
          <input
            type="text"
            placeholder="Buscar por nombre o SKU..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="sf-search"
          />
        </div>
        <select 
          value={categoriaFiltro} 
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className="sf-filter-select"
        >
          <option value="">Todas las categorías</option>
          {categorias.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="error-state">
          <i className="bi bi-exclamation-triangle"></i>
          <p>{error}</p>
          <button onClick={cargarProductos}>Reintentar</button>
        </div>
      ) : productosFiltrados.length === 0 ? (
        <div className="sf-empty">
          <i className="bi bi-box"></i>
          <h3>No hay productos</h3>
          <p>Agrega productos al catálogo para comenzar</p>
        </div>
      ) : (
        <div className="productos-grid">
          {productosFiltrados.map(producto => (
            <div key={producto._id} className="producto-card">
              <div className="producto-img">
                {producto.imagen ? (
                  <img src={producto.imagen} alt={producto.nombre} />
                ) : (
                  <i className="bi bi-box"></i>
                )}
              </div>
              <div className="producto-info">
                <h3>{producto.nombre}</h3>
                <span className="producto-sku">{producto.sku}</span>
                <span className="producto-categoria">{producto.categoria}</span>
              </div>
              <div className="producto-precio">
                {formatMonto(producto.precio_venta)}
              </div>
              <div className="producto-stock">
                <span className={producto.stock_actual <= producto.stock_minimo ? 'stock-bajo' : ''}>
                  {producto.stock_actual || 0} unidades
                </span>
              </div>
              <div className="producto-actions">
                <button className="btn-icon" title="Editar">
                  <i className="bi bi-pencil"></i>
                </button>
                <button className="btn-icon" title="Ver detalle">
                  <i className="bi bi-eye"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductosSection;

