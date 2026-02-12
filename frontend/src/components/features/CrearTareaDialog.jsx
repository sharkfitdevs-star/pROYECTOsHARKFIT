import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar, Repeat, X } from 'lucide-react';
import { format } from 'date-fns';

import { Tareas_RS } from '@/entities/Tareas_RS';
import { Sucursales } from '@/entities/Sucursales';
import { Clientes } from '@/entities/Clientes';
import User from '@/entities/User';

export default function CrearTareaDialog({ open, onOpenChange, staffId, sedeDefault, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [sedes, setSedes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clientesFiltrados, setClientesFiltrados] = useState([]);

  // Campos del formulario
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState('administrativa');
  const [prioridad, setPrioridad] = useState('media');
  const [fechaLimite, setFechaLimite] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sede, setSede] = useState(sedeDefault || '');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [notas, setNotas] = useState('');

  // Campos de recurrencia
  const [esRecurrente, setEsRecurrente] = useState(false);
  const [frecuenciaRecurrencia, setFrecuenciaRecurrencia] = useState('semanal');
  const [diasSemana, setDiasSemana] = useState([]);
  const [diaMes, setDiaMes] = useState(1);

  useEffect(() => {
    if (open) {
      loadData();
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    if (sedeDefault) {
      setSede(sedeDefault);
    }
  }, [sedeDefault]);

  useEffect(() => {
    if (busquedaCliente.length >= 2) {
      const filtrados = clientes.filter(c => 
        c.nombre?.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
        c.whatsapp?.includes(busquedaCliente)
      ).slice(0, 10);
      setClientesFiltrados(filtrados);
    } else {
      setClientesFiltrados([]);
    }
  }, [busquedaCliente, clientes]);

  const loadData = async () => {
    const sedesData = await Sucursales.filter({ activa: true });
    setSedes(sedesData);

    if (sedeDefault) {
      const clientesData = await Clientes.filter({ sede: sedeDefault });
      setClientes(clientesData);
    }
  };

  const resetForm = () => {
    setTitulo('');
    setDescripcion('');
    setTipo('administrativa');
    setPrioridad('media');
    setFechaLimite(format(new Date(), 'yyyy-MM-dd'));
    setSede(sedeDefault || '');
    setClienteSeleccionado(null);
    setBusquedaCliente('');
    setNotas('');
    setEsRecurrente(false);
    setFrecuenciaRecurrencia('semanal');
    setDiasSemana([]);
    setDiaMes(1);
  };

  const handleSedeChange = async (sedeId) => {
    setSede(sedeId);
    setClienteSeleccionado(null);
    setBusquedaCliente('');
    
    if (sedeId) {
      const clientesData = await Clientes.filter({ sede: sedeId });
      setClientes(clientesData);
    }
  };

  const toggleDiaSemana = (dia) => {
    setDiasSemana(prev => {
      if (prev.includes(dia)) {
        return prev.filter(d => d !== dia);
      } else {
        return [...prev, dia].sort((a, b) => a - b);
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!titulo.trim()) {
      alert('El título es obligatorio');
      return;
    }

    if (!sede) {
      alert('Debe seleccionar una sede');
      return;
    }

    if (esRecurrente) {
      if (frecuenciaRecurrencia === 'semanal' && diasSemana.length === 0) {
        alert('Debe seleccionar al menos un día de la semana para tareas recurrentes semanales');
        return;
      }
    }

    setLoading(true);

    try {
      const tareaData = {
        titulo,
        descripcion,
        tipo,
        prioridad,
        fecha_limite: fechaLimite,
        estado: 'pendiente',
        responsable: staffId,
        sede,
        notas,
        es_recurrente: esRecurrente
      };

      if (clienteSeleccionado) {
        tareaData.cliente = clienteSeleccionado.id;
      }

      if (esRecurrente) {
        tareaData.frecuencia_recurrencia = frecuenciaRecurrencia;
        
        if (frecuenciaRecurrencia === 'semanal') {
          tareaData.dias_recurrencia = diasSemana;
        } else if (frecuenciaRecurrencia === 'mensual') {
          tareaData.dias_recurrencia = [diaMes];
        } else if (frecuenciaRecurrencia === 'diaria') {
          tareaData.dias_recurrencia = [];
        }
      }

      await Tareas_RS.create(tareaData);

      alert('Tarea creada exitosamente');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error al crear tarea:', error);
      alert('Error al crear la tarea');
    } finally {
      setLoading(false);
    }
  };

  const diasSemanaLabels = [
    { value: 1, label: 'Lun' },
    { value: 2, label: 'Mar' },
    { value: 3, label: 'Mié' },
    { value: 4, label: 'Jue' },
    { value: 5, label: 'Vie' },
    { value: 6, label: 'Sáb' },
    { value: 0, label: 'Dom' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Nueva Tarea
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div>
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Revisar inventario"
              required
            />
          </div>

          {/* Descripción */}
          <div>
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe la tarea..."
              rows={3}
            />
          </div>

          {/* Tipo y Prioridad */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tipo">Tipo *</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger id="tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrativa">Administrativa</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="seguimiento">Seguimiento</SelectItem>
                  <SelectItem value="operativa">Operativa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="prioridad">Prioridad *</Label>
              <Select value={prioridad} onValueChange={setPrioridad}>
                <SelectTrigger id="prioridad">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fecha Límite y Sede */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fechaLimite">Fecha Límite *</Label>
              <Input
                id="fechaLimite"
                type="date"
                value={fechaLimite}
                onChange={(e) => setFechaLimite(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="sede">Sede *</Label>
              <Select value={sede} onValueChange={handleSedeChange}>
                <SelectTrigger id="sede">
                  <SelectValue placeholder="Seleccionar sede" />
                </SelectTrigger>
                <SelectContent>
                  {sedes.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cliente Relacionado (opcional) */}
          <div>
            <Label htmlFor="cliente">Cliente Relacionado (opcional)</Label>
            {clienteSeleccionado ? (
              <div className="flex items-center gap-2 p-2 border rounded-md bg-gray-50">
                <span className="flex-1 text-sm">
                  {clienteSeleccionado.nombre} - {clienteSeleccionado.whatsapp}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setClienteSeleccionado(null);
                    setBusquedaCliente('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Input
                  id="cliente"
                  value={busquedaCliente}
                  onChange={(e) => setBusquedaCliente(e.target.value)}
                  placeholder="Buscar por nombre o whatsapp..."
                  disabled={!sede}
                />
                {clientesFiltrados.length > 0 && (
                  <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                    {clientesFiltrados.map(cliente => (
                      <button
                        key={cliente.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                        onClick={() => {
                          setClienteSeleccionado(cliente);
                          setBusquedaCliente('');
                          setClientesFiltrados([]);
                        }}
                      >
                        {cliente.nombre} - {cliente.whatsapp}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Recurrencia */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Checkbox
                id="esRecurrente"
                checked={esRecurrente}
                onCheckedChange={setEsRecurrente}
              />
              <Label htmlFor="esRecurrente" className="flex items-center gap-2 cursor-pointer">
                <Repeat className="h-4 w-4" />
                Tarea Recurrente
              </Label>
            </div>

            {esRecurrente && (
              <div className="space-y-4 pl-6 border-l-2 border-blue-200">
                <div>
                  <Label htmlFor="frecuencia">Frecuencia</Label>
                  <Select value={frecuenciaRecurrencia} onValueChange={setFrecuenciaRecurrencia}>
                    <SelectTrigger id="frecuencia">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diaria">Diaria</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensual">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {frecuenciaRecurrencia === 'semanal' && (
                  <div>
                    <Label>Días de la Semana *</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {diasSemanaLabels.map(dia => (
                        <Badge
                          key={dia.value}
                          variant={diasSemana.includes(dia.value) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleDiaSemana(dia.value)}
                        >
                          {dia.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {frecuenciaRecurrencia === 'mensual' && (
                  <div>
                    <Label htmlFor="diaMes">Día del Mes</Label>
                    <Select value={diaMes.toString()} onValueChange={(v) => setDiaMes(parseInt(v))}>
                      <SelectTrigger id="diaMes">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                          <SelectItem key={d} value={d.toString()}>Día {d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {frecuenciaRecurrencia === 'diaria' && (
                  <p className="text-sm text-gray-600">
                    Esta tarea se repetirá todos los días
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Notas */}
          <div>
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Notas adicionales..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Tarea'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}