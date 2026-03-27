import React, { useState, useEffect } from 'react';
import DataTable from '../ui/DataTable';
import './InventarioStyles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';


const ComprasSection = () => {
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('');

  // ESTADOS PARA EL MODAL DE NUEVA ORDEN
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    proveedor: '',
    fecha: new Date().toISOString().split('T')[0],
    items: '',
    montoTotal: '',
    estado: 'pendiente',
    notas: '',
    formaPago: 'transferencia'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!formData.proveedor.trim()) {
      alert('El proveedor es obligatorio');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/inventario/compras`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error('Error al guardar');
      setShowModal(false);
      setFormData({
        proveedor: '',
        fecha: new Date().toISOString().split('T')[0],
        items: '',
        montoTotal: '',
        estado: 'pendiente',
        notas: '',
        formaPago: 'transferencia'
      });
      cargarCompras && cargarCompras();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar la orden de compra');
    } finally {
      setSaving(false);
    }
  };

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
        <button className="btn-primary" onClick={() => setShowModal(true)}>
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
          <DataTable
            columns={[
              { key: 'numero', label: 'N° Orden', render: (v, row) => `#${row.numero || row._id?.slice(-6)}` },
              { key: 'fecha', label: 'Fecha', render: (v, row) => formatFecha(row.fecha) },
              { key: 'proveedor', label: 'Proveedor', render: (v, row) => row.proveedor?.nombre || '-' },
              { key: 'items', label: 'Items', render: (v, row) => row.items?.length || 0, className: 'text-center' },
              { key: 'total', label: 'Total', render: (v, row) => formatMonto(row.total), className: 'text-right font-mono' },
              { key: 'estado', label: 'Estado', render: (v, row) => {
                  const estadoInfo = getEstadoInfo(row.estado);
                  return <span className={`status-badge ${estadoInfo.class}`}>{estadoInfo.label}</span>;
                }
              },
            ]}
            data={comprasFiltradas}
            loading={loading}
            error={error}
            emptyMessage="No hay órdenes de compra"
            emptyIcon="bi-cart"
            actions={(row) => (
              <>
                <button className="btn-icon" title="Ver detalle">
                  <i className="bi bi-eye"></i>
                </button>
                <button className="btn-icon" title="Editar">
                  <i className="bi bi-pencil"></i>
                </button>
                {row.estado === 'aprobada' && (
                  <button className="btn-icon success" title="Marcar recibida">
                    <i className="bi bi-check-circle"></i>
                  </button>
                )}
              </>
            )}
          />
        )}
      {/* MODAL NUEVA ORDEN DE COMPRA */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nueva Orden de Compra</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Proveedor *</label>
                <input type="text" name="proveedor" value={formData.proveedor} onChange={handleChange} placeholder="Nombre del proveedor" />
              </div>
              <div className="form-group">
                <label>Fecha</label>
                <input type="date" name="fecha" value={formData.fecha} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Monto Total</label>
                <input type="number" name="montoTotal" value={formData.montoTotal} onChange={handleChange} placeholder="0" />
              </div>
              <div className="form-group">
                <label>Forma de Pago</label>
                <select name="formaPago" value={formData.formaPago} onChange={handleChange}>
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="cheque">Cheque</option>
                  <option value="credito">Crédito 30 días</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="form-group">
                <label>Estado</label>
                <select name="estado" value={formData.estado} onChange={handleChange}>
                  <option value="pendiente">Pendiente</option>
                  <option value="aprobada">Aprobada</option>
                  <option value="en_proceso">En Proceso</option>
                  <option value="completada">Completada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
              <div className="form-group">
                <label>Items / Detalle</label>
                <textarea name="items" value={formData.items} onChange={handleChange} placeholder="Detalle de productos..." rows="3" />
              </div>
              <div className="form-group">
                <label>Notas</label>
                <textarea name="notas" value={formData.notas} onChange={handleChange} placeholder="Observaciones..." rows="2" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Orden'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComprasSection;

