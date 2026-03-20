import React, { useEffect, useMemo, useState } from 'react';

const TABS = {
  TODAS: 'todas',
  PENDIENTES: 'pendientes',
  DEVOLUCIONES: 'devoluciones'
};

const TIPOS_ENTREGA = ['uniforme', 'equipo', 'herramienta', 'tecnologia', 'material', 'epp', 'otro'];
const MOTIVOS_ENTREGA = ['nuevo_ingreso', 'reposicion', 'cambio_talla', 'desgaste', 'perdida', 'promocion', 'proyecto', 'otro'];
const ESTADOS_ENTREGA = ['pendiente', 'entregado', 'parcial', 'devuelto', 'devolucion_parcial', 'perdido', 'dañado', 'cancelado'];
const CONDICIONES_DEVOLUCION = ['buen_estado', 'desgastado', 'dañado'];

const INITIAL_FILTROS = {
  colaborador: '',
  estado: '',
  sede: '',
  fecha_inicio: '',
  fecha_fin: ''
};

const INITIAL_CREAR = {
  colaborador: '',
  tipo: 'uniforme',
  motivo: 'nuevo_ingreso',
  sede: '',
  requiere_devolucion: false,
  fecha_programada: '',
  fecha_devolucion_esperada: '',
  items: []
};

