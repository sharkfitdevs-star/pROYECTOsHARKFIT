from django.contrib import admin
from apps.ventas.models import Venta


@admin.register(Venta)
class VentaAdmin(admin.ModelAdmin):
    list_display = ('numero_venta', 'cliente', 'tipo', 'estado', 'monto_neto', 'fecha_venta', 'vendedor')
    list_filter = ('estado', 'tipo', 'fecha_venta', 'vendedor')
    search_fields = ('numero_venta', 'cliente__nombre', 'descripcion')
    fieldsets = (
        ('Información Básica', {
            'fields': ('numero_venta', 'cliente', 'tipo', 'estado')
        }),
        ('Montos', {
            'fields': ('monto_total', 'monto_descuento', 'monto_neto', 'moneda')
        }),
        ('Pago', {
            'fields': ('forma_pago', 'cuotas', 'fecha_vencimiento_pago')
        }),
        ('Detalles', {
            'fields': ('vendedor', 'descripcion', 'notas_internas')
        }),
        ('Fechas', {
            'fields': ('fecha_venta', 'fecha_entrega', 'fecha_facturacion')
        }),
    )
    readonly_fields = ('created_at', 'updated_at', 'monto_neto')
