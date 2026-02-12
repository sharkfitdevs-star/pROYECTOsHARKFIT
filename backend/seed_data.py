"""
Script para generar datos de prueba/ejemplo en el Django admin
Uso: python manage.py shell < seed_data.py
"""

from django.contrib.auth.models import User
from apps.clientes.models import Cliente
from apps.ventas.models import Venta
from apps.agendamientos.models import Agendamiento
from apps.alertas.models import Alerta
from apps.usuarios.models import PerfilUsuario
from datetime import datetime, timedelta
from django.utils import timezone
import random

# Crear usuario administrador
try:
    admin = User.objects.get(username='admin')
    print("✓ Admin usuario ya existe")
except User.DoesNotExist:
    admin = User.objects.create_superuser(
        username='admin',
        email='admin@vendify.com',
        password='admin123'
    )
    PerfilUsuario.objects.create(
        user=admin,
        rol='admin',
        telefono='+54 11 2123-4567'
    )
    print("✓ Admin usuario creado")

# Crear usuarios de ejemplo
usuarios = []
nombres = [
    ('Juan', 'Pérez'),
    ('María', 'García'),
    ('Carlos', 'López'),
    ('Ana', 'Martínez'),
    ('Roberto', 'Rodríguez'),
]

for nombre, apellido in nombres:
    try:
        user = User.objects.get(username=f"{nombre.lower()}{apellido.lower()}")
        usuarios.append(user)
    except User.DoesNotExist:
        user = User.objects.create_user(
            username=f"{nombre.lower()}{apellido.lower()}",
            email=f"{nombre.lower()}@vendify.com",
            password=f"{nombre}123",
            first_name=nombre,
            last_name=apellido
        )
        PerfilUsuario.objects.create(
            user=user,
            rol=random.choice(['vendedor', 'operador', 'analista']),
            telefono=f"+54 11 {random.randint(1000, 9999)}-{random.randint(1000, 9999)}",
            estado='activo'
        )
        usuarios.append(user)
        print(f"✓ Usuario {nombre} {apellido} creado")

# Crear clientes de ejemplo
empresas = [
    'Tech Solutions SA',
    'Marketing Digital Ltd',
    'Consultoría Empresarial',
    'E-commerce Plus',
    'Sistemas Inteligentes',
    'Agencia Creative',
    'Financial Services Co',
    'Logística Global',
]

clientes = []
for i, empresa in enumerate(empresas):
    try:
        cliente = Cliente.objects.get(empresa=empresa)
        clientes.append(cliente)
    except Cliente.DoesNotExist:
        cliente = Cliente.objects.create(
            nombre=f"Cliente {i+1}",
            email=f"contacto{i+1}@empresa.com",
            telefono=f"+54 11 {random.randint(10000000, 99999999)}",
            rut=f"{random.randint(10, 99)}.{random.randint(100, 999)}.{random.randint(100, 999)}-K",
            empresa=empresa,
            estado=random.choice(['prospecto', 'activo', 'suspendido']),
            ciudad=random.choice(['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza']),
            provincia=random.choice(['Buenos Aires', 'Córdoba', 'Santa Fe', 'Mendoza']),
            fuente=random.choice(['web', 'referencia', 'agencia', 'feria']),
            presupuesto_estimado=random.uniform(5000, 50000),
            asignado_a=random.choice(usuarios[1:]) if len(usuarios) > 1 else None
        )
        clientes.append(cliente)
        print(f"✓ Cliente {empresa} creado")

# Crear ventas de ejemplo
for i in range(20):
    try:
        venta = Venta.objects.get(numero_venta=f"VTA-{2024}-{i+1:03d}")
    except Venta.DoesNotExist:
        cliente = random.choice(clientes)
        monto_total = random.uniform(1000, 50000)
        monto_descuento = random.uniform(0, monto_total * 0.2)
        
        venta = Venta.objects.create(
            numero_venta=f"VTA-{2024}-{i+1:03d}",
            cliente=cliente,
            tipo=random.choice(['nueva_afiliacion', 'renovacion', 'upgrade']),
            estado=random.choice(['nueva', 'en_proceso', 'completada']),
            monto_total=monto_total,
            monto_descuento=monto_descuento,
            monto_neto=monto_total - monto_descuento,
            moneda='ARS',
            forma_pago=random.choice(['transferencia', 'tarjeta_credito', 'cheque']),
            cuotas=random.choice([1, 3, 6, 12]),
            vendedor=random.choice(usuarios[1:]) if len(usuarios) > 1 else None,
            fecha_venta=timezone.now() - timedelta(days=random.randint(0, 90))
        )
        if venta.estado == 'completada':
            venta.fecha_entrega = venta.fecha_venta + timedelta(days=random.randint(1, 30))
        venta.save()

print(f"✓ 20 ventas creadas")

# Crear agendamientos de ejemplo
for i in range(15):
    try:
        agendamiento = Agendamiento.objects.get(titulo=f"Cita {i+1}")
    except Agendamiento.DoesNotExist:
        cliente = random.choice(clientes)
        fecha_inicio = timezone.now() + timedelta(days=random.randint(-7, 30), hours=random.randint(9, 17))
        
        agendamiento = Agendamiento.objects.create(
            cliente=cliente,
            tipo=random.choice(['reunion', 'llamada', 'visita', 'demostracion']),
            estado=random.choice(['pendiente', 'confirmada', 'completada']),
            titulo=f"Cita {i+1} - {cliente.nombre}",
            descripcion=f"Reunión de seguimiento con {cliente.nombre}",
            fecha_hora_inicio=fecha_inicio,
            fecha_hora_fin=fecha_inicio + timedelta(minutes=60),
            duracion_minutos=60,
            ubicacion=random.choice(['Oficina Centro', 'Virtual', 'Cliente']),
            es_virtual=random.choice([True, False]),
            responsable=random.choice(usuarios[1:]) if len(usuarios) > 1 else None,
        )

print(f"✓ 15 agendamientos creados")

# Crear alertas de ejemplo
tipos_alerta = [
    'cliente_nuevo', 'venta_completada', 'cita_proxima', 'deuda_alta', 'inactividad'
]

for i, tipo in enumerate(tipos_alerta):
    for j in range(3):
        try:
            alerta = Alerta.objects.get(titulo=f"Alerta {tipo}-{j+1}")
        except Alerta.DoesNotExist:
            alerta = Alerta.objects.create(
                tipo=tipo,
                prioridad=random.choice(['baja', 'media', 'alta', 'critica']),
                estado=random.choice(['pendiente', 'en_proceso', 'resuelta']),
                cliente=random.choice(clientes) if random.random() > 0.2 else None,
                titulo=f"Alerta {tipo}-{j+1}",
                descripcion=f"Descripción automática para {tipo}",
                asignado_a=random.choice(usuarios[1:]) if len(usuarios) > 1 else None,
                notificado=random.choice([True, False])
            )

print(f"✓ Alertas creadas")

print("\n✅ DATOS DE PRUEBA GENERADOS EXITOSAMENTE")
print(f"\nUsuarios creados: {len(usuarios) + 1}")
print(f"Clientes creados: {len(clientes)}")
print(f"Ventas creadas: 20")
print(f"Agendamientos creados: 15")
print(f"Alertas creadas: 15")

print("\n📝 CREDENCIALES PARA LOGIN:")
print("Username: admin")
print("Password: admin123")
print("\nOtros usuarios disponibles:")
for user in usuarios:
    print(f"  {user.username} / {user.first_name}")