function getEstadoClass(estado) {
  switch (estado) {
    case 'entregado':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'parcial':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'devuelto':
      return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    case 'devolucion_parcial':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'cancelado':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function toCurrency(value) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

export default function EntregasSection() {
  const [entregas, setEntregas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tabActiva, setTabActiva] = useState(TABS.TODAS);
  const [filtros, setFiltros] = useState(INITIAL_FILTROS);
  const [paginacion, setPaginacion] = useState({ page: 1, limit: 10, total: 0, total_pages: 1 });

  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [formCrear, setFormCrear] = useState(INITIAL_CREAR);

  const [productosBusqueda, setProductosBusqueda] = useState('');
  const [productosOpciones, setProductosOpciones] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(false);

  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const [entregaSeleccionada, setEntregaSeleccionada] = useState(null);

  const [devolucionAbierta, setDevolucionAbierta] = useState(false);
  const [devolucionItems, setDevolucionItems] = useState([]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filtros.colaborador) params.set('colaborador', filtros.colaborador);
    if (filtros.estado) params.set('estado', filtros.estado);
    if (filtros.sede) params.set('sede', filtros.sede);
    if (filtros.fecha_inicio) params.set('fecha_inicio', filtros.fecha_inicio);
    if (filtros.fecha_fin) params.set('fecha_fin', filtros.fecha_fin);
    params.set('page', String(paginacion.page));
    params.set('limit', String(paginacion.limit));
    return params.toString();
  }, [filtros, paginacion.page, paginacion.limit]);

  const endpointEntregas = useMemo(() => {
    if (tabActiva === TABS.PENDIENTES) return '/api/inventario/entregas?estado=pendiente';
    if (tabActiva === TABS.DEVOLUCIONES) return '/api/inventario/entregas/pendientes-devolucion';
    return '/api/inventario/entregas';
  }, [tabActiva]);

  const cargarEntregas = async () => {
    try {
      setLoading(true);
      const sep = endpointEntregas.includes('?') ? '&' : '?';
      const response = await fetch(`${endpointEntregas}${sep}${queryString}`, { credentials: 'include' });
      if (!response.ok) throw new Error('No se pudo cargar entregas');

      const payload = await response.json();
      const list = ensureArray(payload.data);
      setEntregas(list);

      const pg = payload.pagination || {};
      setPaginacion((prev) => ({
        ...prev,
        total: Number(pg.total || list.length || 0),
        total_pages: Number(pg.total_pages || 1)
      }));
    } catch (error) {
      window.alert(error.message || 'Error al cargar entregas');
      setEntregas([]);
    } finally {
      setLoading(false);
    }
  };

  const cargarProductos = async (termino = '') => {
    try {
      setLoadingProductos(true);
      const params = new URLSearchParams();
      if (termino) params.set('q', termino);
      params.set('limit', '20');

      const response = await fetch(`/api/inventario/productos?${params.toString()}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('No se pudo cargar productos');

      const payload = await response.json();
      setProductosOpciones(ensureArray(payload.data));
    } catch (error) {
      window.alert(error.message || 'Error al buscar productos');
      setProductosOpciones([]);
    } finally {
      setLoadingProductos(false);
    }
  };

  useEffect(() => {
    cargarEntregas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabActiva, queryString]);

  useEffect(() => {
    if (!modalCrearAbierto) return;
    const timer = setTimeout(() => {
      cargarProductos(productosBusqueda);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productosBusqueda, modalCrearAbierto]);

  const resetCrear = () => {
    setFormCrear(INITIAL_CREAR);
    setProductosBusqueda('');
    setProductosOpciones([]);
  };

  const abrirCrear = () => {
    resetCrear();
    setModalCrearAbierto(true);
  };

  const cerrarCrear = () => {
    setModalCrearAbierto(false);
    resetCrear();
  };

  const agregarItem = () => {
    setFormCrear((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          producto: '',
          producto_nombre: '',
          variante_nombre: '',
          talla: '',
          cantidad: 1,
          valor_unitario: 0
        }
      ]
    }));
  };

  const quitarItem = (index) => {
    setFormCrear((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const setItemField = (index, field, value) => {
    setFormCrear((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          [field]: field === 'cantidad' || field === 'valor_unitario' ? Number(value || 0) : value
        };
      })
    }));
  };

  const seleccionarProducto = (index, productoId) => {
    const producto = productosOpciones.find((p) => p._id === productoId);
    setFormCrear((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          producto: productoId,
          producto_nombre: producto?.nombre || '',
          valor_unitario: Number(producto?.precio_venta || 0)
        };
      })
    }));
  };

  const guardarEntrega = async (event) => {
    event.preventDefault();
    if (!formCrear.colaborador) {
      window.alert('Debes ingresar el colaborador');
      return;
    }
    if (!formCrear.sede) {
      window.alert('Debes ingresar la sede');
      return;
    }
    if (formCrear.items.length === 0) {
      window.alert('Debes agregar al menos un item');
      return;
    }

    const itemsInvalidos = formCrear.items.some((it) => !it.producto || Number(it.cantidad) <= 0);
    if (itemsInvalidos) {
      window.alert('Todos los items deben tener producto y cantidad mayor a 0');
      return;
    }

    try {
      const payload = {
        colaborador: formCrear.colaborador,
        tipo: formCrear.tipo,
        motivo: formCrear.motivo,
        sede: formCrear.sede,
        requiere_devolucion: formCrear.requiere_devolucion,
        fecha_programada: formCrear.fecha_programada || null,
        fecha_devolucion_esperada: formCrear.fecha_devolucion_esperada || null,
        items: formCrear.items.map((it) => ({
          producto: it.producto,
          variante_nombre: it.variante_nombre || it.talla || null,
          cantidad: Number(it.cantidad),
          valor_unitario: Number(it.valor_unitario || 0),
          valor_total: Number(it.cantidad) * Number(it.valor_unitario || 0)
        }))
      };

      const response = await fetch('/api/inventario/entregas', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo crear la entrega');
      }

      cerrarCrear();
      await cargarEntregas();
    } catch (error) {
      window.alert(error.message || 'Error al crear entrega');
    }
  };

  const abrirDetalle = (entrega) => {
    setEntregaSeleccionada(entrega);
    setDetalleAbierto(true);
  };

  const cerrarDetalle = () => {
    setDetalleAbierto(false);
    setEntregaSeleccionada(null);
  };

  const completarEntrega = async (entrega) => {
    const ok = window.confirm(`¿Completar entrega ${entrega.codigo}?`);
    if (!ok) return;

    try {
      const response = await fetch(`/api/inventario/entregas/${entrega._id}/completar`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo completar la entrega');
      }

      await cargarEntregas();
      if (entregaSeleccionada?._id === entrega._id) {
        setDetalleAbierto(false);
      }
    } catch (error) {
      window.alert(error.message || 'Error al completar entrega');
    }
  };

  const abrirDevolucion = (entrega) => {
    setEntregaSeleccionada(entrega);
    const items = ensureArray(entrega.items).map((item) => ({
      productoId: item.producto?._id || item.producto,
      nombre: item.producto?.nombre || 'Producto',
      cantidad: item.cantidad,
      devolver: false,
      condicion: 'buen_estado',
      notas: ''
    }));
    setDevolucionItems(items);
    setDevolucionAbierta(true);
  };

  const cerrarDevolucion = () => {
    setDevolucionAbierta(false);
    setDevolucionItems([]);
  };

  const setDevolucionField = (index, field, value) => {
    setDevolucionItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  };

  const guardarDevolucion = async (event) => {
    event.preventDefault();
    if (!entregaSeleccionada?._id) return;

    const seleccionados = devolucionItems
      .filter((item) => item.devolver)
      .map((item) => ({
        productoId: item.productoId,
        condicion: item.condicion,
        notas: item.notas
      }));

    if (seleccionados.length === 0) {
      window.alert('Selecciona al menos un item para devolución');
      return;
    }

    try {
      const response = await fetch(`/api/inventario/entregas/${entregaSeleccionada._id}/devolver`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: seleccionados })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo registrar devolución');
      }

      cerrarDevolucion();
      await cargarEntregas();
    } catch (error) {
      window.alert(error.message || 'Error al registrar devolución');
    }
  };

  const setFiltro = (field, value) => {
    setPaginacion((prev) => ({ ...prev, page: 1 }));
    setFiltros((prev) => ({ ...prev, [field]: value }));
  };

  const goToPage = (nextPage) => {
    setPaginacion((prev) => ({
      ...prev,
      page: Math.min(Math.max(nextPage, 1), Math.max(prev.total_pages, 1))
    }));
  };

  const pages = useMemo(() => {
    const total = Math.max(Number(paginacion.total_pages || 1), 1);
    return Array.from({ length: total }, (_, i) => i + 1);
  }, [paginacion.total_pages]);

  const timeline = useMemo(() => {
    if (!entregaSeleccionada) return [];

    const itemDevuelto = ensureArray(entregaSeleccionada.items).find((it) => it.fecha_devolucion);
    return [
      { key: 'creacion', label: 'Creación', fecha: entregaSeleccionada.fecha_solicitud, estado: 'done' },
      {
        key: 'aprobacion',
        label: 'Aprobación',
        fecha: entregaSeleccionada.fecha_aprobacion,
        estado: entregaSeleccionada.fecha_aprobacion ? 'done' : 'pending'
      },
      {
        key: 'entrega',
        label: 'Entrega',
        fecha: entregaSeleccionada.fecha_entrega,
        estado: entregaSeleccionada.fecha_entrega ? 'done' : 'pending'
      },
      {
        key: 'devolucion',
        label: 'Devolución',
        fecha: itemDevuelto?.fecha_devolucion || null,
        estado: itemDevuelto?.fecha_devolucion ? 'done' : 'pending'
      }
    ];
  }, [entregaSeleccionada]);

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Entregas</h2>
          <p className="text-sm text-slate-500">Gestión de entrega y devolución de implementos</p>
        </div>

        <button
          type="button"
          onClick={abrirCrear}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Nueva Entrega
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTabActiva(TABS.TODAS)}
          className={`rounded-full px-4 py-2 text-sm ${
            tabActiva === TABS.TODAS ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
          }`}
        >
          Todas
        </button>
        <button
          type="button"
          onClick={() => setTabActiva(TABS.PENDIENTES)}
          className={`rounded-full px-4 py-2 text-sm ${
            tabActiva === TABS.PENDIENTES ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
          }`}
        >
          Pendientes
        </button>
        <button
          type="button"
          onClick={() => setTabActiva(TABS.DEVOLUCIONES)}
          className={`rounded-full px-4 py-2 text-sm ${
            tabActiva === TABS.DEVOLUCIONES ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
          }`}
        >
          Devoluciones Pendientes
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-5">
        <input
          value={filtros.colaborador}
          onChange={(e) => setFiltro('colaborador', e.target.value)}
          placeholder="Colaborador (ID)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <select
          value={filtros.estado}
          onChange={(e) => setFiltro('estado', e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          {ESTADOS_ENTREGA.map((estado) => (
            <option key={estado} value={estado}>
              {estado}
            </option>
          ))}
        </select>

        <input
          value={filtros.sede}
          onChange={(e) => setFiltro('sede', e.target.value)}
          placeholder="Sede"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <input
          type="date"
          value={filtros.fecha_inicio}
          onChange={(e) => setFiltro('fecha_inicio', e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        <input
          type="date"
          value={filtros.fecha_fin}
          onChange={(e) => setFiltro('fecha_fin', e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-slate-600">Código</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-slate-600">Colaborador</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-slate-600">Tipo</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-slate-600">Motivo</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-slate-600">Items</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-slate-600">Estado</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-slate-600">Fecha Entrega</th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-500">
                  Cargando entregas...
                </td>
              </tr>
            )}

            {!loading && entregas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-500">
                  No hay entregas para mostrar
                </td>
              </tr>
            )}

            {!loading &&
              entregas.map((entrega) => (
                <tr key={entrega._id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-slate-700">{entrega.codigo || '-'}</td>
                  <td className="px-3 py-3 text-sm text-slate-700">
                    {entrega.colaborador?.nombres || entrega.colaborador?.codigo || entrega.colaborador || '-'}
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-700">{entrega.tipo || '-'}</td>
                  <td className="px-3 py-3 text-sm text-slate-700">{entrega.motivo || '-'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-700">{ensureArray(entrega.items).length}</td>
                  <td className="px-3 py-3 text-sm">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getEstadoClass(entrega.estado)}`}>
                      {entrega.estado || '-'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-700">{formatDate(entrega.fecha_entrega)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm">
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => abrirDetalle(entrega)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        onClick={() => completarEntrega(entrega)}
                        className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
                      >
                        Completar
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirDevolucion(entrega)}
                        className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
                      >
                        Devolver
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-slate-600">
          Página {paginacion.page} de {Math.max(paginacion.total_pages || 1, 1)} • Total: {paginacion.total}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goToPage(paginacion.page - 1)}
            disabled={paginacion.page <= 1}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Prev
          </button>

          <select
            value={paginacion.page}
            onChange={(e) => goToPage(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-700"
          >
            {pages.map((page) => (
              <option key={page} value={page}>
                {page}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => goToPage(paginacion.page + 1)}
            disabled={paginacion.page >= Math.max(paginacion.total_pages || 1, 1)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {modalCrearAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-800">Crear Entrega</h3>
              <button type="button" onClick={cerrarCrear} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">
                ✕
              </button>
            </div>

            <form onSubmit={guardarEntrega} className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Colaborador (ID)</span>
                  <input
                    value={formCrear.colaborador}
                    onChange={(e) => setFormCrear((prev) => ({ ...prev, colaborador: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Tipo</span>
                  <select
                    value={formCrear.tipo}
                    onChange={(e) => setFormCrear((prev) => ({ ...prev, tipo: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {TIPOS_ENTREGA.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Motivo</span>
                  <select
                    value={formCrear.motivo}
                    onChange={(e) => setFormCrear((prev) => ({ ...prev, motivo: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {MOTIVOS_ENTREGA.map((motivo) => (
                      <option key={motivo} value={motivo}>
                        {motivo}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Sede</span>
                  <input
                    value={formCrear.sede}
                    onChange={(e) => setFormCrear((prev) => ({ ...prev, sede: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Fecha Programada</span>
                  <input
                    type="date"
                    value={formCrear.fecha_programada}
                    onChange={(e) => setFormCrear((prev) => ({ ...prev, fecha_programada: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Fecha Devolución Esperada</span>
                  <input
                    type="date"
                    value={formCrear.fecha_devolucion_esperada}
                    onChange={(e) => setFormCrear((prev) => ({ ...prev, fecha_devolucion_esperada: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={formCrear.requiere_devolucion}
                  onChange={(e) => setFormCrear((prev) => ({ ...prev, requiere_devolucion: e.target.checked }))}
                />
                Requiere devolución
              </label>

              <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-800">Items de entrega</h4>
                  <button
                    type="button"
                    onClick={agregarItem}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    + Agregar item
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <input
                    value={productosBusqueda}
                    onChange={(e) => setProductosBusqueda(e.target.value)}
                    placeholder="Buscar producto por nombre o código"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <div className="text-sm text-slate-500">
                    {loadingProductos ? 'Buscando productos...' : `${productosOpciones.length} resultado(s)`}
                  </div>
                </div>

                {formCrear.items.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    Agrega items para crear la entrega.
                  </div>
                )}

                {formCrear.items.map((item, index) => (
                  <div key={`item-${index}`} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-6">
                    <select
                      value={item.producto}
                      onChange={(e) => seleccionarProducto(index, e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
                    >
                      <option value="">Seleccionar producto</option>
                      {productosOpciones.map((producto) => (
                        <option key={producto._id} value={producto._id}>
                          {producto.codigo} - {producto.nombre}
                        </option>
                      ))}
                    </select>

                    <input
                      placeholder="Variante"
                      value={item.variante_nombre || ''}
                      onChange={(e) => setItemField(index, 'variante_nombre', e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />

                    <input
                      placeholder="Talla"
                      value={item.talla || ''}
                      onChange={(e) => setItemField(index, 'talla', e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />

                    <input
                      type="number"
                      min="1"
                      placeholder="Cantidad"
                      value={item.cantidad}
                      onChange={(e) => setItemField(index, 'cantidad', e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500">{toCurrency(item.valor_unitario)}</span>
                      <button
                        type="button"
                        onClick={() => quitarItem(index)}
                        className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={cerrarCrear}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
                >
                  Cancelar
                </button>
                <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                  Guardar entrega
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detalleAbierto && entregaSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-800">Detalle Entrega {entregaSeleccionada.codigo}</h3>
              <button type="button" onClick={cerrarDetalle} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
              <div className="md:col-span-2 space-y-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <h4 className="mb-3 text-sm font-semibold text-slate-800">Items</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-600">Producto</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-600">Estado</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-600">Fecha Entrega</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-600">Fecha Devolución</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-600">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ensureArray(entregaSeleccionada.items).map((item, i) => (
                          <tr key={`detalle-item-${i}`}>
                            <td className="px-3 py-2 text-sm text-slate-700">
                              {item.producto?.nombre || item.producto || '-'}
                            </td>
                            <td className="px-3 py-2 text-sm">
                              <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getEstadoClass(item.estado)}`}>
                                {item.estado || '-'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm text-slate-700">{formatDate(item.fecha_entrega)}</td>
                            <td className="px-3 py-2 text-sm text-slate-700">{formatDate(item.fecha_devolucion)}</td>
                            <td className="px-3 py-2 text-right text-sm text-slate-700">{toCurrency(item.valor_total || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <h4 className="mb-3 text-sm font-semibold text-slate-800">Timeline</h4>
                  <ol className="relative border-s border-slate-200">
                    {timeline.map((ev) => (
                      <li key={ev.key} className="mb-4 ms-4">
                        <span
                          className={`absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full border ${
                            ev.estado === 'done' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-white'
                          }`}
                        />
                        <p className="text-sm font-medium text-slate-800">{ev.label}</p>
                        <p className="text-xs text-slate-500">{ev.fecha ? formatDate(ev.fecha) : 'Pendiente'}</p>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-800">Acciones</h4>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => completarEntrega(entregaSeleccionada)}
                      className="rounded-lg border border-emerald-300 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                    >
                      Completar entrega
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDetalleAbierto(false);
                        abrirDevolucion(entregaSeleccionada);
                      }}
                      className="rounded-lg border border-blue-300 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
                    >
                      Registrar devolución
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {devolucionAbierta && entregaSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-800">Registrar devolución</h3>
              <button
                type="button"
                onClick={cerrarDevolucion}
                className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={guardarDevolucion} className="space-y-4 p-5">
              <div className="space-y-3">
                {devolucionItems.map((item, idx) => (
                  <div key={`dev-${idx}`} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-6">
                    <label className="inline-flex items-center gap-2 md:col-span-2">
                      <input
                        type="checkbox"
                        checked={Boolean(item.devolver)}
                        onChange={(e) => setDevolucionField(idx, 'devolver', e.target.checked)}
                      />
                      <span className="text-sm text-slate-700">{item.nombre}</span>
                    </label>

                    <div className="text-sm text-slate-600">Cantidad: {item.cantidad}</div>

                    <select
                      value={item.condicion}
                      onChange={(e) => setDevolucionField(idx, 'condicion', e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      {CONDICIONES_DEVOLUCION.map((cond) => (
                        <option key={cond} value={cond}>
                          {cond}
                        </option>
                      ))}
                    </select>

                    <input
                      placeholder="Notas"
                      value={item.notas}
                      onChange={(e) => setDevolucionField(idx, 'notas', e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={cerrarDevolucion}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
                >
                  Cancelar
                </button>
                <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                  Confirmar devolución
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
