import React, { useEffect, useMemo, useState } from 'react';

const CATEGORIAS = [
  '',
  'equipamiento',
  'indumentaria',
  'suplementos',
  'accesorios',
  'tecnologia',
  'limpieza',
  'oficina',
  'mobiliario',
  'merchandising',
  'otros'
];

const TIPOS = ['', 'venta', 'interno', 'mixto'];
const ESTADOS = ['', 'activo', 'descontinuado', 'agotado', 'proximamente'];

const INITIAL_FORM = {
  nombre: '',
  codigo: '',
  categoria: 'equipamiento',
  tipo: 'mixto',
  precio_costo: 0,
  precio_venta: 0,
  stock_minimo: 5,
  proveedor_principal: '',
  descripcion: ''
};

function getEstadoBadgeClass(estado) {
  switch (estado) {
    case 'activo':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'agotado':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'descontinuado':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    case 'proximamente':
      return 'bg-sky-100 text-sky-800 border-sky-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function getCategoriaBadgeClass(categoria) {
  switch (categoria) {
    case 'equipamiento':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'indumentaria':
      return 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200';
    case 'suplementos':
      return 'bg-lime-100 text-lime-800 border-lime-200';
    case 'tecnologia':
      return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    case 'mobiliario':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function toCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount);
}

export default function ProductosSection() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    q: '',
    categoria: '',
    tipo: '',
    estado: ''
  });
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [paginacion, setPaginacion] = useState({
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 1
  });

  const [modoModal, setModoModal] = useState('crear');
  const [formData, setFormData] = useState(INITIAL_FORM);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filtros.q) params.set('q', filtros.q);
    if (filtros.categoria) params.set('categoria', filtros.categoria);
    if (filtros.tipo) params.set('tipo', filtros.tipo);
    if (filtros.estado) params.set('estado', filtros.estado);
    params.set('page', String(paginacion.page));
    params.set('limit', String(paginacion.limit));
    return params.toString();
  }, [filtros, paginacion.page, paginacion.limit]);

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/inventario/productos?${queryString}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('No se pudo obtener el listado de productos');
      }

      const payload = await response.json();
      const lista = Array.isArray(payload.data) ? payload.data : [];
      setProductos(lista);

      const apiPagination = payload.pagination || {};
      setPaginacion((prev) => ({
        ...prev,
        total: Number(apiPagination.total || lista.length || 0),
        total_pages: Number(apiPagination.total_pages || 1)
      }));
    } catch (error) {
      window.alert(error.message || 'Error al cargar productos');
      setProductos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProductos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  const abrirModalCrear = () => {
    setModoModal('crear');
    setProductoSeleccionado(null);
    setFormData(INITIAL_FORM);
    setModalAbierto(true);
  };

  const abrirModalVer = (producto) => {
    setModoModal('ver');
    setProductoSeleccionado(producto);
    setFormData({
      nombre: producto.nombre || '',
      codigo: producto.codigo || '',
      categoria: producto.categoria || 'equipamiento',
      tipo: producto.tipo || 'mixto',
      precio_costo: Number(producto.precio_costo || 0),
      precio_venta: Number(producto.precio_venta || 0),
      stock_minimo: Number(producto.stock_minimo || 5),
      proveedor_principal: producto.proveedor_principal?._id || producto.proveedor_principal || '',
      descripcion: producto.descripcion || ''
    });
    setModalAbierto(true);
  };

  const abrirModalEditar = (producto) => {
    setModoModal('editar');
    setProductoSeleccionado(producto);
    setFormData({
      nombre: producto.nombre || '',
      codigo: producto.codigo || '',
      categoria: producto.categoria || 'equipamiento',
      tipo: producto.tipo || 'mixto',
      precio_costo: Number(producto.precio_costo || 0),
      precio_venta: Number(producto.precio_venta || 0),
      stock_minimo: Number(producto.stock_minimo || 5),
      proveedor_principal: producto.proveedor_principal?._id || producto.proveedor_principal || '',
      descripcion: producto.descripcion || ''
    });
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setProductoSeleccionado(null);
    setFormData(INITIAL_FORM);
    setModoModal('crear');
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ['precio_costo', 'precio_venta', 'stock_minimo'].includes(name)
        ? Number(value)
        : value
    }));
  };

  const handleGuardar = async (event) => {
    event.preventDefault();

    if (modoModal === 'ver') {
      cerrarModal();
      return;
    }

    try {
      const isEdit = modoModal === 'editar' && productoSeleccionado?._id;
      const method = isEdit ? 'PUT' : 'POST';
      const url = isEdit
        ? `/api/inventario/productos/${productoSeleccionado._id}`
        : '/api/inventario/productos';

      const body = {
        ...formData,
        proveedor_principal: formData.proveedor_principal || null
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        throw new Error(errPayload.error || 'No se pudo guardar el producto');
      }

      cerrarModal();
      await cargarProductos();
    } catch (error) {
      window.alert(error.message || 'Error al guardar el producto');
    }
  };

  const handleEliminar = async (producto) => {
    const confirmado = window.confirm(`¿Eliminar producto ${producto.nombre}?`);
    if (!confirmado) return;

    try {
      const response = await fetch(`/api/inventario/productos/${producto._id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        throw new Error(errPayload.error || 'No se pudo eliminar el producto');
      }

      await cargarProductos();
    } catch (error) {
      window.alert(error.message || 'Error al eliminar producto');
    }
  };

  const irPagina = (nextPage) => {
    setPaginacion((prev) => ({
      ...prev,
      page: Math.min(Math.max(nextPage, 1), Math.max(prev.total_pages, 1))
    }));
  };

  const onFiltroChange = (name, value) => {
    setPaginacion((prev) => ({ ...prev, page: 1 }));
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const paginas = useMemo(() => {
    const totalPages = Math.max(paginacion.total_pages || 1, 1);
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }, [paginacion.total_pages]);

  const modalTitulo =
    modoModal === 'crear'
      ? 'Crear Producto'
      : modoModal === 'editar'
      ? 'Editar Producto'
      : 'Ver Producto';

  const camposSoloLectura = modoModal === 'ver';

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Productos</h2>
          <p className="text-sm text-slate-500">Gestión del catálogo de inventario</p>
        </div>

        <button
          type="button"
          onClick={abrirModalCrear}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Nuevo Producto
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-4">
        <input
          type="text"
          placeholder="Buscar por nombre o código"
          value={filtros.q}
          onChange={(e) => onFiltroChange('q', e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-slate-500"
        />

        <select
          value={filtros.categoria}
          onChange={(e) => onFiltroChange('categoria', e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-slate-500"
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS.filter(Boolean).map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          value={filtros.tipo}
          onChange={(e) => onFiltroChange('tipo', e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-slate-500"
        >
          <option value="">Todos los tipos</option>
          {TIPOS.filter(Boolean).map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>

        <select
          value={filtros.estado}
          onChange={(e) => onFiltroChange('estado', e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-slate-500"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.filter(Boolean).map((estado) => (
            <option key={estado} value={estado}>
              {estado}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Código</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Nombre</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Categoría</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Tipo</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Precio Costo</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Precio Venta</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Estado</th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Acciones</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {loading && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-500">
                  Cargando productos...
                </td>
              </tr>
            )}

            {!loading && productos.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-500">
                  No hay productos para mostrar
                </td>
              </tr>
            )}

            {!loading &&
              productos.map((producto) => (
                <tr key={producto._id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-slate-700">{producto.codigo || '-'}</td>
                  <td className="px-3 py-3 text-sm text-slate-700">{producto.nombre || '-'}</td>
                  <td className="px-3 py-3 text-sm">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getCategoriaBadgeClass(
                        producto.categoria
                      )}`}
                    >
                      {producto.categoria || 'sin categoría'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-700">{producto.tipo || '-'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-700">{toCurrency(producto.precio_costo)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-700">{toCurrency(producto.precio_venta)}</td>
                  <td className="px-3 py-3 text-sm">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getEstadoBadgeClass(
                        producto.estado
                      )}`}
                    >
                      {producto.estado || 'sin estado'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm">
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => abrirModalVer(producto)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirModalEditar(producto)}
                        className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEliminar(producto)}
                        className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                      >
                        Eliminar
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
            onClick={() => irPagina(paginacion.page - 1)}
            disabled={paginacion.page <= 1}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Prev
          </button>

          <select
            value={paginacion.page}
            onChange={(e) => irPagina(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-700"
          >
            {paginas.map((pageNumber) => (
              <option key={pageNumber} value={pageNumber}>
                {pageNumber}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => irPagina(paginacion.page + 1)}
            disabled={paginacion.page >= Math.max(paginacion.total_pages || 1, 1)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-800">{modalTitulo}</h3>
              <button
                type="button"
                onClick={cerrarModal}
                className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardar} className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Nombre</span>
                  <input
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleFormChange}
                    disabled={camposSoloLectura}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Código</span>
                  <input
                    name="codigo"
                    value={formData.codigo}
                    onChange={handleFormChange}
                    disabled={camposSoloLectura}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Categoría</span>
                  <select
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleFormChange}
                    disabled={camposSoloLectura}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100"
                  >
                    {CATEGORIAS.filter(Boolean).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Tipo</span>
                  <select
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleFormChange}
                    disabled={camposSoloLectura}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100"
                  >
                    {TIPOS.filter(Boolean).map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Precio Costo</span>
                  <input
                    type="number"
                    min="0"
                    name="precio_costo"
                    value={formData.precio_costo}
                    onChange={handleFormChange}
                    disabled={camposSoloLectura}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Precio Venta</span>
                  <input
                    type="number"
                    min="0"
                    name="precio_venta"
                    value={formData.precio_venta}
                    onChange={handleFormChange}
                    disabled={camposSoloLectura}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Stock Mínimo</span>
                  <input
                    type="number"
                    min="0"
                    name="stock_minimo"
                    value={formData.stock_minimo}
                    onChange={handleFormChange}
                    disabled={camposSoloLectura}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Proveedor (ID)</span>
                  <input
                    name="proveedor_principal"
                    value={formData.proveedor_principal}
                    onChange={handleFormChange}
                    disabled={camposSoloLectura}
                    placeholder="ObjectId del proveedor"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100"
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Descripción</span>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleFormChange}
                  disabled={camposSoloLectura}
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100"
                />
              </label>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cerrar
                </button>

                {modoModal !== 'ver' && (
                  <button
                    type="submit"
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                  >
                    Guardar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
