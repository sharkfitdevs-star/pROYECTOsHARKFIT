import React, { useEffect, useMemo, useState } from 'react';

const TABS = {
  TODAS: 'todas',
  BORRADORES: 'borrador',
  PENDIENTES: 'pendiente',
  POR_RECIBIR: 'por_recibir',
  COMPLETADAS: 'completada'
};

const ESTADOS = [
  'borrador',
  'pendiente',
  'aprobada',
  'enviada',
  'parcial',
  'recibida',
  'completada',
  'cancelada'
];

const METODOS_PAGO = ['efectivo', 'transferencia', 'tarjeta_debito', 'tarjeta_credito', 'credito', 'cheque', 'otro'];
const CONDICIONES_PAGO = ['contado', 'credito_15', 'credito_30', 'credito_60', 'credito_90'];

const INITIAL_FILTROS = {
  proveedor: '',
  estado: '',
  sede: '',
  fecha_inicio: '',
  fecha_fin: ''
};

const INITIAL_FORM = {
  proveedor: '',
  proveedor_nombre: '',
  sede: '',
  condicion_pago: 'credito_30',
  fecha_entrega_esperada: '',
  notas: '',
  descuento_global: 0,
  costo_envio: 0,
  otros_impuestos: 0,
  items: []
};

const INITIAL_RECEPCION = {
  numero_guia: '',
  notas: '',
  items: []
};

const INITIAL_PAGO = {
  monto: 0,
  metodo: 'transferencia',
  referencia: '',
  comprobante_url: '',
  notas: ''
};

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function toCurrency(value) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
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

function getEstadoClass(estado) {
  switch (estado) {
    case 'completada':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'recibida':
      return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    case 'parcial':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'aprobada':
    case 'enviada':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'cancelada':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function computeItemSubtotal(item) {
  const cantidad = Number(item.cantidad || 0);
  const precio = Number(item.precio_unitario || 0);
  const descuento = Math.min(Math.max(Number(item.descuento_porcentaje || 0), 0), 100);
  return Math.round(cantidad * precio * (1 - descuento / 100));
}

export default function ComprasSection() {
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tabActiva, setTabActiva] = useState(TABS.TODAS);
  const [filtros, setFiltros] = useState(INITIAL_FILTROS);
  const [paginacion, setPaginacion] = useState({ page: 1, limit: 10, total: 0, total_pages: 1 });

  const [modalOrdenAbierto, setModalOrdenAbierto] = useState(false);
  const [modoOrden, setModoOrden] = useState('crear');
  const [compraSeleccionada, setCompraSeleccionada] = useState(null);
  const [ordenForm, setOrdenForm] = useState(INITIAL_FORM);

  const [proveedorBusqueda, setProveedorBusqueda] = useState('');
  const [proveedoresOpciones, setProveedoresOpciones] = useState([]);
  const [loadingProveedores, setLoadingProveedores] = useState(false);

  const [productoBusqueda, setProductoBusqueda] = useState('');
  const [productosOpciones, setProductosOpciones] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(false);

  const [modalRecepcionAbierto, setModalRecepcionAbierto] = useState(false);
  const [recepcionForm, setRecepcionForm] = useState(INITIAL_RECEPCION);

  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
  const [pagoForm, setPagoForm] = useState(INITIAL_PAGO);

  const [detalleAbierto, setDetalleAbierto] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filtros.proveedor) params.set('proveedor', filtros.proveedor);
    if (filtros.estado) params.set('estado', filtros.estado);
    if (filtros.sede) params.set('sede', filtros.sede);
    if (filtros.fecha_inicio) params.set('fecha_inicio', filtros.fecha_inicio);
    if (filtros.fecha_fin) params.set('fecha_fin', filtros.fecha_fin);
    params.set('page', String(paginacion.page));
    params.set('limit', String(paginacion.limit));
    return params.toString();
  }, [filtros, paginacion.page, paginacion.limit]);

  const endpointCompras = useMemo(() => {
    if (tabActiva === TABS.TODAS) return '/api/inventario/compras';
    if (tabActiva === TABS.POR_RECIBIR) return '/api/inventario/compras?estado=parcial';
    return `/api/inventario/compras?estado=${tabActiva}`;
  }, [tabActiva]);

  const totals = useMemo(() => {
    const subtotal = ensureArray(ordenForm.items).reduce((acc, item) => acc + computeItemSubtotal(item), 0);
    const descuentoGlobal = Number(ordenForm.descuento_global || 0);
    const base = Math.max(subtotal - descuentoGlobal, 0);
    const iva = Math.round(base * 0.19);
    const total = base + iva + Number(ordenForm.otros_impuestos || 0) + Number(ordenForm.costo_envio || 0);
    return { subtotal, iva, total };
  }, [ordenForm.items, ordenForm.descuento_global, ordenForm.otros_impuestos, ordenForm.costo_envio]);

  const cargarCompras = async () => {
    try {
      setLoading(true);
      const sep = endpointCompras.includes('?') ? '&' : '?';
      const response = await fetch(`${endpointCompras}${sep}${queryString}`, { credentials: 'include' });
      if (!response.ok) throw new Error('No se pudo cargar compras');

      const payload = await response.json();
      const list = ensureArray(payload.data);
      setCompras(list);

      const pg = payload.pagination || {};
      setPaginacion((prev) => ({
        ...prev,
        total: Number(pg.total || list.length || 0),
        total_pages: Number(pg.total_pages || 1)
      }));
    } catch (error) {
      window.alert(error.message || 'Error al cargar compras');
      setCompras([]);
    } finally {
      setLoading(false);
    }
  };

  const cargarProveedores = async (q = '') => {
    try {
      setLoadingProveedores(true);
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      params.set('limit', '20');

      const response = await fetch(`/api/inventario/proveedores?${params.toString()}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('No se pudieron cargar proveedores');

      const payload = await response.json();
      setProveedoresOpciones(ensureArray(payload.data));
    } catch (error) {
      window.alert(error.message || 'Error al buscar proveedores');
      setProveedoresOpciones([]);
    } finally {
      setLoadingProveedores(false);
    }
  };

  const cargarProductos = async (q = '') => {
    try {
      setLoadingProductos(true);
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      params.set('limit', '30');

      const response = await fetch(`/api/inventario/productos?${params.toString()}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('No se pudieron cargar productos');

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
    cargarCompras();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabActiva, queryString]);

  useEffect(() => {
    if (!modalOrdenAbierto) return;
    const timer = setTimeout(() => {
      cargarProveedores(proveedorBusqueda);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proveedorBusqueda, modalOrdenAbierto]);

  useEffect(() => {
    if (!modalOrdenAbierto) return;
    const timer = setTimeout(() => {
      cargarProductos(productoBusqueda);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoBusqueda, modalOrdenAbierto]);

  const setFiltro = (field, value) => {
    setPaginacion((prev) => ({ ...prev, page: 1 }));
    setFiltros((prev) => ({ ...prev, [field]: value }));
  };

  const goToPage = (nextPage) => {
    setPaginacion((prev) => ({
      ...prev,
      page: Math.min(Math.max(nextPage, 1), Math.max(prev.total_pages || 1, 1))
    }));
  };

  const pages = useMemo(() => {
    const max = Math.max(Number(paginacion.total_pages || 1), 1);
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [paginacion.total_pages]);

  const resetOrden = () => {
    setOrdenForm(INITIAL_FORM);
    setProveedorBusqueda('');
    setProductoBusqueda('');
    setProveedoresOpciones([]);
    setProductosOpciones([]);
  };

  const abrirCrear = () => {
    setModoOrden('crear');
    setCompraSeleccionada(null);
    resetOrden();
    setModalOrdenAbierto(true);
  };

  const abrirEditar = (compra) => {
    setModoOrden('editar');
    setCompraSeleccionada(compra);
    setOrdenForm({
      proveedor: compra.proveedor?._id || compra.proveedor || '',
      proveedor_nombre: compra.proveedor?.razon_social || compra.datos_proveedor?.nombre || '',
      sede: compra.sede || '',
      condicion_pago: compra.condicion_pago || 'credito_30',
      fecha_entrega_esperada: compra.fecha_entrega_esperada ? compra.fecha_entrega_esperada.slice(0, 10) : '',
      notas: compra.notas || '',
      descuento_global: Number(compra.descuento_global || 0),
      costo_envio: Number(compra.costo_envio || 0),
      otros_impuestos: Number(compra.otros_impuestos || 0),
      items: ensureArray(compra.items).map((it) => ({
        _id: it._id,
        producto: it.producto?._id || it.producto || '',
        producto_nombre: it.producto?.nombre || '',
        variante_nombre: it.variante_nombre || '',
        cantidad: Number(it.cantidad || 1),
        precio_unitario: Number(it.precio_unitario || 0),
        descuento_porcentaje: Number(it.descuento_porcentaje || 0)
      }))
    });
    setModalOrdenAbierto(true);
  };

  const cerrarOrden = () => {
    setModalOrdenAbierto(false);
    setCompraSeleccionada(null);
    resetOrden();
  };

  const seleccionarProveedor = (id) => {
    const prov = proveedoresOpciones.find((p) => p._id === id);
    setOrdenForm((prev) => ({
      ...prev,
      proveedor: id,
      proveedor_nombre: prov?.razon_social || prov?.nombre_fantasia || ''
    }));
  };

  const agregarItem = () => {
    setOrdenForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          producto: '',
          producto_nombre: '',
          cantidad: 1,
          precio_unitario: 0,
          descuento_porcentaje: 0,
          variante_nombre: ''
        }
      ]
    }));
  };

  const eliminarItem = (index) => {
    setOrdenForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const seleccionarProducto = (index, productoId) => {
    const producto = productosOpciones.find((p) => p._id === productoId);
    setOrdenForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          producto: productoId,
          producto_nombre: producto?.nombre || '',
          precio_unitario: Number(producto?.precio_costo || producto?.precio_venta || 0)
        };
      })
    }));
  };

  const setItemField = (index, field, value) => {
    setOrdenForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i !== index) return item;
        const numericFields = ['cantidad', 'precio_unitario', 'descuento_porcentaje'];
        return {
          ...item,
          [field]: numericFields.includes(field) ? Number(value || 0) : value
        };
      })
    }));
  };

  const guardarOrden = async (estadoObjetivo = null) => {
    if (!ordenForm.proveedor) {
      window.alert('Debes seleccionar un proveedor');
      return;
    }
    if (!ordenForm.sede) {
      window.alert('Debes indicar la sede');
      return;
    }
    if (ordenForm.items.length === 0) {
      window.alert('Debes agregar al menos un item');
      return;
    }

    const invalidItems = ordenForm.items.some((it) => !it.producto || Number(it.cantidad) <= 0 || Number(it.precio_unitario) < 0);
    if (invalidItems) {
      window.alert('Revisa los items: producto, cantidad y precio son obligatorios');
      return;
    }

    try {
      const payload = {
        proveedor: ordenForm.proveedor,
        sede: ordenForm.sede,
        condicion_pago: ordenForm.condicion_pago,
        fecha_entrega_esperada: ordenForm.fecha_entrega_esperada || null,
        notas: ordenForm.notas,
        descuento_global: Number(ordenForm.descuento_global || 0),
        costo_envio: Number(ordenForm.costo_envio || 0),
        otros_impuestos: Number(ordenForm.otros_impuestos || 0),
        subtotal: totals.subtotal,
        iva: totals.iva,
        total: totals.total,
        estado: estadoObjetivo || (modoOrden === 'crear' ? 'borrador' : undefined),
        items: ordenForm.items.map((it) => ({
          producto: it.producto,
          variante_nombre: it.variante_nombre || null,
          cantidad: Number(it.cantidad),
          precio_unitario: Number(it.precio_unitario),
          descuento_porcentaje: Number(it.descuento_porcentaje || 0),
          subtotal: computeItemSubtotal(it)
        }))
      };

      if (payload.estado === undefined) delete payload.estado;

      const isEdit = modoOrden === 'editar' && compraSeleccionada?._id;
      const url = isEdit ? `/api/inventario/compras/${compraSeleccionada._id}` : '/api/inventario/compras';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo guardar la orden');
      }

      const result = await response.json().catch(() => null);
      const compraResult = result?.data || null;

      if (estadoObjetivo === 'aprobada' && compraResult?._id) {
        const aprobarRes = await fetch(`/api/inventario/compras/${compraResult._id}/aprobar`, {
          method: 'POST',
          credentials: 'include'
        });
        if (!aprobarRes.ok) {
          const err = await aprobarRes.json().catch(() => ({}));
          throw new Error(err.error || 'La orden se guardo pero no se pudo aprobar');
        }
      }

      cerrarOrden();
      await cargarCompras();
    } catch (error) {
      window.alert(error.message || 'Error al guardar orden');
    }
  };

  const abrirRecepcion = (compra) => {
    setCompraSeleccionada(compra);
    setRecepcionForm({
      numero_guia: '',
      notas: '',
      items: ensureArray(compra.items).map((it) => ({
        item_id: it._id,
        producto_nombre: it.producto?.nombre || 'Producto',
        cantidad_pendiente: Math.max(Number(it.cantidad || 0) - Number(it.cantidad_recibida || 0), 0),
        cantidad_recibida: 0,
        numero_lote: it.numero_lote || '',
        fecha_vencimiento: it.fecha_vencimiento ? String(it.fecha_vencimiento).slice(0, 10) : '',
        observaciones: ''
      }))
    });
    setModalRecepcionAbierto(true);
  };

  const cerrarRecepcion = () => {
    setModalRecepcionAbierto(false);
    setRecepcionForm(INITIAL_RECEPCION);
  };

  const setRecepcionField = (index, field, value) => {
    setRecepcionForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          [field]: field === 'cantidad_recibida' ? Number(value || 0) : value
        };
      })
    }));
  };

  const guardarRecepcion = async (e) => {
    e.preventDefault();
    if (!compraSeleccionada?._id) return;

    const items = recepcionForm.items
      .filter((it) => Number(it.cantidad_recibida) > 0)
      .map((it) => ({
        item_id: it.item_id,
        cantidad_recibida: Number(it.cantidad_recibida),
        numero_lote: it.numero_lote || undefined,
        fecha_vencimiento: it.fecha_vencimiento || undefined,
        observaciones: it.observaciones || undefined
      }));

    if (items.length === 0) {
      window.alert('Debes registrar al menos una cantidad recibida mayor a 0');
      return;
    }

    try {
      const response = await fetch(`/api/inventario/compras/${compraSeleccionada._id}/recepcion`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero_guia: recepcionForm.numero_guia,
          notas: recepcionForm.notas,
          items
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo registrar la recepcion');
      }

      cerrarRecepcion();
      await cargarCompras();
    } catch (error) {
      window.alert(error.message || 'Error al registrar recepcion');
    }
  };

  const abrirPago = (compra) => {
    setCompraSeleccionada(compra);
    setPagoForm({
      ...INITIAL_PAGO,
      monto: Number(compra.saldo_pendiente || compra.total || 0)
    });
    setModalPagoAbierto(true);
  };

  const cerrarPago = () => {
    setModalPagoAbierto(false);
    setPagoForm(INITIAL_PAGO);
  };

  const guardarPago = async (e) => {
    e.preventDefault();
    if (!compraSeleccionada?._id) return;
    if (Number(pagoForm.monto) <= 0) {
      window.alert('Monto invalido');
      return;
    }

    try {
      const response = await fetch(`/api/inventario/compras/${compraSeleccionada._id}/pagos`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto: Number(pagoForm.monto),
          metodo: pagoForm.metodo,
          referencia: pagoForm.referencia,
          comprobante_url: pagoForm.comprobante_url,
          notas: pagoForm.notas
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo registrar el pago');
      }

      cerrarPago();
      await cargarCompras();
    } catch (error) {
      window.alert(error.message || 'Error al registrar pago');
    }
  };

  const abrirDetalle = (compra) => {
    setCompraSeleccionada(compra);
    setDetalleAbierto(true);
  };

  const cerrarDetalle = () => {
    setDetalleAbierto(false);
    setCompraSeleccionada(null);
  };

  const enviarOrden = async (compra) => {
    try {
      const response = await fetch(`/api/inventario/compras/${compra._id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'enviada' })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo enviar la orden');
      }
      await cargarCompras();
    } catch (error) {
      window.alert(error.message || 'Error al enviar orden');
    }
  };

  const aprobarOrden = async (compra) => {
    try {
      const response = await fetch(`/api/inventario/compras/${compra._id}/aprobar`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo aprobar la orden');
      }
      await cargarCompras();
    } catch (error) {
      window.alert(error.message || 'Error al aprobar orden');
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Compras</h2>
          <p className="text-sm text-slate-500">Ordenes de compra, recepciones y pagos</p>
        </div>
        <button
          type="button"
          onClick={abrirCrear}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Nueva Orden
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTabActiva(TABS.TODAS)}
          className={`rounded-full px-4 py-2 text-sm ${tabActiva === TABS.TODAS ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
        >
          Todas
        </button>
        <button
          type="button"
          onClick={() => setTabActiva(TABS.BORRADORES)}
          className={`rounded-full px-4 py-2 text-sm ${tabActiva === TABS.BORRADORES ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
        >
          Borradores
        </button>
        <button
          type="button"
          onClick={() => setTabActiva(TABS.PENDIENTES)}
          className={`rounded-full px-4 py-2 text-sm ${tabActiva === TABS.PENDIENTES ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
        >
          Pendientes
        </button>
        <button
          type="button"
          onClick={() => setTabActiva(TABS.POR_RECIBIR)}
          className={`rounded-full px-4 py-2 text-sm ${tabActiva === TABS.POR_RECIBIR ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
        >
          Por Recibir
        </button>
        <button
          type="button"
          onClick={() => setTabActiva(TABS.COMPLETADAS)}
          className={`rounded-full px-4 py-2 text-sm ${tabActiva === TABS.COMPLETADAS ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
        >
          Completadas
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-5">
        <input
          value={filtros.proveedor}
          onChange={(e) => setFiltro('proveedor', e.target.value)}
          placeholder="Proveedor (ID)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={filtros.estado}
          onChange={(e) => setFiltro('estado', e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((estado) => (
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
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-slate-600">Codigo</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-slate-600">Proveedor</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-slate-600">Fecha</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-slate-600">Items</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-slate-600">Subtotal</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-slate-600">IVA</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-slate-600">Total</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-slate-600">Estado</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-slate-600">% Recibido</th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-sm text-slate-500">
                  Cargando compras...
                </td>
              </tr>
            )}
            {!loading && compras.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-sm text-slate-500">
                  No hay compras para mostrar
                </td>
              </tr>
            )}
            {!loading &&
              compras.map((compra) => (
                <tr key={compra._id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-slate-700">{compra.codigo || '-'}</td>
                  <td className="px-3 py-3 text-sm text-slate-700">
                    {compra.proveedor?.nombre_fantasia || compra.proveedor?.razon_social || compra.datos_proveedor?.nombre || '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-700">{formatDate(compra.fecha_emision)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-700">{ensureArray(compra.items).length}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-700">{toCurrency(compra.subtotal)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-700">{toCurrency(compra.iva)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-700">{toCurrency(compra.total)}</td>
                  <td className="px-3 py-3 text-sm">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getEstadoClass(compra.estado)}`}>
                      {compra.estado || '-'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-700">
                    {Number(compra.porcentaje_recibido || 0)}%
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm">
                    <div className="inline-flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => abrirDetalle(compra)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirEditar(compra)}
                        className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirRecepcion(compra)}
                        className="rounded border border-cyan-300 px-2 py-1 text-xs text-cyan-700 hover:bg-cyan-50"
                      >
                        Recepcion
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirPago(compra)}
                        className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
                      >
                        Pago
                      </button>
                      <button
                        type="button"
                        onClick={() => enviarOrden(compra)}
                        className="rounded border border-amber-300 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50"
                      >
                        Enviar
                      </button>
                      <button
                        type="button"
                        onClick={() => aprobarOrden(compra)}
                        className="rounded border border-violet-300 px-2 py-1 text-xs text-violet-700 hover:bg-violet-50"
                      >
                        Aprobar
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
          Pagina {paginacion.page} de {Math.max(paginacion.total_pages || 1, 1)} - Total: {paginacion.total}
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

      {modalOrdenAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-800">
                {modoOrden === 'crear' ? 'Crear Orden de Compra' : 'Editar Orden de Compra'}
              </h3>
              <button type="button" onClick={cerrarOrden} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">
                X
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Proveedor</label>
                  <input
                    value={proveedorBusqueda}
                    onChange={(e) => setProveedorBusqueda(e.target.value)}
                    placeholder="Buscar proveedor por nombre, rut o codigo"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <select
                    value={ordenForm.proveedor}
                    onChange={(e) => seleccionarProveedor(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar proveedor</option>
                    {proveedoresOpciones.map((p) => (
                      <option key={p._id} value={p._id}>
                        {(p.codigo || '') + ' - ' + (p.razon_social || p.nombre_fantasia || '')}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500">{loadingProveedores ? 'Buscando proveedores...' : `${proveedoresOpciones.length} resultado(s)`}</p>
                </div>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Sede</span>
                  <input
                    value={ordenForm.sede}
                    onChange={(e) => setOrdenForm((prev) => ({ ...prev, sede: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Condicion pago</span>
                  <select
                    value={ordenForm.condicion_pago}
                    onChange={(e) => setOrdenForm((prev) => ({ ...prev, condicion_pago: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {CONDICIONES_PAGO.map((cp) => (
                      <option key={cp} value={cp}>
                        {cp}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Fecha entrega esperada</span>
                  <input
                    type="date"
                    value={ordenForm.fecha_entrega_esperada}
                    onChange={(e) => setOrdenForm((prev) => ({ ...prev, fecha_entrega_esperada: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Descuento global</span>
                  <input
                    type="number"
                    min="0"
                    value={ordenForm.descuento_global}
                    onChange={(e) => setOrdenForm((prev) => ({ ...prev, descuento_global: Number(e.target.value || 0) }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Costo envio</span>
                  <input
                    type="number"
                    min="0"
                    value={ordenForm.costo_envio}
                    onChange={(e) => setOrdenForm((prev) => ({ ...prev, costo_envio: Number(e.target.value || 0) }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Otros impuestos</span>
                  <input
                    type="number"
                    min="0"
                    value={ordenForm.otros_impuestos}
                    onChange={(e) => setOrdenForm((prev) => ({ ...prev, otros_impuestos: Number(e.target.value || 0) }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Notas</span>
                <textarea
                  rows={3}
                  value={ordenForm.notas}
                  onChange={(e) => setOrdenForm((prev) => ({ ...prev, notas: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-800">Items</h4>
                  <button
                    type="button"
                    onClick={agregarItem}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    + Agregar item
                  </button>
                </div>

                <input
                  value={productoBusqueda}
                  onChange={(e) => setProductoBusqueda(e.target.value)}
                  placeholder="Buscar producto"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <p className="text-xs text-slate-500">{loadingProductos ? 'Buscando productos...' : `${productosOpciones.length} resultado(s)`}</p>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-600">Producto</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-600">Cantidad</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-600">Precio Unitario</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-600">Descuento %</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-600">Subtotal</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-600">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {ordenForm.items.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-500">
                            Agrega items para la orden
                          </td>
                        </tr>
                      )}
                      {ordenForm.items.map((item, index) => (
                        <tr key={`orden-item-${index}`}>
                          <td className="px-3 py-2">
                            <select
                              value={item.producto}
                              onChange={(e) => seleccionarProducto(index, e.target.value)}
                              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                            >
                              <option value="">Seleccionar producto</option>
                              {productosOpciones.map((p) => (
                                <option key={p._id} value={p._id}>
                                  {(p.codigo || '') + ' - ' + (p.nombre || '')}
                                </option>
                              ))}
                            </select>
                            <input
                              value={item.variante_nombre || ''}
                              onChange={(e) => setItemField(index, 'variante_nombre', e.target.value)}
                              placeholder="Variante / talla"
                              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="1"
                              value={item.cantidad}
                              onChange={(e) => setItemField(index, 'cantidad', e.target.value)}
                              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              value={item.precio_unitario}
                              onChange={(e) => setItemField(index, 'precio_unitario', e.target.value)}
                              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.descuento_porcentaje}
                              onChange={(e) => setItemField(index, 'descuento_porcentaje', e.target.value)}
                              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                            />
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right text-sm text-slate-700">
                            {toCurrency(computeItemSubtotal(item))}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => eliminarItem(index)}
                              className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
                <p className="text-sm text-slate-700">Subtotal: <strong>{toCurrency(totals.subtotal)}</strong></p>
                <p className="text-sm text-slate-700">IVA 19%: <strong>{toCurrency(totals.iva)}</strong></p>
                <p className="text-sm text-slate-700">Total: <strong>{toCurrency(totals.total)}</strong></p>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={cerrarOrden}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => guardarOrden('borrador')}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Guardar Borrador
                </button>
                <button
                  type="button"
                  onClick={() => guardarOrden('enviada')}
                  className="rounded-lg border border-amber-300 px-4 py-2 text-sm text-amber-700 hover:bg-amber-50"
                >
                  Enviar
                </button>
                <button
                  type="button"
                  onClick={() => guardarOrden('aprobada')}
                  className="rounded-lg border border-violet-300 px-4 py-2 text-sm text-violet-700 hover:bg-violet-50"
                >
                  Aprobar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalRecepcionAbierto && compraSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-800">Registrar Recepcion {compraSeleccionada.codigo}</h3>
              <button type="button" onClick={cerrarRecepcion} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">
                X
              </button>
            </div>

            <form onSubmit={guardarRecepcion} className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Numero guia</span>
                  <input
                    value={recepcionForm.numero_guia}
                    onChange={(e) => setRecepcionForm((prev) => ({ ...prev, numero_guia: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700">Notas</span>
                  <input
                    value={recepcionForm.notas}
                    onChange={(e) => setRecepcionForm((prev) => ({ ...prev, notas: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="space-y-2">
                {recepcionForm.items.map((item, index) => (
                  <div key={`rec-item-${index}`} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-6">
                    <div className="text-sm text-slate-700 md:col-span-2">{item.producto_nombre}</div>
                    <div className="text-xs text-slate-500">Pendiente: {item.cantidad_pendiente}</div>
                    <input
                      type="number"
                      min="0"
                      max={item.cantidad_pendiente}
                      value={item.cantidad_recibida}
                      onChange={(e) => setRecepcionField(index, 'cantidad_recibida', e.target.value)}
                      placeholder="Cantidad recibir"
                      className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                    />
                    <input
                      value={item.numero_lote}
                      onChange={(e) => setRecepcionField(index, 'numero_lote', e.target.value)}
                      placeholder="Numero lote"
                      className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                    />
                    <input
                      type="date"
                      value={item.fecha_vencimiento}
                      onChange={(e) => setRecepcionField(index, 'fecha_vencimiento', e.target.value)}
                      className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={cerrarRecepcion}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
                >
                  Cancelar
                </button>
                <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                  Guardar recepcion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalPagoAbierto && compraSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-800">Registrar Pago {compraSeleccionada.codigo}</h3>
              <button type="button" onClick={cerrarPago} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">
                X
              </button>
            </div>

            <form onSubmit={guardarPago} className="space-y-4 p-5">
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Monto</span>
                <input
                  type="number"
                  min="1"
                  value={pagoForm.monto}
                  onChange={(e) => setPagoForm((prev) => ({ ...prev, monto: Number(e.target.value || 0) }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Metodo</span>
                <select
                  value={pagoForm.metodo}
                  onChange={(e) => setPagoForm((prev) => ({ ...prev, metodo: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {METODOS_PAGO.map((metodo) => (
                    <option key={metodo} value={metodo}>
                      {metodo}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Referencia</span>
                <input
                  value={pagoForm.referencia}
                  onChange={(e) => setPagoForm((prev) => ({ ...prev, referencia: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Comprobante (URL)</span>
                <input
                  value={pagoForm.comprobante_url}
                  onChange={(e) => setPagoForm((prev) => ({ ...prev, comprobante_url: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Notas</span>
                <textarea
                  rows={3}
                  value={pagoForm.notas}
                  onChange={(e) => setPagoForm((prev) => ({ ...prev, notas: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={cerrarPago}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
                >
                  Cancelar
                </button>
                <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                  Guardar pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detalleAbierto && compraSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-800">Detalle Compra {compraSeleccionada.codigo}</h3>
              <button type="button" onClick={cerrarDetalle} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">
                X
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
              <div className="space-y-4 md:col-span-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <h4 className="mb-3 text-sm font-semibold text-slate-800">Items</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-600">Producto</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-600">Cant.</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-600">Recibida</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-slate-600">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ensureArray(compraSeleccionada.items).map((item, i) => (
                          <tr key={`detalle-item-${i}`}>
                            <td className="px-3 py-2 text-sm text-slate-700">{item.producto?.nombre || item.producto || '-'}</td>
                            <td className="px-3 py-2 text-sm text-slate-700">{item.cantidad}</td>
                            <td className="px-3 py-2 text-sm text-slate-700">{item.cantidad_recibida}</td>
                            <td className="px-3 py-2 text-right text-sm text-slate-700">{toCurrency(item.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <h4 className="mb-3 text-sm font-semibold text-slate-800">Historial recepciones</h4>
                  {ensureArray(compraSeleccionada.recepciones).length === 0 && (
                    <p className="text-sm text-slate-500">Sin recepciones registradas.</p>
                  )}
                  <div className="space-y-2">
                    {ensureArray(compraSeleccionada.recepciones).map((rec, i) => (
                      <div key={`rec-${i}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                        <p><strong>Fecha:</strong> {formatDate(rec.fecha)}</p>
                        <p><strong>Guia:</strong> {rec.numero_guia || '-'}</p>
                        <p><strong>Items:</strong> {ensureArray(rec.items).length}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <h4 className="mb-3 text-sm font-semibold text-slate-800">Historial pagos</h4>
                  {ensureArray(compraSeleccionada.pagos).length === 0 && (
                    <p className="text-sm text-slate-500">Sin pagos registrados.</p>
                  )}
                  <div className="space-y-2">
                    {ensureArray(compraSeleccionada.pagos).map((pago, i) => (
                      <div key={`pago-${i}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                        <p><strong>Fecha:</strong> {formatDate(pago.fecha)}</p>
                        <p><strong>Monto:</strong> {toCurrency(pago.monto)}</p>
                        <p><strong>Metodo:</strong> {pago.metodo || '-'}</p>
                        <p><strong>Referencia:</strong> {pago.referencia || '-'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                  <h4 className="mb-2 font-semibold text-slate-800">Resumen</h4>
                  <p>Estado: <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getEstadoClass(compraSeleccionada.estado)}`}>{compraSeleccionada.estado}</span></p>
                  <p>Subtotal: {toCurrency(compraSeleccionada.subtotal)}</p>
                  <p>IVA: {toCurrency(compraSeleccionada.iva)}</p>
                  <p>Total: {toCurrency(compraSeleccionada.total)}</p>
                  <p>Monto pagado: {toCurrency(compraSeleccionada.monto_pagado)}</p>
                  <p>Saldo pendiente: {toCurrency(compraSeleccionada.saldo_pendiente)}</p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-800">Acciones</h4>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDetalleAbierto(false);
                        abrirRecepcion(compraSeleccionada);
                      }}
                      className="rounded-lg border border-cyan-300 px-3 py-2 text-sm text-cyan-700 hover:bg-cyan-50"
                    >
                      Registrar recepcion
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDetalleAbierto(false);
                        abrirPago(compraSeleccionada);
                      }}
                      className="rounded-lg border border-emerald-300 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                    >
                      Registrar pago
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
