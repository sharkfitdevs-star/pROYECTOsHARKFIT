from rest_framework import serializers
from apps.alertas.models import Alerta
from apps.clientes.models import Cliente


class AlertaSerializer(serializers.ModelSerializer):
    """Serializer para Alerta"""
    
    cliente_nombre = serializers.CharField(
        source='cliente.nombre',
        read_only=True,
        allow_null=True
    )
    asignado_a_nombre = serializers.CharField(
        source='asignado_a.get_full_name',
        read_only=True,
        allow_null=True
    )
    resuelto_por_nombre = serializers.CharField(
        source='resuelto_por.get_full_name',
        read_only=True,
        allow_null=True
    )
    tiempo_desde_creacion_horas = serializers.SerializerMethodField()
    
    class Meta:
        model = Alerta
        fields = [
            'id', 'tipo', 'prioridad', 'estado', 'cliente', 'cliente_nombre',
            'titulo', 'descripcion', 'datos_adicionales', 'asignado_a',
            'asignado_a_nombre', 'notificado', 'enviado_a_canales',
            'notas', 'fecha_resolucion', 'resuelto_por', 'resuelto_por_nombre',
            'created_at', 'updated_at', 'fecha_vencimiento',
            'esta_pendiente', 'es_critica', 'tiempo_desde_creacion_horas'
        ]
        read_only_fields = ['created_at', 'updated_at', 'esta_pendiente', 'es_critica']
    
    def get_tiempo_desde_creacion_horas(self, obj):
        """Calcular horas desde que fue creada la alerta"""
        from django.utils import timezone
        delta = timezone.now() - obj.created_at
        return delta.total_seconds() / 3600


class AlertaListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listados"""
    
    cliente_nombre = serializers.CharField(source='cliente.nombre', read_only=True, allow_null=True)
    
    class Meta:
        model = Alerta
        fields = [
            'id', 'tipo', 'prioridad', 'estado', 'cliente', 'cliente_nombre',
            'titulo', 'asignado_a', 'created_at'
        ]


class AlertaCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear alertas"""
    
    class Meta:
        model = Alerta
        fields = [
            'tipo', 'prioridad', 'cliente', 'titulo', 'descripcion',
            'datos_adicionales', 'fecha_vencimiento'
        ]
        extra_kwargs = {
            'titulo': {'required': True},
            'descripcion': {'required': True},
        }


class AlertaPendienteSerializer(serializers.ModelSerializer):
    """Serializer para alertas pendientes (notificaciones)"""
    
    cliente_nombre = serializers.CharField(source='cliente.nombre', read_only=True, allow_null=True)
    
    class Meta:
        model = Alerta
        fields = [
            'id', 'tipo', 'prioridad', 'cliente', 'cliente_nombre',
            'titulo', 'created_at'
        ]
