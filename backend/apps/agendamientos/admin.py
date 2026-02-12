from django.contrib import admin
from apps.agendamientos.models import Agendamiento


@admin.register(Agendamiento)
class AgendamientoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'cliente', 'tipo', 'estado', 'fecha_hora_inicio', 'responsable')
    list_filter = ('estado', 'tipo', 'fecha_hora_inicio', 'responsable')
    search_fields = ('titulo', 'cliente__nombre', 'descripcion')
    fieldsets = (
        ('Información Básica', {
            'fields': ('cliente', 'tipo', 'estado', 'titulo', 'descripcion')
        }),
        ('Fechas y Horas', {
            'fields': ('fecha_hora_inicio', 'fecha_hora_fin', 'duracion_minutos')
        }),
        ('Ubicación', {
            'fields': ('ubicacion', 'es_virtual', 'enlace_reunion')
        }),
        ('Personal', {
            'fields': ('responsable', 'participantes_email')
        }),
        ('Recordatorio', {
            'fields': ('recordatorio_minutos_antes', 'recordatorio_enviado')
        }),
        ('Seguimiento', {
            'fields': ('notas', 'resultado')
        }),
    )
    readonly_fields = ('created_at', 'updated_at')
