import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { User } from '@/entities/User';
import { Staff } from '@/entities/Staff';
import { Roles } from '@/entities/Roles';

// Default permissions for admin/fallback
const DEFAULT_ADMIN_PERMISSIONS = {
  // Dashboards
  ver_dashboard_comercial: true,
  ver_dashboard_costos: true,
  
  // Leads
  gestionar_leads_diarios: true,
  
  // Agenda
  ver_agenda: true,
  gestionar_agenda: true,
  
  // Prospectos
  ver_prospectos: true,
  crear_prospectos: true,
  editar_prospectos: true,
  eliminar_prospectos: true,
  eliminar_prospectos_masivo: true,
  editar_prospectos_masivo: true,
  importar_prospectos: true,
  exportar_prospectos: true,
  deshacer_importacion: true,
  
  // Ventas
  ver_ventas: true,
  gestionar_ventas: true,
  eliminar_ventas: true,
  
  // Marketing
  gestionar_gastos_ads: true,
  gestionar_remarketing: true,
  
  // Configuración
  acceso_configuracion: true,
  gestionar_sucursales: true,
  gestionar_staff: true,
  gestionar_cerradores: true,
  gestionar_planes: true,
  gestionar_clases: true,
  gestionar_roles: true
};

// Default permissions by operational role (when no rol_personalizado is assigned)
const ROLE_DEFAULT_PERMISSIONS = {
  vendedor: {
    // Dashboards
    ver_dashboard_comercial: true,
    ver_dashboard_costos: false,
    
    // Leads
    gestionar_leads_diarios: true,
    
    // Agenda
    ver_agenda: true,
    gestionar_agenda: true,
    
    // Prospectos
    ver_prospectos: true,
    crear_prospectos: true,
    editar_prospectos: true,
    eliminar_prospectos: false,
    eliminar_prospectos_masivo: false,
    editar_prospectos_masivo: false,
    importar_prospectos: false,
    exportar_prospectos: true,
    deshacer_importacion: false,
    
    // Ventas
    ver_ventas: true,
    gestionar_ventas: true,
    eliminar_ventas: false,
    
    // Marketing
    gestionar_gastos_ads: false,
    gestionar_remarketing: true,
    
    // Configuración
    acceso_configuracion: false,
    gestionar_sucursales: false,
    gestionar_staff: false,
    gestionar_cerradores: false,
    gestionar_planes: false,
    gestionar_clases: false,
    gestionar_roles: false
  },
  
  asistente: {
    // Dashboards
    ver_dashboard_comercial: true,
    ver_dashboard_costos: false,
    
    // Leads
    gestionar_leads_diarios: true,
    
    // Agenda
    ver_agenda: true,
    gestionar_agenda: true,
    
    // Prospectos
    ver_prospectos: true,
    crear_prospectos: true,
    editar_prospectos: true,
    eliminar_prospectos: false,
    eliminar_prospectos_masivo: false,
    editar_prospectos_masivo: false,
    importar_prospectos: false,
    exportar_prospectos: true,
    deshacer_importacion: false,
    
    // Ventas
    ver_ventas: true,
    gestionar_ventas: false,
    eliminar_ventas: false,
    
    // Marketing
    gestionar_gastos_ads: false,
    gestionar_remarketing: false,
    
    // Configuración
    acceso_configuracion: false,
    gestionar_sucursales: false,
    gestionar_staff: false,
    gestionar_cerradores: false,
    gestionar_planes: false,
    gestionar_clases: false,
    gestionar_roles: false
  },
  
  RS: {
    // Dashboards
    ver_dashboard_comercial: true,
    ver_dashboard_costos: true,
    
    // Leads
    gestionar_leads_diarios: true,
    
    // Agenda
    ver_agenda: true,
    gestionar_agenda: true,
    
    // Prospectos
    ver_prospectos: true,
    crear_prospectos: true,
    editar_prospectos: true,
    eliminar_prospectos: true,
    eliminar_prospectos_masivo: true,
    editar_prospectos_masivo: true,
    importar_prospectos: true,
    exportar_prospectos: true,
    deshacer_importacion: true,
    
    // Ventas
    ver_ventas: true,
    gestionar_ventas: true,
    eliminar_ventas: false,
    
    // Marketing
    gestionar_gastos_ads: true,
    gestionar_remarketing: true,
    
    // Configuración
    acceso_configuracion: true,
    gestionar_sucursales: false,
    gestionar_staff: true,
    gestionar_cerradores: true,
    gestionar_planes: false,
    gestionar_clases: true,
    gestionar_roles: false
  },
  
  jefe_ventas: {
    // Dashboards
    ver_dashboard_comercial: true,
    ver_dashboard_costos: true,
    
    // Leads
    gestionar_leads_diarios: true,
    
    // Agenda
    ver_agenda: true,
    gestionar_agenda: true,
    
    // Prospectos
    ver_prospectos: true,
    crear_prospectos: true,
    editar_prospectos: true,
    eliminar_prospectos: true,
    eliminar_prospectos_masivo: true,
    editar_prospectos_masivo: true,
    importar_prospectos: true,
    exportar_prospectos: true,
    deshacer_importacion: true,
    
    // Ventas
    ver_ventas: true,
    gestionar_ventas: true,
    eliminar_ventas: true,
    
    // Marketing
    gestionar_gastos_ads: true,
    gestionar_remarketing: true,
    
    // Configuración
    acceso_configuracion: true,
    gestionar_sucursales: false,
    gestionar_staff: true,
    gestionar_cerradores: true,
    gestionar_planes: true,
    gestionar_clases: true,
    gestionar_roles: false
  },
  
  lider_comercial: {
    // Dashboards
    ver_dashboard_comercial: true,
    ver_dashboard_costos: true,
    
    // Leads
    gestionar_leads_diarios: true,
    
    // Agenda
    ver_agenda: true,
    gestionar_agenda: true,
    
    // Prospectos
    ver_prospectos: true,
    crear_prospectos: true,
    editar_prospectos: true,
    eliminar_prospectos: true,
    eliminar_prospectos_masivo: true,
    editar_prospectos_masivo: true,
    importar_prospectos: true,
    exportar_prospectos: true,
    deshacer_importacion: true,
    
    // Ventas
    ver_ventas: true,
    gestionar_ventas: true,
    eliminar_ventas: true,
    
    // Marketing
    gestionar_gastos_ads: true,
    gestionar_remarketing: true,
    
    // Configuración
    acceso_configuracion: true,
    gestionar_sucursales: true,
    gestionar_staff: true,
    gestionar_cerradores: true,
    gestionar_planes: true,
    gestionar_clases: true,
    gestionar_roles: true
  },
  
  direccion: {
    // Dashboards
    ver_dashboard_comercial: true,
    ver_dashboard_costos: true,
    
    // Leads
    gestionar_leads_diarios: true,
    
    // Agenda
    ver_agenda: true,
    gestionar_agenda: true,
    
    // Prospectos
    ver_prospectos: true,
    crear_prospectos: true,
    editar_prospectos: true,
    eliminar_prospectos: true,
    eliminar_prospectos_masivo: true,
    editar_prospectos_masivo: true,
    importar_prospectos: true,
    exportar_prospectos: true,
    deshacer_importacion: true,
    
    // Ventas
    ver_ventas: true,
    gestionar_ventas: true,
    eliminar_ventas: true,
    
    // Marketing
    gestionar_gastos_ads: true,
    gestionar_remarketing: true,
    
    // Configuración
    acceso_configuracion: true,
    gestionar_sucursales: true,
    gestionar_staff: true,
    gestionar_cerradores: true,
    gestionar_planes: true,
    gestionar_clases: true,
    gestionar_roles: true
  }
};

