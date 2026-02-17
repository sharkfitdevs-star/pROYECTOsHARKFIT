import React from 'react';

/**
 * PermissionContext - Proveedor de contexto para permisos
 * Placeholder para prevenir errores de importación
 */

export const PermissionContext = React.createContext({});

export const PermissionProvider = ({ children }) => {
  return (
    <PermissionContext.Provider value={{}}>
      {children}
    </PermissionContext.Provider>
  );
};

export default PermissionProvider;
