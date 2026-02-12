from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.alertas.views import AlertaViewSet

router = DefaultRouter()
router.register(r'', AlertaViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
