from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.core.urls")),
    path("api/usuarios/", include("apps.usuarios.urls")),
    path("api/clientes/", include("apps.clientes.urls")),
    path("api/ventas/", include("apps.ventas.urls")),
    path("api/agendamientos/", include("apps.agendamientos.urls")),
    path("api/alertas/", include("apps.alertas.urls")),
    path("api/reportes/", include("apps.reportes.urls")),
    path("api/webhooks/", include("apps.webhooks.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
