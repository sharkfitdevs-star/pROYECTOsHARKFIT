import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clientes } from '@/entities/Clientes';
import { Ciclos_Retencion } from '@/entities/Ciclos_Retencion';
import { Sucursales } from '@/entities/Sucursales';
import { Planes_Servicios } from '@/entities/Planes_Servicios';
import { Staff } from '@/entities/Staff';
import { Cerradores } from '@/entities/Cerradores';
import { Bajas_Programadas } from '@/entities/Bajas_Programadas';
import { Deudores } from '@/entities/Deudores';
import { Ventas } from '@/entities/Ventas';
import { Prospectos } from '@/entities/Prospectos';
import { Seguimiento_Online } from '@/entities/Seguimiento_Online';
import { sincronizarClienteDesdeVenta } from '@/components/SyncClientesHelper';
import moment from 'moment';
import DashboardRetencionSede from '@/components/DashboardRetencionSede';
import RegistrarVentaDialog from '@/components/RegistrarVentaDialog';
import RegistrarContactoDialog from '@/components/RegistrarContactoDialog';
import DarDeBajaDialog from '@/components/DarDeBajaDialog';
import { useToast } from '@/components/ui/use-toast';

export default function DashboardFinanciero() {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [staff, setStaff] = useState([]);
  const [cerradores, setCerradores] = useState([]);
  const [ciclosRetencion, setCiclosRetencion] = useState([]);
  const [bajasProgramadas, setBajasProgramadas] = useState([]);
  const [deudoresList, setDeudoresList] = useState([]);
  const [seguimientosOnline, setSeguimientosOnline] = useState([]);
  
  // Dialog states
  const [renovacionDialogOpen, setRenovacionDialogOpen] = useState(false);
  const [prospectoParaRenovacion, setProspectoParaRenovacion] = useState(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [contactoDialogOpen, setContactoDialogOpen] = useState(false);
  const [clienteParaContacto, setClienteParaContacto] = useState(null);
  const [darDeBajaDialogOpen, setDarDeBajaDialogOpen] = useState(false);
  const [clienteParaBaja, setClienteParaBaja] = useState(null);
  
  const { toast } = useToast();

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [
        clientesData, 
        sedesData, 
        planesData, 
        staffData, 
        cerradoresData, 
        ciclosData, 
        bajasData, 
        deudoresData,
        seguimientosOnlineData
      ] = await Promise.all([
        Clientes.list('-createdAt'),
        Sucursales.list('nombre_sede'),
        Planes_Servicios.list('nombre_plan'),
        Staff.list('nombre'),
        Cerradores.list('nombre_cerrador'),
        Ciclos_Retencion.list('-fecha_evento'),
        Bajas_Programadas.list('-createdAt'),
        Deudores.list('-createdAt'),
        Seguimiento_Online.list('-createdAt')
      ]);
      
      setClientes(clientesData || []);
      setSedes((sedesData || []).filter(s => s.activo));
      setPlanes((planesData || []).filter(p => p.activo));
      setStaff((staffData || []).filter(s => s.activo));
      setCerradores((cerradoresData || []).filter(c => c.activo));
      setCiclosRetencion(ciclosData || []);
      setBajasProgramadas(bajasData || []);
      setDeudoresList(deudoresData || []);
      setSeguimientosOnline(seguimientosOnlineData || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRenovar = async (cliente) => {
    try {
      const prospectos = await Prospectos.filter({ whatsapp: cliente.whatsapp });
      
      if (prospectos && prospectos.length > 0) {
        setProspectoParaRenovacion(prospectos[0]);
        setClienteSeleccionado(cliente);
        setRenovacionDialogOpen(true);
      } else {
        toast({
          title: "Sin prospecto",
          description: "No se encontró un prospecto asociado a este cliente.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error buscando prospecto:', error);
      toast({
        title: "Error",
        description: "Error al preparar la renovación",
        variant: "destructive"
      });
    }
  };

  const handleGuardarRenovacion = async (ventaData) => {
    try {
      const nuevaVenta = await Ventas.create({
        ...ventaData,
        prospecto_id: prospectoParaRenovacion.id,
        sede: clienteSeleccionado.sede,
        estado: 'Cerrada'
      });

      await sincronizarClienteDesdeVenta(nuevaVenta, prospectoParaRenovacion);

      const seguimientoActivo = seguimientosOnline.find(s => s.cliente_id === clienteSeleccionado.id);
      if (seguimientoActivo) {
        await Seguimiento_Online.update(seguimientoActivo.id, {
          estado: 'Renovó',
          renovo: true
        });
      }
      
      toast({
        title: "Renovación Exitosa",
        description: "La venta y el cliente han sido actualizados."
      });

      setRenovacionDialogOpen(false);
      await cargarDatos();
    } catch (error) {
      console.error('Error guardando renovación:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar la renovación.",
        variant: "destructive"
      });
    }
  };

  const handleRegistrarContacto = (cliente) => {
    setClienteParaContacto(cliente);
    setContactoDialogOpen(true);
  };

  const handleDarDeBaja = (cliente) => {
    const plan = planes.find(p => p.id === cliente.plan_actual);
    setClienteParaBaja({
      ...cliente,
      plan_nombre: plan?.nombre_plan
    });
    setDarDeBajaDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard financiero...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Dashboard de Retención por Sede */}
      <DashboardRetencionSede
        clientes={clientes}
        bajasProgramadas={bajasProgramadas}
        deudores={deudoresList}
        ciclosRetencion={ciclosRetencion}
        sedes={sedes}
        planes={planes}
        mesActual={moment()}
        onRenovar={handleRenovar}
        onContactar={handleRegistrarContacto}
        onDarDeBaja={handleDarDeBaja}
      />

      {/* Dialogs */}
      <RegistrarVentaDialog
        open={renovacionDialogOpen}
        onClose={() => setRenovacionDialogOpen(false)}
        prospecto={prospectoParaRenovacion}
        onSave={handleGuardarRenovacion}
        esRenovacion={true}
      />

      <RegistrarContactoDialog
        open={contactoDialogOpen}
        onOpenChange={setContactoDialogOpen}
        cliente={clienteParaContacto}
        onSuccess={cargarDatos}
      />

      <DarDeBajaDialog
        open={darDeBajaDialogOpen}
        onOpenChange={setDarDeBajaDialogOpen}
        cliente={clienteParaBaja}
        onSuccess={cargarDatos}
      />
    </div>
  );
}