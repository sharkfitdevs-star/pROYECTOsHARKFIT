"""
ViewSets para la API REST de datos EVO W12
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Avg, Count
from apps.core.models_evo import Prospect, Member, Sale, AccessLog, SyncQueue
from apps.core.serializers_evo import (
    ProspectSerializer, MemberSerializer, SaleSerializer, 
    AccessLogSerializer, SyncQueueSerializer, DashboardStatsSerializer
)


class ProspectViewSet(viewsets.ReadOnlyModelViewSet):
    """API para prospectos"""
    queryset = Prospect.objects.all()
    serializer_class = ProspectSerializer

    def get_queryset(self):
        queryset = Prospect.objects.all()
        tenant = self.request.query_params.get('tenant', None)
        if tenant:
            queryset = queryset.filter(tenant_id=tenant)
        return queryset


class MemberViewSet(viewsets.ReadOnlyModelViewSet):
    """API para miembros"""
    queryset = Member.objects.all()
    serializer_class = MemberSerializer

    def get_queryset(self):
        queryset = Member.objects.all()
        tenant = self.request.query_params.get('tenant', None)
        if tenant:
            queryset = queryset.filter(tenant_id=tenant)
        return queryset


class SaleViewSet(viewsets.ReadOnlyModelViewSet):
    """API para ventas"""
    queryset = Sale.objects.all()
    serializer_class = SaleSerializer

    def get_queryset(self):
        queryset = Sale.objects.all()
        tenant = self.request.query_params.get('tenant', None)
        if tenant:
            queryset = queryset.filter(tenant_id=tenant)
        return queryset


class AccessLogViewSet(viewsets.ReadOnlyModelViewSet):
    """API para registros de acceso"""
    queryset = AccessLog.objects.all()
    serializer_class = AccessLogSerializer

    def get_queryset(self):
        queryset = AccessLog.objects.all()
        tenant = self.request.query_params.get('tenant', None)
        if tenant:
            queryset = queryset.filter(tenant_id=tenant)
        return queryset[:100]  # Limitar a 100 últimos


class SyncQueueViewSet(viewsets.ReadOnlyModelViewSet):
    """API para logs de sincronización"""
    queryset = SyncQueue.objects.all()
    serializer_class = SyncQueueSerializer


class DashboardViewSet(viewsets.ViewSet):
    """API para estadísticas del dashboard"""

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Obtener estadísticas agregadas"""
        tenant = request.query_params.get('tenant', 'gym-vendify-001')

        # Contar registros
        total_prospects = Prospect.objects.filter(tenant_id=tenant).count()
        total_sales = Sale.objects.filter(tenant_id=tenant).count()
        total_entries = AccessLog.objects.filter(tenant_id=tenant).count()

        # Calcular revenue
        revenue_data = Sale.objects.filter(tenant_id=tenant).aggregate(
            total=Sum('amount'),
            average=Avg('amount')
        )
        total_revenue = revenue_data['total'] or 0
        avg_sale_amount = revenue_data['average'] or 0

        # Última sincronización
        last_sync_obj = SyncQueue.objects.filter(
            tenant_id=tenant,
            status='COMPLETED'
        ).first()
        last_sync = last_sync_obj.created_at if last_sync_obj else 'N/A'

        # Registros recientes
        recent_prospects = Prospect.objects.filter(tenant_id=tenant)[:5]
        recent_sales = Sale.objects.filter(tenant_id=tenant)[:5]
        recent_entries = AccessLog.objects.filter(tenant_id=tenant)[:10]

        data = {
            'total_prospects': total_prospects,
            'total_sales': total_sales,
            'total_entries': total_entries,
            'total_revenue': total_revenue,
            'avg_sale_amount': avg_sale_amount,
            'last_sync': last_sync,
            'recent_prospects': ProspectSerializer(recent_prospects, many=True).data,
            'recent_sales': SaleSerializer(recent_sales, many=True).data,
            'recent_entries': AccessLogSerializer(recent_entries, many=True).data,
        }

        return Response(data)
