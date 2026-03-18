const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const ImportService = require('../src/services/ImportService');
const Cliente = require('../src/models/Cliente');

describe('ImportService end-to-end', () => {
  let mongoServer;
  const uploadDir = path.join(__dirname, '..', 'uploads');

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  });

  afterEach(async () => {
    // limpiar colecciones
    const collNames = Object.keys(mongoose.connection.collections);
    for (const name of collNames) {
      try {
        await mongoose.connection.collections[name].deleteMany({});
      } catch (e) {}
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    fs.rmSync(uploadDir, { recursive: true, force: true });
    mongoose.models = {};
    mongoose.modelSchemas = {};
  });

  test('CSV import inserts clientes with required fields', async () => {
    const filepath = path.join(uploadDir, 'test1.csv');
    fs.writeFileSync(filepath, 'nombre,apellido,email,telefono\nJuan,Perez,juan@test.com,555-1234');

    const mapeo = { nombre: 'nombre', apellido: 'apellido', email: 'email', telefono: 'telefono' };
    const result = await ImportService.processCSVFile({ path: filepath, originalname: 'test1.csv' }, mapeo, 'clientes', ',');

    expect(result.registosProcesados).toBe(1);
    expect(result.registosInseridos).toBe(1);
    expect(result.registosFallidos).toBe(0);
    expect(result.estatus).toBe('Exitoso');
    expect(result.mappingUsed).toBeDefined();
    expect(result.detectedHeaders).toEqual(['nombre','apellido','email','telefono']);

    const docs = await Cliente.find().lean();
    expect(docs.length).toBe(1);
    const doc = docs[0];
    expect(doc.uniqueId).toBeDefined();
    expect(doc.idMember).toBeDefined();
    expect(doc.name).toMatch(/Juan/);
    expect(doc.email).toBe('juan@test.com');
    expect(doc.source).toBe('import_excel');
  });

  test('Errors during insert count as fallidos and status adjusts', async () => {
    const filepath = path.join(uploadDir, 'test2.csv');
    fs.writeFileSync(filepath, 'nombre,apellido,email\nFoo,Bar,foo@x.com');

    // spy Cliente.create to throw once
    const origCreate = Cliente.create;
    let thrown = false;
    Cliente.create = jest.fn(async (data) => {
      if (!thrown) {
        thrown = true;
        throw new Error('simulated insert failure');
      }
      return origCreate(data);
    });

    const mapeo = { nombre: 'nombre', apellido: 'apellido', email: 'email' };
    const result = await ImportService.processCSVFile({ path: filepath, originalname: 'test2.csv' }, mapeo, 'clientes', ',');

    expect(result.registosProcesados).toBe(1);
    expect(result.registosInseridos).toBe(0);
    expect(result.registosFallidos).toBe(1);
    expect(['Fallido','Parcial']).toContain(result.estatus);
    expect(result.errorMessage).toBeUndefined(); // error info is logged in history but not returned

    const docs = await Cliente.find().lean();
    expect(docs.length).toBe(0);

    // restore
    Cliente.create = origCreate;
  });

  test('Auto-detect headers and fail when no identifier columns', async () => {
    const filepath = path.join(uploadDir, 'test3.csv');
    fs.writeFileSync(filepath, 'foo,bar\n1,2');

    await expect(
      ImportService.processCSVFile({ path: filepath, originalname: 'test3.csv' }, {}, 'clientes', ',')
    ).rejects.toThrow('No se detectaron columnas identificadoras');
  });

  test('Rows missing identity fields are counted as invalid', async () => {
    const filepath = path.join(uploadDir, 'test4.csv');
    fs.writeFileSync(filepath, 'nombre,email\n,\nJose,jose@example.com');

    const result = await ImportService.processCSVFile({ path: filepath, originalname: 'test4.csv' }, {}, 'clientes', ',');
    expect(result.invalidCount).toBe(1);
    expect(result.totalRows).toBe(2);
    expect(result.estatus).toBe('Parcial');
  });

  test('CSV parser normalizes and warns when name column absent', async () => {
    const filepath = path.join(uploadDir, 'testMissingName.csv');
    fs.writeFileSync(filepath, '  nombre  ,correo\nJuan,juan@x.com');
    // mapping provided only for correo to simulate missing name
    const result = await ImportService.processCSVFile({ path: filepath, originalname: 'testMissingName.csv' }, { correo:'email' }, 'clientes', ',');
    expect(result.warnings).toContain('missingFields:name');
  });

  test('Header synonyms are normalized and mapped automatically', async () => {
    const filepath = path.join(uploadDir, 'synonyms.csv');
    fs.writeFileSync(filepath, 'Nombre Completo,Correo Electronico,Telefono\nAna,ana@x.com,123');
    const result = await ImportService.processCSVFile({ path: filepath, originalname: 'synonyms.csv' }, {}, 'clientes', ',');
    expect(result.mappingUsed).toBeDefined();
    expect(result.invalidCount).toBe(0);
    expect(result.totalRows).toBe(1);
    const docs = await Cliente.find().lean();
    expect(docs[0].name).toBe('Ana');
    expect(docs[0].email).toBe('ana@x.com');
  });

  test('Excel parser normalizes headers/mapping and warns when name missing', async () => {
    const ExcelJS = require('exceljs');
    const filepath = path.join(uploadDir, 'testMissingName.xlsx');
    // create workbook with header having extra spaces
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Sheet1');
    ws.addRow(['  Nombre ', 'Email']);
    ws.addRow(['Carlos', 'c@x.com']);
    await workbook.xlsx.writeFile(filepath);

    const mapeo = { Email: 'email' }; // user forgot map for name
    const result = await ImportService.processExcelFile({ path: filepath, originalname: 'testMissingName.xlsx' }, mapeo, 'clientes');
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(result.warnings).toContain('missingFields:name');
    // still should import record because default heuristic will fill by synonym? mapeoNormalized doesn't include name
    const docs = await Cliente.find().lean();
    // name may remain undefined, import still happens since fallback mapping uses 'Nombre' -> name
    expect(docs[0].name).toBe('Carlos');
  });
});
