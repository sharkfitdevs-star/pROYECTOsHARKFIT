import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function generarLiquidacionPDF(liquidacion, colaborador) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text('Sharcknegocios - Liquidación de Sueldo', 14, 22);
  doc.setFontSize(10);
  doc.text('Fecha: ' + new Date().toLocaleDateString('es-CL'), 14, 30);
  doc.setFontSize(12);
  doc.text('Colaborador: ' + (colaborador?.nombre || '') + ' ' + (colaborador?.apellido || ''), 14, 42);
  doc.text('RUT: ' + (colaborador?.rut || '-'), 14, 50);
  doc.text('Cargo: ' + (colaborador?.cargo || '-'), 14, 58);
  doc.text('Período: ' + (liquidacion?.periodo || '-'), 14, 66);
  doc.autoTable({
    startY: 76,
    head: [['Concepto', 'Monto']],
    body: [
      ['Sueldo Base', '$' + (liquidacion?.sueldo_base || 0).toLocaleString('es-CL')],
      ['Bonos', '$' + (liquidacion?.bonos || 0).toLocaleString('es-CL')],
      ['AFP', '-$' + (liquidacion?.afp || 0).toLocaleString('es-CL')],
      ['Salud', '-$' + (liquidacion?.salud || 0).toLocaleString('es-CL')],
      ['Otros descuentos', '-$' + (liquidacion?.otros_descuentos || 0).toLocaleString('es-CL')],
    ],
    theme: 'grid',
    headStyles: { fillColor: [99, 102, 241] },
  });
  const totalLiquido = (liquidacion?.sueldo_base || 0) + (liquidacion?.bonos || 0) - (liquidacion?.afp || 0) - (liquidacion?.salud || 0) - (liquidacion?.otros_descuentos || 0);
  doc.setFontSize(14);
  doc.text('Total Líquido: $' + totalLiquido.toLocaleString('es-CL'), 14, doc.lastAutoTable.finalY + 16);
  doc.save('liquidacion_' + (colaborador?.rut || 'sin_rut') + '_' + (liquidacion?.periodo || 'sin_periodo') + '.pdf');
}

export function generarFichaColaboradorPDF(colaborador) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text('Sharcknegocios - Ficha de Colaborador', 14, 22);
  doc.setFontSize(10);
  doc.text('Generado: ' + new Date().toLocaleDateString('es-CL'), 14, 30);
  doc.autoTable({
    startY: 40,
    head: [['Campo', 'Valor']],
    body: [
      ['Nombre', (colaborador?.nombre || '') + ' ' + (colaborador?.apellido || '')],
      ['RUT', colaborador?.rut || '-'],
      ['Email', colaborador?.email || '-'],
      ['Teléfono', colaborador?.telefono || '-'],
      ['Cargo', colaborador?.cargo || '-'],
      ['Departamento', colaborador?.departamento || '-'],
      ['Fecha Ingreso', colaborador?.fecha_ingreso ? new Date(colaborador.fecha_ingreso).toLocaleDateString('es-CL') : '-'],
      ['Tipo Contrato', colaborador?.tipo_contrato || '-'],
      ['Jornada', colaborador?.jornada || '-'],
      ['Estado', colaborador?.estado || '-'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [99, 102, 241] },
  });
  doc.save('ficha_' + (colaborador?.rut || 'sin_rut') + '.pdf');
}

export function generarReporteAlertasPDF(alertas, titulo) {
  const doc = new jsPDF('landscape');
  doc.setFontSize(16);
  doc.text(titulo || 'Reporte de Alertas', 14, 22);
  doc.setFontSize(10);
  doc.text('Generado: ' + new Date().toLocaleDateString('es-CL') + ' | Total: ' + alertas.length, 14, 30);
  doc.autoTable({
    startY: 38,
    head: [['Prioridad', 'Título', 'Tipo', 'Responsable', 'Estado', 'Fecha']],
    body: alertas.map(a => [
      a.priority || '-',
      a.title || a.titulo || '-',
      a.type || '-',
      a.responsable || '-',
      a.status || '-',
      a.createdAt ? new Date(a.createdAt).toLocaleDateString('es-CL') : '-'
    ]),
    theme: 'grid',
    headStyles: { fillColor: [99, 102, 241] },
    styles: { fontSize: 8 },
  });
  doc.save('reporte_alertas_' + new Date().toISOString().slice(0, 10) + '.pdf');
}
