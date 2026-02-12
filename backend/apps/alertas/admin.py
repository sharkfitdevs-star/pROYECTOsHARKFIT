from django.contrib import admin
from apps.alertas.models import Alerta


@admin.register(Alerta)
class AlertaAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'tipo', 'prioridad', 'estado', 'cliente', 'asignado_a', 'created_at')
    list_filter = ('estado', 'tipo', 'prioridad', 'created_at')
    search_fields = ('titulo', 'descripcion', 'cliente__nombre')
    fieldsets = (
        ('Información Básica', {
            'fields': ('tipo', 'prioridad', 'estado', 'cliente', 'titulo', 'descripcion')
        }),
        ('Asignación', {
            'fields': ('asignado_a',)
        }),
        ('Notificación', {
            'fields': ('notificado', 'enviado_a_canales')
        }),
        ('Seguimiento', {
            'fields': ('notas', 'fecha_resolucion', 'resuelto_por', 'fecha_vencimiento')
        }),
        ('Datos Adicionales', {
            'fields': ('datos_adicionales',)
        }),
    )
    readonly_fields = ('created_at', 'updated_at')
