import { useEffect, useState, useMemo } from "react";
import DataTable from '../../components/ui/DataTable';
import { useNavigate } from 'react-router-dom';
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

function getClienteStatusLabel(value) {
  const normalized = String(value || '').toLowerCase();
  if (['activo', 'active', 'true', '1'].includes(normalized)) {
    return { label: 'Activo', className: 'activo' };
  }
  if (['prospecto', 'prospect'].includes(normalized)) {
    return { label: 'Prospecto', className: 'prospecto' };
  }
  return { label: normalized ? 'Inactivo' : 'Sin estado', className: 'inactivo' };
}

export default function ClientesSection() {
  const [clientes, setClientes] = useState([]); // accumulated pages
  const [skip, setSkip] = useState(0);
  const [limit] = useState(200); // could be made configurable later
  const [totalCount, setTotalCount] = useState(0);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const navigate = useNavigate();
  const {
    token,
    importsConnected,
    importsConnectionError,
    isTogglingImports,
    importsToggleForbidden,
    setImportsConnectedRemote,
    syncImportsConnected,
    importsReloadKey,
    logout
  } = useAuth();

  useEffect(() => {
    const cargar = async () => {
      // if token missing, mark as expired and bail so UI can show login
      if (!token) {
        setError('Sesión expirada');
        return;
      }
      // bail out if imports not connected or still unknown
      if (importsConnected === false || importsConnected === null) return;
      // if previous attempt determined session expired, stop retrying
      if (error && error.includes('Sesión expirada')) return;

      setCargando(true);
      setError(null);
      try {
        const resultRaw = await fetchClientes({ skip, limit });
        const { items, total, importsConnected: flag, meta } = normalizeClientesResponse(resultRaw);
        if (process.env.NODE_ENV === 'development') {
          console.debug('clientes normalized', { count: items.length, total, importsConnected: flag, meta });
        }
        if (typeof flag === 'boolean' && flag !== importsConnected) {
          syncImportsConnected(flag);
        }
        setTotalCount(total);
        if (skip === 0) {
          setClientes(items);
        } else {
          setClientes((prev) => [...prev, ...items]);
        }
      } catch (err) {
        console.error(err);
        if (err.code === 'NO_TOKEN' || err.code === 'AUTH_EXPIRED') {
          setError('Sesión expirada, vuelve a iniciar sesión.');
        } else {
          setError(err.message || "No se pudo cargar la lista de clientes.");
        }
      } finally {
        setCargando(false);
      }
    };
    // reset state when connection toggles off or jitter
    if (importsConnected === false) {
      setClientes([]);
      setTotalCount(0);
      setSkip(0);
    }
    // whenever importsConnected changes from null->true or reload key changes or skip changes, try fetch
    cargar();

    const onRefresh = () => {
      // simply fetch current page again
      cargar();
    };
    window.addEventListener('clientes-refresh', onRefresh);
    return () => window.removeEventListener('clientes-refresh', onRefresh);
  }, [importsConnected, importsReloadKey, skip, limit]);

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

  // helper to trigger reload from outside
  const dispatchReload = () => window.dispatchEvent(new Event('clientes-refresh'));

  // early UI cases
  if (importsConnected === null) {
    return (
      <div className="clientes-section">
        <h2>👥 Clientes</h2>
        <p>Verificando conexión...</p>
      </div>
    );
  }


  return (
    <div className="clientes-section">
      <h2>👥 Clientes</h2>
      <p>Los datos se obtienen de las importaciones realizadas en Excel/CSV.</p>
      {importsConnected === false && (
        <div className="info-text">
          Imports desconectado: no hay datos de clientes.
        </div>
      )}
      {/* connection error banner */}
      {importsConnectionError && (
        <div className="error-text">
          Error de conexión de imports: {importsConnectionError}{' '}
          <button className="btn-secondary" onClick={dispatchReload}>Reintentar</button>
        </div>
      )}
      {/* connection control */}
      <div className="clientes-connection-status" style={{ display:'flex', alignItems:'center', gap:'1rem', margin:'0.5rem 0' }}>
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
        <button
          className="btn-danger"
          disabled={cargando}
          onClick={async () => {
            if (!window.confirm('¿Eliminar TODOS los clientes importados? Esta acción no se puede deshacer.')) return;
            try {
              const token = localStorage.getItem('authToken');
              const res = await fetch('/api/clientes/importados', {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
              });
              const json = await res.json();
              if (json.ok) {
                createToast({ title: 'Listo', description: `${json.deleted} clientes eliminados` });
                setClientes([]);
                setTotalCount(0);
                setSkip(0);
              } else {
                createToast({ title: 'Error', description: json.error || 'No se pudo limpiar', variant: 'destructive' });
              }
            } catch (e) {
              createToast({ title: 'Error', description: e.message, variant: 'destructive' });
            }
          }}
        >
          🗑️ Limpiar datos importados
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
          Total clientes: {totalCount} | Mostrando: {filtrados.length}
        </div>
      </div>

      {cargando && <p className="info-text">Cargando clientes...</p>}
      {error && (
        <div className="error-text">
          {error}{' '}
          <button className="btn-secondary" onClick={dispatchReload}>Reintentar</button>
        </div>
      )}

      {!cargando && !error && clientes.length === 0 && !importsConnected && (
        <div className="empty-state">
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
      {error && error.includes('Sesión expirada') && (
        <div className="empty-state">
          <h3 className="card-title">{error}</h3>
          <button className="btn-primary" onClick={() => navigate('/login')}>
            Iniciar sesión
          </button>
        </div>
      )}
      {importsConnected && !cargando && !error && filtrados.length > 0 && (
        <>
          <DataTable
            columns={[
              { key: 'nombre', label: 'Nombre', sortable: true, render: (v, row) => row.nombre || row.nombre_cliente || row.name || '(sin nombre)' },
              { key: 'email', label: 'Email', sortable: true, render: (v) => v || '—' },
              { key: 'telefono', label: 'Teléfono', render: (v, row) => row.telefono || row.cellPhone || '—' },
              { key: 'estado', label: 'Estado', sortable: true, render: (v, row) => {
                const info = getClienteStatusLabel(row.estado || row.status);
                return <span className={`sf-badge ${info.className}`}>{info.label}</span>;
              }},
              { key: 'fuente', label: 'Fuente', render: (v, row) => row.fuente || row.source || '—' },
              { key: 'createdAt', label: 'Fecha registro', sortable: true, render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
              { key: 'updatedAt', label: 'Última actualización', sortable: true, render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
            ]}
            data={filtrados}
            loading={cargando}
            error={error && !error.includes('Sesión expirada') ? error : null}
            emptyMessage="No hay clientes registrados"
            emptyIcon="bi-people"
            searchable={false}
            pageSize={200}
          />
          {/* load more button */}
          {clientes.length < totalCount && (
            <button
              className="btn-primary"
              disabled={cargando}
              onClick={() => setSkip((s) => s + limit)}
              style={{ margin: '1rem auto', display: 'block' }}
            >
              Cargar más
            </button>
          )}
        </>
      )}
    </div>
  );
}
