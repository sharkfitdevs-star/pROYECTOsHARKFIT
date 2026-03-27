import React, { useState, useEffect } from 'react';
import DataTable from '../ui/DataTable';
import './InventarioStyles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const InventarioSection = () => {
  const [inventario, setInventario] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ productoId: '', tipo: 'entrada', cantidad: '', motivo: '', sede: '' });
  const [saving, setSaving] = useState(false);
  const [productosDisponibles, setProductosDisponibles] = useState([]);

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

  const cargarProductosParaSelect = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_URL}/inventario/productos`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setProductosDisponibles(data.success ? (data.data || []) : []);
    } catch (err) { console.error(err); }
  };

  const handleSave = async () => {
    if (!formData.productoId || !formData.cantidad) return alert('Producto y cantidad son obligatorios');
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`${API_URL}/inventario/stock/ajuste`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...formData, cantidad: Number(formData.cantidad) })
      });
      setShowModal(false);
      setFormData({ productoId: '', tipo: 'entrada', cantidad: '', motivo: '', sede: '' });
      cargarInventario();
    } catch (err) { console.error(err); alert('Error al guardar ajuste'); }
    finally { setSaving(false); }
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
          <button className="btn-primary" onClick={() => { setShowModal(true); cargarProductosParaSelect(); }}>
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
        <div className="sf-empty">
          <i className="bi bi-boxes"></i>
          <h3>Sin registros de inventario</h3>
          <p>Agrega productos y registra su stock</p>
        </div>
        ) : (
          <DataTable
            columns={[
              { key: 'producto', label: 'Producto', render: (v, row) => row.producto?.nombre || '-' },
              { key: 'sku', label: 'SKU', render: (v, row) => row.producto?.sku || '-' },
              { key: 'sede', label: 'Sede', render: (v, row) => row.sede?.nombre || '-' },
              { key: 'cantidad_actual', label: 'Stock Actual', render: (v) => v, className: 'text-center' },
              { key: 'stock_minimo', label: 'Mínimo', render: (v) => v, className: 'text-center' },
              { key: 'stock_maximo', label: 'Máximo', render: (v) => v, className: 'text-center' },
              { key: 'estado', label: 'Estado', render: (v, row) => {
                  const status = getStockStatus(row);
                  return <span className={`sf-badge ${status.label?.toLowerCase()}`}>{status.label}</span>;
                }
              },
            ]}
            data={inventario}
            loading={loading}
            error={error}
            emptyMessage="Sin registros de inventario"
            emptyIcon="bi-boxes"
            actions={(row) => (
              <>
                <button className="sf-btn-action" title="Ajustar">
                  <i className="bi bi-pencil"></i>
                </button>
                <button className="sf-btn-action" title="Historial">
                  <i className="bi bi-clock-history"></i>
                </button>
              </>
            )}
          />
        )}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Ajuste de Stock</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <label>Producto *
                <select value={formData.productoId} onChange={e => setFormData({...formData, productoId: e.target.value})}>
                  <option value="">Seleccionar producto</option>
                  {productosDisponibles.map(p => <option key={p._id} value={p._id}>{p.nombre} ({p.sku})</option>)}
                </select>
              </label>
              <label>Tipo de ajuste *
                <select value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
                  <option value="entrada">Entrada</option>
                  <option value="salida">Salida</option>
                  <option value="correccion">Corrección</option>
                </select>
              </label>
              <label>Cantidad *<input type="number" min="1" value={formData.cantidad} onChange={e => setFormData({...formData, cantidad: e.target.value})} /></label>
              <label>Motivo<input value={formData.motivo} onChange={e => setFormData({...formData, motivo: e.target.value})} placeholder="Ej: Compra proveedor, Merma, Inventario..." /></label>
              <label>Sede<input value={formData.sede} onChange={e => setFormData({...formData, sede: e.target.value})} placeholder="Ej: Sede central" /></label>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Aplicar Ajuste'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventarioSection;


