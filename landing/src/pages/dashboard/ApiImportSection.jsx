import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ExtractorService from '../../api/services/ExtractorService';
import { createToast } from '@/components/ui/use-toast';
import { useAuth } from '../../context/AuthContext';
import { getAccessToken } from '../../config/authStorage';
import EvoConnectionForm from './components/EvoConnectionForm';
import SelectiveImportWizard from './components/SelectiveImportWizard';

const ESTRATEGIAS = [
  {
    key:         'replace',
    label:       'Reemplazar',
    description: 'Elimina todos los registros Excel y los reemplaza con los datos de la API.',
    color:       '#E24B4A',
    bg:          '#E24B4A14',
  },
  {
    key:         'overwrite',
    label:       'Sobrescribir',
    description: 'Mantiene registros Excel. En duplicados, la versión API prevalece.',
    color:       '#E89B2F',
    bg:          '#E89B2F14',
  },
  {
    key:         'complement',
    label:       'Complementar',
    description: 'Los datos conviven. En duplicados se fusionan conservando el campo más completo.',
    color:       '#1D9E75',
    bg:          '#1D9E7514',
  },
  {
    key:         'cancel',
    label:       'Cancelar',
    description: 'No importar ahora. Los datos actuales quedan intactos.',
    color:       '#888780',
    bg:          '#88878014',
  },
];

const STATUS_META = {
  completed:         { label: 'Completado',         bg: '#EAF3DE', color: '#3B6D11' },
  failed:            { label: 'Error',               bg: '#FCEBEB', color: '#A32D2D' },
  cancelled_by_user: { label: 'Cancelado',           bg: '#F1EFE8', color: '#5F5E5A' },
  running:           { label: 'En progreso',         bg: '#E8F4FF', color: '#1A6EA8' },
  queued:            { label: 'En cola',             bg: '#FFF8E8', color: '#92660A' },
  conflict_pending:  { label: 'Conflicto pendiente', bg: '#FFF3CD', color: '#856404' },
};

// ─── Íconos SVG inline ────────────────────────────────────────────────────────
const IconPlug     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V12M5 12H2a10 10 0 0020 0h-3M15 6V2M9 6V2M15 6H9v5a3 3 0 006 0V6z"/></svg>;
const IconDatabase = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>;
const IconCheck    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconX        = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconHash     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>;
const IconClock    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconAlert    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconPlay     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const IconRefresh  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.13-3.36L23 10M1 14l5.36 4.36A9 9 0 0020.49 15"/></svg>;
const IconSpinner  = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.25"/>
    <path d="M21 12a9 9 0 00-9-9"/>
  </svg>
);

