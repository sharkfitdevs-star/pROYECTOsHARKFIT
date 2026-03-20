import { useEffect, useMemo, useState } from 'react'

function estadoBadgeClass(estado) {
  switch (estado) {
    case 'critico':
      return 'bg-rose-100 text-rose-800 border-rose-200'
    case 'bajo':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'normal':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'agotado':
      return 'bg-slate-200 text-slate-800 border-slate-300'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

export default function InventarioSection() {
  const [stock, setStock] = useState([])
  const [loading, setLoading] = useState(false)
  const [filtros, setFiltros] = useState({ sede: '', alerta_stock_bajo: false })
  const [paginacion, setPaginacion] = useState({ page: 1, limit: 20, total: 0, total_pages: 1 })

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (filtros.sede) params.set('sede', filtros.sede)
    if (filtros.alerta_stock_bajo) params.set('alerta_stock_bajo', 'true')
    params.set('page', String(paginacion.page))
    params.set('limit', String(paginacion.limit))
    return params.toString()
  }, [filtros, paginacion.page, paginacion.limit])

  const cargarStock = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/inventario/stock?${query}`, { credentials: 'include' })
      if (!response.ok) throw new Error('No se pudo cargar stock')
      const payload = await response.json()
      const items = Array.isArray(payload.data) ? payload.data : []
      setStock(items)
      const p = payload.pagination || {}
      setPaginacion((prev) => ({
        ...prev,
        total: Number(p.total || items.length || 0),
        total_pages: Number(p.total_pages || 1)
      }))
    } catch (error) {
      window.alert(error.message || 'Error al cargar stock')
      setStock([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarStock()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const goToPage = (nextPage) => {
    setPaginacion((prev) => ({
      ...prev,
      page: Math.min(Math.max(nextPage, 1), Math.max(prev.total_pages || 1, 1))
    }))
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Inventario / Stock</h2>
          <p className="text-sm text-slate-500">Control de existencias por sede</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-3">
        <input
          value={filtros.sede}
          onChange={(e) => setFiltros((prev) => ({ ...prev, sede: e.target.value }))}
          placeholder="Filtrar por sede"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={filtros.alerta_stock_bajo}
            onChange={(e) => setFiltros((prev) => ({ ...prev, alerta_stock_bajo: e.target.checked }))}
          />
          Solo stock bajo
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-slate-600">Producto</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-slate-600">Sede</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-slate-600">Actual</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-slate-600">Disponible</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-slate-600">Reservado</th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-slate-600">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-500">
                  Cargando stock...
                </td>
              </tr>
            )}

            {!loading && stock.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-500">
                  Sin registros de stock
                </td>
              </tr>
            )}

            {!loading && stock.map((row) => (
              <tr key={row._id} className="hover:bg-slate-50">
                <td className="px-3 py-3 text-sm text-slate-700">{row.producto?.nombre || '-'}</td>
                <td className="px-3 py-3 text-sm text-slate-700">{row.sede || '-'}</td>
                <td className="px-3 py-3 text-sm text-slate-700">{row.stock_actual ?? 0}</td>
                <td className="px-3 py-3 text-sm text-slate-700">{row.stock_disponible ?? 0}</td>
                <td className="px-3 py-3 text-sm text-slate-700">{row.stock_reservado ?? 0}</td>
                <td className="px-3 py-3 text-sm">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${estadoBadgeClass(row.estado_stock)}`}>
                    {row.estado_stock || 'normal'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => goToPage(paginacion.page - 1)}
          disabled={paginacion.page <= 1}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Prev
        </button>
        <span className="text-sm text-slate-600">{paginacion.page} / {Math.max(paginacion.total_pages || 1, 1)}</span>
        <button
          type="button"
          onClick={() => goToPage(paginacion.page + 1)}
          disabled={paginacion.page >= Math.max(paginacion.total_pages || 1, 1)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </section>
  )
}
