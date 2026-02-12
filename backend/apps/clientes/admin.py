from django.contrib import admin
from apps.clientes.models import Cliente


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'email', 'telefono', 'estado', 'empresa', 'created_at')
    list_filter = ('estado', 'created_at', 'fuente')
    search_fields = ('nombre', 'email', 'telefono', 'rut')
    fieldsets = (
        ('Información Básica', {
            'fields': ('nombre', 'email', 'telefono', 'rut', 'empresa')
        }),
        ('Dirección', {
            'fields': ('direccion', 'ciudad', 'provincia', 'codigo_postal')
        }),
        ('Contacto Secundario', {
            'fields': ('contacto_nombre', 'contacto_email', 'contacto_telefono')
        }),
        ('Información Comercial', {
            'fields': ('estado', 'fuente', 'presupuesto_estimado', 'frecuencia_pago', 'asignado_a')
        }),
        ('Notas', {
            'fields': ('notas',)
        }),
    )
    readonly_fields = ('created_at', 'updated_at')
