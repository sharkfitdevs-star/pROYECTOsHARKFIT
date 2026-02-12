from django.db import models
from django.contrib.auth.models import User
from apps.clientes.models import Cliente


class Venta(models.Model):
    """Modelo para gestionar ventas"""
    
    ESTADO_CHOICES = [
        ('nueva', 'Nueva'),
        ('en_proceso', 'En proceso'),
        ('completada', 'Completada'),
        ('cancelada', 'Cancelada'),
        ('devuelta', 'Devuelta'),
    ]
    
    TIPO_CHOICES = [
        ('nueva_afiliacion', 'Nueva afiliación'),
        ('renovacion', 'Renovación'),
        ('upgrade', 'Upgrade'),
        ('downgrade', 'Downgrade'),
        ('reactivacion', 'Reactivación'),
    ]
    
    # Información básica
    numero_venta = models.CharField(
        max_length=50,
        unique=True,
        help_text="Número único de la venta (ej: VTA-2024-001)"
    )
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name='ventas'
    )
    tipo = models.CharField(
        max_length=20,
        choices=TIPO_CHOICES,
        default='nueva_afiliacion'
    )
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='nueva'
    )
    
    # Detalles económicos
    monto_total = models.DecimalField(max_digits=10, decimal_places=2)
    monto_descuento = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )
    monto_neto = models.DecimalField(max_digits=10, decimal_places=2)
    moneda = models.CharField(
        max_length=3,
        default='ARS',
        choices=[
            ('ARS', 'Pesos Argentinos'),
            ('USD', 'Dólares USA'),
            ('EUR', 'Euros'),
        ]
    )
    
    # Condiciones de pago
    forma_pago = models.CharField(
        max_length=50,
        blank=True,
        choices=[
            ('efectivo', 'Efectivo'),
            ('transferencia', 'Transferencia Bancaria'),
            ('tarjeta_credito', 'Tarjeta de Crédito'),
            ('cheque', 'Cheque'),
            ('mp', 'Mercado Pago'),
        ]
    )
    cuotas = models.IntegerField(default=1)
    fecha_vencimiento_pago = models.DateField(null=True, blank=True)
    
    # Personal
    vendedor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ventas_creadas'
    )
    
    # Descripción
    descripcion = models.TextField(blank=True)
    notas_internas = models.TextField(blank=True)
    
    # Timestamps
    fecha_venta = models.DateField(auto_now_add=True)
    fecha_entrega = models.DateField(null=True, blank=True)
    fecha_facturacion = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-fecha_venta']
        verbose_name = 'Venta'
        verbose_name_plural = 'Ventas'
        indexes = [
            models.Index(fields=['cliente']),
            models.Index(fields=['estado']),
            models.Index(fields=['-fecha_venta']),
        ]
    
    def __str__(self):
        return f"{self.numero_venta} - {self.cliente.nombre}"
    
    def save(self, *args, **kwargs):
        # Calcular monto neto
        if not self.monto_neto:
            self.monto_neto = self.monto_total - self.monto_descuento
        super().save(*args, **kwargs)
    
    @property
    def es_completada(self):
        return self.estado == 'completada'
    
    @property
    def porcentaje_descuento(self):
        if self.monto_total == 0:
            return 0
        return (self.monto_descuento / self.monto_total) * 100
