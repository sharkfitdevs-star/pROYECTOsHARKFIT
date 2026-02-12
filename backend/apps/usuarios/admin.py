from django.contrib import admin
from django.contrib.auth.models import User
from apps.usuarios.models import PerfilUsuario


@admin.register(PerfilUsuario)
class PerfilUsuarioAdmin(admin.ModelAdmin):
    list_display = ('nombre_completo', 'rol', 'estado', 'get_email', 'telefono', 'ultimo_acceso')
    list_filter = ('rol', 'estado', 'ultimo_acceso')
    search_fields = ('user__username', 'user__email', 'user__first_name', 'user__last_name')
    
    def get_email(self, obj):
        return obj.user.email
    get_email.short_description = 'Email'
    get_email.admin_order_field = 'user__email'
    fieldsets = (
        ('Usuario', {
            'fields': ('user',)
        }),
        ('Información Personal', {
            'fields': ('telefono', 'documento', 'fecha_nacimiento', 'foto')
        }),
        ('Información Profesional', {
            'fields': ('rol', 'departamento', 'puesto', 'estado')
        }),
        ('Permisos', {
            'fields': (
                'puede_ver_todas_ventas',
                'puede_ver_reportes',
                'puede_crear_usuarios',
                'puede_modificar_configuracion'
            )
        }),
        ('Preferencias', {
            'fields': (
                'notificaciones_email',
                'notificaciones_whatsapp',
                'recibir_resumenes_diarios',
                'hora_resumen_diario'
            )
        }),
        ('Contrato', {
            'fields': ('fecha_inicio_contrato', 'fecha_fin_contrato')
        }),
    )
    readonly_fields = ('created_at', 'updated_at', 'ultimo_acceso')
