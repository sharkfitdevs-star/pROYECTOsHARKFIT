"""
Serializadores para la API de datos EVO W12
"""

from rest_framework import serializers
from apps.core.models_evo import Prospect, Member, Sale, AccessLog, SyncQueue


class ProspectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prospect
        fields = ['id', 'tenant_id', 'evo_prospect_id', 'name', 'email', 
                  'registration_date', 'created_at', 'updated_at']


class MemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Member
        fields = ['id', 'tenant_id', 'evo_member_id', 'name', 
                  'created_at', 'updated_at']


class SaleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sale
        fields = ['id', 'tenant_id', 'evo_sale_id', 'member_id', 
                  'amount', 'sale_date', 'status', 'created_at', 'updated_at']


class AccessLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessLog
        fields = ['id', 'tenant_id', 'evo_entry_id', 'member_id', 
                  'access_time', 'location', 'created_at']


class SyncQueueSerializer(serializers.ModelSerializer):
    class Meta:
        model = SyncQueue
        fields = ['id', 'tenant_id', 'job_type', 'status', 
                  'error_message', 'created_at', 'processed_at']


class DashboardStatsSerializer(serializers.Serializer):
    """Estadísticas agregadas para el dashboard"""
    total_prospects = serializers.IntegerField()
    total_sales = serializers.IntegerField()
    total_entries = serializers.IntegerField()
    total_revenue = serializers.FloatField()
    avg_sale_amount = serializers.FloatField()
    last_sync = serializers.CharField()
    recent_prospects = ProspectSerializer(many=True)
    recent_sales = SaleSerializer(many=True)
    recent_entries = AccessLogSerializer(many=True)
