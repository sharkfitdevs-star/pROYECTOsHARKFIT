import React from 'react';
import './DashboardEVO.css';

function DashboardEVO() {
  return (
    <div className="dashboard-evo">
      <header className="dashboard-header">
        <div>
          <h1>📊 Dashboard Vendify - EVO W12</h1>
          <p className="last-update">Última actualización: --</p>
        </div>
        <button className="refresh-btn" type="button" disabled>
          🔄 Actualizar
        </button>
      </header>

      <div className="stats-grid">
        <div className="stat-card prospects">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Prospectos</h3>
            <p className="stat-number">0</p>
            <small>Total de leads registrados</small>
          </div>
        </div>

        <div className="stat-card sales">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Ventas</h3>
            <p className="stat-number">0</p>
            <small>$0 CLP total</small>
          </div>
        </div>

        <div className="stat-card entries">
          <div className="stat-icon">🚪</div>
          <div className="stat-content">
            <h3>Accesos</h3>
            <p className="stat-number">0</p>
            <small>Registros de entrada</small>
          </div>
        </div>

        <div className="stat-card average">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>Venta Promedio</h3>
            <p className="stat-number">$0</p>
            <small>CLP por transacción</small>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardEVO;
