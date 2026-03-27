import { useEffect, useState, useMemo, useCallback } from "react"
import axios from "axios"
import { getAccessToken } from "../../config/authStorage"
import "../../styles/Dashboard.css"

const BASE = import.meta.env.VITE_API_URL || "/api"
const api = axios.create({ baseURL: BASE, withCredentials: true })
api.interceptors.request.use((cfg) => {
  const t = getAccessToken()
  if (t) cfg.headers["Authorization"] = "Bearer " + t
  return cfg
})

// ── Modal ────────────────────────────────────────────────────
function Modal({ children, open, onClose }) {
  useEffect(() => {
    if (!open) return
    const handleKey = (e) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: "var(--color-surface)", borderRadius: 8,
        boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
        maxWidth: 720, width: "100%", padding: "1.5rem",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        {children}
      </div>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────
export default function Clientes() {
  const [clientes,     setClientes]     = useState([])
  const [page,         setPage]         = useState(1)
  const [totalCount,   setTotalCount]   = useState(0)
  const [cargando,     setCargando]     = useState(false)
  const [error,        setError]        = useState(null)
  const [busqueda,     setBusqueda]     = useState("")
  const [estadoFilter, setEstadoFilter] = useState("")
  const [sedeFilter,   setSedeFilter]   = useState("")
  const [planFilter,   setPlanFilter]   = useState("")
  const [sedeOptions,  setSedeOptions]  = useState([])
  const [planOptions,  setPlanOptions]  = useState([])

  const [profileOpen,    setProfileOpen]    = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileData,    setProfileData]    = useState(null)
  const [editOpen,       setEditOpen]       = useState(false)
  const [editingClient,  setEditingClient]  = useState(null)
  const [formData,       setFormData]       = useState({})
  const [formError,      setFormError]      = useState("")
  const [formLoading,    setFormLoading]    = useState(false)

  const limit = 50

  // ── Carga ────────────────────────────────────────────────
  const cargarClientes = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (busqueda)     params.append("search",     busqueda)
      if (estadoFilter) params.append("estado",     estadoFilter)
      if (sedeFilter)   params.append("branchName", sedeFilter)
      if (planFilter)   params.append("planName",   planFilter)
      params.append("page",  page)
      params.append("limit", limit)

      const res = await api.get("/clientes?" + params.toString())
      const lista = res.data.data || res.data.clientes || []
      setClientes(lista)
      setTotalCount(res.data.total || lista.length)
      setSedeOptions([...new Set(lista.map((c) => c.branchName).filter(Boolean))])
      setPlanOptions([...new Set(lista.map((c) => c.planName).filter(Boolean))])
    } catch (e) {
      setError("Error cargando clientes: " + (e.message || ""))
    } finally {
      setCargando(false)
    }
  }, [busqueda, estadoFilter, sedeFilter, planFilter, page])

  useEffect(() => { cargarClientes() }, [cargarClientes])

  // Escucha el mismo evento que dispara ImportarExcelSection
  useEffect(() => {
    window.addEventListener("clientes-refresh", cargarClientes)
    return () => window.removeEventListener("clientes-refresh", cargarClientes)
  }, [cargarClientes])

  // ── Filtro local ─────────────────────────────────────────
  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return clientes
    const q = busqueda.toLowerCase()
    return clientes.filter((c) =>
      (c.name      || "").toLowerCase().includes(q) ||
      (c.lastName  || "").toLowerCase().includes(q) ||
      (c.email     || "").toLowerCase().includes(q) ||
      (c.cellPhone || "").toLowerCase().includes(q) ||
      (c.planName  || "").toLowerCase().includes(q)
    )
  }, [clientes, busqueda])

  // ── Acciones ─────────────────────────────────────────────
  const openProfile = async (id) => {
    setProfileOpen(true)
    setProfileLoading(true)
    try {
      const res = await api.get("/clientes/" + id)
      setProfileData(res.data.data || res.data)
    } catch { setProfileData(null) }
    finally   { setProfileLoading(false) }
  }

  const openEdit = (c) => {
    setEditingClient(c)
    setFormData(c || { name:"", lastName:"", email:"", cellPhone:"", cpf:"", idMember:"", planName:"", branchName:"", estado:"activo" })
    setFormError("")
    setEditOpen(true)
  }

  const submitForm = async (e) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError("")
    try {
      if (editingClient && formData._id) {
        await api.put("/clientes/" + formData._id, formData)
      } else {
        await api.post("/clientes", formData)
      }
      setEditOpen(false)
      cargarClientes()
    } catch (err) {
      setFormError(err.message || "Error al guardar cliente")
    } finally {
      setFormLoading(false)
    }
  }

  const toggleEstado = async (id, current) => {
    const newEstado = current === "activo" ? "inactivo" : "activo"
    try {
      await api.patch("/clientes/" + id + "/estado", { estado: newEstado })
      cargarClientes()
    } catch (err) { console.error(err) }
  }

  const limpiarImportados = async () => {
    if (!window.confirm("Eliminar TODOS los clientes importados?")) return
    try {
      const token = getAccessToken()
      const res = await fetch(BASE + "/clientes/importados", {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
      })
      const json = await res.json()
      if (json.ok) { setClientes([]); setTotalCount(0); setPage(1) }
    } catch (e) { console.error(e) }
  }

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="ventas-section">
      <h2>Clientes</h2>
      <p className="info-text">Los datos se obtienen de las importaciones realizadas en Excel/CSV.</p>

      {/* Toolbar — global Sharcknegocios */}
      <div className="sf-filters" style={{ marginBottom: 16 }}>
        <label htmlFor="busqueda-cliente">Buscar: </label>
        <input
          id="busqueda-cliente"
          type="text"
          placeholder="Cliente, plan, sede..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="sf-search"
        />
        <select value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)} className="sf-filter-select">
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="por vencer">Por vencer</option>
          <option value="inactivo">Inactivo</option>
        </select>
        <select value={sedeFilter} onChange={(e) => setSedeFilter(e.target.value)} className="sf-filter-select">
          <option value="">Todas las sedes</option>
          {sedeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="sf-filter-select">
          <option value="">Todos los planes</option>
          {planOptions.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={() => { setEstadoFilter(""); setSedeFilter(""); setPlanFilter(""); setBusqueda("") }}>
          Limpiar filtros
        </button>
        <span style={{ marginLeft: "auto", color: "var(--color-text-secondary)", fontSize: ".95em" }}>
          Total clientes: {totalCount} | Mostrando: {filtrados.length}
        </span>
        <button className="btn-secondary" onClick={() => openEdit(null)}>+ Nuevo Cliente</button>
        <button className="btn-danger" disabled={cargando} onClick={limpiarImportados}>
          Limpiar datos importados
        </button>
      </div>

      {cargando && <p className="info-text">Cargando clientes...</p>}
      {error    && <div className="error-text">{error}</div>}

      {/* Tabla global Sharcknegocios */}
      <div className="sf-table-wrapper">
        <table className="sf-table">
          <thead>
            <tr>
              <th>Fecha ingreso</th><th>Nombre</th><th>Email</th>
              <th>Teléfono</th><th>Plan</th><th>Sede</th>
              <th>Estado</th><th>Vence</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!cargando && filtrados.length === 0 && (
              <tr><td colSpan={9} className="sf-empty">Sin clientes registrados</td></tr>
            )}
            {filtrados.map((c, idx) => {
              const estado = c.estado || c.status || "inactivo"
              return (
                <tr key={c._id || idx}>
                  <td>{(c.membershipStartDate || c.createdAt) ? new Date(c.membershipStartDate || c.createdAt).toLocaleDateString("es-CL") : "-"}</td>
                  <td>{[c.name, c.lastName].filter(Boolean).join(" ") || "-"}</td>
                  <td>{c.email    || "-"}</td>
                  <td>{c.cellPhone || "-"}</td>
                  <td>{c.planName  || "-"}</td>
                  <td>{c.branchName || "-"}</td>
                  <td>
                    <span className={`sf-badge ${estado}`}>{estado}</span>
                  </td>
                  <td>{(c.vencimiento || c.membershipEndDate) ? new Date(c.vencimiento || c.membershipEndDate).toLocaleDateString("es-CL") : "-"}</td>
                  <td>
                    <div className="sf-actions">
                      <button className="sf-btn-action" onClick={() => openProfile(c._id)} title="Ver perfil">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                      <button className="sf-btn-action" onClick={() => openEdit(c)} title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button className="sf-btn-action" onClick={() => toggleEstado(c._id, estado)} title={estado === "activo" ? "Desactivar" : "Activar"} style={{ color: estado === "activo" ? "#22c55e" : "#ef4444" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="12" r="10"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación — idéntica a VentasSection */}
      <div className="ventas-pagination">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary">Anterior</button>
        <span>Página {page}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={filtrados.length < limit} className="btn-secondary">Siguiente</button>
      </div>

      {/* ── Modal: Ver perfil ── */}
      <Modal open={profileOpen} onClose={() => setProfileOpen(false)}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
          <h3 style={{ margin:0, fontSize:"1.1rem", fontWeight:700 }}>
            {profileData ? `${profileData.name||""} ${profileData.lastName||""}`.trim() : "Perfil"}
          </h3>
          <button onClick={() => setProfileOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:20, color:"var(--color-text-secondary)" }}>×</button>
        </div>
        {profileLoading ? <p className="info-text">Cargando...</p> : profileData ? (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem", fontSize:"0.875rem" }}>
              <div><span style={{ color:"var(--color-text-secondary)" }}>Email:</span> {profileData.email||"-"}</div>
              <div><span style={{ color:"var(--color-text-secondary)" }}>Teléfono:</span> {profileData.cellPhone||"-"}</div>
              <div><span style={{ color:"var(--color-text-secondary)" }}>RUT/CPF:</span> {profileData.cpf||"-"}</div>
              <div><span style={{ color:"var(--color-text-secondary)" }}>ID Miembro:</span> {profileData.idMember||"-"}</div>
              <div><span style={{ color:"var(--color-text-secondary)" }}>Plan:</span> {profileData.planName||"-"}</div>
              <div><span style={{ color:"var(--color-text-secondary)" }}>Sede:</span> {profileData.branchName||"-"}</div>
              <div><span style={{ color:"var(--color-text-secondary)" }}>Inicio:</span> {profileData.membershipStartDate ? new Date(profileData.membershipStartDate).toLocaleDateString("es-CL") : "-"}</div>
              <div><span style={{ color:"var(--color-text-secondary)" }}>Vence:</span>  {profileData.membershipEndDate  ? new Date(profileData.membershipEndDate).toLocaleDateString("es-CL")  : "-"}</div>
              <div><span style={{ color:"var(--color-text-secondary)" }}>Estado:</span> {profileData.status||"-"}</div>
              <div><span style={{ color:"var(--color-text-secondary)" }}>Asistencias:</span> {profileData.attendances||0}</div>
            </div>
            <hr style={{ margin:"1rem 0" }}/>
            <div style={{ textAlign:"right" }}>
              <button onClick={() => { setProfileOpen(false); openEdit(profileData) }}
                style={{ padding:"0.4rem 1rem", background:"var(--color-primary)", color:"var(--color-text)", border:"none", borderRadius:6, cursor:"pointer", fontSize:"0.875rem" }}>
                Editar datos completos
              </button>
            </div>
          </>
        ) : <p style={{ color:"#ef4444" }}>Error cargando perfil</p>}
      </Modal>

      {/* ── Modal: Crear / Editar ── */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
          <h3 style={{ margin:0, fontSize:"1.1rem", fontWeight:700 }}>
            {editingClient ? "Editar cliente" : "Nuevo cliente"}
          </h3>
          <button onClick={() => setEditOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:20, color:"var(--color-text-secondary)" }}>×</button>
        </div>
        <form onSubmit={submitForm}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" }}>
            {[
              { label:"Nombre *",   key:"name",      required:true },
              { label:"Apellido",   key:"lastName" },
              { label:"Email *",    key:"email",     type:"email", required:true },
              { label:"Teléfono",   key:"cellPhone" },
              { label:"RUT / CPF",  key:"cpf" },
              { label:"ID Miembro", key:"idMember" },
              { label:"Plan",       key:"planName" },
              { label:"Sede",       key:"branchName" },
            ].map(({ label, key, type="text", required }) => (
              <div key={key}>
                <label style={{ display:"block", fontSize:"0.8rem", fontWeight:500, color:"var(--color-text)", marginBottom:4 }}>{label}</label>
                <input type={type} required={required} value={formData[key]||""} onChange={(e) => setFormData({...formData,[key]:e.target.value})}
                  style={{ width:"100%", border:"1px solid var(--color-border)", borderRadius:6, padding:"0.4rem 0.6rem", fontSize:"0.875rem", boxSizing:"border-box", background:"var(--color-surface-card)", color:"var(--color-text)" }}/>
              </div>
            ))}
            <div>
              <label style={{ display:"block", fontSize:"0.8rem", fontWeight:500, color:"var(--color-text)", marginBottom:4 }}>Estado</label>
              <select value={formData.estado||"activo"} onChange={(e) => setFormData({...formData,estado:e.target.value})}
                style={{ width:"100%", border:"1px solid var(--color-border)", borderRadius:6, padding:"0.4rem 0.6rem", fontSize:"0.875rem", background:"var(--color-surface-card)", color:"var(--color-text)" }}>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="por vencer">Por vencer</option>
              </select>
            </div>
          </div>
          {formError && <p style={{ color:"#ef4444", fontSize:"0.875rem", marginTop:"0.5rem" }}>{formError}</p>}
          <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:"1rem" }}>
            <button type="button" onClick={() => setEditOpen(false)}
              style={{ padding:"0.4rem 1rem", border:"1px solid var(--color-border)", borderRadius:6, background:"var(--color-surface)", color:"var(--color-text-secondary)", cursor:"pointer", fontSize:"0.875rem" }}>
              Cancelar
            </button>
            <button type="submit" disabled={formLoading}
              style={{ padding:"0.4rem 1rem", background:"var(--color-primary)", color:"var(--color-text)", border:"none", borderRadius:6, cursor:"pointer", fontSize:"0.875rem", opacity:formLoading?0.6:1 }}>
              {formLoading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
