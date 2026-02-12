from rest_framework import serializers
from apps.ventas.models import Venta
from apps.clientes.models import Cliente
from apps.clientes.serializers import ClienteListSerializer


class VentaSerializer(serializers.ModelSerializer):
    """Serializer para Venta"""
    
    cliente_nombre = serializers.CharField(
        source='cliente.nombre',
        read_only=True
    )
    cliente_email = serializers.CharField(
        source='cliente.email',
        read_only=True
    )
    vendedor_nombre = serializers.CharField(
        source='vendedor.get_full_name',
        read_only=True
    )
    dias_pendiente = serializers.SerializerMethodField()
    
    class Meta:
        model = Venta
        fields = [
            'id', 'numero_venta', 'cliente', 'cliente_nombre', 'cliente_email',
            'tipo', 'estado', 'monto_total', 'monto_descuento', 'monto_neto',
            'moneda', 'forma_pago', 'cuotas', 'fecha_vencimiento_pago',
            'vendedor', 'vendedor_nombre', 'descripcion', 'notas_internas',
            'fecha_venta', 'fecha_entrega', 'fecha_facturacion',
            'created_at', 'updated_at', 'es_completada', 'porcentaje_descuento',
            'dias_pendiente'
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'numero_venta',
            'es_completada', 'porcentaje_descuento'
        ]
    
    def get_dias_pendiente(self, obj):
        """Calcular días pendientes hasta vencimiento"""
        if obj.fecha_vencimiento_pago:
            from datetime import date
            delta = obj.fecha_vencimiento_pago - date.today()
            return delta.days
        return None
    
    def validate_numero_venta(self, value):
        """Validar que número de venta sea único"""
        instance = self.instance
        if Venta.objects.filter(numero_venta=value).exclude(pk=instance.pk if instance else None).exists():
            raise serializers.ValidationError("Este número de venta ya existe.")
        return value
    
    def validate(self, data):
        """Validar consistencia de datos"""
        if data.get('monto_total', 0) <= 0:
            raise serializers.ValidationError("El monto total debe ser mayor a 0.")
        
        monto_descuento = data.get('monto_descuento', 0)
        monto_total = data.get('monto_total', 0)
        if monto_descuento > monto_total:
            raise serializers.ValidationError("El descuento no puede ser mayor al monto total.")
        
        return data


class VentaListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listados de ventas"""
    
    cliente_nombre = serializers.CharField(source='cliente.nombre', read_only=True)
    
    class Meta:
        model = Venta
        fields = [
            'id', 'numero_venta', 'cliente', 'cliente_nombre', 'tipo',
            'estado', 'monto_neto', 'moneda', 'fecha_venta'
        ]


class VentaCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear ventas"""
    
    class Meta:
        model = Venta
        fields = [
            'numero_venta', 'cliente', 'tipo', 'estado',
            'monto_total', 'monto_descuento', 'moneda',
            'forma_pago', 'cuotas', 'descripcion'
        ]
        extra_kwargs = {
            'numero_venta': {'required': True},
            'cliente': {'required': True},
            'monto_total': {'required': True},
        }
