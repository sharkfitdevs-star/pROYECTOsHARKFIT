/**
 * Utilidades para exportar datos en diferentes formatos
 */

import ExcelJS from 'exceljs';

/**
 * Exporta datos a CSV
 * @param {Array} data - Array de objetos
 * @param {string} filename - Nombre del archivo
 */
export const exportToCSV = (data, filename = 'export') => {
  if (!Array.isArray(data) || data.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  // Obtener headers
  const headers = Object.keys(data[0]);
  
  // Crear contenido CSV
  let csvContent = headers.join(',') + '\n';
  
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      // Escapar comillas y envolver en comillas si contiene comas
      if (value === null || value === undefined) {
        return '';
      }
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvContent += values.join(',') + '\n';
  });

  // Crear y descargar blob
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Exporta datos a Excel (XLSX)
 * @param {Array} data - Array de objetos
 * @param {string} filename - Nombre del archivo
 * @param {string} sheetName - Nombre de la hoja
 */
export const exportToXLSX = async (data, filename = 'export', sheetName = 'Datos') => {
  if (!Array.isArray(data) || data.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Agregar encabezados
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);

    // Agregar datos
    data.forEach(row => {
      worksheet.addRow(headers.map(h => row[h]));
    });

    // Crear archivo blob
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exportando a Excel:', error);
    alert('Error al exportar a Excel');
    exportToCSV(data, filename); // Fallback a CSV
  }
};

/**
 * Exporta datos a JSON
 * @param {*} data - Datos a exportar
 * @param {string} filename - Nombre del archivo
 */
export const exportToJSON = (data, filename = 'export') => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Copia datos al portapapeles
 * @param {*} data - Datos a copiar
 */
export const copyToClipboard = async (data) => {
  try {
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Error copiando al portapapeles:', error);
    return false;
  }
};

/**
 * Genera datos de ejemplo para prueba
 */
export const generarDatosEjemplo = () => {
  return [
    {
      id: 1,
      nombre: 'Cliente A',
      email: 'cliente@example.com',
      fecha: '2024-01-15',
      monto: 1500,
      estado: 'Activo'
    },
    {
      id: 2,
      nombre: 'Cliente B',
      email: 'clienteb@example.com',
      fecha: '2024-01-20',
      monto: 2300,
      estado: 'Activo'
    },
    {
      id: 3,
      nombre: 'Cliente C',
      email: 'clientec@example.com',
      fecha: '2024-02-05',
      monto: 1800,
      estado: 'Inactivo'
    }
  ];
};
