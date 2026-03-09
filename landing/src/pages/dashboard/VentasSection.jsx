import { useEffect, useState, useMemo } from "react";
import { fetchVentas } from "../../services/ventasApi";
import { useAuth } from "../../context/AuthContext";
import { createToast } from "@/components/ui/use-toast";
import "../../styles/Dashboard.css";

export default function VentasSection() {
  const [ventas, setVentas] = useState([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const { importsConnected } = useAuth();
  const limit = 50;

  useEffect(() => {
    cargarVentas();
    const onRefresh = () => cargarVentas();
    window.addEventListener('ventas-refresh', onRefresh);
    return () => window.removeEventListener('ventas-refresh', onRefresh);
  }, [page, importsConnected]);

  async function cargarVentas() {
    setCargando(true);
    setError(null);
    try {
      const data = await fetchVentas({ page, limit });
      const lista = Array.isArray(data.data) ? data.data : Array.isArray(data.ventas) ? data.ventas : [];
      setVentas(lista);
      setTotalCount(typeof data.total === 'number' ? data.total : lista.length);
    } catch (e) {
      setError("Error cargando ventas: " + e.message);
    } finally {
      setCargando(false);
    }
  }

  const filtradas = useMemo(() => {
    if (!busqueda.trim()) return ventas;
    const q = busqueda.toLowerCase();
    return ventas.filter(v =>
      (v.memberName || v.idMember || "").toLowerCase().includes(q) ||
      (v.planName || v.description || "").toLowerCase().includes(q) ||
      (v.employeeName || "").toLowerCase().includes(q)
    );
  }, [ventas, busqueda]);

  return (
    <div className="ventas-section">
      <h2>Ventas</h2>
      <p className="info-text">Los datos se obtienen de las importaciones realizadas en Excel/CSV.</p>
      <div className="ventas-toolbar">
        <div>
          <label htmlFor="busqueda-venta">Buscar: </label>
          <input id="busqueda-venta" type="text" placeholder="Cliente, plan, vendedor..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <div className="ventas-actions">
          <span className="info-text">Total ventas: {totalCount} | Mostrando: {filtradas.length}</span>
          <button className="btn-danger" disabled={cargando} onClick={async () => {
            if (!window.confirm('Eliminar TODAS las ventas importadas?')) return;
            try {
              const { fetchAuth } = await import('../../api/fetchAuth');
              const json = await fetchAuth('/api/ventas/importados', { method: 'DELETE' });
              if (json.ok) { createToast({ title: 'Listo', description: json.deleted + ' ventas eliminadas' }); setVentas([]); setTotalCount(0); setPage(1); }
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
              <th>Plan</th><th>Monto</th><th>Descuento</th><th>Inscripcion</th><th>Sede</th>
            </tr>
          </thead>
          <tbody>
            {!cargando && filtradas.length === 0 && <tr><td colSpan={13} style={{ textAlign: 'center', padding: '1rem', color: '#999' }}>Sin ventas registradas</td></tr>}
            {filtradas.map((v, idx) => (
              <tr key={v._id || v.idSale || idx}>
                <td>{v.saleDate ? new Date(v.saleDate).toLocaleDateString() : '-'}</td>
                <td>{v.memberName || v.idMember || '-'}</td>
                <td>{v.whatsapp || v.cellPhone || '-'}</td>
                <td>{v.dueDate ? new Date(v.dueDate).toLocaleDateString() : '-'}</td>
                <td>{v.saleType || '-'}</td>
                <td>{v.paymentStatus || '-'}</td>
                <td>{v.employeeName || '-'}</td>
                <td>{v.fechaCompra ? new Date(v.fechaCompra).toLocaleDateString() : '-'}</td>
                <td>{v.planName || '-'}</td>
                <td>{v.amount != null ? '$' + Number(v.amount).toLocaleString() : '-'}</td>
                <td>{v.discount != null ? '$' + Number(v.discount).toLocaleString() : '-'}</td>
                <td>{v.tax != null ? '$' + Number(v.tax).toLocaleString() : '-'}</td>
                <td>{v.branchName || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ventas-pagination">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary">Anterior</button>
        <span>Pagina {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={filtradas.length < limit} className="btn-secondary">Siguiente</button>
      </div>
    </div>
  );
}