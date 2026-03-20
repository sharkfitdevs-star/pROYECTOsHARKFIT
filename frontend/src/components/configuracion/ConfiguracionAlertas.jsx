import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';

const styles = {
  wrapper: { maxWidth: 1100, margin: '0 auto', padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { margin: 0, fontSize: 24, fontWeight: 700 },
  subtitle: { margin: '4px 0 0 0', color: '#6b7280' },
  card: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, background: '#fff', marginBottom: 12 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'center' },
  input: { padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', width: '100%' },
  select: { padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', width: '100%' },
  button: { padding: '10px 12px', borderRadius: 8, border: '1px solid #111827', background: '#111827', color: '#fff', cursor: 'pointer' },
  buttonGhost: { padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' },
  status: { fontSize: 12, fontWeight: 600 },
  message: { padding: 12, borderRadius: 8, background: '#f3f4f6', marginBottom: 10 },
};

const TIPOS = [
  'membresia_por_vencer',
  'membresia_vencida',
  'pago_pendiente',
  'cliente_inactivo',
  'cumpleanos_cliente',
  'contrato_por_vencer',
  'evaluacion_pendiente',
  'inasistencia_detectada',
  'stock_bajo',
  'stock_critico',
  'sincronizacion_fallida',
  'importacion_con_errores',
  'kpi_bajo_umbral',
  'kpi_sobre_umbral',
  'tendencia_negativa',
];

const FRECUENCIAS = ['cada_5_min', 'cada_hora', 'diaria', 'manual'];

export default function ConfiguracionAlertas() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    tipoAlerta: 'membresia_por_vencer',
    prioridad: 'media',
    frecuencia: 'diaria',
    activa: true,
    configuracion: {
      diasAnticipacion: 7,
      tituloPlantilla: 'Alerta automatica',
      descripcionPlantilla: 'Regla de negocio disparada',
    },
  });

  const totalActivas = useMemo(() => items.filter((i) => i.activa).length, [items]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reglas-alertas');
      setItems(res.data?.data || []);
    } catch (error) {
      setMessage(error?.response?.data?.error || 'No se pudieron cargar reglas');
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
      await api.post('/reglas-alertas', form);
      setForm((prev) => ({ ...prev, nombre: '', descripcion: '' }));
      setMessage('Regla de alerta creada correctamente');
      await loadData();
    } catch (error) {
      setMessage(error?.response?.data?.error || 'No se pudo crear la regla');
    } finally {
      setSaving(false);
    }
  };

  const evaluarRegla = async (item) => {
    try {
      const res = await api.post(`/reglas-alertas/${item._id}/evaluar`);
      const total = res.data?.data?.alertasGeneradas || 0;
      setMessage(`Evaluacion completada. Alertas generadas: ${total}`);
      await loadData();
    } catch (error) {
      setMessage(error?.response?.data?.error || 'No se pudo evaluar la regla');
    }
  };

  const toggleEstado = async (item) => {
    try {
      if (item.activa) {
        await api.post(`/reglas-alertas/${item._id}/desactivar`);
      } else {
        await api.post(`/reglas-alertas/${item._id}/activar`);
      }
      await loadData();
    } catch (error) {
      setMessage(error?.response?.data?.error || 'No se pudo actualizar estado');
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Reglas de Alertas</h1>
          <p style={styles.subtitle}>Generacion automatica de alertas por condiciones de negocio</p>
        </div>
        <div>
          <span style={{ ...styles.status, color: '#111827' }}>Total: {items.length}</span>
          <span style={{ ...styles.status, color: '#059669', marginLeft: 12 }}>Activas: {totalActivas}</span>
        </div>
      </div>

      {message ? <div style={styles.message}>{message}</div> : null}

      <div style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Nueva regla</h3>
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
            value={form.tipoAlerta}
            onChange={(e) => setForm((p) => ({ ...p, tipoAlerta: e.target.value }))}
          >
            {TIPOS.map((tipo) => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>
          <select
            style={styles.select}
            value={form.frecuencia}
            onChange={(e) => setForm((p) => ({ ...p, frecuencia: e.target.value }))}
          >
            {FRECUENCIAS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <button style={styles.button} disabled={saving} onClick={createItem}>Crear</button>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Reglas existentes</h3>
        {loading ? <p>Cargando...</p> : null}
        {!loading && items.length === 0 ? <p>No hay reglas creadas.</p> : null}

        {!loading && items.map((item) => (
          <div key={item._id} style={{ borderTop: '1px solid #f3f4f6', padding: '12px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div>
                <strong>{item.nombre}</strong>
                <div style={{ color: '#6b7280', fontSize: 13 }}>{item.descripcion || 'Sin descripcion'}</div>
                <div style={{ color: '#374151', fontSize: 12 }}>
                  Tipo: {item.tipoAlerta} | Frecuencia: {item.frecuencia} | Prioridad: {item.prioridad}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={styles.buttonGhost} onClick={() => evaluarRegla(item)}>Evaluar</button>
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
