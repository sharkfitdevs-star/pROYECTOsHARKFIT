from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.usuarios.views import UsuarioViewSet, PerfilUsuarioViewSet

router = DefaultRouter()
router.register(r'', UsuarioViewSet, basename='usuario')
router.register(r'perfiles', PerfilUsuarioViewSet, basename='perfil')

urlpatterns = [
    path('', include(router.urls)),
]
