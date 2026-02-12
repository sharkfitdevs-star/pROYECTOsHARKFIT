from django.db import models
from django.contrib.auth.models import User
from apps.clientes.models import Cliente


class Agendamiento(models.Model):
    """Modelo para gestionar citas/agendamientos"""
    
    TIPO_CHOICES = [
        ('reunion', 'Reunión'),
        ('llamada', 'Llamada'),
        ('visita', 'Visita'),
        ('demostracion', 'Demostración'),
        ('seguimiento', 'Seguimiento'),
        ('otro', 'Otro'),
    ]
    
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('confirmada', 'Confirmada'),
        ('completada', 'Completada'),
        ('cancelada', 'Cancelada'),
        ('reprogramada', 'Reprogramada'),
    ]
    
    # Información básica
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name='agendamientos'
    )
    tipo = models.CharField(
        max_length=20,
        choices=TIPO_CHOICES,
        default='reunion'
    )
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='pendiente'
    )
    
    # Detalles
    titulo = models.CharField(max_length=300)
    descripcion = models.TextField(blank=True)
    
    # Fecha y hora
    fecha_hora_inicio = models.DateTimeField()
    fecha_hora_fin = models.DateTimeField()
    duracion_minutos = models.IntegerField(default=30)
    
    # Ubicación
    ubicacion = models.CharField(max_length=300, blank=True)
    es_virtual = models.BooleanField(default=False)
    enlace_reunion = models.URLField(blank=True, help_text="Enlace a zoom, meet, etc")
    
    # Personal interno
    responsable = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='agendamientos'
    )
    participantes_email = models.TextField(
        blank=True,
        help_text="Correos de participantes separados por coma"
    )
    
    # Recordatorios
    recordatorio_minutos_antes = models.IntegerField(
        default=15,
        choices=[
            (5, '5 minutos'),
            (15, '15 minutos'),
            (30, '30 minutos'),
            (60, '1 hora'),
            (1440, '1 día'),
        ]
    )
    recordatorio_enviado = models.BooleanField(default=False)
    
    # Notas y seguimiento
    notas = models.TextField(blank=True)
    resultado = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['fecha_hora_inicio']
        verbose_name = 'Agendamiento'
        verbose_name_plural = 'Agendamientos'
        indexes = [
            models.Index(fields=['cliente']),
            models.Index(fields=['estado']),
            models.Index(fields=['fecha_hora_inicio']),
        ]
    
    def __str__(self):
        return f"{self.titulo} - {self.cliente.nombre} ({self.fecha_hora_inicio.strftime('%d/%m/%Y %H:%M')})"
    
    @property
    def fue_completada(self):
        return self.estado == 'completada'
    
    @property
    def esta_proxima(self):
        from datetime import timedelta
        from django.utils import timezone
        now = timezone.now()
        cinco_minutos = now + timedelta(minutes=5)
        return now <= self.fecha_hora_inicio <= cinco_minutos
