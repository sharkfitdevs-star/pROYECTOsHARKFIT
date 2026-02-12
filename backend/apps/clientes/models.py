from django.db import models
from django.contrib.auth.models import User


class Cliente(models.Model):
    """Modelo para gestionar clientes"""
    
    ESTADO_CHOICES = [
        ('prospecto', 'Prospecto'),
        ('activo', 'Activo'),
        ('suspendido', 'Suspendido'),
        ('baja', 'Baja'),
    ]
    
    # Campos básicos
    nombre = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    telefono = models.CharField(max_length=20)
    rut = models.CharField(max_length=20, unique=True, null=True, blank=True)
    empresa = models.CharField(max_length=200, blank=True)
    
    # Estado
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='prospecto'
    )
    
    # Dirección
    direccion = models.CharField(max_length=300, blank=True)
    ciudad = models.CharField(max_length=100, blank=True)
    provincia = models.CharField(max_length=100, blank=True)
    codigo_postal = models.CharField(max_length=10, blank=True)
    
    # Contacto
    contacto_nombre = models.CharField(max_length=200, blank=True)
    contacto_email = models.EmailField(blank=True)
    contacto_telefono = models.CharField(max_length=20, blank=True)
    
    # Información comercial
    fuente = models.CharField(
        max_length=100,
        blank=True,
        help_text="Cómo conocimos al cliente (web, referencia, agencia, etc)"
    )
    presupuesto_estimado = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    frecuencia_pago = models.CharField(
        max_length=50,
        blank=True,
        choices=[
            ('mensual', 'Mensual'),
            ('trimestral', 'Trimestral'),
            ('semestral', 'Semestral'),
            ('anual', 'Anual'),
        ]
    )
    
    # Notas y tracking
    notas = models.TextField(blank=True)
    asignado_a = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='clientes'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    fecha_primera_venta = models.DateField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['estado']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return f"{self.nombre} ({self.estado})"
    
    @property
    def es_activo(self):
        return self.estado == 'activo'
    
    @property
    def es_prospecto(self):
        return self.estado == 'prospecto'
