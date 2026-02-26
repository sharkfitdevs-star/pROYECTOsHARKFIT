import { useEffect, useState, useMemo, Fragment } from "react";
import { fetchClientes, normalizeClientesResponse } from "../../services/clientesApi";
import { createToast } from "@/components/ui/use-toast";
import { useAuth } from "../../context/AuthContext";
import "../../styles/Dashboard.css";

const CAMPOS_IGNORADOS = [
  "__v",
  "password",
  "hash",
  "salt",
  "createdAt",
  "updatedAt",
];

function normalizarValor(val) {
  if (val == null) return "";
  if (typeof val === "object") {
    try {
      return JSON.stringify(val);
    } catch {
      return "[objeto]";
    }
  }
  return String(val);
}

export default function ClientesSection() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const {
    importsConnected,
    isTogglingImports,
    importsToggleForbidden,
    setImportsConnectedRemote,
    syncImportsConnected,
    importsReloadKey,
  } = useAuth();

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      setError(null);
      try {
        const resultRaw = await fetchClientes();
        const { items, total, importsConnected: flag } = normalizeClientesResponse(resultRaw);
        if (process.env.NODE_ENV === 'development') {
          console.debug('clientes normalized', { count: items.length, total, importsConnected: flag });
        }
        if (typeof flag === 'boolean' && flag !== importsConnected) {
          syncImportsConnected(flag);
        }
        setClientes(items);
      } catch (err) {
        console.error(err);
        setError(err.message || "No se pudo cargar la lista de clientes.");
      } finally {
        setCargando(false);
      }
    };
    // fetch initial list and whenever importsConnected/reloadKey changes
    cargar();

    const onRefresh = () => {
      cargar();
    };
    window.addEventListener('clientes-refresh', onRefresh);
    return () => window.removeEventListener('clientes-refresh', onRefresh);
  }, [importsConnected, importsReloadKey]);

  // columnas fijas que mostramos en la tabla (orden y etiqueta)
  const columnasDef = useMemo(() => [
    { key: 'nombre', label: 'Nombre' },
    { key: 'email', label: 'Email' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'estado', label: 'Estado' },
    { key: 'fuente', label: 'Fuente' },
    { key: 'createdAt', label: 'Fecha registro' },
    { key: 'updatedAt', label: 'Última actualización' }
  ], []);

  const columnas = columnasDef.map(c => c.key);

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return clientes;
    return clientes.filter((cli) => {
      const hayName = normalizarValor(cli.nombre).toLowerCase().includes(term);
      const hayEmail = normalizarValor(cli.email).toLowerCase().includes(term);
      const hayPhone = normalizarValor(cli.telefono).toLowerCase().includes(term);
      return hayName || hayEmail || hayPhone;
    });
  }, [busqueda, clientes]);

  // control de filas expandidas para mostrar detalles técnicos
  const [expanded, setExpanded] = useState({});
  const toggleExpand = (idx) => {
    setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // banner si más del 10% de los clientes importados tienen nombre vacío o placeholder
  const missingNameCount = clientes.filter(c => {
    const n = c.name || '';
    return !n.trim() || n.trim() === 'Sin nombre';
  }).length;
  const ratio = clientes.length ? missingNameCount / clientes.length : 0;
  const showNameBanner = clientes.length >= 10 && ratio >= 0.10;

  const toggleConnection = async () => {
    // if we've already been forbidden, bail out immediately
    if (importsToggleForbidden) return;

    const target = !importsConnected;
    const msg = target
      ? '¿Conectar importaciones? Los datos importados volverán a verse.'
      : '¿Desconectar importaciones? Esto ocultará los datos importados pero no los borrará.';
    if (!window.confirm(msg)) return;
    try {
      const val = await setImportsConnectedRemote(target);
      createToast({ title: 'Éxito', description: `Importaciones ${val ? 'conectadas' : 'desconectadas'}` });
    } catch (e) {
      // handle permission errors ourselves so we can show a one‑time toast
      const status = e?.response?.status;
      const code = e?.code;
      if (
        status === 403 ||
        code === 'IMPORTS_FORBIDDEN_403' ||
        code === 'IMPORTS_FORBIDDEN_GUARD'
      ) {
        markImportsForbidden();
        if (sessionStorage.getItem('importsForbiddenToastShown') !== '1') {
          sessionStorage.setItem('importsForbiddenToastShown', '1');
          createToast({
            title: 'No autorizado',
            description: 'No tienes permisos para desconectar importaciones.',
            variant: 'warning'
          });
        }
        return;
      }
      // toast already shown by context for other errors
    }
  };

  return (
    <div className="clientes-section">
      <h2>👥 Clientes</h2>
      <p>Los datos se obtienen de las importaciones realizadas en Excel/CSV.</p>
      {!importsConnected && (
        <div className="warning-card" style={{ padding: '1rem', background: '#fff3cd', color: '#856404', margin: '0.5rem 0', borderRadius: '4px' }}>
          Importaciones globalmente desconectadas. Los registros importados no se mostrarán.
        </div>
      )}
      {/* connection control */}
      <div className="clientes-connection-status" style={{display:'flex', alignItems:'center', gap:'1rem', margin:'0.5rem 0'}}>
        <span className={importsConnected ? 'badge badge-green' : 'badge badge-red'}>
          {importsConnected ? 'Conectadas' : 'Desconectadas'}
        </span>
        <button
          className="btn-primary"
          onClick={toggleConnection}
          disabled={cargando || isTogglingImports || importsToggleForbidden}
          title={
            importsToggleForbidden
              ? 'No tienes permisos para cambiar esta configuración'
              : ''
          }
        >
          {importsConnected ? 'Desconectar importaciones' : 'Conectar importaciones'}
        </button>
      </div>
      {importsConnected && showNameBanner && (
        <div className="warning-banner">
          Tus importaciones están llegando sin columna de nombre. Revisa el mapeo del Excel.
        </div>
      )}

      <div className="clientes-toolbar">
        <div>
          <label htmlFor="busqueda-cliente">Buscar: </label>
          <input
            id="busqueda-cliente"
            type="text"
            placeholder="Nombre, correo, teléfono..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            disabled={!importsConnected}
          />
        </div>
        <div className="info-text">
          Total clientes: {clientes.length} | Mostrando: {filtrados.length}
        </div>
      </div>

      {cargando && <p className="info-text">Cargando clientes...</p>}
      {error && <p className="error-text">{error}</p>}

      {!cargando && !error && clientes.length === 0 && !importsConnected && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <h3 className="card-title">Importaciones desconectadas</h3>
          <p className="card-content" style={{ margin: '1rem 0' }}>
            Para ver los clientes importados, vuelve a conectar la fuente de datos.
          </p>
          <button className="btn-primary" onClick={toggleConnection} disabled={cargando}>
            Conectar importaciones
          </button>
        </div>
      )}

      {/* only render table when connected; if disconnected show nothing */}
      {importsConnected && !cargando && !error && filtrados.length > 0 && (
        <div className="clientes-table-container">
          <table className="clientes-table">
            <thead>
              <tr>
                {columnasDef.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
                <th>...</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((cli, idx) => {
                const hasName = cli.nombre;
                const rowKey = cli._id || cli.uniqueId || cli.idMember || `${cli.email||''}-${idx}`;
                return (
                  <Fragment key={rowKey}>
                    <tr key={rowKey} className="cursor-pointer" onClick={() => toggleExpand(idx)}>
                      <td>{hasName ? cli.nombre : '(sin nombre)'}</td>
                      <td>{cli.email || '—'}</td>
                      <td>{cli.telefono || '—'}</td>
                      <td>{cli.estado ? (String(cli.estado).toLowerCase() === 'activo' || String(cli.estado).toLowerCase() === 'true' ? 'Activo' : 'Inactivo') : '—'}</td>
                      <td>{cli.fuente || '—'}</td>
                      <td>{cli.createdAt ? new Date(cli.createdAt).toLocaleDateString() : '—'}</td>
                      <td>{cli.updatedAt ? new Date(cli.updatedAt).toLocaleDateString() : '—'}</td>
                      <td>{expanded[idx] ? '-' : '+'}</td>
                    </tr>
                    {expanded[idx] && (
                      <tr key={`${rowKey}-details`} className="details-row">
                        <td colSpan={columnasDef.length + 1}>
                          <pre className="small-text">
{JSON.stringify(
  Object.fromEntries(
    Object.entries(cli).filter(([k]) => !columnas.includes(k))
  ),
  null,
  2
)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
