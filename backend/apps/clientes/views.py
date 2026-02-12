from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from apps.clientes.models import Cliente
from apps.clientes.serializers import (
    ClienteSerializer,
    ClienteListSerializer,
    ClienteCreateSerializer,
)


class ClientePagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 1000


class ClienteViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar Clientes"""
    
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    pagination_class = ClientePagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['estado', 'asignado_a']
    search_fields = ['nombre', 'email', 'telefono', 'rut', 'empresa']
    ordering_fields = ['created_at', 'nombre', 'estado']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Usar diferentes serializers según la acción"""
        if self.action == 'list':
            return ClienteListSerializer
        elif self.action == 'create':
            return ClienteCreateSerializer
        return ClienteSerializer
    
    @action(detail=False, methods=['get'])
    def buscar(self, request):
        """Buscar clientes por nombre, email o teléfono"""
        query = request.query_params.get('q', '')
        if not query or len(query) < 2:
            return Response(
                {'error': 'Búsqueda debe tener al menos 2 caracteres'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        clientes = Cliente.objects.filter(
            nombre__icontains=query
        ) | Cliente.objects.filter(
            email__icontains=query
        ) | Cliente.objects.filter(
            telefono__icontains=query
        )
        
        serializer = ClienteListSerializer(clientes, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def por_estado(self, request):
        """Obtener clientes agrupados por estado"""
        estados = {
            'prospecto': Cliente.objects.filter(estado='prospecto').count(),
            'activo': Cliente.objects.filter(estado='activo').count(),
            'suspendido': Cliente.objects.filter(estado='suspendido').count(),
            'baja': Cliente.objects.filter(estado='baja').count(),
        }
        return Response(estados)
    
    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        """Cambiar estado de un cliente"""
        cliente = self.get_object()
        nuevo_estado = request.data.get('estado')
        
        estados_validos = ['prospecto', 'activo', 'suspendido', 'baja']
        if nuevo_estado not in estados_validos:
            return Response(
                {'error': f'Estado inválido. Debe ser uno de: {", ".join(estados_validos)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cliente.estado = nuevo_estado
        cliente.save()
        
        serializer = ClienteSerializer(cliente)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def asignar_a(self, request, pk=None):
        """Asignar cliente a un usuario"""
        cliente = self.get_object()
        usuario_id = request.data.get('usuario_id')
        
        if not usuario_id:
            cliente.asignado_a = None
        else:
            from django.contrib.auth.models import User
            try:
                usuario = User.objects.get(id=usuario_id)
                cliente.asignado_a = usuario
            except User.DoesNotExist:
                return Response(
                    {'error': 'Usuario no encontrado'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        cliente.save()
        serializer = ClienteSerializer(cliente)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def exportar(self, request):
        """Exportar clientes a CSV"""
        import csv
        from django.http import HttpResponse
        
        formato = request.query_params.get('formato', 'csv')
        
        clientes = self.filter_queryset(self.get_queryset())
        
        if formato == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="clientes.csv"'
            
            writer = csv.writer(response)
            writer.writerow([
                'ID', 'Nombre', 'Email', 'Teléfono', 'RUT', 'Empresa',
                'Estado', 'Ciudad', 'Fuente', 'Presupuesto', 'Creado'
            ])
            
            for cliente in clientes:
                writer.writerow([
                    cliente.id,
                    cliente.nombre,
                    cliente.email,
                    cliente.telefono,
                    cliente.rut or '',
                    cliente.empresa,
                    cliente.estado,
                    cliente.ciudad,
                    cliente.fuente,
                    cliente.presupuesto_estimado or '',
                    cliente.created_at.strftime('%d/%m/%Y'),
                ])
            
            return response
        
        return Response(
            {'error': 'Formato no soportado'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    def destroy(self, request, *args, **kwargs):
        """Eliminar cliente con validación"""
        cliente = self.get_object()
        
        # Validar que no tenga ventas activas
        if cliente.ventas.filter(estado='en_proceso').exists():
            return Response(
                {'error': 'No puedes eliminar un cliente con ventas en proceso'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().destroy(request, *args, **kwargs)
