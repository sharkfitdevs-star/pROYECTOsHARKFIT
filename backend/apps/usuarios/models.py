from django.db import models
from django.contrib.auth.models import User


class PerfilUsuario(models.Model):
    """Extensión del modelo User de Django"""
    
    ROL_CHOICES = [
        ('admin', 'Administrador'),
        ('gerente', 'Gerente'),
        ('vendedor', 'Vendedor'),
        ('operador', 'Operador'),
        ('analista', 'Analista'),
        ('viewer', 'Solo lectura'),
    ]
    
    ESTADO_CHOICES = [
        ('activo', 'Activo'),
        ('inactivo', 'Inactivo'),
        ('suspendido', 'Suspendido'),
    ]
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='perfil'
    )
    
    # Información personal
    telefono = models.CharField(max_length=20, blank=True)
    documento = models.CharField(max_length=20, blank=True, unique=True)
    fecha_nacimiento = models.DateField(null=True, blank=True)
    
    # Información profesional
    rol = models.CharField(
        max_length=20,
        choices=ROL_CHOICES,
        default='vendedor'
    )
    departamento = models.CharField(max_length=100, blank=True)
    puesto = models.CharField(max_length=100, blank=True)
    
    # Estado
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='activo'
    )
    
    # Permisos customizados
    puede_ver_todas_ventas = models.BooleanField(default=False)
    puede_ver_reportes = models.BooleanField(default=False)
    puede_crear_usuarios = models.BooleanField(default=False)
    puede_modificar_configuracion = models.BooleanField(default=False)
    
    # Foto de perfil (ImageField requiere Pillow - comentado temporalmente)
    # foto = models.ImageField(
    #     upload_to='usuarios/fotos/',
    #     null=True,
    #     blank=True
    # )
    foto = models.FileField(
        upload_to='usuarios/fotos/',
        null=True,
        blank=True
    )
    
    # Preferencias
    notificaciones_email = models.BooleanField(default=True)
    notificaciones_whatsapp = models.BooleanField(default=False)
    recibir_resumenes_diarios = models.BooleanField(default=True)
    hora_resumen_diario = models.TimeField(default='08:00')
    
    # Actividad
    ultimo_acceso = models.DateTimeField(null=True, blank=True)
    fecha_inicio_contrato = models.DateField(null=True, blank=True)
    fecha_fin_contrato = models.DateField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['user__first_name']
        verbose_name = 'Perfil Usuario'
        verbose_name_plural = 'Perfiles Usuarios'
    
    def __str__(self):
        return f"{self.user.get_full_name()} ({self.get_rol_display()})"
    
    @property
    def es_admin(self):
        return self.rol == 'admin'
    
    @property
    def es_gerente(self):
        return self.rol == 'gerente'
    
    @property
    def es_vendedor(self):
        return self.rol == 'vendedor'
    
    @property
    def nombre_completo(self):
        return self.user.get_full_name() or self.user.username


# Señal para crear perfil cuando se crea un usuario
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender=User)
def crear_perfil_usuario(sender, instance, created, **kwargs):
    """Crear automáticamente un PerfilUsuario cuando se crea un User"""
    if created:
        PerfilUsuario.objects.get_or_create(user=instance)


@receiver(post_save, sender=User)
def guardar_perfil_usuario(sender, instance, **kwargs):
    """Guardar automáticamente el PerfilUsuario cuando se guarda el User"""
    if hasattr(instance, 'perfil'):
        instance.perfil.save()
