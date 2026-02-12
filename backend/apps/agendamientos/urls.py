from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.agendamientos.views import AgendamientoViewSet

router = DefaultRouter()
router.register(r'', AgendamientoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
