// Motor ExcelJS completo para generación de archivos Excel
const ExcelJS = require('exceljs');

async function generateExcel({ sheets }) {
  const workbook = new ExcelJS.Workbook();
  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sheet.name || 'Sheet');
    if (sheet.columns) ws.columns = sheet.columns;
    if (sheet.rows) ws.addRows(sheet.rows);
    if (sheet.styles) {
      for (const [cell, style] of Object.entries(sheet.styles)) {
        ws.getCell(cell).style = style;
      }
    }
  }
  return workbook;
}

async function writeExcelFile({ sheets, filePath }) {
  const workbook = await generateExcel({ sheets });
  await workbook.xlsx.writeFile(filePath);
}

async function writeExcelBuffer({ sheets }) {
  const workbook = await generateExcel({ sheets });
  return await workbook.xlsx.writeBuffer();
}

module.exports = {
  generateExcel,
  writeExcelFile,
  writeExcelBuffer,
};
