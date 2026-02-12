from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from apps.alertas.models import Alerta
from apps.alertas.serializers import (
    AlertaSerializer,
    AlertaListSerializer,
    AlertaCreateSerializer,
    AlertaPendienteSerializer,
)


class AlertaPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 1000


class AlertaViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar Alertas"""
    
    queryset = Alerta.objects.all()
    serializer_class = AlertaSerializer
    pagination_class = AlertaPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['estado', 'tipo', 'prioridad', 'cliente', 'asignado_a']
    search_fields = ['titulo', 'descripcion', 'cliente__nombre']
    ordering_fields = ['created_at', 'prioridad', 'fecha_vencimiento']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Usar diferentes serializers según la acción"""
        if self.action == 'list':
            return AlertaListSerializer
        elif self.action == 'create':
            return AlertaCreateSerializer
        elif self.action == 'pendientes':
            return AlertaPendienteSerializer
        return AlertaSerializer
    
    @action(detail=False, methods=['get'])
    def pendientes(self, request):
        """Obtener alertas pendientes (sin resolver)"""
        alertas = Alerta.objects.filter(estado='pendiente').order_by('-prioridad', 'created_at')
        
        page = self.paginate_queryset(alertas)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(alertas, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def criticas(self, request):
        """Obtener alertas críticas no resueltas"""
        alertas = Alerta.objects.filter(
            prioridad='critica',
            estado__in=['pendiente', 'en_proceso']
        ).order_by('-created_at')
        
        serializer = AlertaListSerializer(alertas, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def por_prioridad(self, request):
        """Obtener alertas agrupadas por prioridad"""
        prioridades = {
            'critica': Alerta.objects.filter(prioridad='critica', estado='pendiente').count(),
            'alta': Alerta.objects.filter(prioridad='alta', estado='pendiente').count(),
            'media': Alerta.objects.filter(prioridad='media', estado='pendiente').count(),
            'baja': Alerta.objects.filter(prioridad='baja', estado='pendiente').count(),
        }
        return Response(prioridades)
    
    @action(detail=False, methods=['get'])
    def por_tipo(self, request):
        """Obtener alertas agrupadas por tipo"""
        from django.db.models import Count
        
        tipos = Alerta.objects.filter(
            estado='pendiente'
        ).values('tipo').annotate(
            cantidad=Count('id')
        )
        
        return Response(tipos)
    
    @action(detail=True, methods=['post'])
    def resolver(self, request, pk=None):
        """Resolver/cerrar una alerta"""
        alerta = self.get_object()
        from django.utils import timezone
        
        alerta.estado = 'resuelta'
        alerta.fecha_resolucion = timezone.now()
        alerta.resuelto_por = request.user
        alerta.notas = request.data.get('notas_resolucion', '')
        alerta.save()
        
        serializer = AlertaSerializer(alerta)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def asignar(self, request, pk=None):
        """Asignar alerta a un usuario"""
        alerta = self.get_object()
        usuario_id = request.data.get('usuario_id')
        
        if not usuario_id:
            alerta.asignado_a = None
        else:
            from django.contrib.auth.models import User
            try:
                usuario = User.objects.get(id=usuario_id)
                alerta.asignado_a = usuario
            except User.DoesNotExist:
                return Response(
                    {'error': 'Usuario no encontrado'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        alerta.save()
        serializer = AlertaSerializer(alerta)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def notificar(self, request, pk=None):
        """Marcar alerta como notificada"""
        alerta = self.get_object()
        canales = request.data.get('canales', 'email')
        
        alerta.notificado = True
        alerta.enviado_a_canales = canales
        alerta.save()
        
        # Aquí iría lógica real de envío (email, SMS, Slack, etc)
        
        serializer = AlertaSerializer(alerta)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """Obtener resumen de alertas del sistema"""
        total = Alerta.objects.count()
        pendientes = Alerta.objects.filter(estado='pendiente').count()
        criticas = Alerta.objects.filter(prioridad='critica', estado='pendiente').count()
        
        return Response({
            'total_alertas': total,
            'alertas_pendientes': pendientes,
            'alertas_criticas': criticas,
            'tasa_resolucion': ((total - pendientes) / total * 100) if total > 0 else 0,
        })
