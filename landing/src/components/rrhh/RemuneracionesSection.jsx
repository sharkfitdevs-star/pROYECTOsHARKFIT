import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../ui/DataTable';
import RemuneracionesService from '../../api/services/RemuneracionesService';
import './RemuneracionesSection.css';

const RemuneracionesSection = () => {
    // Función para generar un nuevo período de remuneraciones
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const getHeaders = () => ({
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      'Content-Type': 'application/json'
    });
    // Prompt D: Modal informativo en vez de POST
    const [showInfoModal, setShowInfoModal] = useState(false);
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('liquidaciones');
  
  // Filtros
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth() + 1);
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());
  const [estadoFiltro, setEstadoFiltro] = useState('');
  
  // Modal

  // Funciones faltantes agregadas como stubs
  const handleVerDetalle = (id) => {
    console.log('handleVerDetalle llamada', id);
    // Implementación real pendiente
  };

  const handleAprobar = (id) => {
    console.log('handleAprobar llamada', id);
    // Implementación real pendiente
  };

  const handlePagar = (id) => {
    console.log('handlePagar llamada', id);
    // Implementación real pendiente
  };
  const [modalOpen, setModalOpen] = useState(false);
  const [liquidacionSeleccionada, setLiquidacionSeleccionada] = useState(null);
  
  // Adelantos
  const [adelantos, setAdelantos] = useState([]);
  const [loadingAdelantos, setLoadingAdelantos] = useState(false);

  const cargarLiquidaciones = useCallback(async () => {
    try {
      setLoading(true);
      const [liqResponse, resResponse] = await Promise.all([
        RemuneracionesService.getLiquidaciones({
          mes: mesSeleccionado,
          anio: anioSeleccionado,
          estado: estadoFiltro || undefined
        }),
        RemuneracionesService.getResumenPeriodo(anioSeleccionado, mesSeleccionado)
      ]);
      
      setLiquidaciones(liqResponse.data || []);
      setResumen(resResponse.data || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [mesSeleccionado, anioSeleccionado, estadoFiltro]);

  const renderResumen = () => {
    if (!resumen) return null;
    
    const totalBruto = resumen.resumen_por_estado?.reduce((sum, r) => sum + (r.total_bruto || 0), 0) || 0;
    const totalLiquido = resumen.resumen_por_estado?.reduce((sum, r) => sum + (r.total_liquido || 0), 0) || 0;
    
    return (
      <div className="resumen-cards">
        <div className="resumen-card">
          <div className="resumen-icon"><i className="bi bi-people"></i></div>
          <div className="resumen-info">
            <span className="resumen-valor">{resumen.total_colaboradores || 0}</span>
            <span className="resumen-label">Colaboradores</span>
          </div>
        </div>
        
        <div className="resumen-card">
          <div className="resumen-icon generadas"><i className="bi bi-file-earmark-text"></i></div>
          <div className="resumen-info">
            <span className="resumen-valor">{resumen.liquidaciones_generadas || 0}</span>
            <span className="resumen-label">Liquidaciones</span>
          </div>
        </div>
        
        <div className="resumen-card">
          <div className="resumen-icon pendientes"><i className="bi bi-clock"></i></div>
          <div className="resumen-info">
            <span className="resumen-valor">{resumen.pendientes_generar || 0}</span>
            <span className="resumen-label">Pendientes</span>
          </div>
        </div>
        
        <div className="resumen-card">
          <div className="resumen-icon total"><i className="bi bi-cash-stack"></i></div>
          <div className="resumen-info">
            <span className="resumen-valor">{RemuneracionesService.formatMonto(totalLiquido)}</span>
            <span className="resumen-label">Total Líquido</span>
          </div>
        </div>
      </div>
    );
  };

  const renderLiquidaciones = () => (
    <div className="liquidaciones-container">
      <div className="liquidaciones-header">
        <div className="sf-filters">
          <select 
            value={mesSeleccionado} 
            onChange={(e) => setMesSeleccionado(parseInt(e.target.value))}
            className="sf-filter-select"
          >
            {RemuneracionesService.getMeses().map(mes => (
              <option key={mes.value} value={mes.value}>{mes.label}</option>
            ))}
          </select>
          
          <select 
            value={anioSeleccionado} 
            onChange={(e) => setAnioSeleccionado(parseInt(e.target.value))}
            className="sf-filter-select"
          >
            {[2024, 2025, 2026].map(anio => (
              <option key={anio} value={anio}>{anio}</option>
            ))}
          </select>
          
          <select 
            value={estadoFiltro} 
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="sf-filter-select"
          >
            <option value="">Todos los estados</option>
            <option value="borrador">Borrador</option>
            <option value="calculada">Calculada</option>
            <option value="aprobada">Aprobada</option>
            <option value="pagada">Pagada</option>
            <option value="anulada">Anulada</option>
          </select>
        </div>
        
        <button className="btn-generar" onClick={() => setShowInfoModal(true)}>
                {/* Modal informativo generación de período */}
                {showInfoModal && (
                  <div className="modal-overlay" onClick={() => setShowInfoModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                      <div className="modal-header"><h3>Generar Período</h3><button className="modal-close" onClick={() => setShowInfoModal(false)}>&times;</button></div>
                      <div className="modal-body"><p style={{color:'var(--color-text-secondary)',textAlign:'center',padding:'20px'}}>La generación automática de períodos de liquidación estará disponible próximamente. Por ahora, los datos de remuneraciones se gestionan a través de la importación de datos.</p></div>
                      <div className="modal-footer"><button className="btn-primary" onClick={() => setShowInfoModal(false)}>Entendido</button></div>
                    </div>
                  </div>
                )}
          <i className="bi bi-plus-circle"></i>
          Generar Período
        </button>
      </div>
      
      {renderResumen()}
      
      {loading ? (
        <div className="loading-state">
          <i className="bi bi-arrow-repeat spin"></i>
          <p>Cargando liquidaciones...</p>
        </div>
      ) : liquidaciones.length === 0 ? (
        <div className="empty-state">
          <i className="bi bi-file-earmark-x"></i>
          <h3>No hay liquidaciones</h3>
          <p>Genera las liquidaciones del período actual</p>
        </div>
      ) : (
        <div className="sf-table-wrapper">
          <table className="sf-table">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>RUT</th>
                <th>Cargo</th>
                <th>Sueldo Base</th>
                <th>Total Haberes</th>
                <th>Total Descuentos</th>
                <th>Líquido</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {liquidaciones.map(liq => {
                const estadoInfo = RemuneracionesService.getEstadoInfo(liq.estado);
                return (
                  <tr key={liq._id}>
                    <td className="col-nombre">
                      {liq.datos_colaborador?.nombre_completo || 
                       `${liq.colaborador?.nombre || ''} ${liq.colaborador?.apellido || ''}`}
                    </td>
                    <td>{liq.datos_colaborador?.rut || liq.colaborador?.rut || '-'}</td>
                    <td>{liq.datos_colaborador?.cargo || liq.colaborador?.cargo || '-'}</td>
                    <td className="col-monto">{RemuneracionesService.formatMonto(liq.sueldo_base)}</td>
                    <td className="col-monto">{RemuneracionesService.formatMonto(liq.total_haberes)}</td>
                    <td className="col-monto descuento">{RemuneracionesService.formatMonto(liq.total_descuentos)}</td>
                    <td className="col-monto liquido">{RemuneracionesService.formatMonto(liq.sueldo_liquido)}</td>
                    <td>
                      <span className={`sf-badge ${liq.estado?.toLowerCase()}`}>{estadoInfo.label}</span>
                    </td>
                    <td className="col-acciones">
                      <button 
                        className="sf-btn-action"
                        onClick={() => handleVerDetalle(liq._id)}
                        title="Ver detalle"
                      >
                        <i className="bi bi-eye"></i>
                      </button>
                      {liq.estado === 'calculada' && (
                        <button 
                          className="sf-btn-action"
                          onClick={() => handleAprobar(liq._id)}
                          title="Aprobar"
                        >
                          <i className="bi bi-check-circle"></i>
                        </button>
                      )}
                      {liq.estado === 'aprobada' && (
                        <button 
                          className="sf-btn-action"
                          onClick={() => handlePagar(liq._id)}
                          title="Marcar como pagada"
                        >
                          <i className="bi bi-cash"></i>
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

  const renderAdelantos = () => (
    <div className="adelantos-container">
      <div className="adelantos-header">
        <h3>Adelantos y Préstamos</h3>
        <button className="btn-nuevo-adelanto">
          <i className="bi bi-plus"></i>
          Nuevo Adelanto
        </button>
      </div>
      
      {loadingAdelantos ? (
        <div className="loading-state">
          <i className="bi bi-arrow-repeat spin"></i>
          <p>Cargando adelantos...</p>
        </div>
      ) : adelantos.length === 0 ? (
        <div className="empty-state">
          <i className="bi bi-wallet2"></i>
          <h3>No hay adelantos registrados</h3>
        </div>
      ) : (
        <div className="adelantos-list">
          {adelantos.map(adelanto => (
            <div key={adelanto._id} className="adelanto-card">
              <div className="adelanto-info">
                <span className="adelanto-colaborador">
                  {adelanto.colaborador?.nombre} {adelanto.colaborador?.apellido}
                </span>
                <span className="adelanto-tipo">{adelanto.tipo}</span>
              </div>
              <div className="adelanto-montos">
                <span className="monto-solicitado">
                  {RemuneracionesService.formatMonto(adelanto.monto_solicitado)}
                </span>
                {adelanto.cuotas > 1 && (
                  <span className="cuotas-info">
                    {adelanto.cuotas_pagadas}/{adelanto.cuotas} cuotas
                  </span>
                )}
              </div>
              <span className={`adelanto-estado estado-${adelanto.estado}`}>
                {adelanto.estado}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderModal = () => {
    if (!modalOpen || !liquidacionSeleccionada) return null;
    
    const liq = liquidacionSeleccionada;
    
    return (
      <div className="modal-overlay" onClick={() => setModalOpen(false)}>
        <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Detalle de Liquidación</h2>
            <button className="modal-close" onClick={() => setModalOpen(false)}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          
          <div className="modal-body">
            <div className="detalle-header">
              <div className="detalle-colaborador">
                <h3>{liq.datos_colaborador?.nombre_completo}</h3>
                <p>{liq.datos_colaborador?.cargo} • RUT: {liq.datos_colaborador?.rut}</p>
              </div>
              <div className="detalle-periodo">
                <span className="periodo-label">{liq.periodo_str}</span>
                <span 
                  className="estado-badge"
                  style={{ 
                    backgroundColor: RemuneracionesService.getEstadoInfo(liq.estado).bgColor,
                    color: RemuneracionesService.getEstadoInfo(liq.estado).color
                  }}
                >
                  {RemuneracionesService.getEstadoInfo(liq.estado).label}
                </span>
              </div>
            </div>
            
            <div className="detalle-grid">
              <div className="detalle-seccion">
                <h4><i className="bi bi-plus-circle"></i> Haberes</h4>
                <table className="detalle-table">
                  <tbody>
                    {liq.haberes?.map((h, i) => (
                      <tr key={i}>
                        <td>{h.nombre}</td>
                        <td className="monto">{RemuneracionesService.formatMonto(h.monto)}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td>Total Haberes</td>
                      <td className="monto">{RemuneracionesService.formatMonto(liq.total_haberes)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="detalle-seccion">
                <h4><i className="bi bi-dash-circle"></i> Descuentos</h4>
                <table className="detalle-table">
                  <tbody>
                    {liq.descuentos?.map((d, i) => (
                      <tr key={i}>
                        <td>{d.nombre}</td>
                        <td className="monto descuento">{RemuneracionesService.formatMonto(d.monto)}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td>Total Descuentos</td>
                      <td className="monto descuento">{RemuneracionesService.formatMonto(liq.total_descuentos)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="detalle-totales">
              <div className="total-item">
                <span>Sueldo Bruto</span>
                <span className="valor">{RemuneracionesService.formatMonto(liq.sueldo_bruto)}</span>
              </div>
              <div className="total-item">
                <span>Total Descuentos</span>
                <span className="valor descuento">-{RemuneracionesService.formatMonto(liq.total_descuentos)}</span>
              </div>
              <div className="total-item liquido">
                <span>SUELDO LÍQUIDO</span>
                <span className="valor">{RemuneracionesService.formatMonto(liq.sueldo_liquido)}</span>
              </div>
            </div>
          </div>
          
          <div className="modal-footer">
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cerrar
            </button>
            {liq.estado === 'calculada' && (
              <button className="btn-primary" onClick={() => handleAprobar(liq._id)}>
                <i className="bi bi-check-circle"></i> Aprobar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="remuneraciones-section">
      <div className="section-header">
        <div>
          <h1>Remuneraciones</h1>
          <p>Gestión de liquidaciones de sueldo y adelantos</p>
        </div>
        <button className="btn-danger" onClick={async()=>{if(!window.confirm('¿Eliminar TODAS las remuneraciones importadas?'))return;try{const token=localStorage.getItem('authToken');const res=await fetch((import.meta.env.VITE_API_URL||'http://localhost:3005/api')+'/remuneraciones/importados',{method:'DELETE',headers:{Authorization:'Bearer '+token}});const json=await res.json();if(json.ok){alert(json.deleted+' remuneraciones eliminadas');window.location.reload();}else{alert('Error: '+(json.error||'No se pudo limpiar'));}}catch(e){alert('Error: '+e.message);}}}>🗑️ Limpiar importados</button>
      </div>
      
      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'liquidaciones' ? 'active' : ''}`}
          onClick={() => setActiveTab('liquidaciones')}
        >
          <i className="bi bi-file-earmark-text"></i>
          Liquidaciones
        </button>
        <button 
          className={`tab-btn ${activeTab === 'adelantos' ? 'active' : ''}`}
          onClick={() => setActiveTab('adelantos')}
        >
          <i className="bi bi-wallet2"></i>
          Adelantos
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'liquidaciones' && renderLiquidaciones()}
        {activeTab === 'adelantos' && renderAdelantos()}
      </div>
      
      {renderModal()}
    </div>
  );
};

export default RemuneracionesSection;


