import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  DollarSign, 
  FileText, 
  CreditCard, 
  UserX, 
  Clock,
  Calendar,
  Star,
  CheckCircle,
  XCircle
} from 'lucide-react';

export default function GuiaTiposAlertas() {
  const alertas = [
    {
      id: 1,
      tipo: 'renovacion',
      nombre: 'Renovación',
      icon: AlertCircle,
      color: 'bg-orange-500',
      detecta: 'Clientes con planes PREPAGO vencidos que no han renovado',
      criterios: [
        'Cliente tiene fecha_fin_plan_actual (fecha de vencimiento)',
        'La fecha de vencimiento ya pasó',
        'Han transcurrido más de X días desde el vencimiento (configurable)',
        'NO ha renovado recientemente (últimos 7 días)',
        'Aplica a PREPAGO (planes de 1, 6, 12 meses pagados por adelantado)'
      ],
      noDetecta: [
        'Planes de Suscripción (esos se renuevan automáticamente mes a mes)',
        'Clientes que ya renovaron en los últimos 7 días',
        'Servicios puntuales (solo Planes/Programas)'
      ],
      ejemplo: {
        cliente: 'Juan Pérez',
        plan: 'Mensual Prepago (1 mes)',
        fechaInicio: '01/01/2025',
        fechaFin: '31/01/2025',
        hoy: '05/02/2025',
        diasVencido: 5,
        alertaCreada: true,
        prioridad: 'Media',
        tarea: 'Alerta Renovación: Juan Pérez - 5 días vencido'
      },
      configuracion: {
        diasActivar: 3,
        diasPrioridadAlta: 7,
        diasCritico: 14,
        crearTarea: true,
        frecuencia: 'Diaria (8 AM)'
      }
    },
    {
      id: 2,
      tipo: 'deudor',
      nombre: 'Deudor',
      icon: DollarSign,
      color: 'bg-red-500',
      detecta: 'Clientes con deudas pendientes que superan ciertos días de atraso',
      criterios: [
        'Cliente está en la tabla Deudores',
        'Estado: Pendiente, En gestión o Contactado',
        'Días de atraso > X días (configurable)',
        'Aplica a Suscripciones principalmente (clientes que no pagaron su cuota mensual)'
      ],
      noDetecta: [
        'Deudores ya recuperados',
        'Deudores marcados como irrecuperables',
        'Planes prepago vencidos (esos van a "Renovación")'
      ],
      ejemplo: {
        cliente: 'María González',
        plan: 'Suscripción Mensual',
        ultimoPago: '01/01/2025',
        hoy: '20/01/2025',
        diasAtraso: 19,
        alertaCreada: true,
        prioridad: 'Alta',
        monto: '$25,000',
        tarea: 'Gestión Deudor: María González - $25,000'
      },
      configuracion: {
        diasActivar: 7,
        diasPrioridadAlta: 15,
        diasCritico: 30,
        crearTarea: true,
        frecuencia: 'Diaria (8 AM)'
      }
    },
    {
      id: 3,
      tipo: 'contrato_pendiente',
      nombre: 'Contrato Pendiente',
      icon: FileText,
      color: 'bg-blue-500',
      detecta: 'Contratos que llevan días pendientes de firma después de la venta',
      criterios: [
        'Contrato en estado "Pendiente"',
        'Días desde la venta > X días (configurable)',
        'Aplica a todas las ventas que requieren contrato'
      ],
      noDetecta: [
        'Contratos ya firmados',
        'Contratos rechazados'
      ],
      ejemplo: {
        cliente: 'Carlos Ruiz',
        plan: 'Anual Prepago',
        fechaVenta: '01/02/2025',
        hoy: '10/02/2025',
        diasPendiente: 9,
        alertaCreada: true,
        prioridad: 'Alta',
        metodo: 'Digital',
        tarea: 'Contrato Pendiente: Carlos Ruiz - 9 días'
      },
      configuracion: {
        diasActivar: 3,
        diasPrioridadAlta: 7,
        diasCritico: 14,
        crearTarea: true,
        frecuencia: 'Diaria (9 AM)'
      }
    },
    {
      id: 4,
      tipo: 'tarjeta_pendiente',
      nombre: 'Tarjeta Pendiente',
      icon: CreditCard,
      color: 'bg-purple-500',
      detecta: 'Tarjetas de pago con intentos fallidos de registro',
      criterios: [
        'Tarjeta en estado "Pendiente" o "Fallida"',
        'Intentos de registro > X intentos (configurable)',
        'Aplica a Suscripciones principalmente (para cobro automático)'
      ],
      noDetecta: [
        'Tarjetas ya registradas exitosamente',
        'Tarjetas rechazadas definitivamente'
      ],
      ejemplo: {
        cliente: 'Ana Torres',
        plan: 'Suscripción Mensual',
        intentos: 3,
        motivo: 'Fondos insuficientes',
        alertaCreada: true,
        prioridad: 'Media',
        tarea: 'Tarjeta Pendiente: Ana Torres - 3 intentos'
      },
      configuracion: {
        diasActivar: 2,
        diasPrioridadAlta: 4,
        diasCritico: 6,
        crearTarea: true,
        frecuencia: 'Cada 4 horas'
      }
    },
    {
      id: 5,
      tipo: 'cliente_riesgo',
      nombre: 'Cliente en Riesgo',
      icon: UserX,
      color: 'bg-yellow-500',
      detecta: 'Clientes identificados como en riesgo de pérdida que llevan días sin gestión',
      criterios: [
        'Cliente en tabla Clientes_Riesgo',
        'Estado: Identificado, En gestión o Contactado',
        'Días desde identificación > X días (configurable)',
        'Nivel de riesgo: Bajo, Medio, Alto o Crítico',
        'Motivos: Baja programada, NPS bajo, Deuda, No uso, Queja, Otro'
      ],
      noDetecta: [
        'Clientes ya recuperados',
        'Clientes perdidos definitivamente'
      ],
      ejemplo: {
        cliente: 'Pedro Sánchez',
        nivelRiesgo: 'Alto',
        motivo: 'Baja programada',
        fechaIdentificacion: '01/02/2025',
        hoy: '06/02/2025',
        diasSinGestion: 5,
        alertaCreada: true,
        prioridad: 'Alta',
        tarea: 'Cliente en Riesgo Alto: Pedro Sánchez'
      },
      configuracion: {
        diasActivar: 3,
        diasPrioridadAlta: 7,
        diasCritico: 14,
        crearTarea: true,
        frecuencia: 'Diaria (8 AM)'
      }
    },
    {
      id: 6,
      tipo: 'seguimiento_online',
      nombre: 'Seguimiento Online',
      icon: Clock,
      color: 'bg-green-500',
      detecta: 'Clientes en seguimiento online (0-3 días vencidos) que necesitan contacto',
      criterios: [
        'Cliente en tabla Seguimiento_Online',
        'Estado: Seguimiento Online o Pendiente',
        'Días vencido: entre 0 y 3 días (ventana corta)',
        'Aplica a PREPAGO recién vencido (antes de pasar a alerta de renovación)'
      ],
      noDetecta: [
        'Clientes con +3 días vencidos (esos pasan a "Renovación")',
        'Clientes que ya pasaron a alerta'
      ],
      ejemplo: {
        cliente: 'Laura Díaz',
        plan: 'Mensual Prepago',
        fechaVencimiento: '01/02/2025',
        hoy: '03/02/2025',
        diasVencido: 2,
        alertaCreada: true,
        prioridad: 'Media',
        estado: 'Seguimiento Online (ventana de oportunidad)',
        tarea: 'Seguimiento Online: Laura Díaz - 2 días'
      },
      configuracion: {
        diasActivar: 2,
        diasPrioridadAlta: 3,
        diasCritico: 4,
        crearTarea: true,
        frecuencia: 'Cada 4 horas'
      }
    },
    {
      id: 7,
      tipo: 'baja_programada',
      nombre: 'Baja Programada',
      icon: Calendar,
      color: 'bg-pink-500',
      detecta: 'Bajas programadas que se acercan a su fecha de ejecución',
      criterios: [
        'Baja en tabla Bajas_Programadas',
        'Estado: Programada o En gestión',
        'Días hasta la baja ≤ X días (configurable)',
        'Aplica a Suscripciones principalmente (clientes que solicitaron baja)'
      ],
      noDetecta: [
        'Bajas ya ejecutadas',
        'Clientes recuperados (continúan activos)'
      ],
      ejemplo: {
        cliente: 'Roberto Vega',
        plan: 'Suscripción Mensual',
        fechaBaja: '10/02/2025',
        hoy: '08/02/2025',
        diasHastaBaja: 2,
        alertaCreada: true,
        prioridad: 'Media',
        motivo: 'Mudanza',
        tarea: 'Baja Programada: Roberto Vega - en 2 días'
      },
      configuracion: {
        diasActivar: 2,
        diasPrioridadAlta: 1,
        diasCritico: 0,
        crearTarea: true,
        frecuencia: 'Diaria (7 AM)'
      }
    },
    {
      id: 8,
      tipo: 'cliente_nuevo',
      nombre: 'Cliente Nuevo (Onboarding)',
      icon: Star,
      color: 'bg-cyan-500',
      detecta: 'Clientes nuevos registrados para generar tareas automáticas de onboarding',
      criterios: [
        'Cliente recién creado (últimos X días configurables)',
        'No tiene tareas de onboarding previas',
        'Permite crear múltiples tareas con diferentes responsables',
        'Aplica a TODOS los clientes nuevos (Prepago, Suscripción, Programas)'
      ],
      noDetecta: [
        'Clientes antiguos (más de X días)',
        'Clientes que ya tienen tareas de onboarding creadas'
      ],
      ejemplo: {
        cliente: 'Sofía Martínez',
        plan: 'Mensual Prepago',
        fechaRegistro: '10/02/2025',
        hoy: '10/02/2025',
        tareasCreadas: 3,
        responsables: 'RS (Bienvenida), Soporte (Contrato), Financiero (Tarjeta)',
        tarea1: 'Bienvenida y Tour: Sofía Martínez',
        tarea2: 'Registrar Contrato: Sofía Martínez',
        tarea3: 'Registrar Tarjeta: Sofía Martínez'
      },
      configuracion: {
        diasActivar: 1,
        diasPrioridadAlta: 'N/A',
        diasCritico: 'N/A',
        crearTarea: true,
        frecuencia: 'Cada 4 horas'
      }
    }
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Star className="w-8 h-8 text-yellow-500" />
          Guía: ¿Qué Hace Cada Tipo de Alerta?
        </h1>
        <p className="text-gray-600 mt-2">
          Cada tipo de alerta detecta una situación específica en tu operación. Esta guía te explica <strong>exactamente qué detecta cada alerta</strong> y <strong>cuándo deberías configurarla</strong>.
        </p>
      </div>

      {/* Tabla Resumen */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle>📊 Resumen Rápido: ¿Cuál Configurar?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Tipo de Alerta</th>
                  <th className="text-left p-2">¿Cuándo Usarla?</th>
                  <th className="text-left p-2">Frecuencia Recomendada</th>
                </tr>
              </thead>
              <tbody>
                {alertas.map(alerta => (
                  <tr key={alerta.id} className="border-b">
                    <td className="p-2">
                      <Badge className={alerta.color}>{alerta.nombre}</Badge>
                    </td>
                    <td className="p-2 text-gray-700">{alerta.detecta.split(' ').slice(0, 5).join(' ')}...</td>
                    <td className="p-2 text-gray-700">{alerta.configuracion.frecuencia}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detalle de cada alerta */}
      {alertas.map((alerta, index) => {
        const Icon = alerta.icon;
        return (
          <Card key={alerta.id} className="border-2">
            <CardHeader className={`${alerta.color} text-white`}>
              <CardTitle className="flex items-center gap-3">
                <Icon className="w-6 h-6" />
                {index + 1}. ALERTA: {alerta.nombre}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {/* Qué Detecta */}
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  🔍 ¿Qué Detecta?
                </h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded">{alerta.detecta}</p>
              </div>

              {/* Criterios */}
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Criterios Específicos
                </h3>
                <ul className="space-y-1">
                  {alerta.criterios.map((criterio, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                      <span className="text-gray-700">{criterio}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* NO Detecta */}
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  NO Detecta
                </h3>
                <ul className="space-y-1">
                  {alerta.noDetecta.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-600 mt-1 flex-shrink-0" />
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Configuración Recomendada */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-lg mb-3">💡 Configuración Recomendada</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Días para activar:</span>
                    <span className="ml-2 font-semibold">{alerta.configuracion.diasActivar}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Prioridad alta:</span>
                    <span className="ml-2 font-semibold">{alerta.configuracion.diasPrioridadAlta}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Crítico:</span>
                    <span className="ml-2 font-semibold">{alerta.configuracion.diasCritico}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Crear tarea:</span>
                    <span className="ml-2 font-semibold">{alerta.configuracion.crearTarea ? '✓ Sí' : '✗ No'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Frecuencia:</span>
                    <span className="ml-2 font-semibold">{alerta.configuracion.frecuencia}</span>
                  </div>
                </div>
              </div>

              {/* Ejemplo Real */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-semibold text-lg mb-3">📊 Ejemplo Real</h3>
                <div className="space-y-2 text-sm">
                  {Object.entries(alerta.ejemplo).map(([key, value]) => (
                    <div key={key} className="flex">
                      <span className="text-gray-600 w-40 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span className="font-medium text-gray-900">{typeof value === 'boolean' ? (value ? '✓' : '✗') : value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Consejos Finales */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardHeader>
          <CardTitle>💡 Consejos de Configuración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="font-semibold mb-2">1. Empieza con lo Crítico</h4>
            <p className="text-sm text-gray-700">Configura primero: Renovación (recuperar ingresos), Baja Programada (prevenir pérdidas), Deudor (cobros pendientes)</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">2. Ajusta los Umbrales a tu Realidad</h4>
            <p className="text-sm text-gray-700">Gimnasio pequeño: umbrales más cortos (3, 7, 14 días). Gimnasio grande: umbrales más largos (7, 15, 30 días)</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">3. Activa Tareas Automáticas</h4>
            <p className="text-sm text-gray-700">Siempre activa "crear_tarea_automatica" para que el RS tenga trabajo asignado automáticamente</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">4. Frecuencia Inteligente</h4>
            <p className="text-sm text-gray-700">Diaria (8 AM): Renovación, Deudor, Contratos, Clientes Riesgo, Bajas. Cada 4 horas: Tarjetas, Seguimiento Online</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}