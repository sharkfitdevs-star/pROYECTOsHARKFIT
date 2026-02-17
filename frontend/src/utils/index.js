/**
 * Utils - Funciones de utilidad general
 */

export const createPageUrl = (pageName) => {
  // Convertir nombre de página a URL
  // Ejemplo: 'DashboardComercial' -> '/dashboard/comercial'
  const urlName = pageName
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
  
  return `/${urlName}`;
};

export default {
  createPageUrl
};
