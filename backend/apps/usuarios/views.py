from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django_filters.rest_framework import DjangoFilterBackend
from apps.usuarios.models import PerfilUsuario
from apps.usuarios.serializers import (
    UsuarioSerializer,
    UsuarioCreateSerializer,
    UsuarioUpdateSerializer,
    UsuarioChangePasswordSerializer,
    LoginSerializer,
    PerfilUsuarioSerializer,
)


class UsuarioPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 1000


class UsuarioViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar Usuarios"""
    
    queryset = User.objects.all()
    serializer_class = UsuarioSerializer
    pagination_class = UsuarioPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['date_joined', 'username']
    ordering = ['-date_joined']
    
    def get_serializer_class(self):
        """Usar diferentes serializers según la acción"""
        if self.action == 'create':
            return UsuarioCreateSerializer
        elif self.action == 'update' or self.action == 'partial_update':
            return UsuarioUpdateSerializer
        elif self.action == 'cambiar_password':
            return UsuarioChangePasswordSerializer
        return UsuarioSerializer
    
    @action(detail=False, methods=['post'])
    def login(self, request):
        """Autenticar usuario y retornar JWT token"""
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        username = serializer.validated_data['username']
        password = serializer.validated_data['password']
        
        try:
            usuario = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {'error': 'Usuario o contraseña incorrectos'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not usuario.check_password(password):
            return Response(
                {'error': 'Usuario o contraseña incorrectos'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not usuario.is_active:
            return Response(
                {'error': 'Usuario inactivo'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Generar JWT tokens
        refresh = RefreshToken.for_user(usuario)
        
        # Actualizar último acceso
        from django.utils import timezone
        usuario.perfil.ultimo_acceso = timezone.now()
        usuario.perfil.save()
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'usuario': UsuarioSerializer(usuario).data,
        })
    
    @action(detail=False, methods=['post'])
    def logout(self, request):
        """Logout (simplemente elimina token del cliente)"""
        return Response({'detail': 'Sesión cerrada'})
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Obtener datos del usuario actual"""
        if not request.user.is_authenticated:
            return Response(
                {'error': 'No autenticado'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        serializer = UsuarioSerializer(request.user)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def cambiar_password(self, request, pk=None):
        """Cambiar contraseña del usuario"""
        usuario = self.get_object()
        
        # Solo el usuario mismo puede cambiar su contraseña
        if request.user.id != usuario.id and not request.user.is_staff:
            return Response(
                {'error': 'No tienes permiso'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = UsuarioChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Verificar contraseña antigua
        if not usuario.check_password(serializer.validated_data['old_password']):
            return Response(
                {'error': 'Contraseña antigua incorrecta'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Establecer nueva contraseña
        usuario.set_password(serializer.validated_data['new_password'])
        usuario.save()
        
        return Response({'detail': 'Contraseña actualizada'})
    
    @action(detail=True, methods=['put', 'patch'])
    def actualizar_perfil(self, request, pk=None):
        """Actualizar datos del perfil"""
        usuario = self.get_object()
        
        # Solo el usuario mismo o staff puede actualizar
        if request.user.id != usuario.id and not request.user.is_staff:
            return Response(
                {'error': 'No tienes permiso'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = UsuarioUpdateSerializer(usuario, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(UsuarioSerializer(usuario).data)
    
    @action(detail=True, methods=['get'])
    def desactivar(self, request, pk=None):
        """Desactivar un usuario (solo staff)"""
        if not request.user.is_staff:
            return Response(
                {'error': 'No tienes permiso'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        usuario = self.get_object()
        usuario.is_active = False
        usuario.save()
        
        return Response({'detail': 'Usuario desactivado'})
    
    @action(detail=False, methods=['get'])
    def activos(self, request):
        """Obtener solo usuarios activos"""
        usuarios = User.objects.filter(is_active=True)
        page = self.paginate_queryset(usuarios)
        
        if page is not None:
            serializer = UsuarioSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = UsuarioSerializer(usuarios, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def por_rol(self, request):
        """Obtener usuarios agrupados por rol"""
        from django.db.models import Count
        
        roles = PerfilUsuario.objects.values('rol').annotate(
            cantidad=Count('id')
        )
        
        return Response(roles)


class PerfilUsuarioViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para gestionar Perfiles de Usuarios (lectura principalmente)"""
    
    queryset = PerfilUsuario.objects.all()
    serializer_class = PerfilUsuarioSerializer
    pagination_class = UsuarioPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['rol', 'estado']
    search_fields = ['user__username', 'user__email', 'user__first_name']
    
    @action(detail=True, methods=['put', 'patch'])
    def actualizar(self, request, pk=None):
        """Actualizar perfil (solo staff)"""
        if not request.user.is_staff:
            return Response(
                {'error': 'No tienes permiso'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        perfil = self.get_object()
        serializer = PerfilUsuarioSerializer(
            perfil,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(serializer.data)
