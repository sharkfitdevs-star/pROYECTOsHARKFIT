from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views
from .views_evo import (
    ProspectViewSet, MemberViewSet, SaleViewSet, 
    AccessLogViewSet, SyncQueueViewSet, DashboardViewSet
)

# Router para las APIs de EVO
router = DefaultRouter()
router.register(r'evo/prospects', ProspectViewSet, basename='evo-prospects')
router.register(r'evo/members', MemberViewSet, basename='evo-members')
router.register(r'evo/sales', SaleViewSet, basename='evo-sales')
router.register(r'evo/entries', AccessLogViewSet, basename='evo-entries')
router.register(r'evo/sync-logs', SyncQueueViewSet, basename='evo-sync-logs')
router.register(r'evo/dashboard', DashboardViewSet, basename='evo-dashboard')

urlpatterns = [
    path("", views.root_status, name="root-status"),
    path("health/", views.health_check, name="health-check"),
    path("", include(router.urls)),
]
