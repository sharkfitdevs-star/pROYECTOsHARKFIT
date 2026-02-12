from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from datetime import datetime, timedelta


class ReporteViewSet(viewsets.ViewSet):
    """ViewSet para generar reportes y analíticas"""
    
    @action(detail=False, methods=['get'])
    def dashboard_general(self, request):
        """Dashboard general con KPIs principales"""
        from apps.clientes.models import Cliente
        from apps.ventas.models import Venta
        from apps.agendamientos.models import Agendamiento
        from apps.alertas.models import Alerta
        
        # Clientes
        total_clientes = Cliente.objects.count()
        clientes_activos = Cliente.objects.filter(estado='activo').count()
        clientes_nuevos = Cliente.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=30)
        ).count()
        
        # Ventas
        total_ventas = Venta.objects.count()
        ventas_completadas = Venta.objects.filter(estado='completada').count()
        ventas_mes = Venta.objects.filter(
            fecha_venta__month=timezone.now().month,
            fecha_venta__year=timezone.now().year
        )
        monto_ventas_mes = sum(v.monto_neto for v in ventas_mes)
        
        # Citas
        citas_pendientes = Agendamiento.objects.filter(
            estado__in=['pendiente', 'confirmada'],
            fecha_hora_inicio__gte=timezone.now()
        ).count()
        
        # Alertas
        alertas_pendientes = Alerta.objects.filter(
            estado='pendiente'
        ).count()
        alertas_criticas = Alerta.objects.filter(
            estado='pendiente',
            prioridad='critica'
        ).count()
        
        return Response({
            'clientes': {
                'total': total_clientes,
                'activos': clientes_activos,
                'nuevos_mes': clientes_nuevos,
                'tasa_conversion': (clientes_activos / total_clientes * 100) if total_clientes > 0 else 0,
            },
            'ventas': {
                'total': total_ventas,
                'completadas': ventas_completadas,
                'monto_mes': str(monto_ventas_mes),
                'promedio_venta': str(monto_ventas_mes / ventas_mes.count()) if ventas_mes.count() > 0 else 0,
            },
            'citas': {
                'pendientes': citas_pendientes,
            },
            'alertas': {
                'pendientes': alertas_pendientes,
                'criticas': alertas_criticas,
            },
        })
    
    @action(detail=False, methods=['get'])
    def ventas_por_vendedor(self, request):
        """Desempeño de vendedores"""
        from apps.ventas.models import Venta
        from django.db.models import Sum, Count, Avg
        
        vendedores = Venta.objects.values(
            'vendedor__id',
            'vendedor__username',
            'vendedor__first_name',
            'vendedor__last_name'
        ).annotate(
            total_ventas=Count('id'),
            monto_total=Sum('monto_neto'),
            promedio_venta=Avg('monto_neto'),
            completadas=Count('id', filter=Q(estado='completada')),
            tasa_completacion=Count('id', filter=Q(estado='completada')) * 100.0 / Count('id')
        ).order_by('-monto_total')
        
        return Response(vendedores)
    
    @action(detail=False, methods=['get'])
    def ventas_por_tipo(self, request):
        """Análisis de tipos de venta"""
        from apps.ventas.models import Venta
        from django.db.models import Sum, Count
        
        tipos = Venta.objects.values('tipo').annotate(
            cantidad=Count('id'),
            monto_total=Sum('monto_neto'),
            completadas=Count('id', filter=Q(estado='completada'))
        ).order_by('-monto_total')
        
        return Response(tipos)
    
    @action(detail=False, methods=['get'])
    def crecimiento_clientes(self, request):
        """Crecimiento de clientes por mes"""
        from apps.clientes.models import Cliente
        
        meses = {}
        fecha_inicio = timezone.now() - timedelta(days=365)
        
        clientes = Cliente.objects.filter(
            created_at__gte=fecha_inicio
        ).order_by('created_at')
        
        for cliente in clientes:
            mes = cliente.created_at.strftime('%Y-%m')
            if mes not in meses:
                meses[mes] = 0
            meses[mes] += 1
        
        # Acumular
        meses_ordenados = sorted(meses.keys())
        acumulado = 0
        datos = {}
        
        for mes in meses_ordenados:
            acumulado += meses[mes]
            datos[mes] = {
                'nuevos': meses[mes],
                'total_acumulado': acumulado,
            }
        
        return Response(datos)
    
    @action(detail=False, methods=['get'])
    def efectividad_alertas(self, request):
        """Análisis de efectividad del sistema de alertas"""
        from apps.alertas.models import Alerta
        from django.db.models import Count, Avg, F
        
        # Alertas por tipo
        por_tipo = Alerta.objects.values('tipo').annotate(
            total=Count('id'),
            resueltas=Count('id', filter=Q(estado='resuelta')),
            tasa_resolucion=Count('id', filter=Q(estado='resuelta')) * 100.0 / Count('id')
        )
        
        # Tiempo promedio de resolución
        alertas_resueltas = Alerta.objects.filter(
            estado='resuelta',
            fecha_resolucion__isnull=False
        )
        
        tiempos_resolucion = []
        for alerta in alertas_resueltas:
            tiempo = (alerta.fecha_resolucion - alerta.created_at).total_seconds() / 3600
            tiempos_resolucion.append(tiempo)
        
        tiempo_promedio = sum(tiempos_resolucion) / len(tiempos_resolucion) if tiempos_resolucion else 0
        
        return Response({
            'por_tipo': por_tipo,
            'tiempo_promedio_resolucion_horas': round(tiempo_promedio, 2),
            'alertas_criticas_resueltas': Alerta.objects.filter(
                prioridad='critica',
                estado='resuelta'
            ).count(),
        })
    
    @action(detail=False, methods=['get'])
    def forecast_ventas(self, request):
        """Proyección de ventas para próximos meses"""
        from apps.ventas.models import Venta
        from django.db.models import Sum
        
        # Últimos 6 meses
        meses_datos = {}
        fecha_actual = timezone.now()
        
        for i in range(6):
            mes_fecha = fecha_actual - timedelta(days=30 * i)
            mes_str = mes_fecha.strftime('%Y-%m')
            
            monto = Venta.objects.filter(
                fecha_venta__month=mes_fecha.month,
                fecha_venta__year=mes_fecha.year,
                estado='completada'
            ).aggregate(total=Sum('monto_neto'))['total'] or 0
            
            meses_datos[mes_str] = monto
        
        # Calcular promedio
        valores = list(meses_datos.values())
        promedio = sum(valores) / len(valores) if valores else 0
        
        return Response({
            'historial_6_meses': meses_datos,
            'promedio_mensual': promedio,
            'proyeccion_mes_siguiente': promedio * 1.05,  # Proyección 5% crecimiento
        })
    
    @action(detail=False, methods=['get'])
    def clientes_en_riesgo(self, request):
        """Identificar clientes en riesgo de pérdida"""
        from apps.clientes.models import Cliente
        from apps.agendamientos.models import Agendamiento
        
        # Clientes sin citas en últimos 90 días
        hace_90_dias = timezone.now() - timedelta(days=90)
        
        clientes_activos = Cliente.objects.filter(estado='activo')
        
        en_riesgo = []
        for cliente in clientes_activos:
            ultima_cita = Agendamiento.objects.filter(
                cliente=cliente
            ).order_by('-fecha_hora_inicio').first()
            
            if not ultima_cita or ultima_cita.fecha_hora_inicio < hace_90_dias:
                en_riesgo.append({
                    'id': cliente.id,
                    'nombre': cliente.nombre,
                    'email': cliente.email,
                    'dias_sin_contacto': (
                        (timezone.now() - ultima_cita.fecha_hora_inicio).days
                        if ultima_cita else '+'
                    ),
                    'asignado_a': cliente.asignado_a.get_full_name() if cliente.asignado_a else None,
                })
        
        return Response({
            'total_en_riesgo': len(en_riesgo),
            'clientes': en_riesgo,
        })
    
    @action(detail=False, methods=['get'])
    def exportar_reporte(self, request):
        """Exportar reporte completo a PDF/Excel"""
        formato = request.query_params.get('formato', 'excel')
        
        if formato == 'excel':
            # Aquí iría lógica real de exportación con openpyxl
            return Response({
                'mensaje': 'Exportación a Excel (implementar con openpyxl)',
                'archivo': '/media/reportes/reporte.xlsx'
            })
        elif formato == 'pdf':
            # Aquí iría lógica real de exportación con reportlab
            return Response({
                'mensaje': 'Exportación a PDF (implementar con reportlab)',
                'archivo': '/media/reportes/reporte.pdf'
            })
        
        return Response(
            {'error': 'Formato no soportado'},
            status=status.HTTP_400_BAD_REQUEST
        )
