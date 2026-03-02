import { useState, useEffect } from 'react';
import { previewImport, importFile, commitImport, fetchImportHistory, setImportVisibility, deleteImport } from '../../services/importApi';
import { createToast } from '@/components/ui/use-toast';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Dashboard.css'; // reuse same styles

export default function ImportarExcelSection() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [importId, setImportId] = useState(null);
  const [mapping, setMapping] = useState('{}');
  const [mappingObj, setMappingObj] = useState({});
  const [previewHeaders, setPreviewHeaders] = useState([]); // headers from file
  const [entity, setEntity] = useState('clientes');
  const [delimiter, setDelimiter] = useState(',');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showHidden, setShowHidden] = useState(false);
  const [btnLoading, setBtnLoading] = useState({});

  const { importsConnected, isTogglingImports, importsToggleForbidden, setImportsConnectedRemote, syncImportsConnected, importsReloadKey } = useAuth();

  const MAPPING_PRESETS = {
    clientes: {
      "ID Miembro": "idMember",
      "Nombre": "name",
      "Apellido": "lastName",
      "Teléfono": "cellPhone",
      "Email": "email"
    },
    ventas: {
      "Fecha": "fecha",
      "Monto": "monto",
      "Vendedor": "vendedor"
    }
  };

  // load history on mount, when visibility changes, or when importsConnected toggles
  useEffect(() => {
    loadHistory();
  }, [showHidden, importsConnected, importsReloadKey]);

  // keep mappingObj in sync when user edits the JSON textarea
  useEffect(() => {
    try {
      const obj = JSON.parse(mapping);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        setMappingObj(obj);
      }
    } catch {
      // ignore invalid json while typing
    }
  }, [mapping]);

  const loadHistory = async () => {
    try {
      const resp = await fetchImportHistory();
      if (typeof resp.importsConnected === 'boolean') {
        syncImportsConnected(resp.importsConnected);
      }
      let datos = resp.datos || [];
      if (!showHidden) datos = datos.filter((h) => h.visible !== false);
      setHistory(datos);
    } catch (err) {
      if (err.status === 503) {
        createToast({ title: 'Historial no disponible', description: 'Base de datos no está lista', variant: 'warning' });
      } else {
        console.error(err);
      }
    }
  };

  const handleFileChange = (e) => {
    setPreviewData(null);
    setImportId(null);
    setSelectedFile(e.target.files[0] || null);
  };

  const handlePreview = async () => {
    if (!selectedFile || isPreviewing) return;
    // validate mapping JSON
    let mappingObj;
    try {
      mappingObj = JSON.parse(mapping);
      if (mappingObj === null || typeof mappingObj !== 'object' || Array.isArray(mappingObj)) {
        throw new Error('El mapeo debe ser un objeto JSON');
      }
    } catch (e) {
      setError('El mapeo no es un JSON válido. Revisa comillas, llaves y comas.');
      return;
    }

    setError(null);
    setIsPreviewing(true);
    try {
      const resp = await previewImport(selectedFile, { entity, mapping: mappingObj });

      if (!resp.ok) {
        throw new Error(resp.error || 'Vista previa fallida');
      }

      setImportId(resp.importId || resp.syncId || null);
      setPreviewData(resp.datos || {});
      // extra fields from backend
      setPreviewHeaders(resp.headers || []);
      if (resp.suggestedMapping) {
        setMappingObj(resp.suggestedMapping);
        setMapping(JSON.stringify(resp.suggestedMapping, null, 2));
      }
    } catch (err) {
      const msg = err.message || 'Ocurrió un error inesperado al obtener la vista previa.';
      setError(msg);
      createToast({ title: 'Error al obtener vista previa', description: msg, variant: 'destructive' });
      if (err.details) {
        createToast({ title: 'Detalle del error', description: String(err.details) });
      }
    } finally {
      setIsPreviewing(false);
    }
  };

  const toggleVisibility = async (syncId, visible) => {
    const confirmMsg = visible
      ? '¿Mostrar los datos de este Excel?'
      : '¿Ocultar los datos de este Excel? No se borrarán, solo dejarán de verse.';
    if (!window.confirm(confirmMsg)) return;
    setBtnLoading((p) => ({ ...p, [syncId]: true }));
    try {
      const resp = await setImportVisibility(syncId, visible);
      if (resp && typeof resp.importsConnected === 'boolean') {
        syncImportsConnected(resp.importsConnected);
      }
      createToast({ title: 'Éxito', description: 'Visibilidad actualizada' });
      loadHistory();
      window.dispatchEvent(new Event('clientes-refresh'));
    } catch (err) {
      createToast({ title: 'Error', description: String(err.message) });
    } finally {
      setBtnLoading((p) => ({ ...p, [syncId]: false }));
    }
  };

  const removeImport = async (syncId) => {
    if (!window.confirm('¿Eliminar permanentemente este lote? Esta acción NO se puede deshacer.')) return;
    setBtnLoading((p) => ({ ...p, [`del-${syncId}`]: true }));
    try {
      const resp = await deleteImport(syncId);
      if (resp && typeof resp.importsConnected === 'boolean') {
        syncImportsConnected(resp.importsConnected);
      }
      createToast({ title: 'Éxito', description: 'Lote eliminado' });
      loadHistory();
      window.dispatchEvent(new Event('clientes-refresh'));
    } catch (err) {
      createToast({ title: 'Error', description: String(err.message) });
    } finally {
      setBtnLoading((p) => ({ ...p, [`del-${syncId}`]: false }));
    }
  };

  const handleImport = async () => {
    // validate mapping rules (check values, not keys)
    const values = new Set(Object.values(mappingObj||{}).filter(Boolean));
    const meetsMinimum = values.has('email') || values.has('idMember') || (values.has('name') && values.has('lastName'));
    if (!meetsMinimum) {
      setError('Debe mapear al menos email o idMember o nombre+apellido.');
      return;
    }
    if (!selectedFile) return;
    if (!importsConnected) {
      // shouldn't happen when button disabled but guard anyway
      createToast({
        title: 'Importaciones desconectadas',
        description: 'No se pueden subir archivos mientras las importaciones están desconectadas.'
      });
      return;
    }
    if (!importId) {
      // ensure preview succeeded and provided id
      setError('Debe generar una vista previa antes de confirmar la importación.');
      return;
    }
    // mapping JSON already validated in preview stage; re-validate anyway
    try {
      const obj = JSON.parse(mapping);
      if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
        throw new Error('El mapeo debe ser un objeto JSON');
      }
    } catch (e) {
      setError('El mapeo no es un JSON válido. Revisa comillas, llaves y comas.');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsCommitting(true);
    try {
      const mappingObj = mapping ? JSON.parse(mapping) : {};
      const resp = await commitImport(selectedFile, {
        mapping: mappingObj,
        entity,
        delimiter,
        importId // pass along for idempotency
      });

      // network debug
      console.info('import.commit result', resp);

      if (resp.ok) {
        const msg = `Import finished – inserted:${resp.insertedCount||0} skipped:${resp.skippedCount||0}`;
        createToast({ title: 'Importación completada', description: msg });
      }
      await loadHistory();
      // refresh clientes table/list via event
      window.dispatchEvent(new Event('clientes-refresh'));
    } catch (err) {
      setError(err.message || 'Ocurrió un error inesperado al importar. Intenta nuevamente.');
      if (err.details) {
        createToast({ title: 'Detalle del error', description: String(err.details) });
      }
      // even on error we want fresh history to see failed entry
      await loadHistory();
    } finally {
      setIsCommitting(false);
    }
  };

  const renderPreviewTable = () => {
    if (!previewData) return null;
    const { columnas = [], primerosRegistros = [] } = previewData;
    if (columnas.length === 0 || primerosRegistros.length === 0) {
      return <p className="info-text">El archivo no tiene datos para previsualizar (0 filas o columnas detectadas).</p>;
    }
    return (
      <table className="preview-table">
        <thead>
          <tr>{columnas.map((c, i) => <th key={i}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {primerosRegistros.map((row, idx) => (
            <tr key={idx}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderHistory = () => {
    if (!history.length) return <p className="info-text">No hay importaciones registradas.</p>;
    return (
      <table className="history-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Fuente</th>
            <th>Entidad</th>
            <th>Estatus</th>
            <th>Procesados</th>
            <th>Inseridos</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h, idx) => {
            const key = h?._id || h?.importId || h?.syncId || idx;
            return (
              <tr key={key}>
                <td>{h?.iniciado ? new Date(h.iniciado).toLocaleString() : '-'}</td>
                <td>{h?.fuente}</td>
                <td>{h?.entidad || '-'}</td>
                <td>{h?.estatus}</td>
                <td>{h?.registrosProcesados ?? h?.registosProcesados ?? '-'}</td>
                <td>{h?.registrosInsertados ?? h?.registosInseridos ?? '-'}</td>
                <td>
                  {h?.estatus === 'Fallido' ? (
                    h?.errorMessage || '-'
                  ) : h?.estatus === 'Parcial' ? (
                    `Ins:${h.insertedCount||0} Inv:${h.invalidCount||0}` +
                      (h?.warnings && h.warnings.length ? ` Warn:${h.warnings.length}` : '')
                  ) : (
                    ''
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div className="importar-excel-section">
      <h2>📂 Importar datos desde Excel/CSV</h2>
      <p>
        Seleccione un archivo para cargar registros en el sistema.{' '}
        <span className={importsConnected ? 'badge badge-green' : 'badge badge-red'}>
          {importsConnected ? 'Conectadas' : 'Desconectadas'}
        </span>
      </p>
      {!importsConnected && (
        <div className="warning-card" style={{ padding: '1rem', background: '#fff3cd', color: '#856404', marginBottom: '1rem', borderRadius: '4px' }}>
          <p><strong>Importaciones desconectadas.</strong> No se pueden subir nuevos archivos ni ver los existentes.</p>
          <button
            className="btn-primary"
            onClick={() => setImportsConnectedRemote(true)}
            disabled={isTogglingImports || importsToggleForbidden}
            title={importsToggleForbidden ? 'No tienes permisos para cambiar este estado' : ''}
          >Conectar importaciones</button>
        </div>
      )}
      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(e) => setShowHidden(e.target.checked)}
          />{' '}
          Mostrar importaciones ocultas
        </label>
      </div>

      <div className="form-group">
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          disabled={!importsConnected}
        />
      </div>

      <div className="form-group">
        <label>Entidad</label>
        <select value={entity} onChange={(e) => setEntity(e.target.value)}>
          <option value="clientes">Clientes</option>
          <option value="ventas">Ventas</option>
        </select>
      </div>

      <div className="form-group">
        <label>Mapeo de columnas (JSON)</label>
        <textarea value={mapping} onChange={(e) => setMapping(e.target.value)} rows={3} />
        <p className="info-text">Ejemplo: {"{ \"Nombre\": \"nombre\", \"Correo\": \"email\" }"}</p>
        <button
          type="button"
          className="btn-secondary"
          disabled={!MAPPING_PRESETS[entity] || !importsConnected}
          onClick={() => {
            const preset = MAPPING_PRESETS[entity] || {};
            setMapping(JSON.stringify(preset, null, 2));
          }}
        >
          Cargar mapeo sugerido
        </button>
      </div>

      {selectedFile && (
        <div className="form-group">
          <button onClick={handlePreview} disabled={isPreviewing || !importsConnected}>
            {isPreviewing ? 'Cargando vista previa...' : 'Ver vista previa'}
          </button>
        </div>
      )}

      {/* mapping assistant table */}
      {previewHeaders.length > 0 && (
        <div className="form-group">
          <h4>Mapeo automático</h4>
          <table className="mapping-table">
            <thead>
              <tr><th>Campo interno</th><th>Columna Excel</th></tr>
            </thead>
            <tbody>
              {['name','lastName','email','cellphone','idMember'].map((field) => (
                <tr key={field} className={mappingObj[field] ? '' : 'warning-row'}>
                  <td>{field}</td>
                  <td>
                    <select
                      value={mappingObj[field]||''}
                      onChange={(e) => {
                        const newMap = { ...mappingObj, [field]: e.target.value || null };
                        setMappingObj(newMap);
                        setMapping(JSON.stringify(newMap, null, 2));
                      }}
                    >
                      <option value="">-- ninguno --</option>
                      {previewHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="info-text">Campos mapeados: {Object.values(mappingObj).filter(Boolean).length} / 5</p>
        </div>
      )}

      {!selectedFile && (
        <p className="info-text">Sube un archivo y haz clic en ‘Ver vista previa’ para ver las primeras filas.</p>
      )}

      {previewData && (
        <div className="preview-container">
          {renderPreviewTable()}
        </div>
      )}

      {selectedFile && (
        <div className="form-group">
          <button onClick={handleImport} disabled={isCommitting || !importsConnected}>
            {isCommitting ? 'Procesando importación...' : 'Confirmar importación'}
          </button>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">{success}</p>}

      <h3>Historial de importaciones</h3>
      <div className="history-container">{renderHistory()}</div>
    </div>
  );
}
