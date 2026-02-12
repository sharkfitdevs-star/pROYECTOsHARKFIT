import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Phone, Building2, User, Calendar } from 'lucide-react';
import axios from 'axios';
import moment from 'moment';

export default function GestionarLlamadosConfirmacionDialog({
  open,
  onOpenChange,
  items,
  sedes,
  staff,
  onMarcarResultado,
  onReagendar
}) {
  const [exportLoading, setExportLoading] = useState(false);

  const exportarExcel = async () => {
    setExportLoading(true);
    const headers = ['Prospecto', 'WhatsApp', 'Sede', 'Fecha Visita', 'Hora', 'Vendedor', 'Estado'];
    const data = (items || []).map((it) => [
      it.prospecto_nombre || '',
      it.prospecto_whatsapp || '',
      it.sede_nombre || '',
      it.fecha_visita || '',
      it.hora_visita || '',
      it.vendedor_nombre || '',
      it.estado_llamado || 'pendiente'
    ]);

    const response = await axios.post(
      `${process.env.PROXY_INTEGRATION_URL}/documents/export-excel`,
      {
        sheets: [
          {
            name: 'Llamados Confirmación',
            data: [headers, ...data]
          }
        ]
      },
      {
        headers: {
          'x-api-key': window.config.apiKey
        },
        responseType: 'blob'
      }
    );

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Llamados_Confirmacion_${moment().format('YYYY-MM-DD')}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setExportLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-blue-600" />
              Llamados de Confirmación Pendiente ({items?.length || 0})
            </DialogTitle>
            <Button onClick={exportarExcel} disabled={exportLoading} size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              {exportLoading ? 'Exportando...' : 'Exportar Excel'}
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prospecto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sede</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Visita</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(items || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No hay llamados pendientes para mañana
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.key} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-sm">{it.prospecto_nombre}</p>
                          <p className="text-xs text-gray-500">{it.prospecto_whatsapp}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm">
                        <Building2 className="w-3 h-3 text-gray-400" />
                        {it.sede_nombre || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {it.fecha_visita} {it.hora_visita}
                        </div>
                        <div className="text-xs text-gray-500">Visita mañana</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{it.vendedor_nombre || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <Badge
                        className={
                          it.estado_llamado === 'no_realizado'
                            ? 'bg-red-100 text-red-800'
                            : it.estado_llamado === 'confirmo'
                              ? 'bg-green-100 text-green-800'
                              : it.estado_llamado === 'no_confirmo'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {it.estado_llamado === 'no_realizado'
                          ? 'No realizado'
                          : it.estado_llamado === 'confirmo'
                            ? 'Confirmó'
                            : it.estado_llamado === 'no_confirmo'
                              ? 'No confirmó'
                              : 'Pendiente'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Select
                          value={
                            it.estado_llamado === 'confirmo' || it.estado_llamado === 'no_confirmo'
                              ? it.estado_llamado
                              : ''
                          }
                          onValueChange={(value) => {
                            if (value === 'reagendar') {
                              onReagendar?.(it);
                              return;
                            }
                            onMarcarResultado(it, value);
                          }}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Llamada realizada..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="confirmo">Llamada realizada - Confirmó</SelectItem>
                            <SelectItem value="no_confirmo">Llamada realizada - No confirmó</SelectItem>
                            <SelectItem value="reagendar">Reagendar</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}