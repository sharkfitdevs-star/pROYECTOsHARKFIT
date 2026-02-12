"""
Django Management Command para sincronización EVO W12
Equivalente al proxy Node.js pero usando Django directamente

Usage:
    python manage.py sync_evo --tenant=gym-001 --dns=tu-dns --token=tu-token
"""

import requests
import json
import uuid
import hashlib
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from django.utils import timezone
from datetime import datetime


class Command(BaseCommand):
    help = 'Sincroniza datos de EVO W12 API a la base de datos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--tenant',
            type=str,
            help='Tenant ID (ej: gym-vendify-001)',
            required=True
        )
        parser.add_argument(
            '--dns',
            type=str,
            help='DNS de EVO W12 (tu cuenta)',
            required=True
        )
        parser.add_argument(
            '--token',
            type=str,
            help='Token de API de Integración EVO',
            required=True
        )
        parser.add_argument(
            '--w12-token',
            type=str,
            help='Token de W12App API (para entries)',
            required=False,
            default=None
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Mostrar output detallado',
        )

    def handle(self, *args, **options):
        tenant_id = options['tenant']
        dns = options['dns']
        token = options['token']  # Integration API token
        w12_token = options.get('w12_token')  # W12App API token (optional)
        verbose = options.get('verbose', False)

        self.stdout.write('=' * 80)
        self.stdout.write(self.style.SUCCESS('  EVO INTEGRATION API - SINCRONIZACIÓN COMPLETA'))
        self.stdout.write('=' * 80)
        self.stdout.write(f'  Tenant: {tenant_id}')
        self.stdout.write(f'  DNS: {dns}')
        self.stdout.write(f'  Integration API: evo-integracao.w12app.com.br')
        if w12_token:
            self.stdout.write(f'  W12App API: {dns}.w12app.com.br (entries only)')
        self.stdout.write(f'  Fecha: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
        self.stdout.write('=' * 80)
        self.stdout.write('')

        # Crear tablas si no existen
        self._create_tables_if_not_exist()

        # Configurar cliente HTTP - API de Integración EVO
        # Documentación oficial: https://api.abcevo.com/
        # IMPORTANTE: Esta es la API completa, NO la limitada de W12App
        base_url = 'https://evo-integracao.w12app.com.br'
        session = requests.Session()
        session.auth = (dns, token)  # Basic Auth con DNS + Token
        session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })

        try:
            # 1. Sincronizar Members COMPLETOS desde Integration API
            self.stdout.write(self.style.WARNING('[INTEGRATION API] Sincronizando Members completos...'))
            members_count = self._sync_members_full(session, base_url, tenant_id, verbose)
            self.stdout.write(self.style.SUCCESS(f'[OK] Members con planes: {members_count} registros'))

            # 2. Sincronizar Prospects
            self.stdout.write(self.style.WARNING('[INTEGRATION API] Sincronizando Prospects...'))
            prospects_count = self._sync_prospects(session, base_url, tenant_id, verbose)
            self.stdout.write(self.style.SUCCESS(f'[OK] Prospects: {prospects_count} registros'))

            # 3. Sincronizar Sales
            self.stdout.write(self.style.WARNING('[INTEGRATION API] Sincronizando Sales...'))
            sales_count = self._sync_sales(session, base_url, tenant_id, verbose)
            self.stdout.write(self.style.SUCCESS(f'[OK] Sales: {sales_count} registros'))

            # 4. Sincronizar Entries desde W12App API (si hay token)
            entries_count = 0
            if w12_token:
                self.stdout.write(self.style.WARNING('[W12APP API] Sincronizando Access Logs...'))
                entries_count = self._sync_entries_w12(dns, w12_token, tenant_id, verbose)
                self.stdout.write(self.style.SUCCESS(f'[OK] Entries: {entries_count} registros'))
                
                # Extraer clientes activos adicionales desde entries
                self.stdout.write(self.style.WARNING('[W12APP API] Extrayendo visitantes adicionales...'))
                additional_members = self._extract_active_members(tenant_id, verbose)
                self.stdout.write(self.style.SUCCESS(f'[OK] Visitantes adicionales: {additional_members}'))
            else:
                self.stdout.write(self.style.WARNING('[SKIP] No se sincronizarán access logs (usar --w12-token)'))

            # Log de sincronización
            self._log_sync(tenant_id, 'FULL_SYNC', 'COMPLETED', None)

            self.stdout.write('')
            self.stdout.write('=' * 80)
            self.stdout.write(self.style.SUCCESS('[✅] SINCRONIZACIÓN COMPLETA FINALIZADA'))
            self.stdout.write(f'   Members (con planes): {members_count}')
            self.stdout.write(f'   Prospects: {prospects_count}')
            self.stdout.write(f'   Sales: {sales_count}')
            self.stdout.write(f'   Access Logs: {entries_count}')
            self.stdout.write('=' * 80)

        except requests.exceptions.HTTPError as e:
            error_msg = f'HTTP Error {e.response.status_code}: {e.response.text}'
            self.stdout.write(self.style.ERROR(f'[ERROR] Error: {error_msg}'))
            self._log_sync(tenant_id, 'FULL_SYNC', 'FAILED', error_msg)
            raise CommandError(error_msg)

        except Exception as e:
            error_msg = str(e)
            self.stdout.write(self.style.ERROR(f'[ERROR] Error: {error_msg}'))
            self._log_sync(tenant_id, 'FULL_SYNC', 'FAILED', error_msg)
            raise CommandError(error_msg)

    def _create_tables_if_not_exist(self):
        """Crea las tablas necesarias si no existen"""
        with connection.cursor() as cursor:
            # Tabla prospects
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS prospects (
                    id TEXT PRIMARY KEY,
                    tenant_id TEXT NOT NULL,
                    evo_prospect_id INTEGER NOT NULL,
                    name TEXT,
                    email TEXT,
                    registration_date TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now')),
                    UNIQUE(tenant_id, evo_prospect_id)
                )
            """)

            # Tabla members (stubs)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS members (
                    id TEXT PRIMARY KEY,
                    tenant_id TEXT NOT NULL,
                    evo_member_id INTEGER NOT NULL,
                    name TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now')),
                    UNIQUE(tenant_id, evo_member_id)
                )
            """)

            # Tabla sales
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sales (
                    id TEXT PRIMARY KEY,
                    tenant_id TEXT NOT NULL,
                    evo_sale_id INTEGER NOT NULL,
                    member_id TEXT,
                    amount REAL,
                    sale_date TEXT,
                    status TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now')),
                    UNIQUE(tenant_id, evo_sale_id)
                )
            """)

            # Tabla access_logs
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS access_logs (
                    id TEXT PRIMARY KEY,
                    tenant_id TEXT NOT NULL,
                    evo_entry_id INTEGER NOT NULL,
                    member_id TEXT,
                    access_time TEXT,
                    location TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    UNIQUE(tenant_id, evo_entry_id)
                )
            """)

            # Tabla sync_queue
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sync_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tenant_id TEXT NOT NULL,
                    job_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    error_message TEXT,
                    created_at TEXT DEFAULT (datetime('now')),
                    processed_at TEXT DEFAULT (datetime('now'))
                )
            """)

    def _sync_prospects(self, session, base_url, tenant_id, verbose):
        """Sincroniza prospects desde EVO - CAPTURA COMPLETA"""
        try:
            response = session.get(f'{base_url}/api/v1/prospects', timeout=15)
            response.raise_for_status()
            
            data = response.json()
            prospects = data if isinstance(data, list) else data.get('list', [])

            count = 0
            with connection.cursor() as cursor:
                for p in prospects:
                    try:
                        full_name = f"{p.get('firstName', '')} {p.get('lastName', '')}".strip()
                        
                        cursor.execute("""
                            INSERT INTO prospects (
                                id, tenant_id, evo_prospect_id, first_name, last_name, name, 
                                email, cellphone, gender, birthdate, address, city, state, zipcode,
                                branch_id, branch_name, registration_date, signup_type, 
                                marketing_channel, current_step, temperature, notes
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, [
                            str(uuid.uuid4()),
                            tenant_id,
                            p.get('idProspect'),
                            p.get('firstName'),
                            p.get('lastName'),
                            full_name,
                            p.get('email'),
                            p.get('cellphone'),
                            p.get('gender'),
                            p.get('birthDate'),
                            p.get('address'),
                            p.get('city'),
                            p.get('state'),
                            p.get('zipCode'),
                            p.get('idBranch'),
                            p.get('branchName'),
                            p.get('registerDate'),
                            p.get('signupType'),
                            p.get('mktChannel'),
                            p.get('currentStep'),
                            p.get('temperature'),
                            p.get('notes')
                        ])
                        count += 1
                        if verbose:
                            self.stdout.write(f'  → {full_name} ({p.get("cellphone")}) - {p.get("currentStep")}')
                    except Exception as e:
                        if verbose:
                            self.stdout.write(self.style.WARNING(f'  [WARN] Skip prospect {p.get("idProspect")}: {e}'))

            return count

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error syncing prospects: {e}'))
            raise

    def _sync_sales(self, session, base_url, tenant_id, verbose):
        """Sincroniza ventas desde EVO - CAPTURA COMPLETA"""
        try:
            response = session.get(f'{base_url}/api/v2/sales', timeout=15)
            response.raise_for_status()
            
            data = response.json()
            sales = data if isinstance(data, list) else data.get('list', [])

            count = 0
            with connection.cursor() as cursor:
                for s in sales:
                    try:
                        evo_member_id = s.get('idMember')
                        member_id = None
                        
                        # Crear o actualizar member si existe en la respuesta
                        if evo_member_id:
                            member_id = self._sync_member_from_sale(cursor, tenant_id, s, evo_member_id)
                        
                        # Extraer info del member desde el objeto nested
                        member_info = s.get('member', {})
                        member_name = f"{member_info.get('firstName', '')} {member_info.get('lastName', '')}".strip()
                        member_document = member_info.get('document')
                        
                        # Extraer contactos si existen
                        phone = None
                        email = None
                        contacts = member_info.get('contacts', [])
                        for contact in contacts:
                            if contact.get('contactType') == 'Cellphone':
                                phone = contact.get('description')
                            elif contact.get('contactType') == 'E-mail':
                                email = contact.get('description')
                        
                        # Cantidad y monto
                        sale_items = s.get('saleItens', [])
                        amount = sale_items[0].get('saleValue', 0) if sale_items else 0
                        item_desc = sale_items[0].get('description', '') if sale_items else None
                        
                        cursor.execute("""
                            INSERT INTO sales (
                                id, tenant_id, evo_sale_id, member_id, member_name, 
                                member_document, member_phone, member_email,
                                amount, sale_date, status, sale_source, observations,
                                item_description, item_quantity, branch_id, employee_name
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, [
                            str(uuid.uuid4()),
                            tenant_id,
                            s.get('idSale'),
                            member_id,
                            member_name,
                            member_document,
                            phone,
                            email,
                            amount,
                            s.get('saleDate'),
                            s.get('registrationKind', 'unknown'),
                            s.get('saleSource'),
                            s.get('observations'),
                            item_desc,
                            len(sale_items),
                            s.get('idBranch'),
                            s.get('nameEmployeeSale')
                        ])
                        count += 1
                        if verbose:
                            self.stdout.write(f'  → {member_name} | ${amount} | {s.get("registrationKind")}')
                    except Exception as e:
                        if verbose:
                            self.stdout.write(self.style.WARNING(f'  [WARN] Skip sale {s.get("idSale")}: {e}'))

            return count

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error syncing sales: {e}'))
            raise

    def _sync_entries(self, session, base_url, tenant_id, verbose):
        """Sincroniza entradas/accesos desde EVO - CAPTURA COMPLETA"""
        try:
            response = session.get(f'{base_url}/api/v1/entries', timeout=15)
            response.raise_for_status()
            
            data = response.json()
            entries = data if isinstance(data, list) else data.get('list', [])

            count = 0
            with connection.cursor() as cursor:
                for entry in entries:
                    try:
                        evo_member_id = entry.get('idMember')
                        member_id = None
                        
                        if evo_member_id:
                            member_id = self._get_or_create_member(cursor, tenant_id, evo_member_id)

                        # Create composite ID (entries no tienen ID único)
                        composite = f"{entry.get('date')}_{entry.get('idMember')}_{entry.get('idBranch')}"
                        entry_id = int(hashlib.sha256(composite.encode()).hexdigest()[:8], 16)
                        
                        # Check if entry already exists
                        cursor.execute(
                            'SELECT id FROM access_logs WHERE tenant_id = ? AND evo_entry_id = ?',
                            [tenant_id, entry_id]
                        )
                        if cursor.fetchone():
                            continue  # Skip existing entries
                        
                        cursor.execute("""
                            INSERT INTO access_logs (
                                id, tenant_id, evo_entry_id, member_id, member_evo_id, member_name,
                                location, branch_name, access_time, entry_type, device, 
                                entry_action, block_reason
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, [
                            str(uuid.uuid4()),
                            tenant_id,
                            entry_id,
                            member_id,
                            evo_member_id,
                            entry.get('nameMember'),  # AHORA CAPTURAMOS EL NOMBRE
                            str(entry.get('idBranch', '')),
                            entry.get('branchName'),
                            entry.get('date'),
                            entry.get('entryType'),
                            entry.get('device'),
                            entry.get('entryAction'),
                            entry.get('blockReason')
                        ])
                        count += 1
                        if verbose:
                            self.stdout.write(f'  → {entry.get("nameMember")} | Branch {entry.get("idBranch")} | {entry.get("date")}')
                    except Exception as ex:
                        if verbose:
                            self.stdout.write(self.style.WARNING(f'  [WARN] Skip entry for {entry.get("nameMember")}: {ex}'))

            return count

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error syncing entries: {e}'))
            raise

    def _get_or_create_member(self, cursor, tenant_id, evo_member_id):
        """Obtiene o crea un member stub"""
        # Intentar obtener existente
        cursor.execute(
            'SELECT id FROM members WHERE tenant_id = ? AND evo_member_id = ?',
            [tenant_id, evo_member_id]
        )
        row = cursor.fetchone()
        
        if row:
            return row[0]

        # Crear nuevo stub
        import uuid
        member_id = str(uuid.uuid4())
        
        try:
            cursor.execute("""
                INSERT INTO members (id, tenant_id, evo_member_id, name)
                VALUES (?, ?, ?, 'Unknown Member')
            """, [member_id, tenant_id, evo_member_id])
            return member_id
        except:
            # Si hubo conflicto, intentar obtener de nuevo
            cursor.execute(
                'SELECT id FROM members WHERE tenant_id = ? AND evo_member_id = ?',
                [tenant_id, evo_member_id]
            )
            row = cursor.fetchone()
            return row[0] if row else None

    def _sync_member_from_sale(self, cursor, tenant_id, sale_dict, evo_member_id):
        """Procesa datos completos del member desde una venta - ACTUALIZA O CREA MEMBER COMPLETO"""
        from datetime import datetime
        
        # Obtener o crear member
        cursor.execute(
            'SELECT id FROM members WHERE tenant_id = ? AND evo_member_id = ?',
            [tenant_id, evo_member_id]
        )
        row = cursor.fetchone()
        member_id = row[0] if row else str(uuid.uuid4())
        
        # Extraer datos completos del objeto member
        member_obj = sale_dict.get('member', {})
        
        first_name = member_obj.get('firstName', '')
        last_name = member_obj.get('lastName', '')
        full_name = f"{first_name} {last_name}".strip() or 'Unknown Member'
        
        # Extraer contacts si existen
        contacts = member_obj.get('contacts', [])
        phone = ''
        email = ''
        for contact in contacts:
            if contact.get('type') == 'phone':
                phone = contact.get('value', '')
            elif contact.get('type') == 'email':
                email = contact.get('value', '')
        
        try:
            if row:
                # Actualizar miembro existente con datos completos
                cursor.execute("""
                    UPDATE members SET
                        first_name = ?, last_name = ?, name = ?,
                        document = ?, gender = ?, marital_status = ?,
                        phone = ?, email = ?, 
                        address = ?, city = ?, state = ?, zipcode = ?,
                        branch_id = ?, branch_name = ?,
                        status = ?, membership_status = ?,
                        consultant_name = ?, instructor_name = ?, personal_trainer_name = ?,
                        last_access_date = ?
                    WHERE id = ?
                """, [
                    first_name, last_name, full_name,
                    member_obj.get('document'), member_obj.get('gender'), member_obj.get('maritalStatus'),
                    phone, email,
                    member_obj.get('address'), member_obj.get('city'), member_obj.get('state'), member_obj.get('zipcode'),
                    member_obj.get('idBranch'), member_obj.get('branchName'),
                    member_obj.get('status'), member_obj.get('membershipStatus'),
                    member_obj.get('consultantName'), member_obj.get('instructorName'), member_obj.get('personalTrainerName'),
                    datetime.now().isoformat(),
                    member_id
                ])
            else:
                # Crear nuevo member con datos completos
                cursor.execute("""
                    INSERT INTO members (
                        id, tenant_id, evo_member_id, first_name, last_name, name,
                        document, gender, marital_status, phone, email,
                        address, city, state, zipcode,
                        branch_id, branch_name,
                        registration_date, status, membership_status,
                        consultant_name, instructor_name, personal_trainer_name,
                        last_access_date
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, [
                    member_id, tenant_id, evo_member_id, first_name, last_name, full_name,
                    member_obj.get('document'), member_obj.get('gender'), member_obj.get('maritalStatus'),
                    phone, email,
                    member_obj.get('address'), member_obj.get('city'), member_obj.get('state'), member_obj.get('zipcode'),
                    member_obj.get('idBranch'), member_obj.get('branchName'),
                    datetime.now().isoformat(), member_obj.get('status'), member_obj.get('membershipStatus'),
                    member_obj.get('consultantName'), member_obj.get('instructorName'), member_obj.get('personalTrainerName'),
                    datetime.now().isoformat()
                ])
        except Exception as e:
            # Silenciar errores de actualización - no queremos fallar sync por esto
            pass
        
        return member_id

    def _extract_active_members(self, tenant_id, verbose=False):
        """
        Extrae lista de clientes activos desde access_logs.
        Esta es la solución para obtener info de clientes cuando W12App API no expone members.
        """
        with connection.cursor() as cursor:
            # 1. Obtener todos los entries con información de miembros
            cursor.execute("""
                SELECT 
                    member_evo_id,
                    member_name,
                    branch_name,
                    MIN(access_time) as first_access,
                    MAX(access_time) as last_access,
                    COUNT(*) as total_visits
                FROM access_logs
                WHERE tenant_id = ?
                  AND member_evo_id IS NOT NULL
                  AND member_name IS NOT NULL
                  AND member_name != ''
                  AND member_name != 'Unknown Member'
                GROUP BY member_evo_id, member_name, branch_name
            """, [tenant_id])
            
            rows = cursor.fetchall()
            active_members_count = 0
            
            for row in rows:
                evo_member_id, member_name, branch_name, first_access, last_access, total_visits = row
                
                # Generar ID único para el miembro
                member_id = str(uuid.uuid4())
                
                # Verificar si ya existe
                cursor.execute("""
                    SELECT id FROM members 
                    WHERE tenant_id = ? AND evo_member_id = ?
                """, [tenant_id, evo_member_id])
                
                existing = cursor.fetchone()
                
                if existing:
                    # Actualizar miembro existente con info de actividad
                    cursor.execute("""
                        UPDATE members SET
                            name = ?,
                            branch_name = ?,
                            registration_date = CASE 
                                WHEN registration_date IS NULL OR registration_date = '' 
                                THEN ? 
                                ELSE registration_date 
                            END,
                            last_access_date = ?,
                            membership_status = 'active',
                            status = 'active'
                        WHERE tenant_id = ? AND evo_member_id = ?
                    """, [
                        member_name,
                        branch_name,
                        first_access,
                        last_access,
                        tenant_id,
                        evo_member_id
                    ])
                    active_members_count += 1
                    
                    if verbose:
                        self.stdout.write(f'  [UPDATE] {member_name} ({evo_member_id}) - {total_visits} visitas')
                else:
                    # Crear nuevo miembro inferido desde entries
                    cursor.execute("""
                        INSERT INTO members (
                            id, tenant_id, evo_member_id, name, 
                            branch_name, registration_date, last_access_date,
                            membership_status, status
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, [
                        member_id,
                        tenant_id,
                        evo_member_id,
                        member_name,
                        branch_name,
                        first_access,
                        last_access,
                        'active',
                        'active'
                    ])
                    active_members_count += 1
                    
                    if verbose:
                        self.stdout.write(f'  [NEW] {member_name} ({evo_member_id}) - {total_visits} visitas')
            
            return active_members_count

    def _sync_members_full(self, session, base_url, tenant_id, verbose):
        """
        Sincroniza members COMPLETOS desde Integration API /api/v1/members
        Incluye datos de membersías (planes activos/expirados)
        """
        try:
            response = session.get(f'{base_url}/api/v1/members', timeout=15)
            response.raise_for_status()
            members = response.json()

            count = 0
            with connection.cursor() as cursor:
                for m in members:
                    try:
                        member_id = str(uuid.uuid4())
                        evo_member_id = m.get('idMember')
                        
                        # Nombre completo
                        full_name = f"{m.get('firstName', '')} {m.get('lastName', '')}".strip()
                        
                        # Extraer contactos
                        contacts = m.get('contacts', [])
                        phone = next((c['description'] for c in contacts if c.get('contactType') == 'Cellphone'), None)
                        email = next((c['description'] for c in contacts if c.get('contactType') == 'E-mail'), None)
                        
                        # Extraer plan activo (primera membresía activa)
                        memberships = m.get('memberships', [])
                        active_plan = None
                        plan_status = 'inactive'
                        plan_end_date = None
                        
                        if memberships:
                            for membership in memberships:
                                status = membership.get('membershipStatus', '').lower()
                                if status in ['active', 'activo']:
                                    active_plan = membership.get('name')
                                    plan_status = 'active'
                                    plan_end_date = membership.get('endDate')
                                    break
                            
                            # Si no hay activo, tomar el último
                            if not active_plan and memberships:
                                active_plan = memberships[0].get('name')
                                plan_status = memberships[0].get('membershipStatus', '').lower()
                                plan_end_date = memberships[0].get('endDate')
                        
                        # UPSERT member
                        cursor.execute("""
                            INSERT OR REPLACE INTO members (
                                id, tenant_id, evo_member_id, 
                                first_name, last_name, name, 
                                email, phone,
                                document, gender, birthdate,
                                address, city, state, zipcode,
                                branch_id, branch_name,
                                registration_date, last_access_date,
                                membership_status, status,
                                consultant_name, instructor_name, personal_trainer_name
                            ) VALUES (
                                COALESCE((SELECT id FROM members WHERE tenant_id = ? AND evo_member_id = ?), ?),
                                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                            )
                        """, [
                            tenant_id, evo_member_id,  # COALESCE params
                            member_id,  # new id
                            tenant_id,
                            evo_member_id,
                            m.get('firstName'),
                            m.get('lastName'),
                            full_name,
                            email,
                            phone,
                            m.get('document'),
                            m.get('gender'),
                            m.get('birthDate'),
                            m.get('address'),
                            m.get('city'),
                            m.get('state'),
                            m.get('zipCode'),
                            m.get('idBranch'),
                            m.get('branchName'),
                            m.get('registerDate'),
                            m.get('lastAccessDate'),
                            plan_status,
                            m.get('status'),
                            m.get('nameEmployeeConsultant'),
                            m.get('nameEmployeeInstructor'),
                            m.get('nameEmployeePersonalTrainer')
                        ])
                        
                        count += 1
                        if verbose:
                            status_display = 'ACTIVO' if plan_status == 'active' else 'INACTIVO'
                            plan_display = active_plan[:40] if active_plan else 'Sin plan'
                            self.stdout.write(f'  [{status_display}] {full_name} -> {plan_display}')
                            
                    except Exception as e:
                        if verbose:
                            self.stdout.write(self.style.WARNING(f'  [WARN] Skip member {m.get("idMember")}: {e}'))

            return count

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error syncing members: {e}'))
            raise

    def _sync_entries_w12(self, dns, token, tenant_id, verbose):
        """
        Sincroniza access logs desde W12App API (NO Integration API)
        Este endpoint solo existe en la API limitada
        """
        try:
            # Usar W12App API (la limitada)
            base_url_w12 = f'https://{dns}.w12app.com.br'
            
            session = requests.Session()
            session.auth = (dns, token)
            session.headers.update({
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            })
            
            response = session.get(f'{base_url_w12}/api/v1/entries', timeout=15)
            response.raise_for_status()
            
            data = response.json()
            entries = data if isinstance(data, list) else data.get('list', [])

            count = 0
            with connection.cursor() as cursor:
                for entry in entries:
                    try:
                        cursor.execute("""
                            INSERT INTO access_logs (
                                id, tenant_id, evo_entry_id, member_evo_id, member_name,
                                access_time, branch_id, branch_name, access_type
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, [
                            str(uuid.uuid4()),
                            tenant_id,
                            entry.get('idEntry'),
                            entry.get('idMember'),
                            entry.get('memberName'),
                            entry.get('accessTime'),
                            entry.get('idBranch'),
                            entry.get('branchName'),
                            entry.get('accessType')
                        ])
                        count += 1
                        if verbose:
                            self.stdout.write(f'  → {entry.get("memberName")} - {entry.get("accessTime")}')
                    except Exception as e:
                        if verbose:
                            self.stdout.write(self.style.WARNING(f'  [WARN] Skip entry: {e}'))

            return count

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error syncing entries from W12App: {e}'))
            raise

    def _log_sync(self, tenant_id, job_type, status, error_message):
        """Registra el resultado de la sincronización"""
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO sync_queue (tenant_id, job_type, status, error_message)
                VALUES (?, ?, ?, ?)
            """, [tenant_id, job_type, status, error_message])
