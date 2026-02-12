import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Eye,
  Phone,
  Plus,
  Star,
  TrendingUp,
  UserX
} from 'lucide-react';
import { format, parseISO, differenceInDays, isBefore, subDays } from 'date-fns';

import User from '@/entities/User';
import { Staff } from '@/entities/Staff';
import { Sucursales } from '@/entities/Sucursales';

import { Tareas_RS } from '@/entities/Tareas_RS';
import { Solicitudes_Baja } from '@/entities/Solicitudes_Baja';
import { Llamados_Confirmacion } from '@/entities/Llamados_Confirmacion';
import { Clientes } from '@/entities/Clientes';
import { Prospectos } from '@/entities/Prospectos';
import { Bajas_Programadas } from '@/entities/Bajas_Programadas';
import { Seguimiento_Online } from '@/entities/Seguimiento_Online';
import { Alertas_Renovacion } from '@/entities/Alertas_Renovacion';
import { Clientes_Riesgo } from '@/entities/Clientes_Riesgo';
import { Checklist_Asignados } from '@/entities/Checklist_Asignados';
import { Alertas_Checklist } from '@/entities/Alertas_Checklist';
import { Deudores } from '@/entities/Deudores';
import { Contratos } from '@/entities/Contratos';
import { Tarjetas_Registradas } from '@/entities/Tarjetas_Registradas';
import { Ventas } from '@/entities/Ventas';
import { Planes_Servicios } from '@/entities/Planes_Servicios';
import { Agendamientos } from '@/entities/Agendamientos';
import { Seguimiento_NPS } from '@/entities/Seguimiento_NPS';

import CollapsibleArea from '@/components/CollapsibleArea';
import TabMiDia from '@/components/TabMiDia';
import TabGestionFinanciera from '@/components/TabGestionFinanciera';

import GestionarBajaDialog from '@/components/GestionarBajaDialog';
import GestionarNPSCruzadoDialog from '@/components/GestionarNPSCruzadoDialog';
import GestionarRenovacionPrepagoDialog from '@/components/GestionarRenovacionPrepagoDialog';
import RegistrarContactoDialog from '@/components/RegistrarContactoDialog';
import RegistrarIntentoCobroDialog from '@/components/RegistrarIntentoCobroDialog';
import RegistrarRenovacionDialog from '@/components/RegistrarRenovacionDialog';
import GestionarClienteRiesgoDialog from '@/components/GestionarClienteRiesgoDialog';
import EjecutarChecklistDialog from '@/components/EjecutarChecklistDialog';
import HistorialClienteDialog from '@/components/HistorialClienteDialog';
import CrearTareaDialog from '@/components/CrearTareaDialog';
import GestionarTareaClienteNuevoDialog from '@/components/GestionarTareaClienteNuevoDialog';
import GestionarLlamadosConfirmacionDialog from '@/components/GestionarLlamadosConfirmacionDialog';
import AgendadosHoyDialog from '@/components/AgendadosHoyDialog';
import NPSCruzadosDialog from '@/components/NPSCruzadosDialog';
import ReagendarDialog from '@/components/ReagendarDialog';
import MetricaListadoDialog from '@/components/MetricaListadoDialog';
import BajasAContactarDialog from '@/components/BajasAContactarDialog';
import AlertasMetricasDialog from '@/components/AlertasMetricasDialog';