export default function ApiImportSection() {
  const navigate = useNavigate();
  const { token: authToken } = useAuth();
  const [configs,       setConfigs]       = useState([]);
  const [selectedConfig,setSelectedConfig] = useState('');
  const [dataset,       setDataset]       = useState('ambos');
  const [loading,       setLoading]       = useState(false);
  const [logs,          setLogs]          = useState([]);
  const [activeJob,     setActiveJob]     = useState(null);
  const [conflict,      setConflict]      = useState(null);
  const [statusMsg,     setStatusMsg]     = useState('');
  const [activeTab,     setActiveTab]     = useState('import'); // 'import' | 'history'
  const [openDropdown,  setOpenDropdown]  = useState(null);    // 'conexion' | 'dataset' | null
  const [showNewConn,  setShowNewConn]  = useState(false);
  const [connForm,     setConnForm]     = useState({
    connectionName: '',
    provider:       'custom',
    baseUrl:        '',
    authType:       'bearer',
    token:          '',
    apiKey:         '',
    secret:         '',
    defaultDataset: 'ambos',
    // Campos nuevos para EVO
    dns:            '',
    filialId:       '',
    planType:       'plus',
  });
  const [connSaving,   setConnSaving]   = useState(false);
  const [connError,    setConnError]    = useState('');
  const [lastImportResult, setLastImportResult] = useState(null);
  const [evoUsage, setEvoUsage] = useState(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState(false);
  const [monthlyLimitBlocked, setMonthlyLimitBlocked] = useState(false);
  const [monthlyLimitAlert, setMonthlyLimitAlert] = useState('');
  const connectionDropdownRef = useRef(null);
  const datasetDropdownRef = useRef(null);

  const hasEvoConfig = configs.some(c => String(c?.provider || '').toLowerCase() === 'evo');
  const getConfigValue = (config) => String(config?._id || config?.connectionName || '');

  const getDatasetLabel = (value) => {
    if (value === 'clientes') return 'clientes';
    if (value === 'ventas') return 'ventas';
    return 'ventas y clientes';
  };

  const getDatasetTargets = (value) => ({
    includeClientes: value === 'clientes' || value === 'ambos',
    includeVentas: value === 'ventas' || value === 'ambos',
  });

  const getSelectedConnectionName = () => (
    configs.find(c => getConfigValue(c) === selectedConfig)?.connectionName || 'Conexión API'
  );

  const navigateTo = (path) => {
    if (typeof navigate === 'function') {
      navigate(path);
      return;
    }
    window.location.href = path;
  };

  const upsertLocalLog = ({ jobId, status, recordsInserted, recordsUpdated, datasetValue }) => {
    const connectionName = getSelectedConnectionName();
    setLogs(prev => {
      const base = Array.isArray(prev) ? [...prev] : [];
      const idx = base.findIndex(l => l.jobId === jobId);
      const patch = {
        jobId,
        status,
        dataset: datasetValue,
        recordsInserted: Number(recordsInserted) || 0,
        recordsUpdated: Number(recordsUpdated) || 0,
        connectionName,
        createdAt: new Date().toISOString(),
      };

      if (idx >= 0) {
        base[idx] = { ...base[idx], ...patch };
        return base;
      }

      return [patch, ...base].slice(0, 10);
    });
  };

  const refreshLogs = async () => {
    const logsResponse = await ExtractorService.getLogs({ limit: 10 });
    setLogs(logsResponse.data || []);
  };

  const handleImportCompleted = ({ jobId, datasetValue, recordsInserted, recordsUpdated, error }) => {
    const inserted = Number(recordsInserted) || 0;
    const updated = Number(recordsUpdated) || 0;
    const datasetLabel = getDatasetLabel(datasetValue);

    // Mensajes específicos para diferentes escenarios
    let statusMsg = `Importación completada: ${inserted} insertados, ${updated} actualizados (${datasetLabel}).`;
    let toastDescription = `${datasetLabel}: ${inserted} insertados, ${updated} actualizados.`;

    if (inserted === 0 && updated === 0) {
      statusMsg = `No se encontraron registros nuevos. Tus datos ya están actualizados o verifica los filtros de fecha en EVO.`;
      toastDescription = `No se encontraron registros nuevos.`;
    }

    if (error && error.includes('401')) {
      statusMsg = `❌ Credenciales incorrectas. Verifica tu DNS y API Key en la configuración de la conexión.`;
      toastDescription = `Error 401: Credenciales inválidas.`;
    } else if (error && error.includes('403')) {
      statusMsg = `❌ Sin permisos para este tipo de dato. Ajusta los permisos de tu API Key en EVO Settings → Integrations.`;
      toastDescription = `Error 403: Sin permisos.`;
    }

    setStatusMsg(statusMsg);
    setLastImportResult({
      dataset: datasetValue,
      inserted,
      updated,
      ...getDatasetTargets(datasetValue),
    });

    createToast({
      title: 'Importación completada',
      description: toastDescription,
      variant: inserted + updated > 0 ? 'success' : 'default',
      duration: 7000,
    });

    upsertLocalLog({
      jobId,
      status: 'completed',
      datasetValue,
      recordsInserted: inserted,
      recordsUpdated: updated,
    });

    if (hasEvoConfig) {
      loadEvoUsage();
    }
  };

  const isMonthlyLimitExceededPayload = (payload) => {
    const code = String(payload?.errorCode || payload?.code || payload?.error || '').toUpperCase();
    const message = String(payload?.message || payload?.detail || '').toUpperCase();
    return code.includes('MONTHLY_LIMIT_EXCEEDED') || message.includes('MONTHLY_LIMIT_EXCEEDED');
  };

  const markMonthlyLimitExceeded = () => {
    setMonthlyLimitBlocked(true);
    setMonthlyLimitAlert('❌ Límite de requests EVO alcanzado. Plan Plus: 100/día y 1.000/mes.');
  };

  const loadEvoUsage = async () => {
    if (!hasEvoConfig) return;

    setUsageLoading(true);
    setUsageError(false);

    const token = authToken || getAccessToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const response = await fetch('/api/setup/evo-usage', { headers });
      const data = await response.json();
      if (response.ok && data?.success && data?.usage) {
        setEvoUsage(data.usage);
        const plan = String(data.usage.plan || '').toLowerCase();
        const blockedByQuota = plan !== 'pro' && Number(data.usage.monthlyRemaining) === 0;
        setMonthlyLimitBlocked(blockedByQuota);
        if (!blockedByQuota) {
          setMonthlyLimitAlert('');
        }
        return;
      }

      setUsageError(true);
      setEvoUsage(null);
    } catch (err) {
      console.error('Error cargando uso EVO:', err);
      setUsageError(true);
      setEvoUsage(null);
    } finally {
      setUsageLoading(false);
    }
  };

  const getUsageLevel = (percentUsed = 0) => {
    if (percentUsed > 80) return 'high';
    if (percentUsed >= 60) return 'medium';
    return 'low';
  };

  const getUsageColor = (percentUsed = 0) => {
    const level = getUsageLevel(percentUsed);
    if (level === 'high') return '#f87171';
    if (level === 'medium') return '#fbbf24';
    return '#4ade80';
  };

  const getUsageGradient = (percentUsed = 0) => {
    const color = getUsageColor(percentUsed);
    return `linear-gradient(90deg, ${color}, ${color}CC)`;
  };

  const getMonthlyRemainingColor = (remaining = 0) => {
    if (remaining < 50) return '#f87171';
    if (remaining <= 200) return '#fbbf24';
    return '#4ade80';
  };

  const getDailyUsedColor = (dailyUsed = 0) => {
    if (dailyUsed > 80) return '#f87171';
    if (dailyUsed >= 50) return '#fbbf24';
    return '#4ade80';
  };

  const getUsageMessage = (usage) => {
    if (!usage) return null;

    const remaining = Number(usage.monthlyRemaining) || 0;
    const percent = Number(usage.percentUsed) || 0;

    if (remaining === 0) {
      return {
        tone: 'danger',
        text: '🔴 Cuota mensual agotada. No se pueden realizar mas importaciones hasta el proximo mes.',
      };
    }
    if (percent >= 95) {
      return {
        tone: 'danger',
        text: `🚫 Cuota casi agotada. Solo quedan ${remaining} requests. La importacion podria bloquearse.`,
      };
    }
    if (percent > 80) {
      return {
        tone: 'warning',
        text: '⚠️ Has consumido mas del 80% de tu cuota mensual. Considera optimizar o actualizar a Plan Pro.',
      };
    }
    if (percent >= 50) {
      return {
        tone: 'info',
        text: 'ℹ️ Consumo moderado. Considera usar extraccion incremental para optimizar.',
      };
    }

    return {
      tone: 'success',
      text: '✅ Consumo saludable. Tienes suficientes requests disponibles.',
    };
  };

  useEffect(() => {
    if (!openDropdown) return;
    const handler = (event) => {
      const target = event.target;
      const clickedConnection = connectionDropdownRef.current?.contains(target);
      const clickedDataset = datasetDropdownRef.current?.contains(target);
      if (!clickedConnection && !clickedDataset) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openDropdown]);

  useEffect(() => {
    ExtractorService.getConfigs().then(r => setConfigs(r.data || []));
    refreshLogs();
  }, []);

  useEffect(() => {
    if (hasEvoConfig) {
      loadEvoUsage();
    } else {
      setEvoUsage(null);
      setUsageError(false);
      setMonthlyLimitBlocked(false);
      setMonthlyLimitAlert('');
    }
  }, [hasEvoConfig, authToken]);

  // Polling de estado del job activo — sin cambios
  useEffect(() => {
    if (!activeJob) return;
    const interval = setInterval(async () => {
      const res = await ExtractorService.getStatus(activeJob);
      if (['completed', 'failed', 'cancelled_by_user'].includes(res.data?.status)) {
        clearInterval(interval);
        setActiveJob(null);
        setLoading(false);
        if (res.data.status === 'completed') {
          handleImportCompleted({
            jobId: activeJob,
            datasetValue: res.data.dataset || dataset,
            recordsInserted: res.data.recordsInserted,
            recordsUpdated: res.data.recordsUpdated,
          });
        } else {
          setStatusMsg(`Importación finalizada con estado: ${res.data.status}`);
          setLastImportResult(null);
          upsertLocalLog({
            jobId: activeJob,
            status: res.data.status,
            datasetValue: res.data.dataset || dataset,
            recordsInserted: res.data.recordsInserted,
            recordsUpdated: res.data.recordsUpdated,
          });
        }
        refreshLogs();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [activeJob, dataset]);

  async function handleRun() {
    if (!selectedConfig) return;
    setLoading(true);
    setStatusMsg('');
    setLastImportResult(null);
    setConflict(null);

    try {
      const result = await ExtractorService.run({ configId: selectedConfig, dataset });

      if (isMonthlyLimitExceededPayload(result)) {
        setLoading(false);
        markMonthlyLimitExceeded();
        if (hasEvoConfig) loadEvoUsage();
        return;
      }

      if (result.conflict) {
        setLoading(false);
        setConflict(result);
        return;
      }

      if (result.success && result.result) {
        setLoading(false);
        handleImportCompleted({
          jobId: result.jobId,
          datasetValue: dataset,
          recordsInserted: result.result.inserted,
          recordsUpdated: result.result.updated,
        });
        refreshLogs();
        return;
      }

      setActiveJob(result.jobId);
    } catch (err) {
      setLoading(false);
      if (isMonthlyLimitExceededPayload(err?.response?.data || err)) {
        markMonthlyLimitExceeded();
        if (hasEvoConfig) loadEvoUsage();
        return;
      }
      throw err;
    }
  }

  async function handleResolve(strategy) {
    if (!conflict) return;
    setConflict(null);
    setLoading(true);
    setLastImportResult(null);

    let result;
    try {
      result = await ExtractorService.resolve({
        jobId:    conflict.jobId,
        strategy,
        configId: selectedConfig,
        dataset,
      });
    } catch (err) {
      setLoading(false);
      if (isMonthlyLimitExceededPayload(err?.response?.data || err)) {
        markMonthlyLimitExceeded();
        if (hasEvoConfig) loadEvoUsage();
        return;
      }
      throw err;
    }

    if (isMonthlyLimitExceededPayload(result)) {
      setLoading(false);
      markMonthlyLimitExceeded();
      if (hasEvoConfig) loadEvoUsage();
      return;
    }

    if (strategy === 'cancel') {
      setLoading(false);
      setStatusMsg('Importación cancelada. Datos sin cambios.');
      setLastImportResult(null);
      refreshLogs();
      return;
    }

    if (result.success && result.result) {
      setLoading(false);
      handleImportCompleted({
        jobId: result.jobId,
        datasetValue: dataset,
        recordsInserted: result.result.inserted,
        recordsUpdated: result.result.updated,
      });
      refreshLogs();
      return;
    }

    setActiveJob(result.jobId);
  }

  async function handleSaveConn() {
    if (!connForm.connectionName) {
      setConnError('Nombre de conexión obligatorio.');
      return;
    }

    if (connForm.provider !== 'evo' && !connForm.baseUrl) {
      setConnError('La URL base es obligatoria para proveedores no EVO.');
      return;
    }

    // Validaciones específicas para EVO
    if (connForm.provider === 'evo') {
      if (!connForm.dns) {
        setConnError('El DNS del gimnasio es obligatorio para EVO.');
        return;
      }
      if (!connForm.apiKey) {
        setConnError('La API Key es obligatoria para EVO.');
        return;
      }
    }

    setConnSaving(true);
    setConnError('');
    try {
      // Para EVO no enviamos baseUrl editable: se resuelve como constante en backend
      const payload = connForm.provider === 'evo'
        ? { ...connForm, baseUrl: undefined }
        : connForm;

      await ExtractorService.saveConfig(payload);
      const updated = await ExtractorService.getConfigs();
      setConfigs(updated.data || []);
      setShowNewConn(false);
      setConnForm({
        connectionName: '', provider: 'custom', baseUrl: '',
        authType: 'bearer', token: '', apiKey: '', secret: '', defaultDataset: 'ambos',
        dns: '', filialId: '', planType: 'plus',
      });
    } catch (err) {
      setConnError(err?.response?.data?.message || 'Error al guardar la conexión.');
    } finally {
      setConnSaving(false);
    }
  }

  // ── Stats derivadas de logs ──────────────────────────────────────────────
  const totalImports     = logs.length;
  const exitosas         = logs.filter(l => l.status === 'completed').length;
  const fallidas         = logs.filter(l => l.status === 'failed').length;
  const totalRegistros   = logs.reduce((acc, l) => acc + (Number(l.recordsInserted) || 0), 0);

  const selectStyle = {
    flex: 1,
    minWidth: '180px',
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.12)',
    fontSize: '13px',
    background: 'rgba(255,255,255,0.07)',
    color: '#e8e8e8',
    outline: 'none',
    cursor: 'pointer',
  };

  const labelStyle = {
    display: 'block', fontSize: '11px', fontWeight: 600,
    color: 'rgba(255,255,255,0.45)', marginBottom: '5px',
    textTransform: 'uppercase', letterSpacing: '0.6px',
  };

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.12)', fontSize: '13px',
    background: 'rgba(255,255,255,0.06)', color: '#e8e8e8',
    outline: 'none', boxSizing: 'border-box',
    colorScheme: 'dark',
  };

  return (
    <>
      {/* Keyframe para spinner */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes usageSkeleton { 0% { opacity: 0.4; } 50% { opacity: 0.75; } 100% { opacity: 0.4; } }
        .api-row:hover { background: rgba(255,255,255,0.04) !important; }
        .api-tab { transition: all 0.18s ease; }
        .api-tab:hover { background: rgba(255,255,255,0.08) !important; }
        .api-btn-resolve:hover { filter: brightness(1.1); }
        .api-run-btn:not(:disabled):hover { background: #17876200 !important; border-color: #1D9E75 !important; filter: brightness(1.08); }
        .api-import-wrapper { width: 100% !important; max-width: 100% !important; resize: none !important; box-sizing: border-box; }
        .api-import-wrapper * { box-sizing: border-box; }
        .usage-skeleton { background: linear-gradient(90deg, #222230, #2d2d40, #222230); background-size: 200% 100%; animation: usageSkeleton 1.2s ease-in-out infinite; }
      `}</style>

      <div className="api-import-wrapper" style={{ padding: '28px 32px', animation: 'fadeIn 0.3s ease' }}>

        {/* ── Título de página ── */}
        <h2 style={{
          fontSize: '22px', fontWeight: 600,
          color: 'var(--color-text-primary)', marginBottom: '24px',
          letterSpacing: '-0.3px',
        }}>
          Importación por API
        </h2>

        {hasEvoConfig && (
          <div style={{
            background: '#13131a',
            border: '1px solid #252533',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#e9e9f0' }}>📊 Consumo API EVO</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {evoUsage && (
                  <span style={{
                    padding: '5px 10px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: String(evoUsage.plan || '').toLowerCase() === 'pro' ? '#8ab4ff' : getUsageColor(Number(evoUsage.percentUsed) || 0),
                    background: String(evoUsage.plan || '').toLowerCase() === 'pro' ? 'rgba(138,180,255,0.14)' : `${getUsageColor(Number(evoUsage.percentUsed) || 0)}1A`,
                    border: `1px solid ${String(evoUsage.plan || '').toLowerCase() === 'pro' ? 'rgba(138,180,255,0.32)' : `${getUsageColor(Number(evoUsage.percentUsed) || 0)}55`}`,
                  }}>
                    Plan {String(evoUsage.plan || '').toLowerCase() === 'pro' ? 'Pro' : 'Plus'}
                  </span>
                )}
                <button
                  onClick={loadEvoUsage}
                  disabled={usageLoading}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '6px 10px', borderRadius: '8px',
                    border: '1px solid #252533', background: '#1c1c27',
                    color: usageLoading ? '#707085' : '#b5b5c8',
                    fontSize: '12px', fontWeight: 600,
                    cursor: usageLoading ? 'wait' : 'pointer',
                  }}
                >
                  <span style={{ display: 'inline-flex', transform: usageLoading ? 'rotate(360deg)' : 'none', transition: 'transform 0.4s linear' }}>
                    <IconRefresh />
                  </span>
                  Actualizar
                </button>
              </div>
            </div>

            {usageError && !usageLoading && !evoUsage && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                padding: '10px 12px', borderRadius: '8px',
                border: '1px solid rgba(248,113,113,0.4)',
                background: 'rgba(248,113,113,0.12)', color: '#fca5a5',
                fontSize: '13px',
              }}>
                <span>No se pudo cargar el consumo de API.</span>
                <button
                  onClick={loadEvoUsage}
                  style={{
                    padding: '6px 10px', borderRadius: '8px',
                    border: '1px solid rgba(248,113,113,0.5)',
                    background: 'rgba(248,113,113,0.16)', color: '#fecaca',
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Reintentar
                </button>
              </div>
            )}

            {usageLoading && (
              <div style={{ display: 'grid', gap: '12px' }}>
                <div className="usage-skeleton" style={{ width: '180px', height: '12px', borderRadius: '6px' }} />
                <div style={{ background: '#252533', height: '9px', borderRadius: '999px', overflow: 'hidden' }}>
                  <div className="usage-skeleton" style={{ width: '45%', height: '100%', borderRadius: '999px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
                  <div className="usage-skeleton" style={{ height: '78px', borderRadius: '8px' }} />
                  <div className="usage-skeleton" style={{ height: '78px', borderRadius: '8px' }} />
                  <div className="usage-skeleton" style={{ height: '78px', borderRadius: '8px' }} />
                </div>
              </div>
            )}

            {!usageLoading && evoUsage && String(evoUsage.plan || '').toLowerCase() === 'pro' && (
              <div style={{
                padding: '10px 12px', borderRadius: '8px',
                background: 'rgba(138,180,255,0.1)', border: '1px solid rgba(138,180,255,0.28)',
                color: '#cddfff', fontSize: '13px', lineHeight: 1.6,
              }}>
                <div style={{ fontWeight: 600 }}>Plan Pro - Consultas ilimitadas. Consumo diario: {Number(evoUsage.dailyUsed) || 0} requests</div>
                <div style={{ color: '#9bbdf9' }}>Costo estimado hoy: R$ {((Number(evoUsage.dailyUsed) || 0) / 100 * 2.72).toFixed(2)}</div>
              </div>
            )}

            {!usageLoading && evoUsage && String(evoUsage.plan || '').toLowerCase() !== 'pro' && (
              <>
                <div style={{ marginBottom: '8px', fontSize: '12px', color: '#9f9fb5' }}>Uso mensual</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '220px', background: '#252533', height: '9px', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.max(0, Math.min(100, Number(evoUsage.percentUsed) || 0))}%`,
                      background: getUsageGradient(Number(evoUsage.percentUsed) || 0),
                      borderRadius: '999px',
                      transition: 'width 0.8s ease',
                    }} />
                  </div>
                  <div style={{ color: '#b2b2c4', fontSize: '12px', fontVariantNumeric: 'tabular-nums' }}>
                    {(Number(evoUsage.monthlyUsed) || 0).toLocaleString('es-CL')} / {(Number(evoUsage.monthlyLimit) || 0).toLocaleString('es-CL')} ({Number(evoUsage.percentUsed) || 0}%)
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '10px',
                  marginBottom: '12px',
                }}>
                  {[
                    {
                      value: Number(evoUsage.monthlyRemaining) || 0,
                      label: 'Restantes este mes',
                      color: getMonthlyRemainingColor(Number(evoUsage.monthlyRemaining) || 0),
                    },
                    {
                      value: Number(evoUsage.dailyUsed) || 0,
                      label: 'Usados hoy',
                      color: getDailyUsedColor(Number(evoUsage.dailyUsed) || 0),
                    },
                    {
                      value: Number(evoUsage.dailyLimit) || 0,
                      label: 'Limite diario',
                      color: '#8b8b9e',
                    },
                  ].map((item) => (
                    <div key={item.label} style={{
                      background: '#1c1c27',
                      border: '1px solid #252533',
                      borderRadius: '8px',
                      padding: '1rem',
                    }}>
                      <div style={{ fontSize: '26px', fontWeight: 700, color: item.color, lineHeight: 1 }}>{item.value.toLocaleString('es-CL')}</div>
                      <div style={{ marginTop: '4px', fontSize: '12px', color: '#a0a0b4' }}>{item.label}</div>
                    </div>
                  ))}
                </div>

                {getUsageMessage(evoUsage) && (
                  <div style={{
                    background: getUsageMessage(evoUsage).tone === 'danger'
                      ? 'rgba(248,113,113,0.1)'
                      : getUsageMessage(evoUsage).tone === 'warning'
                        ? 'rgba(251,191,36,0.1)'
                        : getUsageMessage(evoUsage).tone === 'info'
                          ? 'rgba(139,139,158,0.12)'
                          : 'rgba(74,222,128,0.1)',
                    borderLeft: `3px solid ${getUsageMessage(evoUsage).tone === 'danger'
                      ? '#f87171'
                      : getUsageMessage(evoUsage).tone === 'warning'
                        ? '#fbbf24'
                        : getUsageMessage(evoUsage).tone === 'info'
                          ? '#8b8b9e'
                          : '#4ade80'}`,
                    padding: '0.75rem 1rem',
                    fontSize: '0.85rem',
                    borderRadius: '8px',
                    color: '#d8d8e6',
                  }}>
                    {getUsageMessage(evoUsage).text}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Dark card container (igual a ImportarExcel) ── */}
        <div style={{
          background: 'linear-gradient(145deg, #1a1f2e, #141820)',
          borderRadius: '14px',
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'visible',
          boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
          width: '100%',
          boxSizing: 'border-box',
        }}>

          {/* Card header */}
          <div style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderRadius: '14px 14px 0 0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '7px',
                background: '#1D9E7522', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#1D9E75',
              }}>
                <IconPlug />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8e8' }}>
                  Importar datos
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '1px' }}>
                  Conecta con fuentes externas para sincronizar clientes y ventas
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                padding: '4px 10px', borderRadius: '20px', fontSize: '12px',
                background: configs.length > 0 ? '#1D9E7522' : '#88878022',
                color: configs.length > 0 ? '#1D9E75' : '#888780',
                border: `1px solid ${configs.length > 0 ? '#1D9E7540' : '#88878040'}`,
                fontWeight: 500,
              }}>
                {configs.length > 0 ? `● ${configs.length} conexión${configs.length > 1 ? 'es' : ''} disponible${configs.length > 1 ? 's' : ''}` : '● Sin conexiones'}
              </div>
              <button
                onClick={() => setShowNewConn(true)}
                style={{
                  padding: '4px 12px', borderRadius: '20px', fontSize: '12px',
                  background: '#1D9E7518', color: '#1D9E75',
                  border: '1px solid #1D9E7540', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#1D9E7530'}
                onMouseLeave={e => e.currentTarget.style.background = '#1D9E7518'}
              >
                + Nueva conexión
              </button>
            </div>
          </div>

          {/* ── Stats cards (igual a ImportarExcel) ── */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}>
            {[
              { icon: <IconHash />, value: totalImports, label: 'Importaciones',  color: '#7B9CFF' },
              { icon: <IconCheck/>, value: exitosas,     label: 'Exitosas',       color: '#1D9E75' },
              { icon: <IconX    />, value: fallidas,     label: 'Fallidas',       color: '#E24B4A' },
              { icon: <IconHash />, value: totalRegistros.toLocaleString('es-CL'), label: 'Registros insertados', color: '#E89B2F' },
            ].map((stat, i) => (
              <div key={i} style={{
                padding: '20px 24px',
                borderRight: i < 3 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                textAlign: 'center',
              }}>
                <div style={{ color: stat.color, marginBottom: '6px', opacity: 0.9 }}>{stat.icon}</div>
                <div style={{ fontSize: '26px', fontWeight: 700, color: stat.color, lineHeight: 1 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '5px', fontWeight: 500 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* ── Tabs ── */}
          <div style={{
            display: 'flex', padding: '12px 16px 0',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            gap: '4px',
          }}>
            {[{ key: 'import', label: '⬆ Ejecutar importación' }, { key: 'history', label: '⊙ Historial' }].map(tab => (
              <button
                key={tab.key}
                className="api-tab"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '8px 16px', borderRadius: '8px 8px 0 0',
                  border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                  background: activeTab === tab.key ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: activeTab === tab.key ? '#e8e8e8' : 'rgba(255,255,255,0.45)',
                  borderBottom: activeTab === tab.key ? '2px solid #1D9E75' : '2px solid transparent',
                  transition: 'all 0.18s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Ejecutar importación ── */}
          {activeTab === 'import' && (
            <div style={{ padding: '24px' }}>
              <SelectiveImportWizard
                selectedConfig={selectedConfig}
                configs={configs}
                onRefreshUsage={loadEvoUsage}
              />

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>

                {monthlyLimitAlert && (
                  <div style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(248,113,113,0.5)',
                    background: 'rgba(248,113,113,0.15)',
                    color: '#fecaca',
                    fontSize: '13px',
                    fontWeight: 600,
                    lineHeight: 1.5,
                  }}>
                    {monthlyLimitAlert}
                  </div>
                )}

                {/* Selector conexión — custom dropdown */}
                <div ref={connectionDropdownRef} style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    Conexión
                  </label>
                  <div
                    onClick={() => setOpenDropdown(openDropdown === 'conexion' ? null : 'conexion')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '9px 12px', borderRadius: '8px', cursor: 'pointer',
                      border: `1px solid ${openDropdown === 'conexion' ? 'rgba(29,158,117,0.6)' : 'rgba(255,255,255,0.12)'}`,
                      background: 'rgba(255,255,255,0.07)', color: selectedConfig ? '#e8e8e8' : 'rgba(255,255,255,0.35)',
                      fontSize: '13px', userSelect: 'none', height: '38px',
                      boxShadow: openDropdown === 'conexion' ? '0 0 0 2px rgba(29,158,117,0.15)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}><IconPlug /></span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedConfig ? configs.find(c => getConfigValue(c) === selectedConfig)?.connectionName || 'Seleccionar...' : 'Seleccionar conexión...'}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', flexShrink: 0, transform: openDropdown === 'conexion' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                  </div>
                  {openDropdown === 'conexion' && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
                      background: '#1e2535', border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '10px', overflow: 'hidden',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    }}>
                      <div
                        onClick={() => { setSelectedConfig(''); setOpenDropdown(null); }}
                        style={{
                          padding: '10px 14px', cursor: 'pointer', fontSize: '13px',
                          color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)',
                          background: !selectedConfig ? 'rgba(255,255,255,0.06)' : 'transparent',
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = !selectedConfig ? 'rgba(255,255,255,0.06)' : 'transparent'}
                      >
                        Seleccionar conexión...
                      </div>
                      {configs.length === 0 && (
                        <div style={{ padding: '12px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
                          Sin conexiones disponibles
                        </div>
                      )}
                      {configs.map((c, i) => (
                        <div
                          key={getConfigValue(c)}
                          onClick={() => { setSelectedConfig(getConfigValue(c)); setOpenDropdown(null); }}
                          style={{
                            padding: '10px 14px', cursor: 'pointer', fontSize: '13px',
                            display: 'flex', alignItems: 'center', gap: '10px',
                            borderBottom: i < configs.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                            background: selectedConfig === getConfigValue(c) ? 'rgba(29,158,117,0.12)' : 'transparent',
                            transition: 'background 0.12s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = selectedConfig === getConfigValue(c) ? 'rgba(29,158,117,0.18)' : 'rgba(255,255,255,0.05)'}
                          onMouseLeave={e => e.currentTarget.style.background = selectedConfig === getConfigValue(c) ? 'rgba(29,158,117,0.12)' : 'transparent'}
                        >
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1D9E75', flexShrink: 0 }} />
                          <span style={{ color: '#e8e8e8' }}>{c.connectionName}</span>
                          {selectedConfig === getConfigValue(c) && <span style={{ marginLeft: 'auto', color: '#1D9E75', fontSize: '11px' }}>✓</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selector dataset — custom dropdown */}
                {(() => {
                  const currentConfig = configs.find(c => getConfigValue(c) === selectedConfig);
                  const isEvo = String(currentConfig?.provider || '').toLowerCase() === 'evo';
                  
                  let DATASET_OPTIONS = [
                    { value: 'ambos',    label: 'Ventas y Clientes', color: '#7B9CFF', dot: '#7B9CFF' },
                    { value: 'ventas',   label: 'Solo Ventas',       color: '#1D9E75', dot: '#1D9E75' },
                    { value: 'clientes', label: 'Solo Clientes',     color: '#E89B2F', dot: '#E89B2F' },
                  ];

                  // Agregar datasets adicionales para EVO
                  if (isEvo) {
                    DATASET_OPTIONS = [
                      ...DATASET_OPTIONS,
                      { value: 'prospectos', label: 'Prospectos',      color: '#8B5CF6', dot: '#8B5CF6' },
                      { value: 'entradas', label: 'Accesos/Entradas',  color: '#EC4899', dot: '#EC4899' },
                      { value: 'membresias', label: 'Membresías',      color: '#06B6D4', dot: '#06B6D4' },
                      { value: 'pagos', label: 'Pagos/Deudas',       color: '#F59E0B', dot: '#F59E0B' },
                      { value: 'todo', label: '⚠️ Todo (todos datos)',  color: '#EF4444', dot: '#EF4444' },
                    ];
                  }

                  const selected = DATASET_OPTIONS.find(o => o.value === dataset);
                  return (
                    <div ref={datasetDropdownRef} style={{ minWidth: '200px', position: 'relative' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                        Dataset
                      </label>
                      <div
                        onClick={() => setOpenDropdown(openDropdown === 'dataset' ? null : 'dataset')}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '9px 12px', borderRadius: '8px', cursor: 'pointer',
                          border: `1px solid ${openDropdown === 'dataset' ? `${selected.dot}80` : 'rgba(255,255,255,0.12)'}`,
                          background: 'rgba(255,255,255,0.07)', fontSize: '13px',
                          userSelect: 'none', height: '38px',
                          boxShadow: openDropdown === 'dataset' ? `0 0 0 2px ${selected.dot}25` : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: selected.dot, flexShrink: 0 }} />
                        <span style={{ flex: 1, color: selected.color, fontWeight: 600 }}>{selected.label}</span>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', flexShrink: 0, transform: openDropdown === 'dataset' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                      </div>
                      {openDropdown === 'dataset' && (
                        <div style={{
                          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
                          background: '#1e2535', border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '10px', overflow: 'hidden',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                          maxHeight: '400px',
                        }}>
                          {DATASET_OPTIONS.map((opt, i) => (
                            <div
                              key={opt.value}
                              onClick={() => {
                                if (opt.value === 'todo') {
                                  createToast({
                                    title: 'Advertencia',
                                    description: 'Esta opción consume múltiples requests. Verifica tu límite de plan antes de ejecutar.',
                                    variant: 'default',
                                    duration: 5000,
                                  });
                                }
                                setDataset(opt.value);
                                setOpenDropdown(null);
                              }}
                              style={{
                                padding: '11px 14px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '10px',
                                borderBottom: i < DATASET_OPTIONS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                background: dataset === opt.value ? `${opt.dot}18` : 'transparent',
                                transition: 'background 0.12s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = `${opt.dot}22`}
                              onMouseLeave={e => e.currentTarget.style.background = dataset === opt.value ? `${opt.dot}18` : 'transparent'}
                            >
                              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: opt.dot, flexShrink: 0, boxShadow: `0 0 6px ${opt.dot}80` }} />
                              <span style={{ fontSize: '13px', fontWeight: dataset === opt.value ? 600 : 400, color: dataset === opt.value ? opt.color : '#c8c8c8' }}>
                                {opt.label}
                              </span>
                              {dataset === opt.value && <span style={{ marginLeft: 'auto', color: opt.color, fontSize: '11px' }}>✓</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Botón ejecutar */}
                <button
                  className="api-run-btn"
                  onClick={handleRun}
                  disabled={loading || !selectedConfig || monthlyLimitBlocked}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '9px 20px', borderRadius: '8px', fontWeight: 600,
                    fontSize: '13px', cursor: loading || !selectedConfig || monthlyLimitBlocked ? 'not-allowed' : 'pointer',
                    background: loading || !selectedConfig || monthlyLimitBlocked ? 'rgba(255,255,255,0.07)' : '#1D9E75',
                    color: loading || !selectedConfig || monthlyLimitBlocked ? 'rgba(255,255,255,0.35)' : '#fff',
                    border: `1px solid ${loading || !selectedConfig || monthlyLimitBlocked ? 'rgba(255,255,255,0.1)' : '#1D9E75'}`,
                    transition: 'all 0.18s ease',
                    marginTop: 'auto',
                    height: '38px',
                  }}
                >
                  {loading ? <IconSpinner /> : <IconPlay />}
                  {loading ? 'Importando...' : monthlyLimitBlocked ? 'Limite mensual alcanzado' : 'Ejecutar importación'}
                </button>
              </div>

              {/* Barra de progreso animada cuando corre */}
              {loading && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{
                    height: '3px', borderRadius: '2px',
                    background: 'rgba(255,255,255,0.08)', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', width: '40%',
                      background: 'linear-gradient(90deg, transparent, #1D9E75, transparent)',
                      animation: 'progressSlide 1.4s ease-in-out infinite',
                    }} />
                  </div>
                  <style>{`@keyframes progressSlide { 0%{transform:translateX(-150%)} 100%{transform:translateX(350%)} }`}</style>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
                    Sincronizando datos con la API... por favor esperá.
                  </p>
                </div>
              )}

              {/* Mensaje de estado post-importación */}
              {statusMsg && !loading && (
                <div style={{
                  marginTop: '16px', padding: '12px 16px', borderRadius: '8px',
                  background: statusMsg.includes('cancelada') ? 'rgba(136,135,128,0.12)' : 'rgba(29,158,117,0.12)',
                  border: `1px solid ${statusMsg.includes('cancelada') ? 'rgba(136,135,128,0.25)' : 'rgba(29,158,117,0.25)'}`,
                  display: 'flex', alignItems: 'center', gap: '8px',
                  fontSize: '13px',
                  color: statusMsg.includes('cancelada') ? 'rgba(255,255,255,0.55)' : '#1D9E75',
                }}>
                  {statusMsg.includes('cancelada') ? <IconX /> : <IconCheck />}
                  {statusMsg}
                </div>
              )}

              {lastImportResult && !loading && (
                <div style={{
                  marginTop: '10px',
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}>
                  {lastImportResult.includeClientes && (
                    <button
                      onClick={() => navigateTo('/clientes')}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(123,156,255,0.45)',
                        background: 'rgba(123,156,255,0.15)',
                        color: '#b8c8ff',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Ver Clientes
                    </button>
                  )}
                  {lastImportResult.includeVentas && (
                    <button
                      onClick={() => navigateTo('/ventas')}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(29,158,117,0.45)',
                        background: 'rgba(29,158,117,0.15)',
                        color: '#8fe0c3',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Ver Ventas
                    </button>
                  )}
                  <button
                    onClick={() => navigateTo('/dashboard')}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.28)',
                      background: 'rgba(255,255,255,0.08)',
                      color: '#e8e8e8',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Ver Dashboard
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Historial ── */}
          {activeTab === 'history' && (
            <div style={{ padding: '0', borderRadius: '0 0 14px 14px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['Conexión', 'Dataset', 'Estado', 'Registros', 'Fecha'].map((h, i) => (
                      <th key={h} style={{
                        padding: '12px 16px', fontWeight: 600, fontSize: '11px',
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                        color: 'rgba(255,255,255,0.35)',
                        textAlign: i >= 3 ? 'right' : 'left',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => {
                    const meta = STATUS_META[log.status] || { label: log.status, bg: '#F1EFE8', color: '#5F5E5A' };
                    return (
                      <tr key={log.jobId} className="api-row"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' }}>
                        <td style={{ padding: '12px 16px', color: '#d8d8d8' }}>{log.connectionName}</td>
                        <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.55)' }}>{log.dataset}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: '12px', fontSize: '11px',
                            fontWeight: 600, background: meta.bg, color: meta.color,
                          }}>
                            {meta.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#d8d8d8', fontVariantNumeric: 'tabular-nums' }}>
                          {(log.recordsInserted + log.recordsUpdated).toLocaleString('es-CL')}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px' }}>
                          <IconClock />
                          {new Date(log.createdAt).toLocaleDateString('es-CL')}
                        </td>
                      </tr>
                    );
                  })}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>
                        Sin importaciones registradas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Modal de conflicto — sin cambios de lógica ── */}
        {conflict && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            backdropFilter: 'blur(4px)',
          }}>
            <div style={{
              background: 'linear-gradient(145deg, #1e2333, #161b28)',
              borderRadius: '14px', padding: '28px',
              maxWidth: '480px', width: '90%',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              animation: 'fadeIn 0.2s ease',
            }}>
              {/* Header modal */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '8px',
                  background: '#E89B2F1A', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: '#E89B2F',
                  flexShrink: 0,
                }}>
                  <IconAlert />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#e8e8e8', margin: 0 }}>
                  Conflicto detectado
                </h3>
              </div>

              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '20px', lineHeight: 1.65 }}>
                Hay <strong style={{ color: '#e8e8e8' }}>{conflict.excelRecordCount}</strong> registros importados desde Excel
                en <strong style={{ color: '#e8e8e8' }}>{dataset === 'ambos' ? 'Ventas y Clientes' : dataset}</strong>.
                Elegí qué hacer con ellos antes de continuar.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ESTRATEGIAS.map(e => (
                  <button
                    key={e.key}
                    className="api-btn-resolve"
                    onClick={() => handleResolve(e.key)}
                    style={{
                      padding: '12px 16px', borderRadius: '10px', cursor: 'pointer',
                      border: `1px solid ${e.color}30`,
                      background: e.bg,
                      textAlign: 'left', transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '13px', color: e.color }}>
                      {e.label}
                    </span>
                    <span style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: '3px', lineHeight: 1.5 }}>
                      {e.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <EvoConnectionForm
          show={showNewConn}
          onClose={() => setShowNewConn(false)}
          connForm={connForm}
          setConnForm={setConnForm}
          labelStyle={labelStyle}
          inputStyle={inputStyle}
          connError={connError}
          connSaving={connSaving}
          onSave={handleSaveConn}
        />
      </div>
    </>
  );
}
