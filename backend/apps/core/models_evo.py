"""
Modelos Django para datos sincronizados de EVO W12
Estos modelos mapean a las tablas existentes creadas por sync_evo
"""

from django.db import models


class Prospect(models.Model):
    """Prospectos/Leads del gimnasio - DATOS COMPLETOS DE EVO"""
    id = models.CharField(max_length=32, primary_key=True)
    tenant_id = models.CharField(max_length=100)
    evo_prospect_id = models.IntegerField()
    # Datos personales
    first_name = models.CharField(max_length=255, null=True, blank=True)
    last_name = models.CharField(max_length=255, null=True, blank=True)
    name = models.CharField(max_length=255, null=True, blank=True)  # full name
    email = models.CharField(max_length=255, null=True, blank=True)
    cellphone = models.CharField(max_length=50, null=True, blank=True)
    gender = models.CharField(max_length=10, null=True, blank=True)  # M/F
    birthdate = models.CharField(max_length=50, null=True, blank=True)
    # Datos de contacto
    address = models.CharField(max_length=255, null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=50, null=True, blank=True)
    zipcode = models.CharField(max_length=20, null=True, blank=True)
    # Información de negocio
    branch_id = models.IntegerField(null=True, blank=True)
    branch_name = models.CharField(max_length=255, null=True, blank=True)
    registration_date = models.CharField(max_length=50, null=True, blank=True)
    signup_type = models.CharField(max_length=50, null=True, blank=True)  # Personal, etc
    marketing_channel = models.CharField(max_length=100, null=True, blank=True)  # REFERIDO, etc
    current_step = models.CharField(max_length=100, null=True, blank=True)  # AGENDAR LLAMADA, etc
    temperature = models.CharField(max_length=50, null=True, blank=True)  # Morno, Caliente, etc
    conversion_date = models.CharField(max_length=50, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    # Metadata
    created_at = models.CharField(max_length=50, null=True, blank=True)
    updated_at = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        db_table = 'prospects'
        managed = True
        unique_together = [['tenant_id', 'evo_prospect_id']]
        ordering = ['-registration_date']

    def __str__(self):
        return f"{self.name or self.first_name} ({self.email})"


class Member(models.Model):
    """Miembros del gimnasio - DATOS COMPLETOS DE EVO"""
    id = models.CharField(max_length=32, primary_key=True)
    tenant_id = models.CharField(max_length=100)
    evo_member_id = models.IntegerField()
    # Datos personales
    first_name = models.CharField(max_length=255, null=True, blank=True)
    last_name = models.CharField(max_length=255, null=True, blank=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    document = models.CharField(max_length=50, null=True, blank=True)  # DNI/Pasaporte
    gender = models.CharField(max_length=10, null=True, blank=True)  # Male/Female
    birthdate = models.CharField(max_length=50, null=True, blank=True)
    marital_status = models.CharField(max_length=50, null=True, blank=True)
    # Contacto
    phone = models.CharField(max_length=50, null=True, blank=True)
    email = models.CharField(max_length=255, null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    state = models.CharField(max_length=50, null=True, blank=True)
    zipcode = models.CharField(max_length=20, null=True, blank=True)
    # Información gimnasio
    branch_id = models.IntegerField(null=True, blank=True)
    branch_name = models.CharField(max_length=255, null=True, blank=True)
    registration_date = models.CharField(max_length=50, null=True, blank=True)
    # Status
    status = models.CharField(max_length=50, null=True, blank=True)  # Active/Inactive
    membership_status = models.CharField(max_length=50, null=True, blank=True)  # Active/Inactive
    access_blocked = models.BooleanField(default=False)
    blocked_reason = models.CharField(max_length=255, null=True, blank=True)
    # Empleados asociados
    consultant_name = models.CharField(max_length=255, null=True, blank=True)
    instructor_name = models.CharField(max_length=255, null=True, blank=True)
    personal_trainer_name = models.CharField(max_length=255, null=True, blank=True)
    # Metadata
    last_access_date = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.CharField(max_length=50, null=True, blank=True)
    updated_at = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        db_table = 'members'
        managed = True
        unique_together = [['tenant_id', 'evo_member_id']]

    def __str__(self):
        return f"{self.name or self.first_name} ({self.status})"


class Sale(models.Model):
    """Ventas/Transacciones - DATOS COMPLETOS DE EVO"""
    id = models.CharField(max_length=32, primary_key=True)
    tenant_id = models.CharField(max_length=100)
    evo_sale_id = models.IntegerField()
    # Información del miembro
    member_id = models.CharField(max_length=32, null=True, blank=True)  # FK local
    member_name = models.CharField(max_length=255, null=True, blank=True)
    member_document = models.CharField(max_length=50, null=True, blank=True)
    member_phone = models.CharField(max_length=50, null=True, blank=True)
    member_email = models.CharField(max_length=255, null=True, blank=True)
    # Detalles de venta
    amount = models.FloatField(null=True, blank=True)
    sale_date = models.CharField(max_length=50, null=True, blank=True)
    status = models.CharField(max_length=50, null=True, blank=True)  # renewal, new, etc
    sale_source = models.CharField(max_length=100, null=True, blank=True)
    observations = models.TextField(null=True, blank=True)
    # Items de venta
    item_description = models.CharField(max_length=255, null=True, blank=True)
    item_quantity = models.IntegerField(null=True, blank=True)
    # Información gimnasio
    branch_id = models.IntegerField(null=True, blank=True)
    # Vendedor
    employee_name = models.CharField(max_length=255, null=True, blank=True)
    # Metadata
    created_at = models.CharField(max_length=50, null=True, blank=True)
    updated_at = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        db_table = 'sales'
        managed = True
        unique_together = [['tenant_id', 'evo_sale_id']]
        ordering = ['-sale_date']

    def __str__(self):
        return f"Sale #{self.evo_sale_id}: ${self.amount} - {self.member_name}"


class AccessLog(models.Model):
    """Registros de acceso al gimnasio - DATOS COMPLETOS DE EVO"""
    id = models.CharField(max_length=32, primary_key=True)
    tenant_id = models.CharField(max_length=100)
    evo_entry_id = models.IntegerField()
    # Miembro
    member_id = models.CharField(max_length=32, null=True, blank=True)  # FK local
    member_evo_id = models.IntegerField(null=True, blank=True)  # ID en EVO
    member_name = models.CharField(max_length=255, null=True, blank=True)
    # Ubicación y tiempo
    location = models.CharField(max_length=255, null=True, blank=True)  # Branch ID
    branch_name = models.CharField(max_length=255, null=True, blank=True)
    access_time = models.CharField(max_length=50, null=True, blank=True)
    # Detalles de acceso
    entry_type = models.CharField(max_length=100, null=True, blank=True)  # Controle de acesso
    device = models.CharField(max_length=100, null=True, blank=True)  # Digital, etc
    entry_action = models.CharField(max_length=50, null=True, blank=True)  # entry, exit
    # Bloqueos
    block_reason = models.CharField(max_length=255, null=True, blank=True)  # Acceso liberado
    # Metadata
    created_at = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        db_table = 'access_logs'
        managed = True
        unique_together = [['tenant_id', 'evo_entry_id']]
        ordering = ['-access_time']

    def __str__(self):
        return f"Access {self.member_name} → Branch {self.location} at {self.access_time}"


class SyncQueue(models.Model):
    """Log de sincronizaciones"""
    id = models.AutoField(primary_key=True)
    tenant_id = models.CharField(max_length=100)
    job_type = models.CharField(max_length=50)
    status = models.CharField(max_length=50)
    error_message = models.TextField(null=True, blank=True)
    created_at = models.CharField(max_length=50, null=True, blank=True)
    processed_at = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        db_table = 'sync_queue'
        managed = True
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.job_type} - {self.status}"