export default function DashboardRS() {
  // Dashboard del Responsable de Sede - Versión actualizada
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState(null);
  const [sedesDisponibles, setSedesDisponibles] = useState([]);
  const [sedeSeleccionada, setSedeSeleccionada] = useState('todas');

  // Data
  const [tareas, setTareas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [solicitudesBaja, setSolicitudesBaja] = useState([]);
  const [llamados, setLlamados] = useState([]);
  const [prospectos, setProspectos] = useState([]);
  const [npsCruzadosCount, setNpsCruzadosCount] = useState(0);
  const [bajasProgramadas, setBajasProgramadas] = useState([]);
  const [seguimientoOnline, setSeguimientoOnline] = useState([]);
  const [alertasRenovacion, setAlertasRenovacion] = useState([]);
  const [clientesRiesgo, setClientesRiesgo] = useState([]);
  const [checklistsAsignados, setChecklistsAsignados] = useState([]);
  const [alertasChecklist, setAlertasChecklist] = useState([]);
  const [deudores, setDeudores] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [tarjetas, setTarjetas] = useState([]);
  const [agendamientos, setAgendamientos] = useState([]);
  const [staffAll, setStaffAll] = useState([]);
  const [seguimientosNPS, setSeguimientosNPS] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [planes, setPlanes] = useState([]);

  // Dialog state
  const [gestionarBajaDialogOpen, setGestionarBajaDialogOpen] = useState(false);
  const [gestionarNPSDialogOpen, setGestionarNPSDialogOpen] = useState(false);
  const [gestionarRenovacionDialogOpen, setGestionarRenovacionDialogOpen] = useState(false);
  const [registrarContactoDialogOpen, setRegistrarContactoDialogOpen] = useState(false);
  const [registrarIntentoCobroDialogOpen, setRegistrarIntentoCobroDialogOpen] = useState(false);
  const [registrarRenovacionDialogOpen, setRegistrarRenovacionDialogOpen] = useState(false);
  const [gestionarClienteRiesgoDialogOpen, setGestionarClienteRiesgoDialogOpen] = useState(false);
  const [ejecutarChecklistDialogOpen, setEjecutarChecklistDialogOpen] = useState(false);
  const [historialClienteDialogOpen, setHistorialClienteDialogOpen] = useState(false);
  const [crearTareaDialogOpen, setCrearTareaDialogOpen] = useState(false);
  const [gestionarClienteNuevoDialogOpen, setGestionarClienteNuevoDialogOpen] = useState(false);
  const [gestionarLlamadosDialogOpen, setGestionarLlamadosDialogOpen] = useState(false);
  const [agendadosHoyDialogOpen, setAgendadosHoyDialogOpen] = useState(false);
  const [npsCruzadosDialogOpen, setNpsCruzadosDialogOpen] = useState(false);
  const [bajasAContactarDialogOpen, setBajasAContactarDialogOpen] = useState(false);
  const [alertasMetricasDialogOpen, setAlertasMetricasDialogOpen] = useState(false);

  // Nuevos dialogs para métricas clickeables
  const [tareasVencidasDialogOpen, setTareasVencidasDialogOpen] = useState(false);
  const [tareasPendientesDialogOpen, setTareasPendientesDialogOpen] = useState(false);
  const [alertasCriticasDialogOpen, setAlertasCriticasDialogOpen] = useState(false);
  const [deudoresDialogOpen, setDeudoresDialogOpen] = useState(false);

  const [llamadosItems, setLlamadosItems] = useState([]);

  // Reagendar desde Llamados de confirmación
  const [reagendarDialogOpen, setReagendarDialogOpen] = useState(false);
  const [agendamientoSeleccionado, setAgendamientoSeleccionado] = useState(null);

  const [bajaSeleccionada, setBajaSeleccionada] = useState(null);
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [deudorSeleccionado, setDeudorSeleccionado] = useState(null);
  const [clienteRiesgoSeleccionado, setClienteRiesgoSeleccionado] = useState(null);
  const [checklistSeleccionado, setChecklistSeleccionado] = useState(null);

  const [comprobante, setComprobante] = useState(null);

  // Collapsible areas
  const [areasMiDiaOpen, setAreasMiDiaOpen] = useState(false);
  const [areasFinancieraOpen, setAreasFinancieraOpen] = useState(false);
  const [areasTareasOpen, setAreasTareasOpen] = useState(false);
  const [areasRetencionOpen, setAreasRetencionOpen] = useState(false);
  const [areasCalidadOpen, setAreasCalidadOpen] = useState(false);
  const [areasReportesOpen, setAreasReportesOpen] = useState(false);

  const [historialDesde, setHistorialDesde] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [historialHasta, setHistorialHasta] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [kpis, setKpis] = useState({
    tareasPendientes: 0,
    tareasVencidas: 0,
    tareasPorVencer: 0,
    deudoresCantidad: 0,
    deudoresMonto: 0,
    solicitudesPendientes: 0,
    alertasCriticas: 0,
    clientesRiesgoCritico: 0,
    checklistsPendientes: 0,
    seguimientoOnlinePendientes: 0,
    contratosPendientes: 0,
    tarjetasPendientes: 0,
    llamadosPendientesHoy: 0,
    llamadosNoRealizados: 0,
    agendadosHoy: 0,
    agendadosSinGestionar: 0,
    npsCruzadosPendientes: 0,
    bajasAContactar: 0,
    // Métricas para alertas
    metricaRetencion: 0,
    metricaAsistencia: 0,
    metricaConversion: 0,
    alertasMetricasCount: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Cargar datos cuando tengamos staff, incluso si no hay sedes disponibles
    // Las tareas se cargan por responsable, no por sede
    if (staff) {
      loadDataBySede();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sedeSeleccionada, staff, sedesDisponibles]);

  const getSedesIds = () => {
    if (sedeSeleccionada === 'todas') return sedesDisponibles.map(s => s.id);
    if (sedeSeleccionada && sedeSeleccionada !== 'todas') return [sedeSeleccionada];
    return [];
  };

  const loadDataBySede = async () => {
    setLoading(true);

    const sedesIds = getSedesIds();
    const haySedesDisponibles = sedesIds.length > 0;
    
    // Determinar si el usuario tiene rol de supervisión (ve todas las tareas de las sedes)
    const esRolSupervision = staff?.roles && (
      staff.roles.includes('direccion') || 
      staff.roles.includes('jefe_ventas') || 
      staff.roles.includes('lider_comercial') ||
      staff.roles.includes('asistente')
    );

    // IMPORTANTE: Las tareas se cargan según el rol del usuario
    // - Roles de supervisión: ven TODAS las tareas de las sedes seleccionadas
    // - Responsables de sede: solo ven las tareas asignadas a ellos
    let tareasPromise;
    if (esRolSupervision) {
      // Usuarios con rol de supervisión ven todas las tareas de las sedes
      if (sedeSeleccionada === 'todas' && haySedesDisponibles) {
        // Cargar tareas de todas las sedes disponibles
        const tareasPromises = sedesIds.map(sedeId => Tareas_RS.filter({ sede: sedeId }));
        tareasPromise = Promise.all(tareasPromises).then(arrays => arrays.flat());
      } else if (sedeSeleccionada !== 'todas') {
        tareasPromise = Tareas_RS.filter({ sede: sedeSeleccionada });
      } else {
        tareasPromise = Promise.resolve([]);
      }
    } else {
      // Responsables de sede solo ven sus propias tareas
      tareasPromise = sedeSeleccionada === 'todas'
        ? Tareas_RS.filter({ responsable: staff.id })
        : Tareas_RS.filter({ responsable: staff.id, sede: sedeSeleccionada });
    }
    
    const tareasPromises = [tareasPromise];
    
    // Solo cargar datos de sedes si hay sedes disponibles
    const clientesPromises = haySedesDisponibles ? sedesIds.map(sedeId => Clientes.filter({ sede: sedeId })) : [Promise.resolve([])];
    const solicitudesPromises = haySedesDisponibles ? sedesIds.map(sedeId => Solicitudes_Baja.filter({ sede: sedeId })) : [Promise.resolve([])];
    const llamadosPromises = haySedesDisponibles ? sedesIds.map(sedeId => Llamados_Confirmacion.filter({ sede: sedeId })) : [Promise.resolve([])];
    const prospectosPromises = haySedesDisponibles ? sedesIds.map(sedeId => Prospectos.filter({ sede: sedeId, estado_pipeline: 'NPS Online' })) : [Promise.resolve([])];
    const ventasPromises = haySedesDisponibles ? sedesIds.map(sedeId => Ventas.filter({ sede: sedeId })) : [Promise.resolve([])];
    const bajasPromises = haySedesDisponibles ? sedesIds.map(sedeId => Bajas_Programadas.filter({ sede: sedeId })) : [Promise.resolve([])];
    const planesPromise = Planes_Servicios.list('nombre_plan');
    const staffAllPromise = Staff.list('nombre');
    const seguimientoOnlinePromises = haySedesDisponibles ? sedesIds.map(sedeId => Seguimiento_Online.filter({ sede: sedeId })) : [Promise.resolve([])];
    const alertasRenovacionPromises = haySedesDisponibles ? sedesIds.map(sedeId => Alertas_Renovacion.filter({ sede: sedeId })) : [Promise.resolve([])];
    const clientesRiesgoPromises = haySedesDisponibles ? sedesIds.map(sedeId => Clientes_Riesgo.filter({ sede_id: sedeId })) : [Promise.resolve([])];
    const deudoresPromises = haySedesDisponibles ? sedesIds.map(sedeId => Deudores.filter({ sede: sedeId })) : [Promise.resolve([])];
    const contratosPromises = haySedesDisponibles ? sedesIds.map(sedeId => Contratos.filter({ sede: sedeId })) : [Promise.resolve([])];
    const tarjetasPromises = haySedesDisponibles ? sedesIds.map(sedeId => Tarjetas_Registradas.filter({ sede: sedeId })) : [Promise.resolve([])];
    const seguimientosNPSPromise = Seguimiento_NPS.list('-createdAt');

    // 



    // Llamados de confirmacin por SEDE DEL AGENDAMIENTO:
    // Para evitar que un agendamiento no aparezca por estar en otra sede,
    // cargamos agendamientos de TODAS las sedes disponibles del RS, y luego
    // filtramos/mostramos por sede seleccionada (si aplica).
    //
    // Nota: esto es deliberado para que el RS vea y cree llamados segn la sede del agendamiento.
    const agendamientosAllPromise = Agendamientos.filter({});

    const [
      tareasArrays,
      clientesArrays,
      solicitudesArrays,
      llamadosArrays,
      prospectosArrays,
      ventasArrays,
      bajasArrays,
      planesData,
      staffAllData,
      seguimientoOnlineArrays,
      alertasRenovacionArrays,
      clientesRiesgoArrays,
      deudoresArrays,
      contratosArrays,
      tarjetasArrays,
      agendamientosAllData,
      seguimientosNPSData
    ] = await Promise.all([
      Promise.all(tareasPromises),
      Promise.all(clientesPromises),
      Promise.all(solicitudesPromises),
      Promise.all(llamadosPromises),
      Promise.all(prospectosPromises),
      Promise.all(ventasPromises),
      Promise.all(bajasPromises),
      planesPromise,
      staffAllPromise,
      Promise.all(seguimientoOnlinePromises),
      Promise.all(alertasRenovacionPromises),
      Promise.all(clientesRiesgoPromises),
      Promise.all(deudoresPromises),
      Promise.all(contratosPromises),
      Promise.all(tarjetasPromises),
      agendamientosAllPromise,
      seguimientosNPSPromise
    ]);

    const tareasDataRaw = Array.isArray(tareasArrays[0]) ? tareasArrays.flat() : tareasArrays[0] || [];
    // Las tareas ya vienen filtradas según el rol y sede seleccionada
    const tareasData = tareasDataRaw;
    const clientesData = clientesArrays.flat();
    const solicitudesData = solicitudesArrays.flat();
    const llamadosData = llamadosArrays.flat();
    const prospectosData = prospectosArrays.flat();
    const ventasData = ventasArrays.flat();

    // Agendamientos: usar la carga global (para poder detectar llamados por sede del agendamiento)
    // y luego filtrar solo a las sedes visibles por este RS.
    const agendamientosData = (agendamientosAllData || []).filter((a) => sedesIds.includes(a?.sede));
    setAgendamientos(agendamientosData);

    const bajasData = bajasArrays.flat();
    const seguimientoOnlineData = seguimientoOnlineArrays.flat();
    const alertasRenovacionData = alertasRenovacionArrays.flat();
    const clientesRiesgoData = clientesRiesgoArrays.flat();
    const deudoresData = deudoresArrays.flat();
    const contratosData = contratosArrays.flat();
    const tarjetasData = tarjetasArrays.flat();

    setTareas(tareasData);
    setClientes(clientesData);
    setSolicitudesBaja(solicitudesData);
    setLlamados(llamadosData);
    setProspectos(prospectosData);
    setBajasProgramadas(bajasData);
    setStaffAll(staffAllData);
    setVentas(ventasData);
    setPlanes(planesData);

    // Calcular cantidad NPS Cruzados (misma lógica que página NPSCruzados)
    const planById = Object.fromEntries((planesData || []).filter(p => p?.id).map(p => [p.id, p]));
    const staffById = Object.fromEntries((staffAllData || []).filter(s => s?.id).map(s => [s.id, s]));
    const ventasByProspecto = {};
    (ventasData || []).forEach(v => {
      if (!v?.prospecto_id) return;
      if (!ventasByProspecto[v.prospecto_id]) ventasByProspecto[v.prospecto_id] = [];
      ventasByProspecto[v.prospecto_id].push(v);
    });

    const agByProspecto = {};
    (agendamientosData || []).forEach(a => {
      if (!a?.prospecto_id) return;
      if (!agByProspecto[a.prospecto_id]) agByProspecto[a.prospecto_id] = [];
      agByProspecto[a.prospecto_id].push(a);
    });

    const getLastAgendamiento = (prospectoId) => {
      const arr = agByProspecto[prospectoId] || [];
      if (!arr.length) return null;
      return arr.slice().sort((x, y) => new Date(y.fecha_hora) - new Date(x.fecha_hora))[0];
    };

    const tieneCompraPlanPrograma = (prospectoId) => {
      const arr = ventasByProspecto[prospectoId] || [];
      return arr.some(v => {
        if (!v?.plan) return false;
        const plan = planById[v.plan];
        return plan?.tipo_item === 'Plan' || plan?.tipo_item === 'Programa';
      });
    };

    const diasEnNpsOnline = (prospecto) => {
      const base = prospecto?.fecha_ingreso_nps || prospecto?.updatedAt;
      const fechaIngreso = base ? new Date(base) : new Date();
      const diffMs = Date.now() - fechaIngreso.getTime();
      const diffHoras = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
      return Math.floor(diffHoras / 24);
    };

    const esCruzado = (prospecto) => {
      if (!prospecto?.id) return false;
      if (diasEnNpsOnline(prospecto) < 2) return false;
      if (tieneCompraPlanPrograma(prospecto.id)) return false;

      const last = getLastAgendamiento(prospecto.id);
      const noAsistio = last?.resultado_asistencia === 'No asistió';
      const asistio = last?.resultado_asistencia === 'Asistió';

      // Solo contamos los dos orígenes requeridos
      return noAsistio || asistio;
    };

    const npsCruzadosCantidad = (prospectosData || []).filter(esCruzado).length;
    setNpsCruzadosCount(npsCruzadosCantidad);
    setSeguimientoOnline(seguimientoOnlineData);
    setAlertasRenovacion(alertasRenovacionData);
    setClientesRiesgo(clientesRiesgoData);
    setDeudores(deudoresData);
    setContratos(contratosData);
    setTarjetas(tarjetasData);
    setSeguimientosNPS(seguimientosNPSData || []);

    // ✅ Llamados de confirmación: prospectos con visita mañana
    // ✅ Usamos rango local [mañana 00:00, mañana 23:59] para evitar problemas de timezone
    const ahoraLocal = new Date();
    const inicioManana = new Date(ahoraLocal);
    inicioManana.setDate(inicioManana.getDate() + 1);
    inicioManana.setHours(0, 0, 0, 0);

    const finManana = new Date(inicioManana);
    finManana.setHours(23, 59, 59, 999);

    const agendamientosManana = (agendamientosData || []).filter((a) => {
      if (!a?.fecha_hora) return false;
      const fechaHora = parseISO(a.fecha_hora);
      const esManana = fechaHora >= inicioManana && fechaHora <= finManana;
      const estaPendiente = a.resultado_asistencia === 'Pendiente' || !a.resultado_asistencia;
      return esManana && estaPendiente;
    });

    const prospectoById = Object.fromEntries((prospectosData || []).filter(p => p?.id).map(p => [p.id, p]));

    // ✅ Asegurar creación automática de llamados pendientes para HOY (confirmación de visitas de mañana)
    const hoy0 = new Date();
    hoy0.setHours(0, 0, 0, 0);
    const hoyStr2 = format(hoy0, 'yyyy-MM-dd');

    const llamadosPendientesAsegurados = [];

    for (const a of agendamientosManana) {
      const marker = `agendamientoId:${a.id}`;
      const existente = (llamadosData || []).find(
        (l) =>
          l.motivo === 'confirmacion_asistencia' &&
          l.sede === a.sede &&
          l.notas?.includes(marker)
      );

      if (!existente) {
        // Crear llamado pendiente para hoy
        const creado = await Llamados_Confirmacion.create({
          cliente: a.prospecto_id,
          motivo: 'confirmacion_asistencia',
          fecha_programada: hoyStr2,
          estado: 'pendiente',
          responsable: staff.id,
          sede: a.sede,
          notas: `Confirmación de asistencia. ${marker}`
        });

        llamadosPendientesAsegurados.push(creado);
      }
    }

    // Recalcular lista combinando llamados existentes + los creados
    const llamadosConNuevos = [...(llamadosData || []), ...llamadosPendientesAsegurados];

    const llamadosItemsCalc = agendamientosManana.map((a) => {
      const prospecto = prospectoById[a.prospecto_id];
      const sedeObj = sedesDisponibles.find(s => s.id === a.sede);
      const vendedor = staffById[prospecto?.vendedor_asignado];

      const marker = `agendamientoId:${a.id}`;
      // Identificamos el llamado por sede del agendamiento + marker (no por responsable)
      // para que siempre aparezca en la sede que agendó.
      const llamadoExistente = llamadosConNuevos.find(
        (l) =>
          l.motivo === 'confirmacion_asistencia' &&
          l.sede === a.sede &&
          l.notas?.includes(marker)
      );

      const estado_llamado = (() => {
        if (!llamadoExistente) return 'pendiente';
        if (llamadoExistente.estado === 'realizado') {
          // Mostrar el resultado (Confirmó / No confirmó) si existe
          if (llamadoExistente.resultado === 'Confirmó') return 'confirmo';
          if (llamadoExistente.resultado === 'No confirmó') return 'no_confirmo';
          return 'realizado';
        }
        if (llamadoExistente.estado === 'pendiente' && llamadoExistente.fecha_programada < hoyStr2) return 'no_realizado';
        return llamadoExistente.estado || 'pendiente';
      })();

      return {
        key: a.id,
        agendamiento_id: a.id,
        prospecto_id: a.prospecto_id,
        prospecto_nombre: a.prospecto_nombre || prospecto?.nombre || 'N/A',
        prospecto_whatsapp: prospecto?.whatsapp || 'N/A',
        sede_id: a.sede,
        sede_nombre: sedeObj?.nombre_sede || 'N/A',
        fecha_visita: format(parseISO(a.fecha_hora), 'dd/MM/yyyy'),
        hora_visita: format(parseISO(a.fecha_hora), 'HH:mm'),
        vendedor_nombre: vendedor?.nombre || 'N/A',
        estado_llamado
      };
    });

    setLlamadosItems(llamadosItemsCalc);
    // Actualizar también llamados en estado local para KPIs
    setLlamados(llamadosConNuevos);

    const checklistsData = await Checklist_Asignados.filter({ usuario_id: staff.id });
    const alertasChecklistData = await Alertas_Checklist.filter({ usuario_afectado_id: staff.id });

    setChecklistsAsignados(checklistsData);
    setAlertasChecklist(alertasChecklistData);

    // Usamos llamadosConNuevos para que KPIs reflejen inmediatamente los llamados creados en este refresh.
    calcularKPIs(
      tareasData,
      clientesData,
      solicitudesData,
      llamadosConNuevos,
      seguimientoOnlineData,
      alertasRenovacionData,
      clientesRiesgoData,
      checklistsData,
      deudoresData,
      contratosData,
      tarjetasData,
      agendamientosData,
      prospectosData,
      ventasData,
      planesData,
      seguimientosNPSData || [],
      bajasData
    );

    setLoading(false);
  };

  const loadData = async () => {
    setLoading(true);

    const userData = await User.me();
    const staffData = await Staff.filter({ email: userData.email });

    if (!staffData?.length) {
      alert('No se encontró información de staff para este usuario');
      setLoading(false);
      return;
    }

    const currentStaff = staffData[0];
    setStaff(currentStaff);

    let todasSedes = [];
    if (currentStaff.roles && (currentStaff.roles.includes('direccion') || currentStaff.roles.includes('jefe_ventas') || currentStaff.roles.includes('asistente'))) {
      todasSedes = await Sucursales.filter({ activa: true });
    } else {
      todasSedes = await Sucursales.filter({ responsable_sede: currentStaff.id });
    }
    setSedesDisponibles(todasSedes);

    // Data inicial: si tiene múltiples sedes, usamos selector en 'todas'
    setSedeSeleccionada('todas');

    setLoading(false);
  };

  const calcularKPIs = (
    tareasData,
    clientesData,
    solicitudesData,
    llamadosData,
    seguimientoOnlineData,
    alertasRenovacionData,
    clientesRiesgoData,
    checklistsData,
    deudoresData,
    contratosData,
    tarjetasData,
    agendamientosData,
    prospectosData,
    ventasData,
    planesData,
    seguimientosNPSData,
    bajasProgramadasData
  ) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hoyStr = format(hoy, 'yyyy-MM-dd');
    const ahora = new Date();

    const tareasPendientes = tareasData.filter(t => t.estado === 'pendiente' || t.estado === 'en_proceso');
    const tareasVencidas = tareasPendientes.filter(t => isBefore(parseISO(t.fecha_limite), hoy));
    const tareasPorVencer = tareasPendientes.filter(t => {
      const diff = differenceInDays(parseISO(t.fecha_limite), hoy);
      return diff >= 0 && diff <= 3;
    });

    const deudoresCantidad = deudoresData?.length || 0;
    const deudoresMonto = deudoresData?.reduce((sum, d) => sum + (d.monto_adeudado || 0), 0) || 0;

    const solicitudesPendientes = solicitudesData.filter(s => s.estado === 'pendiente' || s.estado === 'en_revision');

    const alertasCriticas = alertasRenovacionData?.filter(a => a.estado === 'Pendiente' && (a.prioridad === 'Alta' || a.dias_vencido > 14)).length || 0;

    const clientesRiesgoCritico = clientesRiesgoData?.filter(c => c.nivel_riesgo === 'Crítico' && c.estado !== 'Recuperado' && c.estado !== 'Perdido').length || 0;

    const checklistsPendientes = checklistsData?.filter(c => c.estado === 'pendiente' || c.estado === 'en_progreso').length || 0;

    const seguimientoOnlinePendientes = seguimientoOnlineData?.filter(s => s.estado === 'Seguimiento Online' || s.estado === 'Pendiente').length || 0;

    // Llamados confirmación: pendientes para hoy + no realizados (fecha pasada y sigue pendiente)
    const llamadosPendientesHoy = llamadosData?.filter(l => l.estado === 'pendiente' && l.fecha_programada === hoyStr).length || 0;
    const llamadosNoRealizados = llamadosData?.filter(l => l.estado === 'pendiente' && l.fecha_programada < hoyStr).length || 0;

    const contratosPendientes = contratosData?.filter(c => c.estado === 'Pendiente').length || 0;
    const tarjetasPendientes = tarjetasData?.filter(t => t.estado === 'Pendiente' || t.estado === 'Fallida').length || 0;

    // Agendados para hoy: todos los agendamientos con fecha de visita hoy
    const agendadosHoy = agendamientosData?.filter(a => {
      if (!a?.fecha_hora) return false;
      const fechaAgendamiento = parseISO(a.fecha_hora);
      const fechaAgendamientoStr = format(fechaAgendamiento, 'yyyy-MM-dd');
      return fechaAgendamientoStr === hoyStr;
    }).length || 0;

    // Agendados sin gestionar: aquellos cuya hora de visita ya pasó y no tienen estado definido
    const agendadosSinGestionar = agendamientosData?.filter(a => {
      if (!a?.fecha_hora) return false;
      const fechaHoraAgendamiento = parseISO(a.fecha_hora);
      // Verificar que la fecha/hora ya pasó
      if (fechaHoraAgendamiento >= ahora) return false;
      // Verificar que no tienen estado gestionado (resultado_asistencia vacío o Pendiente)
      const sinGestionar = !a.resultado_asistencia || a.resultado_asistencia === 'Pendiente';
      return sinGestionar;
    }).length || 0;

    // NPS Cruzados pendientes: prospectos con +2 días en NPS Online, sin compra de Plan/Programa y sin seguimiento
    const planById = {};
    (planesData || []).forEach(p => {
      if (p?.id) planById[p.id] = p;
    });

    const ventasByProspecto = {};
    (ventasData || []).forEach(v => {
      if (!v?.prospecto_id) return;
      if (!ventasByProspecto[v.prospecto_id]) ventasByProspecto[v.prospecto_id] = [];
      ventasByProspecto[v.prospecto_id].push(v);
    });

    const agByProspecto = {};
    (agendamientosData || []).forEach(a => {
      if (!a?.prospecto_id) return;
      if (!agByProspecto[a.prospecto_id]) agByProspecto[a.prospecto_id] = [];
      agByProspecto[a.prospecto_id].push(a);
    });

    const getLastAgendamiento = (prospectoId) => {
      const arr = agByProspecto[prospectoId] || [];
      if (!arr.length) return null;
      return arr.slice().sort((x, y) => new Date(y.fecha_hora) - new Date(x.fecha_hora))[0];
    };

    const tieneCompraPlanPrograma = (prospectoId) => {
      const arr = ventasByProspecto[prospectoId] || [];
      return arr.some(v => {
        if (!v?.plan) return false;
        const plan = planById[v.plan];
        return plan?.tipo_item === 'Plan' || plan?.tipo_item === 'Programa';
      });
    };

    const calcularDiasEnNPSOnline = (prospecto) => {
      const fechaIngreso = prospecto?.fecha_ingreso_nps
        ? new Date(prospecto.fecha_ingreso_nps)
        : new Date(prospecto?.updatedAt);
      const diffMs = Date.now() - fechaIngreso.getTime();
      const diffHoras = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
      return Math.floor(diffHoras / 24);
    };

    const esCruzado = (prospecto) => {
      if (!prospecto?.id) return false;
      if (prospecto.estado_pipeline !== 'NPS Online') return false;
      if (calcularDiasEnNPSOnline(prospecto) < 2) return false;
      if (tieneCompraPlanPrograma(prospecto.id)) return false;

      const last = getLastAgendamiento(prospecto.id);
      const noAsistio = last?.resultado_asistencia === 'No asistió';
      const asistio = last?.resultado_asistencia === 'Asistió';

      return noAsistio || asistio;
    };

    const tieneSeguimiento = (prospectoId) => {
      return (seguimientosNPSData || []).some(s => s.prospecto_id === prospectoId && s.fue_contactado);
    };

    const npsCruzadosPendientes = (prospectosData || []).filter(p => {
      return esCruzado(p) && !tieneSeguimiento(p.id);
    }).length;

    // Bajas a contactar: bajas programadas con estado_gestion = 'programada' o 'en_gestion'
    const bajasAContactar = (bajasProgramadasData || []).filter(b => 
      b.estado_gestion === 'programada' || b.estado_gestion === 'en_gestion'
    ).length;

    // ==========================================
    // CÁLCULO DE MÉTRICAS PARA ALERTAS CRÍTICAS
    // ==========================================
    
    // 1. RETENCIÓN: (Clientes activos - Bajas - Deudores - No Renovados) / Clientes activos
    // Simplificado: usamos clientes activos vs bajas programadas del mes
    const clientesActivos = clientesData?.filter(c => 
      c.estado_suscripcion === 'Activo' || 
      (c.fecha_fin_plan_actual && new Date(c.fecha_fin_plan_actual) >= hoy)
    ).length || 0;
    
    const bajasMes = (bajasProgramadasData || []).filter(b => {
      if (!b.fecha_baja_programada) return false;
      const fechaBaja = new Date(b.fecha_baja_programada);
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      return fechaBaja >= inicioMes && fechaBaja <= finMes;
    }).length;
    
    const metricaRetencion = clientesActivos > 0 
      ? ((clientesActivos - bajasMes - deudoresCantidad) / clientesActivos * 100)
      : 100;

    // 2. ASISTENCIA: Agendamientos que asistieron / Total agendamientos vencidos
    const agendamientosVencidos = (agendamientosData || []).filter(a => {
      if (!a?.fecha_hora) return false;
      return new Date(a.fecha_hora) < ahora;
    });
    
    const agendamientosAsistieron = agendamientosVencidos.filter(a => 
      a.resultado_asistencia === 'Asistió'
    ).length;
    
    const metricaAsistencia = agendamientosVencidos.length > 0 
      ? (agendamientosAsistieron / agendamientosVencidos.length * 100)
      : 100;

    // 3. CONVERSIÓN: Ventas de Plan/Programa / Agendamientos que asistieron
    const ventasPlanPrograma = (ventasData || []).filter(v => {
      if (!v?.plan) return false;
      const plan = planById[v.plan];
      return plan?.tipo_item === 'Plan' || plan?.tipo_item === 'Programa';
    }).length;
    
    const metricaConversion = agendamientosAsistieron > 0 
      ? (ventasPlanPrograma / agendamientosAsistieron * 100)
      : 100;

    // Contar alertas activas (métricas por debajo del umbral)
    let alertasMetricasCount = 0;
    if (metricaRetencion < 85) alertasMetricasCount++;
    if (metricaAsistencia < 60) alertasMetricasCount++;
    if (metricaConversion < 55) alertasMetricasCount++;

    setKpis({
      tareasPendientes: tareasPendientes.length,
      tareasVencidas: tareasVencidas.length,
      tareasPorVencer: tareasPorVencer.length,
      deudoresCantidad,
      deudoresMonto,
      solicitudesPendientes: solicitudesPendientes.length,
      alertasCriticas,
      clientesRiesgoCritico,
      checklistsPendientes,
      seguimientoOnlinePendientes,
      contratosPendientes,
      tarjetasPendientes,
      llamadosPendientesHoy,
      llamadosNoRealizados,
      agendadosHoy,
      agendadosSinGestionar,
      npsCruzadosPendientes,
      bajasAContactar,
      metricaRetencion: Math.min(100, Math.max(0, metricaRetencion)),
      metricaAsistencia: Math.min(100, Math.max(0, metricaAsistencia)),
      metricaConversion: Math.min(100, Math.max(0, metricaConversion)),
      alertasMetricasCount
    });
  };

  const getPrioridadColor = (prioridad) => {
    switch (prioridad) {
      case 'urgente': return 'bg-red-500';
      case 'alta': return 'bg-orange-500';
      case 'media': return 'bg-yellow-500';
      case 'baja': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'completada': return 'bg-green-500';
      case 'en_proceso': return 'bg-blue-500';
      case 'pendiente': return 'bg-yellow-500';
      case 'cancelada': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const esTareaBajaProgramada = (tarea) => {
    return tarea.tipo === 'baja_programada' || tarea.titulo?.includes('Baja Programada') || (tarea.tipo === 'seguimiento' && tarea.notas?.includes('Baja programada ID:'));
  };

  const esTareaClienteRiesgo = (tarea) => {
    return tarea.tipo === 'cliente_riesgo';
  };

  const esTareaDeudor = (tarea) => {
    return tarea.tipo === 'deudor';
  };

  const esTareaClienteNuevo = (tarea) => {
    return tarea.tipo === 'onboarding_cliente_nuevo';
  };

  const extraerBajaId = (tarea) => {
    if (!tarea.notas) return null;
    const match = tarea.notas.match(/Baja programada ID: ([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  };

  const handleGestionarBaja = (tarea) => {
    const bajaId = extraerBajaId(tarea);
    if (!bajaId) return;
    const baja = bajasProgramadas.find(b => b.id === bajaId);
    if (!baja) return;

    setBajaSeleccionada(bajaId);
    setTareaSeleccionada(tarea.id);
    setGestionarBajaDialogOpen(true);
  };

  const handleGestionarNPS = (tarea) => {
    setTareaSeleccionada(tarea.id);
    setGestionarNPSDialogOpen(true);
  };

  const handleReagendarDesdeLlamados = async (item) => {
    const ag = agendamientos.find((a) => a?.id === item?.agendamiento_id);
    if (!ag) return;
    setAgendamientoSeleccionado(ag);
    setReagendarDialogOpen(true);
  };

  const handleSaveReagendar = async (data) => {
    if (!agendamientoSeleccionado) return;

    // Marcar el agendamiento actual como reagendado
    await Agendamientos.update(agendamientoSeleccionado.id, {
      resultado_asistencia: 'Reagendado',
      notas: data.notas
    });

    // Crear nuevo agendamiento
    await Agendamientos.create({
      prospecto_id: agendamientoSeleccionado.prospecto_id,
      prospecto_nombre: agendamientoSeleccionado.prospecto_nombre,
      sede: agendamientoSeleccionado.sede,
      fecha_hora: data.fecha_hora,
      tipo_visita: agendamientoSeleccionado.tipo_visita,
      resultado_asistencia: 'Pendiente',
      registrado_por: agendamientoSeleccionado.registrado_por,
      notas: data.notas
    });

    // Refrescar dashboard
    await loadDataBySede();

    setReagendarDialogOpen(false);
    setAgendamientoSeleccionado(null);
  };

  const handleMarcarLlamadoResultado = async (item, resultado) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hoyStr = format(hoy, 'yyyy-MM-dd');

    // Buscar si ya existe un llamado para este agendamiento (marker en notas)
    // Nota: NO dependemos de la sede para encontrarlo, porque el usuario puede estar en "todas mis sedes".
    const existente = llamados.find(
      (l) =>
        l.motivo === 'confirmacion_asistencia' &&
        l.notas?.includes(`agendamientoId:${item.agendamiento_id}`)
    );

    const payload = {
      cliente: item.prospecto_id, // usamos prospecto_id como referencia
      motivo: 'confirmacion_asistencia',
      fecha_programada: hoyStr,
      estado: 'realizado',
      responsable: staff.id,
      sede: item.sede_id,
      fecha_realizado: hoyStr,
      resultado: resultado === 'confirmo' ? 'Confirmó' : 'No confirmó',
      // Mantener las notas existentes (si hay) para no perder contexto, pero asegurar el marker.
      notas: existente?.notas?.includes(`agendamientoId:${item.agendamiento_id}`)
        ? existente.notas
        : `${existente?.notas ? `${existente.notas} ` : ''}Confirmación de asistencia. agendamientoId:${item.agendamiento_id}`
    };

    if (existente) {
      await Llamados_Confirmacion.update(existente.id, payload);
    } else {
      await Llamados_Confirmacion.create(payload);
    }

    // ✅ Reflejar automáticamente en Agenda (agendamiento)
    if (item?.agendamiento_id) {
      await Agendamientos.update(item.agendamiento_id, {
        estado_confirmacion: resultado === 'confirmo' ? 'Confirmó' : 'No confirmó'
      });
    }

    // Recargar datos para refrescar KPIs y listado
    await loadDataBySede();
  };

  const esTareaRenovacionPrepago = (tarea) => {
    return tarea.tipo === 'renovacion_prepago' || tarea.tipo === 'renovacion_vencida' || tarea.titulo?.includes('Renovación Prepago') || tarea.titulo?.includes('Renovación');
  };

  const handleGestionarRenovacion = async (tarea) => {
    if (!tarea.cliente) return;
    const cliente = clientes.find(c => c.id === tarea.cliente);
    if (!cliente) return;

    setClienteSeleccionado(cliente);
    setTareaSeleccionada(tarea);
    setGestionarRenovacionDialogOpen(true);
  };

  const allClosed = useMemo(() => {
    return !areasMiDiaOpen && !areasFinancieraOpen && !areasTareasOpen && !areasRetencionOpen && !areasCalidadOpen && !areasReportesOpen;
  }, [areasMiDiaOpen, areasFinancieraOpen, areasTareasOpen, areasRetencionOpen, areasCalidadOpen, areasReportesOpen]);

  const toggleAll = () => {
    const next = allClosed;
    setAreasMiDiaOpen(next);
    setAreasFinancieraOpen(next);
    setAreasTareasOpen(next);
    setAreasRetencionOpen(next);
    setAreasCalidadOpen(next);
    setAreasReportesOpen(next);
  };

  const tareasNpsPendientes = useMemo(() => {
    return tareas.filter(t => t.tipo === 'nps_cruzado' && t.estado !== 'completada' && t.estado !== 'cancelada');
  }, [tareas]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Panel de Trabajo - Responsable de Sede</h1>
            <p className="text-gray-600 mt-1">{staff?.nombre}</p>
          </div>

          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-gray-500" />
            <Select value={sedeSeleccionada} onValueChange={setSedeSeleccionada}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Seleccionar sede" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">🏢 Todas mis sedes ({sedesDisponibles.length})</SelectItem>
                {sedesDisponibles.map((sedeItem) => (
                  <SelectItem key={sedeItem.id} value={sedeItem.id}>
                    {sedeItem.nombre_sede}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Comprobante */}
      {comprobante && (
        <div className="mb-4">
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>¡Tarea lista!</AlertTitle>
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">{comprobante.titulo}</p>
                {comprobante.descripcion ? (
                  <p className="text-sm text-muted-foreground">{comprobante.descripcion}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">{comprobante.fecha}</p>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Resumen Rápido */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-900">📊 Resumen Rápido</h2>
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {allClosed ? 'Expandir Todo' : 'Colapsar Todo'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            <div 
              className="bg-white rounded-lg p-4 border-2 border-red-200 cursor-pointer hover:bg-red-50 transition-colors"
              onClick={() => setTareasVencidasDialogOpen(true)}
              title="Ver tareas vencidas"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Tareas Vencidas</p>
                  <p className="text-3xl font-bold text-red-600">{kpis.tareasVencidas}</p>
                  <p className="text-xs text-gray-500 mt-1">{kpis.tareasPendientes} pendientes total</p>
                </div>
                <div className="bg-red-100 p-3 rounded-full">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
              </div>
            </div>

            <div 
              className={`bg-white rounded-lg p-4 border-2 cursor-pointer hover:bg-orange-50 transition-colors ${kpis.alertasMetricasCount > 0 ? 'border-orange-300 bg-orange-50' : 'border-orange-200'}`}
              onClick={() => setAlertasMetricasDialogOpen(true)}
              title="Ver alertas de métricas"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Alertas Críticas</p>
                  <p className="text-3xl font-bold text-orange-600">{kpis.alertasMetricasCount}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {kpis.alertasMetricasCount > 0 
                      ? 'Métricas bajo umbral' 
                      : 'Todo en orden'}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${kpis.alertasMetricasCount > 0 ? 'bg-orange-200' : 'bg-orange-100'}`}>
                  <AlertTriangle className={`h-8 w-8 ${kpis.alertasMetricasCount > 0 ? 'text-orange-700' : 'text-orange-600'}`} />
                </div>
              </div>
            </div>

            <div 
              className="bg-white rounded-lg p-4 border-2 border-blue-200 cursor-pointer hover:bg-blue-50 transition-colors"
              onClick={() => setTareasPendientesDialogOpen(true)}
              title="Ver tareas pendientes"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Tareas Pendientes</p>
                  <p className="text-3xl font-bold text-blue-600">{kpis.tareasPendientes}</p>
                  <p className="text-xs text-gray-500 mt-1">{kpis.tareasPorVencer} por vencer (3 días)</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <ClipboardList className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>

            <div
              className="bg-white rounded-lg p-4 border-2 border-indigo-200 cursor-pointer hover:bg-indigo-50 transition-colors"
              onClick={() => setGestionarLlamadosDialogOpen(true)}
              title="Ver llamados de confirmación"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Llamados Confirmación</p>
                  <p className="text-3xl font-bold text-indigo-600">{llamadosItems.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {kpis.llamadosNoRealizados} no realizados
                  </p>
                </div>
                <div className="bg-indigo-100 p-3 rounded-full">
                  <Phone className="h-8 w-8 text-indigo-600" />
                </div>
              </div>
            </div>

            <div 
              className="bg-white rounded-lg p-4 border-2 border-purple-200 cursor-pointer hover:bg-purple-50 transition-colors"
              onClick={() => setDeudoresDialogOpen(true)}
              title="Ver deudores"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Deudores</p>
                  <p className="text-3xl font-bold text-purple-600">{kpis.deudoresCantidad}</p>
                  <p className="text-xs text-gray-500 mt-1">${kpis.deudoresMonto.toLocaleString('es-CL')}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </div>

            <div 
              className="bg-white rounded-lg p-4 border-2 border-green-200 cursor-pointer hover:bg-green-50 transition-colors"
              onClick={() => setAgendadosHoyDialogOpen(true)}
              title="Ver agendamientos del día"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Agendados Hoy</p>
                  <p className="text-3xl font-bold text-green-600">{kpis.agendadosHoy}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {kpis.agendadosSinGestionar} sin gestionar
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <Calendar className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </div>

            <div 
              className="bg-white rounded-lg p-4 border-2 border-yellow-200 cursor-pointer hover:bg-yellow-50 transition-colors"
              onClick={() => setNpsCruzadosDialogOpen(true)}
              title="Ver NPS Cruzados pendientes"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">NPS Cruzados</p>
                  <p className="text-3xl font-bold text-yellow-600">{kpis.npsCruzadosPendientes}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Sin seguimiento
                  </p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <AlertTriangle className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
            </div>

            <div 
              className="bg-white rounded-lg p-4 border-2 border-rose-200 cursor-pointer hover:bg-rose-50 transition-colors"
              onClick={() => setBajasAContactarDialogOpen(true)}
              title="Ver bajas programadas a contactar"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Bajas a Contactar</p>
                  <p className="text-3xl font-bold text-rose-600">{kpis.bajasAContactar}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Pendientes retención
                  </p>
                </div>
                <div className="bg-rose-100 p-3 rounded-full">
                  <UserX className="h-8 w-8 text-rose-600" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Áreas Colapsables */}
      <div className="space-y-4">
        <CollapsibleArea
          icon={Calendar}
          title="🎯 Mi Día"
          badge={kpis.tareasVencidas > 0 ? `${kpis.tareasVencidas} vencidas` : undefined}
          badgeVariant={kpis.tareasVencidas > 0 ? 'destructive' : 'default'}
          isOpen={areasMiDiaOpen}
          onToggle={() => setAreasMiDiaOpen(v => !v)}
          summary={
            <>
              <div>• Tareas pendientes: <span className="font-medium">{kpis.tareasPendientes}</span></div>
              <div>• Alertas críticas: <span className="font-medium">{kpis.alertasCriticas}</span></div>
              <div>• Checklists pendientes: <span className="font-medium">{kpis.checklistsPendientes}</span></div>
            </>
          }
        >
          <TabMiDia
            tareas={tareas}
            alertasRenovacion={alertasRenovacion}
            clientesRiesgo={clientesRiesgo}
            checklistsAsignados={checklistsAsignados}
            onOpenTarea={(tarea) => {
              if (esTareaBajaProgramada(tarea)) {
                handleGestionarBaja(tarea);
              } else if (esTareaRenovacionPrepago(tarea)) {
                handleGestionarRenovacion(tarea);
              }
            }}
            onOpenAlerta={(alerta) => {
              setClienteSeleccionado(alerta);
              setRegistrarContactoDialogOpen(true);
            }}
            onOpenClienteRiesgo={(cliente) => {
              setClienteRiesgoSeleccionado(cliente);
              setGestionarClienteRiesgoDialogOpen(true);
            }}
            onOpenChecklist={(checklist) => {
              setChecklistSeleccionado(checklist);
              setEjecutarChecklistDialogOpen(true);
            }}
          />
        </CollapsibleArea>

        <CollapsibleArea
          icon={DollarSign}
          title="💰 Gestión Financiera"
          badge={kpis.alertasCriticas > 0 ? `${kpis.alertasCriticas} críticas` : undefined}
          badgeVariant={kpis.alertasCriticas > 0 ? 'destructive' : 'default'}
          isOpen={areasFinancieraOpen}
          onToggle={() => setAreasFinancieraOpen(v => !v)}
          summary={
            <>
              <div>• Seguimiento online: <span className="font-medium">{kpis.seguimientoOnlinePendientes}</span></div>
              <div>• Deudores: <span className="font-medium">{kpis.deudoresCantidad}</span> (${kpis.deudoresMonto.toLocaleString('es-CL')})</div>
              <div>• Contratos: <span className="font-medium">{kpis.contratosPendientes}</span> | Tarjetas: <span className="font-medium">{kpis.tarjetasPendientes}</span></div>
            </>
          }
        >
          <TabGestionFinanciera
            seguimientoOnline={seguimientoOnline}
            alertasRenovacion={alertasRenovacion}
            deudores={deudores}
            clientes={clientes}
            contratos={contratos}
            tarjetas={tarjetas}
            onRegistrarContacto={(cliente) => {
              setClienteSeleccionado(cliente);
              setRegistrarContactoDialogOpen(true);
            }}
            onRegistrarIntentoCobro={(deudor) => {
              setDeudorSeleccionado(deudor);
              setRegistrarIntentoCobroDialogOpen(true);
            }}
            onRegistrarPago={(deudor) => {
              console.log('Registrar pago:', deudor);
            }}
            onRegistrarRenovacion={(cliente) => {
              setClienteSeleccionado(cliente);
              setRegistrarRenovacionDialogOpen(true);
            }}
            onMarcarContratoFirmado={(contrato) => {
              console.log('Marcar contrato firmado:', contrato);
            }}
            onRegistrarIntentoTarjeta={(tarjeta) => {
              console.log('Registrar intento tarjeta:', tarjeta);
            }}
          />
        </CollapsibleArea>

        <CollapsibleArea
          icon={ClipboardList}
          title="📋 Mis Tareas"
          badge={kpis.tareasPendientes}
          badgeVariant="secondary"
          isOpen={areasTareasOpen}
          onToggle={() => setAreasTareasOpen(v => !v)}
          summary={
            <>
              <div>• Pendientes: <span className="font-medium">{kpis.tareasPendientes}</span></div>
              <div>• Vencidas: <span className="font-medium text-red-600">{kpis.tareasVencidas}</span></div>
              <div>• Por vencer (3 días): <span className="font-medium">{kpis.tareasPorVencer}</span></div>
            </>
          }
        >
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Mis Tareas</CardTitle>
                <Button size="sm" onClick={() => setCrearTareaDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Tarea
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tareas.filter(t => t.estado !== 'completada' && t.estado !== 'cancelada').map((tarea) => (
                  <div key={tarea.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{tarea.titulo}</h3>
                          <Badge className={getPrioridadColor(tarea.prioridad)}>
                            {tarea.prioridad}
                          </Badge>
                          <Badge className={getEstadoColor(tarea.estado)}>
                            {tarea.estado}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{tarea.descripcion}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(parseISO(tarea.fecha_limite), 'dd/MM/yyyy')}
                          </span>
                          <span className="capitalize">{tarea.tipo}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {esTareaBajaProgramada(tarea) ? (
                          <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => handleGestionarBaja(tarea)}>
                            Gestionar Baja
                          </Button>
                        ) : esTareaRenovacionPrepago(tarea) ? (
                          <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={() => handleGestionarRenovacion(tarea)}>
                            Gestionar Renovación
                          </Button>
                        ) : esTareaClienteRiesgo(tarea) ? (
                          <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => {
                            const clienteRiesgo = clientesRiesgo.find(cr => cr.cliente_id === tarea.cliente);
                            if (clienteRiesgo) {
                              setClienteRiesgoSeleccionado(clienteRiesgo);
                              setGestionarClienteRiesgoDialogOpen(true);
                            }
                          }}>
                            Gestionar Riesgo
                          </Button>
                        ) : esTareaDeudor(tarea) ? (
                          <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700" onClick={() => {
                            const deudor = deudores.find(d => d.cliente === tarea.cliente);
                            if (deudor) {
                              setDeudorSeleccionado(deudor);
                              setRegistrarIntentoCobroDialogOpen(true);
                            }
                          }}>
                            Registrar Cobro
                          </Button>
                        ) : esTareaClienteNuevo(tarea) ? (
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => {
                            const cliente = clientes.find(c => c.id === tarea.cliente);
                            if (cliente) {
                              setClienteSeleccionado(cliente);
                              setTareaSeleccionada(tarea);
                              setGestionarClienteNuevoDialogOpen(true);
                            }
                          }}>
                            Gestionar
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline">
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </CollapsibleArea>

        <CollapsibleArea
          icon={UserX}
          title="⚠️ Retención y Riesgo"
          badge={kpis.clientesRiesgoCritico > 0 ? `${kpis.clientesRiesgoCritico} críticos` : undefined}
          badgeVariant={kpis.clientesRiesgoCritico > 0 ? 'destructive' : 'default'}
          isOpen={areasRetencionOpen}
          onToggle={() => setAreasRetencionOpen(v => !v)}
          summary={
            <>
              <div>• Riesgo crítico: <span className="font-medium">{kpis.clientesRiesgoCritico}</span></div>
              <div>• Solicitudes baja pendientes: <span className="font-medium">{kpis.solicitudesPendientes}</span></div>
            </>
          }
        >
          <Card>
            <CardHeader>
              <CardTitle>Solicitudes de Baja (pendientes)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {solicitudesBaja.filter(s => s.estado === 'pendiente' || s.estado === 'en_revision').map((solicitud) => (
                  <div key={solicitud.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">Cliente ID: {solicitud.cliente}</h3>
                          <Badge variant={solicitud.estado === 'pendiente' ? 'destructive' : 'outline'}>
                            {solicitud.estado}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">Motivo: {solicitud.motivo}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Clientes en Riesgo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clientesRiesgo.filter(c => c.estado !== 'Recuperado' && c.estado !== 'Perdido').map((cr) => (
                  <div key={cr.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{cr.cliente_nombre}</h3>
                          <Badge className={cr.nivel_riesgo === 'Crítico' ? 'bg-red-500' : cr.nivel_riesgo === 'Alto' ? 'bg-orange-500' : 'bg-yellow-500'}>
                            {cr.nivel_riesgo}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">Motivo: {cr.motivo_riesgo}</p>
                      </div>
                      <Button size="sm" onClick={() => {
                        setClienteRiesgoSeleccionado(cr);
                        setGestionarClienteRiesgoDialogOpen(true);
                      }}>
                        Gestionar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </CollapsibleArea>

        <CollapsibleArea
          icon={Star}
          title="⭐ Calidad y NPS"
          badge={npsCruzadosCount}
          badgeVariant={npsCruzadosCount > 0 ? 'destructive' : 'secondary'}
          isOpen={areasCalidadOpen}
          onToggle={() => setAreasCalidadOpen(v => !v)}
          summary={
            <>
              <div>• NPS Cruzados (según sede): <span className="font-medium">{npsCruzadosCount}</span></div>
              <div>• Llamados pendientes: <span className="font-medium">{llamados.filter(l => l.estado === 'pendiente').length}</span></div>
            </>
          }
        >
          <Card>
            <CardHeader>
              <CardTitle>Tareas NPS Cruzados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tareasNpsPendientes.map((tarea) => (
                  <div key={tarea.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{tarea.titulo}</h3>
                          <Badge className={getPrioridadColor(tarea.prioridad)}>{tarea.prioridad}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{tarea.descripcion}</p>
                      </div>
                      <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700" onClick={() => handleGestionarNPS(tarea)}>
                        Gestionar NPS
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Llamados de Confirmación (pendientes)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {llamados.filter(l => l.estado === 'pendiente').map((llamado) => (
                  <div key={llamado.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold">Cliente ID: {llamado.cliente}</h3>
                        <p className="text-sm text-gray-600">{llamado.motivo}</p>
                        <p className="text-xs text-gray-500">Programado: {llamado.fecha_programada ? format(parseISO(llamado.fecha_programada), 'dd/MM/yyyy') : ''}</p>
                      </div>
                      <Button size="sm" variant="outline">
                        <Phone className="h-4 w-4 mr-2" />
                        Llamar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </CollapsibleArea>

        <CollapsibleArea
          icon={TrendingUp}
          title="📊 Reportes e Historial"
          isOpen={areasReportesOpen}
          onToggle={() => setAreasReportesOpen(v => !v)}
          summary={
            <>
              <div>• Tareas completadas: <span className="font-medium">{tareas.filter(t => t.estado === 'completada').length}</span></div>
              <div>• Clientes en riesgo: <span className="font-medium">{clientesRiesgo.length}</span></div>
            </>
          }
        >
          <Card>
            <CardHeader>
              <CardTitle>Historial de Tareas Completadas</CardTitle>
              <div className="flex flex-col md:flex-row gap-3 mt-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Desde:</label>
                  <input
                    type="date"
                    value={historialDesde}
                    onChange={(e) => setHistorialDesde(e.target.value)}
                    className="border rounded px-3 py-1 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Hasta:</label>
                  <input
                    type="date"
                    value={historialHasta}
                    onChange={(e) => setHistorialHasta(e.target.value)}
                    className="border rounded px-3 py-1 text-sm"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tareas
                  .filter(t => {
                    if (t.estado !== 'completada') return false;
                    if (!t.fecha_completada) return false;
                    const fechaCompletada = parseISO(t.fecha_completada);
                    const desde = parseISO(historialDesde);
                    const hasta = parseISO(historialHasta);
                    return fechaCompletada >= desde && fechaCompletada <= hasta;
                  })
                  .sort((a, b) => new Date(b.fecha_completada) - new Date(a.fecha_completada))
                  .map((tarea) => (
                    <div key={tarea.id} className="border rounded-lg p-4 bg-green-50 border-green-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <h3 className="font-semibold">{tarea.titulo}</h3>
                            <Badge className="bg-green-600">Completada</Badge>
                            <Badge className={getPrioridadColor(tarea.prioridad)}>{tarea.prioridad}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{tarea.descripcion}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Completada: {format(parseISO(tarea.fecha_completada), 'dd/MM/yyyy HH:mm')}
                            </span>
                            <span className="capitalize">{tarea.tipo}</span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </CollapsibleArea>
      </div>

      {/* Dialogs */}
      <GestionarBajaDialog
        open={gestionarBajaDialogOpen}
        onClose={() => {
          setGestionarBajaDialogOpen(false);
          setBajaSeleccionada(null);
          setTareaSeleccionada(null);
        }}
        bajaId={bajaSeleccionada}
        tareaId={tareaSeleccionada}
        onSuccess={(comprobanteData) => {
          if (comprobanteData) {
            setComprobante(comprobanteData);
            setTimeout(() => setComprobante(null), 5000);
          }
          loadDataBySede();
          setGestionarBajaDialogOpen(false);
          setBajaSeleccionada(null);
          setTareaSeleccionada(null);
        }}
      />

      <GestionarNPSCruzadoDialog
        open={gestionarNPSDialogOpen}
        onClose={() => {
          setGestionarNPSDialogOpen(false);
          setTareaSeleccionada(null);
        }}
        tareaId={tareaSeleccionada}
        onSuccess={(comprobanteData) => {
          if (comprobanteData) {
            setComprobante(comprobanteData);
            setTimeout(() => setComprobante(null), 5000);
          }
          loadDataBySede();
          setGestionarNPSDialogOpen(false);
          setTareaSeleccionada(null);
        }}
      />

      <GestionarRenovacionPrepagoDialog
        open={gestionarRenovacionDialogOpen}
        onOpenChange={setGestionarRenovacionDialogOpen}
        tarea={tareaSeleccionada}
        cliente={clienteSeleccionado}
        onSuccess={() => loadDataBySede()}
      />

      <RegistrarContactoDialog
        open={registrarContactoDialogOpen}
        onOpenChange={setRegistrarContactoDialogOpen}
        cliente={clienteSeleccionado}
        onSuccess={() => loadDataBySede()}
      />

      <RegistrarIntentoCobroDialog
        open={registrarIntentoCobroDialogOpen}
        onOpenChange={setRegistrarIntentoCobroDialogOpen}
        deudor={deudorSeleccionado}
        onSuccess={() => loadDataBySede()}
      />

      <RegistrarRenovacionDialog
        open={registrarRenovacionDialogOpen}
        onOpenChange={setRegistrarRenovacionDialogOpen}
        cliente={clienteSeleccionado}
        onSuccess={() => loadDataBySede()}
      />

      <GestionarClienteRiesgoDialog
        open={gestionarClienteRiesgoDialogOpen}
        onOpenChange={setGestionarClienteRiesgoDialogOpen}
        clienteRiesgo={clienteRiesgoSeleccionado}
        onSuccess={() => loadDataBySede()}
      />

      <EjecutarChecklistDialog
        open={ejecutarChecklistDialogOpen}
        onOpenChange={setEjecutarChecklistDialogOpen}
        checklistAsignado={checklistSeleccionado}
        onSuccess={() => loadDataBySede()}
      />

      <HistorialClienteDialog
        open={historialClienteDialogOpen}
        onOpenChange={setHistorialClienteDialogOpen}
        cliente={clienteSeleccionado}
        sedes={sedesDisponibles}
        planes={[]}
      />

      <CrearTareaDialog
        open={crearTareaDialogOpen}
        onOpenChange={setCrearTareaDialogOpen}
        staffId={staff?.id}
        sedeDefault={sedeSeleccionada !== 'todas' ? sedeSeleccionada : undefined}
        onSuccess={() => {
          loadDataBySede();
          setCrearTareaDialogOpen(false);
        }}
      />

      <GestionarLlamadosConfirmacionDialog
        open={gestionarLlamadosDialogOpen}
        onOpenChange={setGestionarLlamadosDialogOpen}
        items={llamadosItems}
        sedes={sedesDisponibles}
        staff={staff}
        onMarcarResultado={handleMarcarLlamadoResultado}
        onReagendar={handleReagendarDesdeLlamados}
      />

      <GestionarTareaClienteNuevoDialog
        open={gestionarClienteNuevoDialogOpen}
        onOpenChange={setGestionarClienteNuevoDialogOpen}
        tarea={tareaSeleccionada}
        cliente={clienteSeleccionado}
        onSuccess={() => {
          loadDataBySede();
          setGestionarClienteNuevoDialogOpen(false);
          setTareaSeleccionada(null);
          setClienteSeleccionado(null);
        }}
      />

      <AgendadosHoyDialog
        open={agendadosHoyDialogOpen}
        onOpenChange={setAgendadosHoyDialogOpen}
        agendamientos={agendamientos}
        sucursales={sedesDisponibles}
        staff={staffAll}
      />

      <NPSCruzadosDialog
        open={npsCruzadosDialogOpen}
        onOpenChange={setNpsCruzadosDialogOpen}
        prospectos={prospectos}
        ventas={ventas}
        planes={planes}
        agendamientos={agendamientos}
        seguimientos={seguimientosNPS}
        sucursales={sedesDisponibles}
        staff={staffAll}
        onSuccess={() => loadDataBySede()}
      />

      <ReagendarDialog
        open={reagendarDialogOpen}
        onClose={() => {
          setReagendarDialogOpen(false);
          setAgendamientoSeleccionado(null);
        }}
        agendamiento={agendamientoSeleccionado}
        onSave={handleSaveReagendar}
      />

      <BajasAContactarDialog
        open={bajasAContactarDialogOpen}
        onOpenChange={setBajasAContactarDialogOpen}
        bajasProgramadas={bajasProgramadas}
        sucursales={sedesDisponibles}
        staff={staffAll}
        clientes={clientes}
        onSuccess={() => loadDataBySede()}
      />

      {/* Dialog de Alertas de Métricas */}
      <AlertasMetricasDialog
        open={alertasMetricasDialogOpen}
        onOpenChange={setAlertasMetricasDialogOpen}
        metricas={{
          retencion: kpis.metricaRetencion,
          asistencia: kpis.metricaAsistencia,
          conversion: kpis.metricaConversion
        }}
        umbrales={{
          retencion: 85,
          asistencia: 60,
          conversion: 55
        }}
        sedeNombre={sedeSeleccionada === 'todas' 
          ? 'Todas las sedes' 
          : sedesDisponibles.find(s => s.id === sedeSeleccionada)?.nombre_sede || 'Sede'
        }
      />

      {/* Dialogs de métricas clickeables */}
      <MetricaListadoDialog
        open={tareasVencidasDialogOpen}
        onOpenChange={setTareasVencidasDialogOpen}
        titulo="Tareas Vencidas"
        tipo="tareas_vencidas"
        items={tareas.filter(t => {
          if (t.estado !== 'pendiente' && t.estado !== 'en_proceso') return false;
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);
          return isBefore(parseISO(t.fecha_limite), hoy);
        })}
        sucursales={sedesDisponibles}
        staffAll={staffAll}
        clientes={clientes}
        onGestionarTarea={(tarea) => {
          setTareasVencidasDialogOpen(false);
          if (esTareaBajaProgramada(tarea)) {
            handleGestionarBaja(tarea);
          } else if (esTareaRenovacionPrepago(tarea)) {
            handleGestionarRenovacion(tarea);
          } else if (esTareaClienteRiesgo(tarea)) {
            const cr = clientesRiesgo.find(c => c.cliente_id === tarea.cliente);
            if (cr) {
              setClienteRiesgoSeleccionado(cr);
              setGestionarClienteRiesgoDialogOpen(true);
            }
          } else if (esTareaDeudor(tarea)) {
            const d = deudores.find(de => de.cliente === tarea.cliente);
            if (d) {
              setDeudorSeleccionado(d);
              setRegistrarIntentoCobroDialogOpen(true);
            }
          } else if (esTareaClienteNuevo(tarea)) {
            const c = clientes.find(cl => cl.id === tarea.cliente);
            if (c) {
              setClienteSeleccionado(c);
              setTareaSeleccionada(tarea);
              setGestionarClienteNuevoDialogOpen(true);
            }
          }
        }}
        onMarcarCompletada={async (tarea) => {
          await Tareas_RS.update(tarea.id, { 
            estado: 'completada',
            fecha_completada: format(new Date(), 'yyyy-MM-dd')
          });
          loadDataBySede();
        }}
      />

      <MetricaListadoDialog
        open={tareasPendientesDialogOpen}
        onOpenChange={setTareasPendientesDialogOpen}
        titulo="Tareas Pendientes"
        tipo="tareas_pendientes"
        items={tareas.filter(t => t.estado === 'pendiente' || t.estado === 'en_proceso')}
        sucursales={sedesDisponibles}
        staffAll={staffAll}
        clientes={clientes}
        onGestionarTarea={(tarea) => {
          setTareasPendientesDialogOpen(false);
          if (esTareaBajaProgramada(tarea)) {
            handleGestionarBaja(tarea);
          } else if (esTareaRenovacionPrepago(tarea)) {
            handleGestionarRenovacion(tarea);
          } else if (esTareaClienteRiesgo(tarea)) {
            const cr = clientesRiesgo.find(c => c.cliente_id === tarea.cliente);
            if (cr) {
              setClienteRiesgoSeleccionado(cr);
              setGestionarClienteRiesgoDialogOpen(true);
            }
          } else if (esTareaDeudor(tarea)) {
            const d = deudores.find(de => de.cliente === tarea.cliente);
            if (d) {
              setDeudorSeleccionado(d);
              setRegistrarIntentoCobroDialogOpen(true);
            }
          } else if (esTareaClienteNuevo(tarea)) {
            const c = clientes.find(cl => cl.id === tarea.cliente);
            if (c) {
              setClienteSeleccionado(c);
              setTareaSeleccionada(tarea);
              setGestionarClienteNuevoDialogOpen(true);
            }
          }
        }}
        onMarcarCompletada={async (tarea) => {
          await Tareas_RS.update(tarea.id, { 
            estado: 'completada',
            fecha_completada: format(new Date(), 'yyyy-MM-dd')
          });
          loadDataBySede();
        }}
      />

      <MetricaListadoDialog
        open={alertasCriticasDialogOpen}
        onOpenChange={setAlertasCriticasDialogOpen}
        titulo="Alertas Críticas - Renovaciones Urgentes"
        tipo="alertas_criticas"
        items={alertasRenovacion.filter(a => a.estado === 'Pendiente' && (a.prioridad === 'Alta' || a.dias_vencido > 14))}
        sucursales={sedesDisponibles}
        staffAll={staffAll}
        clientes={clientes}
        onRegistrarContacto={(alerta) => {
          setAlertasCriticasDialogOpen(false);
          setClienteSeleccionado(alerta);
          setRegistrarContactoDialogOpen(true);
        }}
      />

      <MetricaListadoDialog
        open={deudoresDialogOpen}
        onOpenChange={setDeudoresDialogOpen}
        titulo="Deudores"
        tipo="deudores"
        items={deudores}
        sucursales={sedesDisponibles}
        staffAll={staffAll}
        clientes={clientes}
        onRegistrarIntentoCobro={(deudor) => {
          setDeudoresDialogOpen(false);
          setDeudorSeleccionado(deudor);
          setRegistrarIntentoCobroDialogOpen(true);
        }}
      />
    </div>
  );
}