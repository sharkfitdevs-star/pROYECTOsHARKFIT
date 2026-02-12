// ============================================================
// COMPONENTE REACT: SeccionEvo.jsx
// Resumen de Métricas Comerciales con diseño tipo Clientes
// ============================================================

import React, { useState, useEffect } from 'react';
import { Ventas } from '@/entities/Ventas';
import { Leads_Diarios } from '@/entities/Leads_Diarios';
import { Prospectos } from '@/entities/Prospectos';
import { Agendamientos } from '@/entities/Agendamientos';
import { Clientes } from '@/entities/Clientes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, Users, Calendar, DollarSign, Target, CheckCircle, Clock, UserCheck } from 'lucide-react';

const SeccionEvo = () => {
  const [metricas, setMetricas] = useState({
    totalVentas: 0,
    ventasOnline: 0,
    ventasEnSede: 0,
    montoTotal: 0,
    totalLeads: 0,
    agendados: 0,
    asistencia: 0,
    conversiones: 0,
    diasPromedioConversion: 0,
    // Métricas de clientes
    totalClientes: 0,
    clientesActivos: 0,
    clientesVencen7Dias: 0,
    clientesVencidos: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const obtenerMetricas = async () => {
    try {
      setLoading(true);
      setError(null);

      const [ventasData, leadsData, prospectosData, agendamientosData, clientesData] = await Promise.all([
        Ventas.list(),
        Leads_Diarios.list(),
        Prospectos.list(),
        Agendamientos.list(),
        Clientes.list(),
      ]);

      const ventas = ventasData || [];
      const leads = leadsData || [];
      const prospectos = prospectosData || [];
      const agendamientos = agendamientosData || [];
      const clientes = clientesData || [];

      const ventasCerradas = ventas.filter(v => v.estado === 'Cerrada');
      const ventasOnline = ventasCerradas.filter(v => v.tipo_venta === 'Online').length;
      const ventasEnSede = ventasCerradas.filter(v => v.tipo_venta === 'En sede').length;
      const montoTotal = ventasCerradas.reduce((sum, v) => sum + (parseFloat(v.monto) || 0), 0);

      const totalLeads = leads.reduce((sum, l) => sum + (l.leads_totales || 0), 0);
      const totalAgendados = agendamientos.length;
      const totalAsistencia = agendamientos.filter(a => a.resultado_asistencia === 'Asistió').length;
      const totalConversiones = ventasCerradas.length;

      let diasPromedio = 0;
      const tiempos = [];
      ventasCerradas.forEach(venta => {
        const prospecto = prospectos.find(p => p.id === venta.prospecto_id);
        if (prospecto && prospecto.fecha_ingreso && venta.fecha_venta) {
          const fechaIngreso = new Date(prospecto.fecha_ingreso);
          const fechaVenta = new Date(venta.fecha_venta);
          const dias = Math.floor((fechaVenta - fechaIngreso) / (1000 * 60 * 60 * 24));
          if (dias >= 0) tiempos.push(dias);
        }
      });
      if (tiempos.length > 0) {
        diasPromedio = (tiempos.reduce((a, b) => a + b, 0) / tiempos.length).toFixed(1);
      }

      // CALCULAR MÉTRICAS DE CLIENTES
      const totalClientes = clientes.length;
      const clientesActivos = clientes.filter(c => c.activo && c.estado_suscripcion === 'Activo').length;
      
      // Calcular clientes que vencen en 7 días
      const hoy = new Date();
      const en7Dias = new Date();
      en7Dias.setDate(hoy.getDate() + 7);
      
      const clientesVencen7Dias = clientes.filter(c => {
        if (!c.fecha_fin_plan_actual || !c.activo) return false;
        const fechaFin = new Date(c.fecha_fin_plan_actual);
        return fechaFin >= hoy && fechaFin <= en7Dias;
      }).length;
      
      // Calcular clientes vencidos (fecha_fin_plan_actual ya pasó)
      const clientesVencidos = clientes.filter(c => {
        if (!c.fecha_fin_plan_actual) return false;
        const fechaFin = new Date(c.fecha_fin_plan_actual);
        return fechaFin < hoy;
      }).length;

      setMetricas({
        totalVentas: ventasCerradas.length,
        ventasOnline,
        ventasEnSede,
        montoTotal: montoTotal.toFixed(2),
        totalLeads,
        agendados: totalAgendados,
        asistencia: totalAsistencia,
        conversiones: totalConversiones,
        diasPromedioConversion: diasPromedio,
        totalClientes,
        clientesActivos,
        clientesVencen7Dias,
        clientesVencidos,
      });

      setLoading(false);
    } catch (err) {
      console.error('Error obteniendo métricas:', err);
      setError('Error cargando métricas');
      setLoading(false);
    }
  };

  useEffect(() => {
    obtenerMetricas();
    const interval = setInterval(obtenerMetricas, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header con botón de actualizar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">📊 Resumen de Métricas</CardTitle>
              <CardDescription>Gestión completa de métricas comerciales</CardDescription>
            </div>
            <Button
              onClick={obtenerMetricas}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">❌ {error}</p>
          </CardContent>
        </Card>
      )}

      {/* Gestión de Métricas - Cards de acciones */}
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Métricas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricActionCard
              icon="💰"
              label="Total Ventas"
              color="orange"
              loading={loading}
            />
            <MetricActionCard
              icon="🌐"
              label="Ventas Online"
              color="blue"
              loading={loading}
            />
            <MetricActionCard
              icon="🏢"
              label="Ventas En Sede"
              color="green"
              loading={loading}
            />
            <MetricActionCard
              icon="📈"
              label="Conversiones"
              color="purple"
              loading={loading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Métricas Principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Total Ventas"
          value={metricas.totalVentas}
          color="text-green-600"
          bgColor="bg-green-50"
          loading={loading}
        />
        <MetricCard
          icon={<Users className="w-5 h-5" />}
          label="Total Leads"
          value={metricas.totalLeads}
          color="text-blue-600"
          bgColor="bg-blue-50"
          loading={loading}
        />
        <MetricCard
          icon={<Calendar className="w-5 h-5" />}
          label="Agendados"
          value={metricas.agendados}
          color="text-purple-600"
          bgColor="bg-purple-50"
          loading={loading}
        />
        <MetricCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Asistencia"
          value={metricas.asistencia}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
          loading={loading}
        />
      </div>

      {/* Listado General - Métricas de Clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Listado General</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <div className="text-3xl font-bold text-gray-900">
                {loading ? '-' : metricas.totalClientes}
              </div>
              <p className="text-sm text-gray-600 mt-1">Total Clientes</p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="text-3xl font-bold text-green-600">
                {loading ? '-' : metricas.clientesActivos}
              </div>
              <p className="text-sm text-gray-600 mt-1">Activos</p>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
              <div className="text-3xl font-bold text-orange-600">
                {loading ? '-' : metricas.clientesVencen7Dias}
              </div>
              <p className="text-sm text-gray-600 mt-1">Vencen en 7 días</p>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg border-2 border-red-200 cursor-pointer hover:bg-red-100 transition-colors">
              <div className="text-3xl font-bold text-red-600">
                {loading ? '-' : metricas.clientesVencidos}
              </div>
              <p className="text-sm text-gray-600 mt-1">Vencidos (click para filtrar)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detalles de Ventas */}
      <Card>
        <CardHeader>
          <CardTitle>Detalles de Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Ventas Online</span>
                <span className="text-2xl font-bold text-blue-600">
                  {loading ? '-' : metricas.ventasOnline}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-500"
                  style={{ 
                    width: metricas.totalVentas > 0 
                      ? `${(metricas.ventasOnline / metricas.totalVentas) * 100}%` 
                      : '0%' 
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Ventas En Sede</span>
                <span className="text-2xl font-bold text-purple-600">
                  {loading ? '-' : metricas.ventasEnSede}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-600 transition-all duration-500"
                  style={{ 
                    width: metricas.totalVentas > 0 
                      ? `${(metricas.ventasEnSede / metricas.totalVentas) * 100}%` 
                      : '0%' 
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Monto Total</span>
                <span className="text-2xl font-bold text-green-600">
                  {loading ? '-' : `$${parseFloat(metricas.montoTotal).toLocaleString()}`}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                Facturación total
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métrica Destacada - Días Promedio */}
      <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
        <CardContent className="pt-6">
          <div className="text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-80" />
            <p className="text-sm opacity-90 mb-2">Días Promedio de Conversión</p>
            <h2 className="text-5xl font-bold mb-2">
              {loading ? '-' : metricas.diasPromedioConversion}
            </h2>
            <p className="text-sm opacity-80">días desde lead hasta venta</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Componente de Card de Acción
const MetricActionCard = ({ icon, label, color, loading }) => {
  const colorClasses = {
    orange: 'border-orange-200 hover:bg-orange-50',
    blue: 'border-blue-200 hover:bg-blue-50',
    green: 'border-green-200 hover:bg-green-50',
    purple: 'border-purple-200 hover:bg-purple-50',
  };

  return (
    <div className={`border-2 rounded-lg p-4 text-center cursor-pointer transition-colors ${colorClasses[color]} ${loading ? 'opacity-50' : ''}`}>
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-sm font-medium text-gray-700">{label}</p>
    </div>
  );
};

// Componente de Card de Métrica
const MetricCard = ({ icon, label, value, color, bgColor, loading }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <div className={color}>{icon}</div>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <h3 className="text-3xl font-bold text-gray-900">
        {loading ? '-' : typeof value === 'number' ? value.toLocaleString() : value}
      </h3>
    </CardContent>
  </Card>
);

export default SeccionEvo;