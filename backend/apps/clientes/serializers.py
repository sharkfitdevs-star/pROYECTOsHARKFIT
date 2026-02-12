from rest_framework import serializers
from django.contrib.auth.models import User
from apps.clientes.models import Cliente


class ClienteSerializer(serializers.ModelSerializer):
    """Serializer para Cliente"""
    
    asignado_a_nombre = serializers.CharField(
        source='asignado_a.get_full_name',
        read_only=True
    )
    cantidad_ventas = serializers.SerializerMethodField()
    cantidad_alertas = serializers.SerializerMethodField()
    
    class Meta:
        model = Cliente
        fields = [
            'id', 'nombre', 'email', 'telefono', 'rut', 'empresa',
            'estado', 'direccion', 'ciudad', 'provincia', 'codigo_postal',
            'contacto_nombre', 'contacto_email', 'contacto_telefono',
            'fuente', 'presupuesto_estimado', 'frecuencia_pago',
            'notas', 'asignado_a', 'asignado_a_nombre',
            'created_at', 'updated_at', 'fecha_primera_venta',
            'cantidad_ventas', 'cantidad_alertas',
            'es_activo', 'es_prospecto'
        ]
        read_only_fields = ['created_at', 'updated_at', 'cantidad_ventas', 'cantidad_alertas']
    
    def get_cantidad_ventas(self, obj):
        return obj.ventas.count()
    
    def get_cantidad_alertas(self, obj):
        return obj.alertas.filter(estado='pendiente').count()
    
    def validate_email(self, value):
        """Validar que el email sea único"""
        instance = self.instance
        if Cliente.objects.filter(email=value).exclude(pk=instance.pk if instance else None).exists():
            raise serializers.ValidationError("Este email ya está registrado.")
        return value
    
    def validate_rut(self, value):
        """Validar formato de RUT argentino"""
        if value:
            import re
            if not re.match(r'^[0-9]{1,2}\.?[0-9]{3}\.?[0-9]{3}[\-|kK]$', value):
                raise serializers.ValidationError("Formato de RUT inválido.")
        return value


class ClienteListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listados"""
    
    class Meta:
        model = Cliente
        fields = ['id', 'nombre', 'email', 'telefono', 'estado', 'empresa', 'created_at']


class ClienteCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear clientes"""
    
    class Meta:
        model = Cliente
        fields = ['nombre', 'email', 'telefono', 'rut', 'empresa', 'estado', 'fuente']
        extra_kwargs = {
            'nombre': {'required': True},
            'email': {'required': True},
        }
