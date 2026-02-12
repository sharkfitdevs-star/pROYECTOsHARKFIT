from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.clientes.views import ClienteViewSet

router = DefaultRouter()
router.register(r'', ClienteViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
