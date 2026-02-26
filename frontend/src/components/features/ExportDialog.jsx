import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Download, CheckCircle } from 'lucide-react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import exportService from '@/api/services/exportService'

// Nota: el modal implementa un pequeño "wizard" de dos pasos.
export default function ExportDialog({ open, onOpenChange, onFinished }) {
  const [activeTab, setActiveTab] = useState('universal') // 'universal' | 'evo' | 'file'
  const [baseUrl, setBaseUrl] = useState('')
  const [path, setPath] = useState('')
  const [file, setFile] = useState(null)
  const [configExtra, setConfigExtra] = useState('')

  const [step, setStep] = useState(1) // 1=configurar, 2=mapeo (excel), 3=métricas
  const [runId, setRunId] = useState(null)
  const [preview, setPreview] = useState(null)
  const [availableMetrics, setAvailableMetrics] = useState([])
  const [selectedMetrics, setSelectedMetrics] = useState([])
  const [metricsByEndpoint, setMetricsByEndpoint] = useState({})
  const [previewTab, setPreviewTab] = useState(null)
  // excel mapping
  const [detectedColumns, setDetectedColumns] = useState([])
  const [suggestedMappings, setSuggestedMappings] = useState({})
  const [mappings, setMappings] = useState({})

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (preview && typeof preview === 'object' && !Array.isArray(preview)) {
      const keys = Object.keys(preview);
      setPreviewTab(keys[0] || null);
    } else {
      setPreviewTab(null);
    }
  }, [preview]);

  const resetWizard = () => {
    setStep(1)
    setRunId(null)
    setPreview(null)
    setAvailableMetrics([])
    setSelectedMetrics([])
    setMetricsByEndpoint({})
    setPreviewTab(null)
    setDetectedColumns([])
    setSuggestedMappings({})
    setMappings({})
    setLoading(false)
    setError(null)
  }

  const handleClose = () => {
    resetWizard()
    onOpenChange(false)
  }

  const handleRun = async () => {
    setError(null)
    setLoading(true)
    try {
      let resp
      const sourceType = activeTab === 'file' ? 'excel' : activeTab
      if (sourceType === 'excel') {
        if (!file) {
          setError('Selecciona un archivo válido (.xls/.xlsx/.csv)')
          setLoading(false)
          return
        }
        const form = new FormData()
        form.append('sourceType', sourceType)
        form.append('config', JSON.stringify({}))
        form.append('file', file)
        resp = await exportService.startRunForm(form)
      } else {
        if (!baseUrl.trim() || !path.trim()) {
          setError('baseUrl y path son requeridos')
          setLoading(false)
          return
        }
        const cfg = { baseUrl: baseUrl.trim(), path: path.trim() }
        resp = await exportService.startRun(sourceType, cfg)
      }

      setPreview(resp.preview || [])
      setAvailableMetrics(resp.availableMetrics || [])
      setMetricsByEndpoint(resp.metricsByEndpoint || {})
      setMetricsByEndpoint(resp.metricsByEndpoint || {})
      setRunId(resp.runId)
      if (activeTab === 'file') {
        setDetectedColumns(resp.detectedColumns || [])
        setSuggestedMappings(resp.suggestedMappings || {})
        setMappings(resp.suggestedMappings || {})
        setStep(2);
      } else {
        setStep(2);
      }
    } catch (err) {
      setError(err?.message || 'Error en la petición')
    }
    setLoading(false)
  }

  const handleConfirmMetrics = async () => {
    setError(null)
    setLoading(true)
    // validation for mappings if excel
    if (activeTab === 'file') {
      const required = {
        clients: ['name','email','phone','externalId'],
        sales: ['amount','date'],
        memberships: ['status','clientExternalId'],
        payables: ['amountDue','dueDate']
      };
      for (const m of selectedMetrics) {
        const req = required[m] || [];
        for (const f of req) {
          if (!mappings[m] || !mappings[m][f]) {
            setError(`Debes mapear ${f} para la métrica ${m}`);
            setLoading(false);
            return;
          }
        }
      }
    }

    try {
      await exportService.confirmMetrics(runId, selectedMetrics, {}, mappings)
      setLoading(false)
      handleClose()
      if (onFinished) onFinished()
    } catch (err) {
      setError(err?.message || 'Error confirmando métricas')
      setLoading(false)
    }
  }

  const toggleMetric = (m) => {
    setSelectedMetrics((prev) => {
      if (prev.includes(m)) return prev.filter(x => x !== m)
      return [...prev, m]
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} onClose={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="flex justify-between items-center">
          <DialogTitle>
            {step === 1 ? 'Exportar / Importar datos' : (step === 2 && activeTab === 'file' ? 'Mapeo de columnas' : 'Seleccionar métricas')}
          </DialogTitle>
          {step === 1 && (
            <button
              className="text-sm text-blue-600 hover:underline"
              onClick={() => window.location.href = '/dashboard/export-history'}
            >Ver historial</button>
          )}
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-2">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="universal">Extraer API</TabsTrigger>
                <TabsTrigger value="evo">Extraer EVO</TabsTrigger>
                <TabsTrigger value="file">Importar Archivo</TabsTrigger>
              </TabsList>
              <TabsContent value="universal">
                <div className="space-y-2">
                  <Label>Base URL</Label>
                  <Input
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.foo.com"
                  />
                  <Label>Ruta/endpoint</Label>
                  <Input
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder="/v1/members"
                  />
                </div>
              </TabsContent>
              <TabsContent value="evo">
                <div className="space-y-2">
                  <Label>Base URL (ABC EVO / W12)</Label>
                  <Input
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.abcevo.com"
                  />
                  <Label>Ruta/endpoint</Label>
                  <Input
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder="/memberships"
                  />
                </div>
              </TabsContent>
              <TabsContent value="file">
                <div className="space-y-2">
                  <Label>Seleccionar archivo</Label>
                  <Input
                    type="file"
                    accept=".xls,.xlsx,.csv"
                    onChange={(e) => setFile(e.target.files[0])}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {step === 1 && preview && (
          <div className="mt-4">
            <p className="text-sm font-medium">Vista previa</p>
            {Array.isArray(preview) ? (
              <>
                <p className="text-xs text-gray-600">{preview.length} filas</p>
                <div className="overflow-auto max-h-64">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        {Object.keys(preview[0] || {}).map((k) => (
                          <th key={k} className="border px-1 py-0.5">
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 30).map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).map((v, j) => (
                            <td key={j} className="border px-1 py-0.5">
                              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <Tabs value={previewTab} onValueChange={setPreviewTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    {Object.keys(preview).map((key) => (
                      <TabsTrigger key={key} value={key}>{key}</TabsTrigger>
                    ))}
                  </TabsList>
                  {Object.entries(preview).map(([key, rows]) => (
                    <TabsContent key={key} value={key}>
                      {metricsByEndpoint[key] && (
                        <p className="text-xs text-gray-500"> métricas: {metricsByEndpoint[key].join(', ')} </p>
                      )}
                      <div className="overflow-auto max-h-64">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr>
                              {Object.keys(rows[0] || {}).map((k) => (
                                <th key={k} className="border px-1 py-0.5">{k}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.slice(0,30).map((row,i)=>(
                              <tr key={i}>
                                {Object.values(row).map((v,j)=>(
                                  <td key={j} className="border px-1 py-0.5">
                                    {typeof v==='object'?JSON.stringify(v):String(v)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </>
            )}
          </div>
        )}

        {step === 2 && activeTab === 'file' && (
          <div className="space-y-4">
            <p className="font-medium">Mapeo de columnas</p>
            {availableMetrics.map(m => (
              <fieldset key={m} className="border p-2">
                <legend className="font-semibold">{m}</legend>
                { {
                    clients: ['name','email','phone','externalId'],
                    sales: ['amount','date','clientExternalId'],
                    memberships: ['status','startDate','endDate','clientExternalId'],
                    payables: ['amountDue','dueDate','status','clientExternalId']
                  }[m].map(field => (
                    <div key={field} className="mb-2">
                      <Label className="block text-xs capitalize">{field}</Label>
                      <Select
                        value={mappings[m]?.[field] || ''}
                        onValueChange={(v) => {
                          setMappings(prev => ({
                            ...prev,
                            [m]: { ...(prev[m] || {}), [field]: v }
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="(ninguno)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">(ninguno)</SelectItem>
                          {detectedColumns.map(col => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )) }
              </fieldset>
            ))}
            <Button size="sm" onClick={() => setStep(3)} className="w-full">
              Siguiente: métricas
            </Button>
          </div>
        )}

        {(step === 2 && activeTab !== 'file') || step === 3 ? (
          <div className="space-y-3 max-h-64 overflow-auto">
            {availableMetrics.length === 0 && (
              <p className="text-sm text-gray-600">No hay métricas disponibles.</p>
            )}
            {availableMetrics.map((m) => (
              <div key={m} className="flex items-center gap-2">
                <Checkbox
                  checked={selectedMetrics.includes(m)}
                  onCheckedChange={() => toggleMetric(m)}
                />
                <span className="text-sm">{m}</span>
              </div>
            ))}
          </div>
        ) : null}

        <DialogFooter>
          {step === 1 && (
            <Button onClick={handleRun} disabled={loading} className="w-full">
              {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />} 
              {activeTab === 'file' ? 'Importar' : 'Extraer'}
            </Button>
          )}
          {((step === 2 && activeTab !== 'file') || step === 3) && (
            <Button onClick={handleConfirmMetrics} disabled={loading} className="w-full">
              {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />} Confirmar métricas
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
