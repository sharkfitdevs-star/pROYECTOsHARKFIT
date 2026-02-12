from rest_framework import serializers
from apps.agendamientos.models import Agendamiento
from apps.clientes.models import Cliente


class AgendamientoSerializer(serializers.ModelSerializer):
    """Serializer para Agendamiento"""
    
    cliente_nombre = serializers.CharField(
        source='cliente.nombre',
        read_only=True
    )
    responsable_nombre = serializers.CharField(
        source='responsable.get_full_name',
        read_only=True
    )
    tiempo_restante_minutos = serializers.SerializerMethodField()
    pasada = serializers.SerializerMethodField()
    
    class Meta:
        model = Agendamiento
        fields = [
            'id', 'cliente', 'cliente_nombre', 'tipo', 'estado',
            'titulo', 'descripcion', 'fecha_hora_inicio', 'fecha_hora_fin',
            'duracion_minutos', 'ubicacion', 'es_virtual', 'enlace_reunion',
            'responsable', 'responsable_nombre', 'participantes_email',
            'recordatorio_minutos_antes', 'recordatorio_enviado',
            'notas', 'resultado', 'created_at', 'updated_at',
            'fue_completada', 'esta_proxima', 'tiempo_restante_minutos', 'pasada'
        ]
        read_only_fields = ['created_at', 'updated_at', 'fue_completada', 'esta_proxima']
    
    def get_tiempo_restante_minutos(self, obj):
        """Calcular minutos faltantes para la cita"""
        from django.utils import timezone
        from datetime import timedelta
        now = timezone.now()
        if obj.fecha_hora_inicio > now:
            delta = obj.fecha_hora_inicio - now
            return delta.total_seconds() / 60
        return None
    
    def get_pasada(self, obj):
        """Verificar si la cita ya pasó"""
        from django.utils import timezone
        now = timezone.now()
        return obj.fecha_hora_fin < now
    
    def validate(self, data):
        """Validar que fecha fin sea posterior a fecha inicio"""
        if data.get('fecha_hora_fin') and data.get('fecha_hora_inicio'):
            if data['fecha_hora_fin'] <= data['fecha_hora_inicio']:
                raise serializers.ValidationError(
                    "La fecha/hora de fin debe ser posterior a la de inicio."
                )
        return data


class AgendamientoListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listados"""
    
    cliente_nombre = serializers.CharField(source='cliente.nombre', read_only=True)
    responsable_nombre = serializers.CharField(source='responsable.get_full_name', read_only=True)
    
    class Meta:
        model = Agendamiento
        fields = [
            'id', 'cliente', 'cliente_nombre', 'titulo', 'tipo',
            'estado', 'fecha_hora_inicio', 'responsable_nombre'
        ]


class AgendamientoCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear agendamientos"""
    
    class Meta:
        model = Agendamiento
        fields = [
            'cliente', 'tipo', 'titulo', 'descripcion',
            'fecha_hora_inicio', 'fecha_hora_fin', 'ubicacion',
            'es_virtual', 'enlace_reunion', 'participantes_email'
        ]
        extra_kwargs = {
            'cliente': {'required': True},
            'titulo': {'required': True},
            'fecha_hora_inicio': {'required': True},
            'fecha_hora_fin': {'required': True},
        }