/**
 * Get default permissions for a staff member based on their roles array
 * If staff has multiple roles, merge permissions (most permissive wins)
 * @param {string[]} roles - Array of role names from staff.roles
 * @returns {Object} Merged permissions object
 */
function getDefaultPermissionsForRoles(roles) {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return {}; // No roles = no permissions
  }
  
  // Start with empty permissions
  const mergedPermissions = {};
  
  // Get all permission keys from any role
  const allPermissionKeys = Object.keys(DEFAULT_ADMIN_PERMISSIONS);
  
  // For each permission, check if ANY of the user's roles grants it
  allPermissionKeys.forEach(permissionKey => {
    mergedPermissions[permissionKey] = roles.some(role => {
      const rolePerms = ROLE_DEFAULT_PERMISSIONS[role];
      return rolePerms && rolePerms[permissionKey] === true;
    });
  });
  
  return mergedPermissions;
}

// Create the context
const PermissionContext = createContext(null);

/**
 * PermissionProvider - Wraps the app and provides permission data
 * Fetches: User → Staff (by email) → Role → Permissions
 */
export function PermissionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [staff, setStaff] = useState(null);
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    const loadPermissions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Step 1: Fetch current user
        const userData = await User.me();
        if (!isMounted) return;
        setUser(userData);
        
        if (!userData?.email) {
          // No user email, use default admin permissions
          setPermissions(DEFAULT_ADMIN_PERMISSIONS);
          setLoading(false);
          return;
        }
        
        // Step 2: Check if user has admin role directly (built-in role)
        // User.role can be 'admin' or 'user' by default
        if (userData.role === 'admin') {
          // Admin users get all permissions automatically
          setPermissions(DEFAULT_ADMIN_PERMISSIONS);
          setLoading(false);
          return;
        }
        
        // Step 3: Find staff record by email (for non-admin users)
        const staffRecords = await Staff.filter({ email: userData.email }, '-createdAt', 1);
        if (!isMounted) return;
        
        const staffRecord = staffRecords?.[0] || null;
        setStaff(staffRecord);
        
        // Step 4: Check if staff has a custom role assigned
        if (!staffRecord) {
          // No staff record found - user exists but not in staff
          // For regular users without staff record, deny permissions
          console.warn('User has no staff record:', userData.email);
          setPermissions({});
          setLoading(false);
          return;
        }
        
        if (!staffRecord.rol_personalizado) {
          // Staff exists but no custom role assigned
          // Fall back to default permissions based on staff.roles array
          console.warn('Staff has no rol_personalizado, using default permissions from roles array:', staffRecord.nombre);
          
          if (staffRecord.roles && Array.isArray(staffRecord.roles) && staffRecord.roles.length > 0) {
            // Get default permissions based on operational roles
            const defaultPerms = getDefaultPermissionsForRoles(staffRecord.roles);
            setPermissions(defaultPerms);
            setLoading(false);
            return;
          } else {
            // No roles array either - deny all permissions
            console.warn('Staff has no roles array:', staffRecord.nombre);
            setPermissions({});
            setLoading(false);
            return;
          }
        }
        
        // Step 5: Fetch role by ID from Roles entity
        const roleData = await Roles.get(staffRecord.rol_personalizado);
        if (!isMounted) return;
        setRole(roleData);
        
        if (!roleData) {
          // Role ID exists but role not found in database
          console.warn('Role not found:', staffRecord.rol_personalizado);
          setPermissions({});
          setLoading(false);
          return;
        }
        
        if (!roleData.permisos) {
          // Role exists but has no permissions object
          console.warn('Role has no permissions:', roleData.nombre_rol);
          setPermissions({});
          setLoading(false);
          return;
        }
        
        // Step 6: Set permissions from role
        setPermissions(roleData.permisos);
        
      } catch (err) {
        console.error('Error loading permissions:', err);
        if (isMounted) {
          setError(err);
          // On error, deny all permissions for safety
          setPermissions({});
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadPermissions();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Memoize helper functions to prevent unnecessary re-renders
  const helpers = useMemo(() => ({
    /**
     * Check if user has a specific permission
     * @param {string} permission - Permission name to check
     * @returns {boolean}
     */
    hasPermission: (permission) => {
      if (!permissions) return false;
      return permissions[permission] === true;
    },
    
    /**
     * Check if user has at least one of the specified permissions
     * @param {string[]} permissionList - Array of permission names
     * @returns {boolean}
     */
    hasAnyPermission: (permissionList) => {
      if (!permissions) return false;
      return permissionList.some(p => permissions[p] === true);
    },
    
    /**
     * Check if user has all of the specified permissions
     * @param {string[]} permissionList - Array of permission names
     * @returns {boolean}
     */
    hasAllPermissions: (permissionList) => {
      if (!permissions) return false;
      return permissionList.every(p => permissions[p] === true);
    }
  }), [permissions]);

  const value = useMemo(() => ({
    user,
    staff,
    role,
    permissions,
    loading,
    error,
    ...helpers
  }), [user, staff, role, permissions, loading, error, helpers]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

/**
 * usePermission hook - Access permission context from any component
 * @returns {Object} Permission context with user, staff, role, permissions and helper functions
 */
export function usePermission() {
  const context = useContext(PermissionContext);
  
  if (context === null) {
    throw new Error('usePermission must be used within a PermissionProvider');
  }
  
  return context;
}

// Also export Spanish aliases for backward compatibility
export const usePermisos = usePermission;