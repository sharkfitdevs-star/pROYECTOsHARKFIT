import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './DashboardEVO.css';

const API_BASE = 'http://localhost:8000/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function DashboardEVO() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    fetchDashboardData();
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/evo/dashboard/stats/?tenant=gym-vendify-001`);
      setStats(response.data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Error al cargar datos. Verifica que el backend esté corriendo en puerto 8000.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Cargando datos de EVO W12...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h2>⚠️ Error de Conexión</h2>
        <p>{error}</p>
        <button onClick={fetchDashboardData}>Reintentar</button>
      </div>
    );
  }

  if (!stats) {
    return <div className="dashboard-empty">No hay datos disponibles</div>;
  }

  // Preparar datos para gráficos
  const salesByStatus = stats.recent_sales.reduce((acc, sale) => {
    const status = sale.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(salesByStatus).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));

  const salesChartData = stats.recent_sales.slice(0, 10).reverse().map((sale, idx) => ({
    name: `Venta ${idx + 1}`,
    amount: parseFloat(sale.amount || 0),
    date: sale.sale_date ? sale.sale_date.substring(0, 10) : 'N/A'
  }));

  const recentEntriesChart = stats.recent_entries.map((entry, idx) => ({
    name: `Branch ${entry.location}`,
    branch: entry.location,
    time: entry.access_time ? entry.access_time.substring(11, 16) : 'N/A'
  }));

  // Agrupar entries por sucursal
  const entriesByBranch = stats.recent_entries.reduce((acc, entry) => {
    const branch = `Branch ${entry.location}`;
    acc[branch] = (acc[branch] || 0) + 1;
    return acc;
  }, {});

  const branchData = Object.entries(entriesByBranch).map(([name, value]) => ({
    name,
    accesos: value
  }));

  return (
    <div className="dashboard-evo">
      <header className="dashboard-header">
        <div>
          <h1>📊 Dashboard Vendify - EVO W12</h1>
          <p className="last-update">
            Última actualización: {lastUpdate.toLocaleTimeString('es-CL')}
          </p>
        </div>
        <button onClick={fetchDashboardData} className="refresh-btn">
          🔄 Actualizar
        </button>
      </header>

      {/* Tarjetas de resumen */}
      <div className="stats-grid">
        <div className="stat-card prospects">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Prospectos</h3>
            <p className="stat-number">{stats.total_prospects}</p>
            <small>Total de leads registrados</small>
          </div>
        </div>

        <div className="stat-card sales">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Ventas</h3>
            <p className="stat-number">{stats.total_sales}</p>
            <small>${stats.total_revenue.toLocaleString('es-CL')} CLP total</small>
          </div>
        </div>

        <div className="stat-card entries">
          <div className="stat-icon">🚪</div>
          <div className="stat-content">
            <h3>Accesos</h3>
            <p className="stat-number">{stats.total_entries}</p>
            <small>Registros de entrada</small>
          </div>
        </div>

        <div className="stat-card average">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>Venta Promedio</h3>
            <p className="stat-number">${Math.round(stats.avg_sale_amount).toLocaleString('es-CL')}</p>
            <small>CLP por transacción</small>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="charts-grid">
        {/* Ventas recientes */}
        <div className="chart-card">
          <h3>💵 Últimas Ventas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value) => `$${value.toLocaleString('es-CL')} CLP`}
                labelFormatter={(label) => label}
              />
              <Legend />
              <Bar dataKey="amount" fill="#0088FE" name="Monto" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribución por estado */}
        <div className="chart-card">
          <h3>📊 Ventas por Estado</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Accesos por sucursal */}
        <div className="chart-card full-width">
          <h3>🏢 Accesos por Sucursal (Últimos registros)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={branchData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="accesos" fill="#00C49F" name="Cantidad de Accesos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tablas de datos recientes */}
      <div className="tables-grid">
        <div className="table-card">
          <h3>👥 Últimos Prospectos</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_prospects.map((p) => (
                  <tr key={p.id}>
                    <td>{p.evo_prospect_id}</td>
                    <td>{p.name}</td>
                    <td className="email">{p.email}</td>
                    <td>{p.registration_date ? p.registration_date.substring(0, 10) : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="table-card">
          <h3>💰 Últimas Ventas</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_sales.map((s) => (
                  <tr key={s.id}>
                    <td>{s.evo_sale_id}</td>
                    <td className="amount">${parseFloat(s.amount || 0).toLocaleString('es-CL')}</td>
                    <td>
                      <span className={`badge ${s.status}`}>
                        {s.status || 'unknown'}
                      </span>
                    </td>
                    <td>{s.sale_date ? s.sale_date.substring(0, 10) : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="table-card full-width">
          <h3>🚪 Últimos Accesos</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Sucursal</th>
                  <th>Member ID</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_entries.map((e) => (
                  <tr key={e.id}>
                    <td>{e.access_time ? new Date(e.access_time).toLocaleString('es-CL') : 'N/A'}</td>
                    <td>Branch {e.location}</td>
                    <td>{e.member_id || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="dashboard-footer">
        <p>
          ✅ Sincronizado con EVO W12 | 
          Última sincronización: {stats.last_sync || 'N/A'} |
          Tenant: gym-vendify-001
        </p>
      </div>
    </div>
  );
}
