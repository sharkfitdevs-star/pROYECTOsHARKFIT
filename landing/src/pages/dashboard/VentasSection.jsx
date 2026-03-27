import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { getAccessToken } from "../../config/authStorage";
import { fetchVentas } from "../../services/ventasApi";
import { useAuth } from "../../context/AuthContext";
import { createToast } from "@/components/ui/use-toast";
import "../../styles/Dashboard.css";

function getPaymentBadgeClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (['pagado', 'completada', 'completado'].includes(normalized)) return 'pagado';
  if (['pendiente'].includes(normalized)) return 'pendiente';
  if (['vencido', 'anulada', 'anulado', 'rechazada'].includes(normalized)) return 'vencido';
  return 'pendiente';
}

export default function VentasSection() {
  const [ventas, setVentas] = useState([]);
  const [page, setPage] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [estadoFilter, setEstadoFilter] = useState('');
  const [sedeFilter, setSedeFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [sedeOptions, setSedeOptions] = useState([]);
  const [planOptions, setPlanOptions] = useState([]);
  const { importsConnected } = useAuth();
  const limit = 50;
  const [ventaOpen, setVentaOpen] = useState(false);
  const [ventaData, setVentaData] = useState(null);
  const [ventaLoading, setVentaLoading] = useState(false);

  const BASE = import.meta.env.VITE_API_URL || "/api";
  const api = axios.create({ baseURL: BASE, withCredentials: true });
  api.interceptors.request.use((cfg) => {
    const t = getAccessToken();
    if (t) cfg.headers["Authorization"] = "Bearer " + t;
    return cfg;
  });

  const openVenta = async (id) => {
    setVentaOpen(true);
    setVentaLoading(true);
    try {
      const res = await api.get("/ventas/" + id);
      setVentaData(res.data.data || res.data);
    } catch { setVentaData(null); }
    finally { setVentaLoading(false); }
  };

  // helper to reset all filters and pagination
  const limpiarFiltros = () => {
    setBusqueda('');
    setEstadoFilter('');
    setSedeFilter('');
    setPlanFilter('');
    setPage(1);
  };

  const openEditVenta = (v) => {
    setVentaData(v);
    setVentaOpen(true);
  };

  const toggleEstadoVenta = async (id, current) => {
    const nuevo = current === "pagado" ? "pendiente" : "pagado";
    try {
      await api.patch("/ventas/" + id + "/estado", { paymentStatus: nuevo });
      cargarVentas();
    } catch (err) { console.error(err); }
  };

  // load all ventas once (or whenever importsConnected changes) and compute filter options
  useEffect(() => {
    cargarVentas();
    const onRefresh = () => cargarVentas();
    window.addEventListener('ventas-refresh', onRefresh);
    return () => window.removeEventListener('ventas-refresh', onRefresh);
  }, [importsConnected]);

  // fetch all ventas without applying any filter parameters so filtering/pagination
  // happens entirely on the frontend. using a large limit to ensure the API returns everything.
  async function cargarVentas() {
    setCargando(true);
    setError(null);
    try {
      const data = await fetchVentas({ limit: 9999 });
      const lista = Array.isArray(data.data)
        ? data.data
        : Array.isArray(data.ventas)
        ? data.ventas
        : [];
      setVentas(lista);
      // we don't need a separate totalCount state; ventas.length will reflect the
      // total number of records loaded
      // compute dropdown options from the complete list
      setSedeOptions([
        ...new Set(lista.map(v => v.branchName).filter(Boolean)),
      ]);
      setPlanOptions([
        ...new Set(lista.map(v => v.planName).filter(Boolean)),
      ]);
    } catch (e) {
      setError("Error cargando ventas: " + e.message);
    } finally {
      setCargando(false);
    }
  }

  // derived array that applies all filters (search text + selects)
  // client-side filtering based on user inputs; works over the full ventas array
  const ventasFiltradas = useMemo(() => {
    return ventas.filter((venta) => {
      // normalize property names in case API uses alternate keys
      const nombreCliente = venta.memberName || venta.cliente || venta.idMember || "";
      const nombrePlan = venta.planName || venta.plan || venta.description || "";
      const nombreVendedor = venta.employeeName || venta.vendedor || "";
      const estadoPago = venta.paymentStatus || venta.estado || "";
      const sede = venta.branchName || venta.sede || "";

      const matchText =
        !busqueda ||
        nombreCliente.toLowerCase().includes(busqueda.toLowerCase()) ||
        nombrePlan.toLowerCase().includes(busqueda.toLowerCase()) ||
        nombreVendedor.toLowerCase().includes(busqueda.toLowerCase());

      const matchEstado = !estadoFilter || estadoFilter === "todos" ||
        estadoPago === estadoFilter;
      const matchSede = !sedeFilter || sedeFilter === "todas" ||
        sede === sedeFilter;
      const matchPlan = !planFilter || planFilter === "todos" ||
        nombrePlan === planFilter;

      return matchText && matchEstado && matchSede && matchPlan;
    });
  }, [ventas, busqueda, estadoFilter, sedeFilter, planFilter]);

  // pagination derived from ventasFiltradas
  const ventasPagina = ventasFiltradas.slice(
    (page - 1) * limit,
    page * limit
  );

  const ventasMontoTotal = ventasFiltradas.reduce((acc, venta) => acc + (Number(venta.amount) || 0), 0);
  const ventasPagadas = ventasFiltradas.filter((venta) =>
    ['pagado', 'completada', 'completado'].includes(String(venta.paymentStatus || '').toLowerCase())
  ).length;

  // log first venta to inspect available fields, and reset page when filters change
  useEffect(() => {
    if (ventas.length > 0) {
      console.log('CAMPOS VENTA:', JSON.stringify(ventas[0], null, 2));
    }
  }, [ventas]);

  useEffect(() => {
    setPage(1);
  }, [estadoFilter, sedeFilter, planFilter, busqueda]);

  return (
    <div className="ventas-section">
      <h2>Ventas</h2>
      <p className="info-text">Los datos se obtienen de las importaciones realizadas en Excel/CSV.</p>
      <div className="ventas-kpis">
        <div className="ventas-kpi-card">
          <div className="ventas-kpi-label">Monto total filtrado</div>
          <div className="ventas-kpi-value amount">${ventasMontoTotal.toLocaleString()}</div>
        </div>
        <div className="ventas-kpi-card">
          <div className="ventas-kpi-label">Ventas filtradas</div>
          <div className="ventas-kpi-value count">{ventasFiltradas.length}</div>
        </div>
        <div className="ventas-kpi-card">
          <div className="ventas-kpi-label">Pagadas</div>
          <div className="ventas-kpi-value count">{ventasPagadas}</div>
        </div>
      </div>
      <div className="ventas-toolbar">
        <div>
          <label htmlFor="busqueda-venta">Buscar: </label>
          <input id="busqueda-venta" type="text" placeholder="Cliente, plan, vendedor..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <div className="ventas-filters">
          <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="pagado">Pagado</option>
            <option value="pendiente">Pendiente</option>
            <option value="anulado">Anulado</option>
          </select>
          <select value={sedeFilter} onChange={e => setSedeFilter(e.target.value)}>
            <option value="">Todas las sedes</option>
            {sedeOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={planFilter} onChange={e => setPlanFilter(e.target.value)}>
            <option value="">Todos los planes</option>
            {planOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        </div>
        <div className="ventas-actions">
          <span className="info-text">Total: {ventas.length} | Mostrando: {ventasFiltradas.length}</span>
          <button className="btn-danger" disabled={cargando} onClick={async () => {
            if (!window.confirm('Eliminar TODAS las ventas importadas?')) return;
            try {
              const { fetchAuth } = await import('../../api/fetchAuth');
              const json = await fetchAuth('/api/ventas/importados', { method: 'DELETE' });
              if (json.ok) { createToast({ title: 'Listo', description: json.deleted + ' ventas eliminadas' }); setVentas([]); setPage(1); }
              else { createToast({ title: 'Error', description: json.error || 'No se pudo limpiar', variant: 'destructive' }); }
            } catch (e) { createToast({ title: 'Error', description: e.message, variant: 'destructive' }); }
          }}>Limpiar datos importados</button>
        </div>
      </div>
      {cargando && <p className="info-text">Cargando ventas...</p>}
      {error && <div className="error-text">{error}</div>}
      <div className="ventas-table-container">
        <table className="ventas-table">
          <thead>
            <tr>
              <th>Fecha ingreso</th><th>Cliente</th><th>WhatsApp</th><th>Fecha visita</th>
              <th>Tipo</th><th>Estado</th><th>Vendedor</th><th>Fecha compra</th>
              <th>Plan</th><th>Monto</th><th>Descuento</th><th>Inscripcion</th><th>Sede</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!cargando && ventasPagina.length === 0 && <tr><td colSpan={13} style={{ textAlign: 'center', padding: '1rem' }}>Sin ventas registradas</td></tr>}
            {ventasPagina.map((v, idx) => (
              <tr key={v._id || v.idSale || idx}>
                <td>{v.saleDate ? new Date(v.saleDate).toLocaleDateString() : '-'}</td>
                <td>{v.memberName || v.idMember || '-'}</td>
                <td>{v.whatsapp || v.cellPhone || '-'}</td>
                <td>{v.dueDate ? new Date(v.dueDate).toLocaleDateString() : '-'}</td>
                <td>{v.saleType || '-'}</td>
                <td>
                  <span className={`payment-badge ${getPaymentBadgeClass(v.paymentStatus)}`}>{v.paymentStatus || '-'}</span>
                </td>
                <td>{v.employeeName || '-'}</td>
                <td>{v.fechaCompra ? new Date(v.fechaCompra).toLocaleDateString() : '-'}</td>
                <td>{v.planName || '-'}</td>
                <td>{v.amount != null ? '$' + Number(v.amount).toLocaleString() : '-'}</td>
                <td>{v.discount != null ? '$' + Number(v.discount).toLocaleString() : '-'}</td>
                <td>{v.tax != null ? '$' + Number(v.tax).toLocaleString() : '-'}</td>
                <td>{v.branchName || '-'}</td>
                <td>
                  <div style={{ display:"flex", gap:6, justifyContent:"center" }}>
                    <button onClick={() => openVenta(v._id)} title="Ver detalle" className="table-action-btn">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                    <button onClick={() => openEditVenta(v)} title="Editar" className="table-action-btn">
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => toggleEstadoVenta(v._id, v.paymentStatus)}
                      title={v.paymentStatus === "pagado" ? "Marcar pendiente" : "Marcar pagado"}
                      className={`table-action-btn ${v.paymentStatus === "pagado" ? 'table-action-btn--success' : 'table-action-btn--danger'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    {ventaOpen && (
      <div className="ventas-modal-overlay"
        onClick={(e) => { if (e.target === e.currentTarget) setVentaOpen(false); }}>
        <div className="ventas-modal">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
            <h3 className="ventas-modal-title">Detalle de venta</h3>
            <button onClick={() => setVentaOpen(false)} className="ventas-modal-close">×</button>
          </div>
          {ventaLoading ? <p className="info-text">Cargando...</p> : ventaData ? (
            <div className="ventas-modal-grid">
              <div><span className="ventas-modal-label">Cliente:</span> {ventaData.memberName||"-"}</div>
              <div><span className="ventas-modal-label">WhatsApp:</span> {ventaData.cellPhone||"-"}</div>
              <div><span className="ventas-modal-label">Plan:</span> {ventaData.planName||"-"}</div>
              <div><span className="ventas-modal-label">Monto:</span> {ventaData.amount != null ? "$"+Number(ventaData.amount).toLocaleString() : "-"}</div>
              <div><span className="ventas-modal-label">Vendedor:</span> {ventaData.employeeName||"-"}</div>
              <div><span className="ventas-modal-label">Sede:</span> {ventaData.branchName||"-"}</div>
              <div><span className="ventas-modal-label">Estado:</span> {ventaData.paymentStatus||"-"}</div>
              <div><span className="ventas-modal-label">Tipo:</span> {ventaData.saleType||"-"}</div>
              <div><span className="ventas-modal-label">Fecha compra:</span> {ventaData.saleDate ? new Date(ventaData.saleDate).toLocaleDateString("es-CL") : "-"}</div>
              <div><span className="ventas-modal-label">Fecha visita:</span> {ventaData.dueDate ? new Date(ventaData.dueDate).toLocaleDateString("es-CL") : "-"}</div>
              <div><span className="ventas-modal-label">Descuento:</span> {ventaData.discount != null ? "$"+Number(ventaData.discount).toLocaleString() : "-"}</div>
              <div><span className="ventas-modal-label">Inscripcion:</span> {ventaData.tax != null ? "$"+Number(ventaData.tax).toLocaleString() : "-"}</div>
            </div>
          ) : <p className="error-text">Error cargando detalle</p>}
        </div>
      </div>
    )}
    </div>
  );
}


