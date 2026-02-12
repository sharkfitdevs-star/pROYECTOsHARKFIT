from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from apps.ventas.models import Venta
from apps.ventas.serializers import (
    VentaSerializer,
    VentaListSerializer,
    VentaCreateSerializer,
)


class VentaPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 1000


class VentaViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar Ventas"""
    
    queryset = Venta.objects.all()
    serializer_class = VentaSerializer
    pagination_class = VentaPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['estado', 'tipo', 'vendedor', 'cliente']
    search_fields = ['numero_venta', 'cliente__nombre', 'descripcion']
    ordering_fields = ['fecha_venta', 'monto_neto', 'estado']
    ordering = ['-fecha_venta']
    
    def get_serializer_class(self):
        """Usar diferentes serializers según la acción"""
        if self.action == 'list':
            return VentaListSerializer
        elif self.action == 'create':
            return VentaCreateSerializer
        return VentaSerializer
    
    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        """Cambiar estado de una venta"""
        venta = self.get_object()
        nuevo_estado = request.data.get('estado')
        
        estados_validos = ['nueva', 'en_proceso', 'completada', 'cancelada', 'devuelta']
        if nuevo_estado not in estados_validos:
            return Response(
                {'error': f'Estado inválido. Debe ser uno de: {", ".join(estados_validos)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        venta.estado = nuevo_estado
        venta.save()
        
        serializer = VentaSerializer(venta)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def marcar_completada(self, request, pk=None):
        """Marcar venta como completada"""
        venta = self.get_object()
        from datetime import date
        venta.estado = 'completada'
        venta.fecha_entrega = date.today()
        venta.save()
        
        serializer = VentaSerializer(venta)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def por_estado(self, request):
        """Obtener ventas agrupadas por estado"""
        estados = {
            'nueva': Venta.objects.filter(estado='nueva').count(),
            'en_proceso': Venta.objects.filter(estado='en_proceso').count(),
            'completada': Venta.objects.filter(estado='completada').count(),
            'cancelada': Venta.objects.filter(estado='cancelada').count(),
            'devuelta': Venta.objects.filter(estado='devuelta').count(),
        }
        return Response(estados)
    
    @action(detail=False, methods=['get'])
    def resumen_mes(self, request):
        """Obtener resumen de ventas del mes actual"""
        from django.utils import timezone
        from datetime import timedelta
        
        today = timezone.now().date()
        mes_inicio = today.replace(day=1)
        
        ventas_mes = Venta.objects.filter(
            fecha_venta__gte=mes_inicio,
            fecha_venta__lte=today
        )
        
        total_monto = sum(v.monto_neto for v in ventas_mes)
        cantidad = ventas_mes.count()
        completadas = ventas_mes.filter(estado='completada').count()
        
        return Response({
            'mes': mes_inicio.strftime('%B %Y'),
            'total_monto': str(total_monto),
            'cantidad_ventas': cantidad,
            'ventas_completadas': completadas,
            'porcentaje_completadas': (completadas / cantidad * 100) if cantidad > 0 else 0,
        })
    
    @action(detail=False, methods=['get'])
    def por_vendedor(self, request):
        """Obtener ventas agrupadas por vendedor"""
        from django.db.models import Sum, Count
        
        vendedores = Venta.objects.values('vendedor__id', 'vendedor__first_name').annotate(
            total_ventas=Count('id'),
            monto_total=Sum('monto_neto')
        )
        
        return Response(vendedores)
    
    @action(detail=False, methods=['get'])
    def exportar(self, request):
        """Exportar ventas a CSV"""
        import csv
        from django.http import HttpResponse
        
        formato = request.query_params.get('formato', 'csv')
        
        ventas = self.filter_queryset(self.get_queryset())
        
        if formato == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="ventas.csv"'
            
            writer = csv.writer(response)
            writer.writerow([
                'ID', 'Número Venta', 'Cliente', 'Tipo', 'Estado',
                'Monto Neto', 'Moneda', 'Fecha Venta', 'Vendedor'
            ])
            
            for venta in ventas:
                writer.writerow([
                    venta.id,
                    venta.numero_venta,
                    venta.cliente.nombre,
                    venta.get_tipo_display(),
                    venta.get_estado_display(),
                    venta.monto_neto,
                    venta.moneda,
                    venta.fecha_venta.strftime('%d/%m/%Y'),
                    venta.vendedor.get_full_name() if venta.vendedor else '',
                ])
            
            return response
        
        return Response(
            {'error': 'Formato no soportado'},
            status=status.HTTP_400_BAD_REQUEST
        )
