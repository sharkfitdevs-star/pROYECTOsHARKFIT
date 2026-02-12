from django.db import models
from django.contrib.auth.models import User
from apps.clientes.models import Cliente


class Alerta(models.Model):
    """Modelo para gestionar alertas del sistema"""
    
    TIPO_CHOICES = [
        ('cliente_nuevo', 'Cliente nuevo'),
        ('venta_completada', 'Venta completada'),
        ('cita_proxima', 'Cita próxima'),
        ('deuda_alta', 'Deuda alta'),
        ('cumpleanos', 'Cumpleaños'),
        ('vencimiento_contrato', 'Vencimiento contrato'),
        ('falta_pago', 'Falta de pago'),
        ('inactividad', 'Inactividad del cliente'),
        ('otra', 'Otra'),
    ]
    
    PRIORIDAD_CHOICES = [
        ('baja', 'Baja'),
        ('media', 'Media'),
        ('alta', 'Alta'),
        ('critica', 'Crítica'),
    ]
    
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('en_proceso', 'En proceso'),
        ('resuelta', 'Resuelta'),
        ('ignorada', 'Ignorada'),
    ]
    
    # Información básica
    tipo = models.CharField(
        max_length=30,
        choices=TIPO_CHOICES,
        default='otra'
    )
    prioridad = models.CharField(
        max_length=10,
        choices=PRIORIDAD_CHOICES,
        default='media'
    )
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='pendiente'
    )
    
    # Relaciones
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name='alertas',
        null=True,
        blank=True
    )
    
    # Detalles
    titulo = models.CharField(max_length=300)
    descripcion = models.TextField()
    
    # Información técnica
    datos_adicionales = models.JSONField(
        default=dict,
        blank=True,
        help_text="Datos extras en JSON (monto, fecha, etc)"
    )
    
    # Asignación
    asignado_a = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alertas'
    )
    
    # Notificación
    notificado = models.BooleanField(default=False)
    enviado_a_canales = models.CharField(
        max_length=200,
        blank=True,
        help_text="Canales notificados: email, whatsapp, slack, etc"
    )
    
    # Seguimiento
    notas = models.TextField(blank=True)
    fecha_resolucion = models.DateTimeField(null=True, blank=True)
    resuelto_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alertas_resueltas'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    fecha_vencimiento = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Alerta'
        verbose_name_plural = 'Alertas'
        indexes = [
            models.Index(fields=['cliente']),
            models.Index(fields=['estado']),
            models.Index(fields=['prioridad']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        cliente_str = f" - {self.cliente.nombre}" if self.cliente else ""
        return f"[{self.get_prioridad_display()}] {self.titulo}{cliente_str}"
    
    @property
    def esta_pendiente(self):
        return self.estado == 'pendiente'
    
    @property
    def es_critica(self):
        return self.prioridad == 'critica'
