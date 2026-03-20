import React, { useEffect, useMemo, useState } from 'react';

const TIPOS_PROVEEDOR = ['', 'nacional', 'internacional', 'distribuidor', 'fabricante', 'mayorista'];
const ESTADOS_PROVEEDOR = ['', 'activo', 'inactivo', 'suspendido', 'evaluacion'];
const CATEGORIAS = [
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

const FORMAS_PAGO = ['contado', 'credito_30', 'credito_60', 'credito_90', 'contra_entrega', 'anticipado'];

const TABS = {
  DATOS: 'datos',
  CONTACTOS: 'contactos',
  BANCARIOS: 'bancarios',
  CONDICIONES: 'condiciones'
};

const INITIAL_FORM = {
  rut: '',
  razon_social: '',
  nombre_fantasia: '',
  tipo: 'nacional',
  categorias: [],
  telefono_principal: '',
  email_principal: '',
  direccion: {
    calle: '',
    numero: '',
    comuna: '',
    ciudad: '',
    region: '',
    pais: 'Chile'
  },
  contactos: [],
  cuentas_bancarias: [],
  condiciones_pago: {
    forma_pago: 'credito_30',
    dias_credito: 30
  },
  condiciones_entrega: {
    tiempo_entrega_dias: 7,
    costo_despacho: 0
  }
};

const INITIAL_EVAL = {
  calificacion_entregas: 3,
  calificacion_calidad: 3,
  calificacion_precios: 3,
  calificacion_servicio: 3,
  comentarios: ''
};

function buildEstadoBadge(estado) {
  switch (estado) {
    case 'activo':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'suspendido':
      return 'bg-rose-100 text-rose-800 border-rose-300';
    case 'evaluacion':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'inactivo':
      return 'bg-slate-100 text-slate-700 border-slate-300';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-300';
  }
}

function buildTipoBadge(tipo) {
  switch (tipo) {
    case 'internacional':
      return 'bg-cyan-100 text-cyan-800 border-cyan-300';
    case 'fabricante':
      return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    case 'distribuidor':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-300';
  }
}

function StarRating({ value, onChange, disabled = false }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          className={`text-xl leading-none ${n <= value ? 'text-amber-400' : 'text-slate-300'} ${
            disabled ? 'cursor-default' : 'hover:scale-110'
          }`}
          aria-label={`Calificación ${n}`}
        >
          ★
        </button>
      ))}
      <span className="ml-1 text-sm text-slate-600">{value}/5</span>
    </div>
  );
}

