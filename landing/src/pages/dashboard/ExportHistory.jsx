import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import './Dashboard.css'

function ExportHistory() {
  const [runs, setRuns] = useState([])
  const [selectedRun, setSelectedRun] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // fake data for demo
  useEffect(() => {
    setRuns([
      { runId: 1, createdAt: new Date().toISOString(), sourceType: 'csv', status: 'completed', counts: { rows: 123 } },
      { runId: 2, createdAt: new Date().toISOString(), sourceType: 'json', status: 'failed', counts: {} }
    ])
  }, [])

  const viewRun = (runId) => {
    const run = runs.find(r => r.runId === runId)
    setSelectedRun(run)
  }

  const closeDetail = () => setSelectedRun(null)

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">📦 Historial de Exportaciones</h1>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>Volver al dashboard</Button>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Corridas recientes</h2>
        </div>
        <div className="card-content">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Counts</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(r => (
                  <tr key={r.runId} className="hover:bg-gray-50 cursor-pointer" onClick={() => viewRun(r.runId)}>
                    <td>{r.runId}</td>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                    <td>{r.sourceType}</td>
                    <td><Badge variant={r.status === 'failed' ? 'destructive' : r.status === 'running' ? 'outline' : 'default'}>{r.status}</Badge></td>
                    <td>{JSON.stringify(r.counts || {})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
      </div>

      {selectedRun && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Detalle – {selectedRun.runId}</h2>
            <Button size="sm" variant="ghost" onClick={closeDetail}>Cerrar</Button>
          </div>
          <div className="card-content">
            <p><strong>Status:</strong> {selectedRun.status}</p>
            <p><strong>Counts:</strong> {JSON.stringify(selectedRun.counts)}</p>
            <h3 className="mt-4 font-semibold">Logs</h3>
            <div className="overflow-auto max-h-64">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Level</th>
                    <th>Mensaje</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedRun.logs || []).map((log, i) => (
                    <tr key={i} className={log.level === 'error' ? 'bg-red-50' : ''}>
                      <td>{new Date(log.ts).toLocaleTimeString()}</td>
                      <td>{log.level}</td>
                      <td>{log.message || JSON.stringify(log.meta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExportHistory
