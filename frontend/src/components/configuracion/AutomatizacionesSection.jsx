import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';

const styles = {
  wrapper: { maxWidth: 1100, margin: '0 auto', padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { margin: 0, fontSize: 24, fontWeight: 700 },
  subtitle: { margin: '4px 0 0 0', color: '#6b7280' },
  actions: { display: 'flex', gap: 8 },
  card: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, background: '#fff', marginBottom: 12 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'center' },
  input: { padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', width: '100%' },
  select: { padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', width: '100%' },
  button: { padding: '10px 12px', borderRadius: 8, border: '1px solid #111827', background: '#111827', color: '#fff', cursor: 'pointer' },
  buttonGhost: { padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' },
  status: { fontSize: 12, fontWeight: 600 },
  message: { padding: 12, borderRadius: 8, background: '#f3f4f6', marginBottom: 10 },
};

const EVENTOS = [
  'CLIENTE_CREADO',
  'CLIENTE_ACTUALIZADO',
  'CLIENTE_INACTIVO',
  'MEMBRESIA_POR_VENCER',
  'VENTA_CREADA',
  'VENTA_PAGADA',
  'VENTA_VENCIDA',
  'VENTA_CANCELADA',
  'ALERTA_GENERADA',
  'KPI_BAJO_UMBRAL',
  'KPI_SOBRE_UMBRAL',
  'IMPORTACION_COMPLETADA',
  'IMPORTACION_ERROR',
  'SYNC_EVO_COMPLETADO',
];

export default function AutomatizacionesSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    evento: 'CLIENTE_CREADO',
    activa: true,
  });

  const totalActivas = useMemo(() => items.filter((i) => i.activa && !i.archivada).length, [items]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/automatizaciones');
      setItems(res.data?.data || []);
    } catch (error) {
      setMessage(error?.response?.data?.error || 'No se pudo cargar automatizaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createItem = async () => {
    if (!form.nombre.trim()) {
      setMessage('El nombre es obligatorio');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      await api.post('/automatizaciones', {
        ...form,
        condiciones: [],
        acciones: [
          {
            tipo: 'REGISTRAR_LOG',
            config: {},
          },
        ],
      });
      setForm({ nombre: '', descripcion: '', evento: 'CLIENTE_CREADO', activa: true });
      setMessage('Automatizacion creada correctamente');
      await loadData();
    } catch (error) {
      setMessage(error?.response?.data?.error || 'No se pudo crear la automatizacion');
    } finally {
      setSaving(false);
    }
  };

  const toggleEstado = async (item) => {
    try {
      if (item.activa) {
        await api.post(`/automatizaciones/${item._id}/desactivar`);
      } else {
        await api.post(`/automatizaciones/${item._id}/activar`);
      }
      await loadData();
    } catch (error) {
      setMessage(error?.response?.data?.error || 'No se pudo actualizar estado');
    }
  };

  const ejecutarManual = async (item) => {
    try {
      const res = await api.post(`/automatizaciones/${item._id}/ejecutar`, {
        payload: { origen: 'frontend' },
      });
      const ejecutadas = res.data?.data?.ejecutadas || 0;
      setMessage(`Ejecucion manual completada. Automatizaciones ejecutadas: ${ejecutadas}`);
      await loadData();
    } catch (error) {
      setMessage(error?.response?.data?.error || 'No se pudo ejecutar manualmente');
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Motor de Automatizaciones</h1>
          <p style={styles.subtitle}>Reglas que reaccionan automaticamente a eventos del sistema</p>
        </div>
        <div style={styles.actions}>
          <span style={{ ...styles.status, color: '#111827' }}>Total: {items.length}</span>
          <span style={{ ...styles.status, color: '#059669' }}>Activas: {totalActivas}</span>
        </div>
      </div>

      {message ? <div style={styles.message}>{message}</div> : null}

      <div style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Nueva automatizacion</h3>
        <div style={styles.row}>
          <input
            style={styles.input}
            placeholder="Nombre"
            value={form.nombre}
            onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
          />
          <input
            style={styles.input}
            placeholder="Descripcion"
            value={form.descripcion}
            onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
          />
          <select
            style={styles.select}
            value={form.evento}
            onChange={(e) => setForm((p) => ({ ...p, evento: e.target.value }))}
          >
            {EVENTOS.map((ev) => (
              <option key={ev} value={ev}>{ev}</option>
            ))}
          </select>
          <select
            style={styles.select}
            value={String(form.activa)}
            onChange={(e) => setForm((p) => ({ ...p, activa: e.target.value === 'true' }))}
          >
            <option value="true">Activa</option>
            <option value="false">Inactiva</option>
          </select>
          <button style={styles.button} disabled={saving} onClick={createItem}>Crear</button>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Automatizaciones existentes</h3>
        {loading ? <p>Cargando...</p> : null}
        {!loading && items.length === 0 ? <p>No hay automatizaciones creadas.</p> : null}

        {!loading && items.map((item) => (
          <div key={item._id} style={{ borderTop: '1px solid #f3f4f6', padding: '12px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div>
                <strong>{item.nombre}</strong>
                <div style={{ color: '#6b7280', fontSize: 13 }}>{item.descripcion || 'Sin descripcion'}</div>
                <div style={{ color: '#374151', fontSize: 12 }}>Evento: {item.evento}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={styles.buttonGhost} onClick={() => ejecutarManual(item)}>Ejecutar</button>
                <button style={styles.buttonGhost} onClick={() => toggleEstado(item)}>
                  {item.activa ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
