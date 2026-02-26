import React, { useEffect, useState } from 'react'
import exportService from '@/api/services/exportService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useNavigate } from 'react-router-dom'
import moment from 'moment'

export default function ExportHistory() {
  const [runs, setRuns] = useState([])
  const [selectedRun, setSelectedRun] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchRuns()
  }, [])

  const fetchRuns = async () => {
    setLoading(true)
    try {
      const data = await exportService.listRuns()
      setRuns(data || [])
    } catch (err) {
      console.error('Error cargando historial:', err)
    }
    setLoading(false)
  }

  const viewRun = async (runId) => {
    try {
      const detail = await exportService.getRun(runId)
      setSelectedRun(detail)
    } catch (err) {
      console.error('Error obteniendo run:', err)
    }
  }

  const closeDetail = () => setSelectedRun(null)

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">📦 Historial de Exportaciones</h1>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>Volver al dashboard</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Corridas recientes</CardTitle>
        </CardHeader>
        <CardContent>
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
                    <td>{moment(r.createdAt).format('YYYY-MM-DD HH:mm')}</td>
                    <td>{r.sourceType}</td>
                    <td><Badge variant={r.status === 'failed' ? 'destructive' : r.status === 'running' ? 'outline' : 'default'}>{r.status}</Badge></td>
                    <td>{JSON.stringify(r.counts || {})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedRun && (
        <Card>
          <CardHeader>
            <CardTitle>Detalle – {selectedRun.runId}</CardTitle>
            <Button size="sm" variant="ghost" onClick={closeDetail}>Cerrar</Button>
          </CardHeader>
          <CardContent>
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
                      <td>{moment(log.ts).format('HH:mm:ss')}</td>
                      <td>{log.level}</td>
                      <td>{log.message || JSON.stringify(log.meta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