export default function ProveedoresSection() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({ q: '', tipo: '', categoria: '', estado: '' });
  const [paginacion, setPaginacion] = useState({ page: 1, limit: 10, total: 0, total_pages: 1 });

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoModal, setModoModal] = useState('crear');
  const [tabActiva, setTabActiva] = useState(TABS.DATOS);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const [evalModalAbierto, setEvalModalAbierto] = useState(false);
  const [evalForm, setEvalForm] = useState(INITIAL_EVAL);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filtros.q) params.set('q', filtros.q);
    if (filtros.tipo) params.set('tipo', filtros.tipo);
    if (filtros.categoria) params.set('categoria', filtros.categoria);
    if (filtros.estado) params.set('estado', filtros.estado);
    params.set('page', String(paginacion.page));
    params.set('limit', String(paginacion.limit));
    return params.toString();
  }, [filtros, paginacion.page, paginacion.limit]);

  const cargarProveedores = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/inventario/proveedores?${queryString}`, { credentials: 'include' });
      if (!response.ok) throw new Error('No se pudo cargar el listado de proveedores');

      const payload = await response.json();
      const lista = Array.isArray(payload.data) ? payload.data : [];
      setProveedores(lista);

      const p = payload.pagination || {};
      setPaginacion((prev) => ({
        ...prev,
        total: Number(p.total || lista.length || 0),
        total_pages: Number(p.total_pages || 1)
      }));
    } catch (error) {
      window.alert(error.message || 'Error al obtener proveedores');
      setProveedores([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProveedores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  const updateFiltro = (name, value) => {
    setPaginacion((prev) => ({ ...prev, page: 1 }));
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const abrirCrear = () => {
    setModoModal('crear');
    setProveedorSeleccionado(null);
    setFormData(INITIAL_FORM);
    setTabActiva(TABS.DATOS);
    setModalAbierto(true);
  };

  const abrirVer = (proveedor) => {
    setModoModal('ver');
    setProveedorSeleccionado(proveedor);
    setFormData(mapProveedorToForm(proveedor));
    setTabActiva(TABS.DATOS);
    setModalAbierto(true);
  };

  const abrirEditar = (proveedor) => {
    setModoModal('editar');
    setProveedorSeleccionado(proveedor);
    setFormData(mapProveedorToForm(proveedor));
    setTabActiva(TABS.DATOS);
    setModalAbierto(true);
  };

  const abrirEvaluacion = (proveedor) => {
    setProveedorSeleccionado(proveedor);
    setEvalForm(INITIAL_EVAL);
    setEvalModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setProveedorSeleccionado(null);
    setFormData(INITIAL_FORM);
    setModoModal('crear');
    setTabActiva(TABS.DATOS);
  };

  const cerrarModalEvaluacion = () => {
    setEvalModalAbierto(false);
    setEvalForm(INITIAL_EVAL);
  };

  const isReadOnly = modoModal === 'ver';

  const mapProveedorToForm = (proveedor) => ({
    rut: proveedor.rut || '',
    razon_social: proveedor.razon_social || '',
    nombre_fantasia: proveedor.nombre_fantasia || '',
    tipo: proveedor.tipo || 'nacional',
    categorias: Array.isArray(proveedor.categorias) ? proveedor.categorias : [],
    telefono_principal: proveedor.telefono_principal || '',
    email_principal: proveedor.email_principal || '',
    direccion: {
      calle: proveedor.direccion?.calle || '',
      numero: proveedor.direccion?.numero || '',
      comuna: proveedor.direccion?.comuna || '',
      ciudad: proveedor.direccion?.ciudad || '',
      region: proveedor.direccion?.region || '',
      pais: proveedor.direccion?.pais || 'Chile'
    },
    contactos: Array.isArray(proveedor.contactos) ? proveedor.contactos : [],
    cuentas_bancarias: Array.isArray(proveedor.cuentas_bancarias) ? proveedor.cuentas_bancarias : [],
    condiciones_pago: {
      forma_pago: proveedor.condiciones_pago?.forma_pago || 'credito_30',
      dias_credito: Number(proveedor.condiciones_pago?.dias_credito || 30)
    },
    condiciones_entrega: {
      tiempo_entrega_dias: Number(proveedor.condiciones_entrega?.tiempo_entrega_dias || 7),
      costo_despacho: Number(proveedor.condiciones_entrega?.costo_despacho || 0)
    }
  });

  const setFormField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const setNestedField = (group, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [group]: {
        ...(prev[group] || {}),
        [field]: value
      }
    }));
  };

  const toggleCategoria = (categoria) => {
    setFormData((prev) => {
      const actual = prev.categorias || [];
      const existe = actual.includes(categoria);
      return {
        ...prev,
        categorias: existe ? actual.filter((c) => c !== categoria) : [...actual, categoria]
      };
    });
  };

  const addContacto = () => {
    setFormData((prev) => ({
      ...prev,
      contactos: [
        ...(prev.contactos || []),
        { nombre: '', cargo: '', telefono: '', email: '', es_principal: false }
      ]
    }));
  };

  const removeContacto = (index) => {
    setFormData((prev) => ({
      ...prev,
      contactos: (prev.contactos || []).filter((_, i) => i !== index)
    }));
  };

  const setContactoField = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      contactos: (prev.contactos || []).map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: field === 'es_principal' ? Boolean(value) : value
            }
          : item
      )
    }));
  };

  const addCuenta = () => {
    setFormData((prev) => ({
      ...prev,
      cuentas_bancarias: [
        ...(prev.cuentas_bancarias || []),
        { banco: '', tipo_cuenta: 'corriente', numero_cuenta: '', titular: '' }
      ]
    }));
  };

  const removeCuenta = (index) => {
    setFormData((prev) => ({
      ...prev,
      cuentas_bancarias: (prev.cuentas_bancarias || []).filter((_, i) => i !== index)
    }));
  };

  const setCuentaField = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      cuentas_bancarias: (prev.cuentas_bancarias || []).map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value
            }
          : item
      )
    }));
  };

  const guardarProveedor = async (e) => {
    e.preventDefault();
    if (modoModal === 'ver') {
      cerrarModal();
      return;
    }

    try {
      const isEdit = modoModal === 'editar' && proveedorSeleccionado?._id;
      const url = isEdit
        ? `/api/inventario/proveedores/${proveedorSeleccionado._id}`
        : '/api/inventario/proveedores';

      const method = isEdit ? 'PUT' : 'POST';
      const payload = {
        ...formData,
        contactos: (formData.contactos || []).filter((c) => c.nombre),
        cuentas_bancarias: (formData.cuentas_bancarias || []).filter((c) => c.banco && c.numero_cuenta)
      };

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo guardar proveedor');
      }

      cerrarModal();
      await cargarProveedores();
    } catch (error) {
      window.alert(error.message || 'Error al guardar proveedor');
    }
  };

  const guardarEvaluacion = async (e) => {
    e.preventDefault();
    if (!proveedorSeleccionado?._id) return;

    try {
      const calificacion_general = Math.round(
        (evalForm.calificacion_entregas +
          evalForm.calificacion_calidad +
          evalForm.calificacion_precios +
          evalForm.calificacion_servicio) /
          4
      );

      const payload = {
        ...evalForm,
        calificacion_general
      };

      const response = await fetch(`/api/inventario/proveedores/${proveedorSeleccionado._id}/evaluaciones`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo guardar la evaluación');
      }

      cerrarModalEvaluacion();
      await cargarProveedores();
    } catch (error) {
      window.alert(error.message || 'Error al registrar evaluación');
    }
  };

  const cambiarEstadoProveedor = async (proveedor) => {
    try {
      const activar = proveedor.estado === 'suspendido';
      const confirmar = window.confirm(
        activar
          ? `¿Reactivar proveedor ${proveedor.razon_social}?`
          : `¿Suspender proveedor ${proveedor.razon_social}?`
      );
      if (!confirmar) return;

      const response = await fetch(`/api/inventario/proveedores/${proveedor._id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: activar ? 'activo' : 'suspendido' })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo cambiar estado del proveedor');
      }

      await cargarProveedores();
    } catch (error) {
      window.alert(error.message || 'Error al actualizar estado');
    }
  };

  const paginas = useMemo(() => {
    const totalPages = Math.max(Number(paginacion.total_pages || 1), 1);
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }, [paginacion.total_pages]);

  const goToPage = (nextPage) => {
    setPaginacion((prev) => ({
      ...prev,
      page: Math.min(Math.max(nextPage, 1), Math.max(prev.total_pages, 1))
    }));
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Proveedores</h2>
          <p className="text-sm text-slate-500">Gestión de proveedores y evaluación de desempeño</p>
        </div>
        <button
          type="button"
          onClick={abrirCrear}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Nuevo Proveedor
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-4">
        <input
          value={filtros.q}
          onChange={(e) => updateFiltro('q', e.target.value)}
          placeholder="Buscar por código, RUT o razón social"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />

        <select
          value={filtros.tipo}
          onChange={(e) => updateFiltro('tipo', e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        >
          <option value="">Todos los tipos</option>
          {TIPOS_PROVEEDOR.filter(Boolean).map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>

        <select
          value={filtros.categoria}
          onChange={(e) => updateFiltro('categoria', e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          value={filtros.estado}
          onChange={(e) => updateFiltro('estado', e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        >
          <option value="">Todos los estados</option>
          {ESTADOS_PROVEEDOR.filter(Boolean).map((estado) => (
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
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">RUT</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Razón Social</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Nombre Fantasía</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Tipo</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Categorías</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Calificación</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Estado</th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Acciones</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {loading && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-sm text-slate-500">
                  Cargando proveedores...
                </td>
              </tr>
            )}

            {!loading && proveedores.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-sm text-slate-500">
                  No hay proveedores para mostrar
                </td>
              </tr>
            )}

            {!loading &&
              proveedores.map((prov) => (
                <tr key={prov._id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-slate-700">{prov.codigo || '-'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-700">{prov.rut || '-'}</td>
                  <td className="px-3 py-3 text-sm text-slate-700">{prov.razon_social || '-'}</td>
                  <td className="px-3 py-3 text-sm text-slate-700">{prov.nombre_fantasia || '-'}</td>
                  <td className="px-3 py-3 text-sm">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${buildTipoBadge(prov.tipo)}`}>
                      {prov.tipo || '-'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm text-slate-700">
                    <div className="flex flex-wrap gap-1">
                      {(prov.categorias || []).slice(0, 3).map((cat) => (
                        <span key={cat} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                          {cat}
                        </span>
                      ))}
                      {(prov.categorias || []).length > 3 && (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
                          +{(prov.categorias || []).length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-700">
                    {typeof prov.calificacion_promedio === 'number' ? prov.calificacion_promedio.toFixed(1) : '-'}
                  </td>
                  <td className="px-3 py-3 text-sm">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${buildEstadoBadge(prov.estado)}`}>
                      {prov.estado || '-'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm">
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => abrirVer(prov)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirEditar(prov)}
                        className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirEvaluacion(prov)}
                        className="rounded border border-amber-300 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50"
                      >
                        Evaluar
                      </button>
                      <button
                        type="button"
                        onClick={() => cambiarEstadoProveedor(prov)}
                        className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                      >
                        {prov.estado === 'suspendido' ? 'Reactivar' : 'Suspender'}
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
            {paginas.map((pageNumber) => (
              <option key={pageNumber} value={pageNumber}>
                {pageNumber}
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

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-800">
                {modoModal === 'crear' ? 'Crear Proveedor' : modoModal === 'editar' ? 'Editar Proveedor' : 'Detalle de Proveedor'}
              </h3>
              <button type="button" onClick={cerrarModal} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">
                ✕
              </button>
            </div>

            <div className="border-b border-slate-200 px-5 pt-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTabActiva(TABS.DATOS)}
                  className={`rounded-t-lg px-3 py-2 text-sm ${
                    tabActiva === TABS.DATOS ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Datos Básicos
                </button>
                <button
                  type="button"
                  onClick={() => setTabActiva(TABS.CONTACTOS)}
                  className={`rounded-t-lg px-3 py-2 text-sm ${
                    tabActiva === TABS.CONTACTOS ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Contactos
                </button>
                <button
                  type="button"
                  onClick={() => setTabActiva(TABS.BANCARIOS)}
                  className={`rounded-t-lg px-3 py-2 text-sm ${
                    tabActiva === TABS.BANCARIOS ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Datos Bancarios
                </button>
                <button
                  type="button"
                  onClick={() => setTabActiva(TABS.CONDICIONES)}
                  className={`rounded-t-lg px-3 py-2 text-sm ${
                    tabActiva === TABS.CONDICIONES ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Condiciones
                </button>
              </div>
            </div>

            <form onSubmit={guardarProveedor} className="space-y-4 p-5">
              {tabActiva === TABS.DATOS && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">RUT</span>
                    <input
                      value={formData.rut}
                      onChange={(e) => setFormField('rut', e.target.value)}
                      disabled={isReadOnly}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">Razón Social</span>
                    <input
                      value={formData.razon_social}
                      onChange={(e) => setFormField('razon_social', e.target.value)}
                      disabled={isReadOnly}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">Nombre Fantasía</span>
                    <input
                      value={formData.nombre_fantasia}
                      onChange={(e) => setFormField('nombre_fantasia', e.target.value)}
                      disabled={isReadOnly}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">Tipo</span>
                    <select
                      value={formData.tipo}
                      onChange={(e) => setFormField('tipo', e.target.value)}
                      disabled={isReadOnly}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100"
                    >
                      {TIPOS_PROVEEDOR.filter(Boolean).map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">Teléfono</span>
                    <input
                      value={formData.telefono_principal}
                      onChange={(e) => setFormField('telefono_principal', e.target.value)}
                      disabled={isReadOnly}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">Email</span>
                    <input
                      value={formData.email_principal}
                      onChange={(e) => setFormField('email_principal', e.target.value)}
                      disabled={isReadOnly}
                      type="email"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none disabled:bg-slate-100"
                    />
                  </label>

                  <div className="md:col-span-2">
                    <p className="mb-2 text-sm font-medium text-slate-700">Categorías</p>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                      {CATEGORIAS.map((cat) => (
                        <label key={cat} className="inline-flex items-center gap-2 rounded border border-slate-200 px-2 py-1 text-sm">
                          <input
                            type="checkbox"
                            checked={(formData.categorias || []).includes(cat)}
                            onChange={() => toggleCategoria(cat)}
                            disabled={isReadOnly}
                          />
                          <span>{cat}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <p className="mb-2 text-sm font-medium text-slate-700">Dirección</p>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                      <input
                        placeholder="Calle"
                        value={formData.direccion.calle}
                        onChange={(e) => setNestedField('direccion', 'calle', e.target.value)}
                        disabled={isReadOnly}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        placeholder="Número"
                        value={formData.direccion.numero}
                        onChange={(e) => setNestedField('direccion', 'numero', e.target.value)}
                        disabled={isReadOnly}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        placeholder="Comuna"
                        value={formData.direccion.comuna}
                        onChange={(e) => setNestedField('direccion', 'comuna', e.target.value)}
                        disabled={isReadOnly}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        placeholder="Ciudad"
                        value={formData.direccion.ciudad}
                        onChange={(e) => setNestedField('direccion', 'ciudad', e.target.value)}
                        disabled={isReadOnly}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        placeholder="Región"
                        value={formData.direccion.region}
                        onChange={(e) => setNestedField('direccion', 'region', e.target.value)}
                        disabled={isReadOnly}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        placeholder="País"
                        value={formData.direccion.pais}
                        onChange={(e) => setNestedField('direccion', 'pais', e.target.value)}
                        disabled={isReadOnly}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {tabActiva === TABS.CONTACTOS && (
                <div className="space-y-3">
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={addContacto}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      + Agregar contacto
                    </button>
                  )}

                  {(formData.contactos || []).length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                      No hay contactos agregados.
                    </div>
                  )}

                  {(formData.contactos || []).map((contacto, idx) => (
                    <div key={`contacto-${idx}`} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-5">
                      <input
                        placeholder="Nombre"
                        value={contacto.nombre || ''}
                        disabled={isReadOnly}
                        onChange={(e) => setContactoField(idx, 'nombre', e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        placeholder="Cargo"
                        value={contacto.cargo || ''}
                        disabled={isReadOnly}
                        onChange={(e) => setContactoField(idx, 'cargo', e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        placeholder="Teléfono"
                        value={contacto.telefono || ''}
                        disabled={isReadOnly}
                        onChange={(e) => setContactoField(idx, 'telefono', e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        placeholder="Email"
                        value={contacto.email || ''}
                        disabled={isReadOnly}
                        onChange={(e) => setContactoField(idx, 'email', e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={Boolean(contacto.es_principal)}
                            disabled={isReadOnly}
                            onChange={(e) => setContactoField(idx, 'es_principal', e.target.checked)}
                          />
                          Principal
                        </label>
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => removeContacto(idx)}
                            className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tabActiva === TABS.BANCARIOS && (
                <div className="space-y-3">
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={addCuenta}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      + Agregar cuenta bancaria
                    </button>
                  )}

                  {(formData.cuentas_bancarias || []).length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                      No hay cuentas bancarias agregadas.
                    </div>
                  )}

                  {(formData.cuentas_bancarias || []).map((cuenta, idx) => (
                    <div key={`cuenta-${idx}`} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-5">
                      <input
                        placeholder="Banco"
                        value={cuenta.banco || ''}
                        disabled={isReadOnly}
                        onChange={(e) => setCuentaField(idx, 'banco', e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <select
                        value={cuenta.tipo_cuenta || 'corriente'}
                        disabled={isReadOnly}
                        onChange={(e) => setCuentaField(idx, 'tipo_cuenta', e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="corriente">corriente</option>
                        <option value="vista">vista</option>
                        <option value="ahorro">ahorro</option>
                      </select>
                      <input
                        placeholder="Número"
                        value={cuenta.numero_cuenta || ''}
                        disabled={isReadOnly}
                        onChange={(e) => setCuentaField(idx, 'numero_cuenta', e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        placeholder="Titular"
                        value={cuenta.titular || ''}
                        disabled={isReadOnly}
                        onChange={(e) => setCuentaField(idx, 'titular', e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <div className="flex items-center justify-end">
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => removeCuenta(idx)}
                            className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tabActiva === TABS.CONDICIONES && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">Forma pago</span>
                    <select
                      value={formData.condiciones_pago.forma_pago}
                      disabled={isReadOnly}
                      onChange={(e) => setNestedField('condiciones_pago', 'forma_pago', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      {FORMAS_PAGO.map((fp) => (
                        <option key={fp} value={fp}>
                          {fp}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">Días crédito</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.condiciones_pago.dias_credito}
                      disabled={isReadOnly}
                      onChange={(e) => setNestedField('condiciones_pago', 'dias_credito', Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">Tiempo entrega (días)</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.condiciones_entrega.tiempo_entrega_dias}
                      disabled={isReadOnly}
                      onChange={(e) => setNestedField('condiciones_entrega', 'tiempo_entrega_dias', Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">Costo despacho</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.condiciones_entrega.costo_despacho}
                      disabled={isReadOnly}
                      onChange={(e) => setNestedField('condiciones_entrega', 'costo_despacho', Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              )}

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

      {evalModalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-800">Agregar evaluación</h3>
              <button
                type="button"
                onClick={cerrarModalEvaluacion}
                className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={guardarEvaluacion} className="space-y-4 p-5">
              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-sm font-medium text-slate-700">Entregas</p>
                  <StarRating
                    value={evalForm.calificacion_entregas}
                    onChange={(v) => setEvalForm((p) => ({ ...p, calificacion_entregas: v }))}
                  />
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium text-slate-700">Calidad</p>
                  <StarRating
                    value={evalForm.calificacion_calidad}
                    onChange={(v) => setEvalForm((p) => ({ ...p, calificacion_calidad: v }))}
                  />
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium text-slate-700">Precios</p>
                  <StarRating
                    value={evalForm.calificacion_precios}
                    onChange={(v) => setEvalForm((p) => ({ ...p, calificacion_precios: v }))}
                  />
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium text-slate-700">Servicio</p>
                  <StarRating
                    value={evalForm.calificacion_servicio}
                    onChange={(v) => setEvalForm((p) => ({ ...p, calificacion_servicio: v }))}
                  />
                </div>
              </div>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Comentarios</span>
                <textarea
                  rows={4}
                  value={evalForm.comentarios}
                  onChange={(e) => setEvalForm((p) => ({ ...p, comentarios: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={cerrarModalEvaluacion}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Guardar evaluación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
