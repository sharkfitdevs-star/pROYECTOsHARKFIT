from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from apps.agendamientos.models import Agendamiento
from apps.agendamientos.serializers import (
    AgendamientoSerializer,
    AgendamientoListSerializer,
    AgendamientoCreateSerializer,
)


class AgendamientoPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 1000


class AgendamientoViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar Agendamientos"""
    
    queryset = Agendamiento.objects.all()
    serializer_class = AgendamientoSerializer
    pagination_class = AgendamientoPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['estado', 'tipo', 'cliente', 'responsable', 'es_virtual']
    search_fields = ['titulo', 'cliente__nombre', 'descripcion']
    ordering_fields = ['fecha_hora_inicio', 'titulo']
    ordering = ['fecha_hora_inicio']
    
    def get_serializer_class(self):
        """Usar diferentes serializers según la acción"""
        if self.action == 'list':
            return AgendamientoListSerializer
        elif self.action == 'create':
            return AgendamientoCreateSerializer
        return AgendamientoSerializer
    
    @action(detail=False, methods=['get'])
    def proximas(self, request):
        """Obtener próximas citas (próximas 7 días)"""
        from django.utils import timezone
        from datetime import timedelta
        
        ahora = timezone.now()
        en_una_semana = ahora + timedelta(days=7)
        
        proximas = Agendamiento.objects.filter(
            fecha_hora_inicio__gte=ahora,
            fecha_hora_inicio__lte=en_una_semana,
            estado__in=['pendiente', 'confirmada']
        ).order_by('fecha_hora_inicio')
        
        serializer = AgendamientoListSerializer(proximas, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def hoy(self, request):
        """Obtener citas de hoy"""
        from django.utils import timezone
        import datetime
        
        hoy = timezone.now().date()
        citas_hoy = Agendamiento.objects.filter(
            fecha_hora_inicio__date=hoy
        ).order_by('fecha_hora_inicio')
        
        serializer = AgendamientoListSerializer(citas_hoy, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def calendario(self, request):
        """Obtener citas para calendario (mes completo)"""
        from django.utils import timezone
        import calendar
        from datetime import date
        
        year = int(request.query_params.get('year', date.today().year))
        month = int(request.query_params.get('month', date.today().month))
        
        # Primer y último día del mes
        primer_dia = date(year, month, 1)
        if month == 12:
            ultimo_dia = date(year + 1, 1, 1)
        else:
            ultimo_dia = date(year, month + 1, 1)
        
        citas = Agendamiento.objects.filter(
            fecha_hora_inicio__date__gte=primer_dia,
            fecha_hora_inicio__date__lt=ultimo_dia
        )
        
        # Agrupar por día
        dias = {}
        for cita in citas:
            dia = cita.fecha_hora_inicio.date()
            if dia not in dias:
                dias[dia] = []
            dias[dia].append({
                'id': cita.id,
                'titulo': cita.titulo,
                'hora': cita.fecha_hora_inicio.strftime('%H:%M'),
                'cliente': cita.cliente.nombre,
                'estado': cita.estado,
            })
        
        return Response({
            'mes': primer_dia.strftime('%B %Y'),
            'dias': dias,
        })
    
    @action(detail=True, methods=['post'])
    def confirmar(self, request, pk=None):
        """Confirmar una cita"""
        cita = self.get_object()
        cita.estado = 'confirmada'
        cita.save()
        
        serializer = AgendamientoSerializer(cita)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def completar(self, request, pk=None):
        """Marcar cita como completada"""
        cita = self.get_object()
        cita.estado = 'completada'
        cita.resultado = request.data.get('resultado', '')
        cita.save()
        
        serializer = AgendamientoSerializer(cita)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """Cancelar una cita"""
        cita = self.get_object()
        cita.estado = 'cancelada'
        cita.notas = request.data.get('razon_cancelacion', '')
        cita.save()
        
        serializer = AgendamientoSerializer(cita)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def por_responsable(self, request):
        """Obtener citas agrupadas por responsable"""
        from django.db.models import Count
        
        responsables = Agendamiento.objects.values(
            'responsable__id',
            'responsable__first_name'
        ).annotate(
            total_citas=Count('id'),
            completadas=Count('id', filter=models.Q(estado='completada'))
        )
        
        return Response(responsables)
