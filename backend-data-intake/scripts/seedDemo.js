require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Cliente = require('../src/models/Cliente');
const Venta = require('../src/models/Venta');
const Colaborador = require('../src/models/rrhh/Colaborador');

const FORCE = process.argv.includes('--force');

const NOMBRES = ['Juan','María','Carlos','Ana','Pedro','Valentina','Diego','Camila','Felipe','Javiera','Rodrigo','Catalina','Sebastián','Daniela','Andrés','Francisca','Matías','Sofía','Nicolás','Isidora'];
const APELLIDOS = ['González','Muñoz','Rojas','Díaz','Pérez','Soto','Contreras','Silva','Martínez','Sepúlveda','Morales','Torres','Flores','Rivera','Gómez','Herrera','Medina','Aguilar','Castillo','Vargas'];
const SEDES = ['Sede Central','Sede Norte','Sede Sur'];
const PLANES = ['mensual','trimestral','anual','diario'];
const VENDEDORES = ['Carlos Soto','Ana Pérez','Diego Rojas','Valentina Silva'];
const CARGOS = ['instructor','recepcionista','vendedor','gerente','administrativo'];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randDate(monthsBack) {
  const d = new Date();
  d.setMonth(d.getMonth() - Math.floor(Math.random() * monthsBack));
  d.setDate(randInt(1, 28));
  return d;
}
function rut() { return `${randInt(10000000,25000000)}-${randInt(0,9)}`; }

async function seedClientes() {
  const existing = await Cliente.countDocuments();
  if (existing > 0 && !FORCE) {
    console.log(`⏭  Clientes: ya existen ${existing}, saltando. Usa --force para re-seedar.`);
    return [];
  }
  if (FORCE) await Cliente.deleteMany({});
  
  const clientes = [];
  for (let i = 0; i < 50; i++) {
    const nombre = rand(NOMBRES);
    const apellido = rand(APELLIDOS);
    const statusRoll = Math.random();
    const status = statusRoll < 0.7 ? 'activo' : statusRoll < 0.9 ? 'inactivo' : 'suspendido';
    const planRoll = Math.random();
    const planName = planRoll < 0.4 ? 'mensual' : planRoll < 0.7 ? 'trimestral' : planRoll < 0.9 ? 'anual' : 'diario';
    const sede = rand(SEDES);
    
    clientes.push({
      uniqueId: `DEMO-${Date.now()}-${i}`,
      idMember: `MEM-${String(i+1).padStart(4,'0')}`,
      name: nombre,
      lastName: apellido,
      email: `${nombre.toLowerCase()}.${apellido.toLowerCase()}${i}@demo.cl`,
      cellPhone: `+569${randInt(10000000,99999999)}`,
      status,
      active: status === 'activo',
      planName,
      branchName: sede,
      idBranch: sede.replace(/\s/g,'-').toLowerCase(),
      fechaIngreso: randDate(24),
      source: 'seed_demo'
    });
  }
  
  const result = await Cliente.insertMany(clientes, { ordered: false });
  console.log(`✅ Clientes: ${result.length} insertados`);
  return result;
}

async function seedVentas(clientes) {
  const existing = await Venta.countDocuments();
  if (existing > 0 && !FORCE) {
    console.log(`⏭  Ventas: ya existen ${existing}, saltando.`);
    return;
  }
  if (FORCE) await Venta.deleteMany({});
  
  const ventas = [];
  for (let i = 0; i < 200; i++) {
    const cliente = clientes.length > 0 ? clientes[i % clientes.length] : null;
    const amount = randInt(30000, 150000);
    const paymentRoll = Math.random();
    const paymentStatus = paymentRoll < 0.8 ? 'Pagado' : 'Pendiente';
    const sede = rand(SEDES);
    
    ventas.push({
      idSale: `SALE-DEMO-${Date.now()}-${i}`,
      idMember: cliente?.idMember || `MEM-${String(randInt(1,50)).padStart(4,'0')}`,
      memberName: cliente ? `${cliente.name} ${cliente.lastName}` : `${rand(NOMBRES)} ${rand(APELLIDOS)}`,
      amount,
      totalAmount: amount,
      discount: 0,
      paymentStatus,
      employeeName: rand(VENDEDORES),
      planName: rand(PLANES),
      branchName: sede,
      idBranch: sede.replace(/\s/g,'-').toLowerCase(),
      saleDate: randDate(6),
      source: 'seed_demo'
    });
  }
  
  const result = await Venta.insertMany(ventas, { ordered: false });
  console.log(`✅ Ventas: ${result.length} insertadas`);
}

async function seedColaboradores() {
  const existing = await Colaborador.countDocuments();
  if (existing > 0 && !FORCE) {
    console.log(`⏭  Colaboradores: ya existen ${existing}, saltando.`);
    return;
  }
  if (FORCE) await Colaborador.deleteMany({});
  
  const colaboradores = [];
  const usedRuts = new Set();
  
  for (let i = 0; i < 10; i++) {
    let r;
    do { r = rut(); } while (usedRuts.has(r));
    usedRuts.add(r);
    
    const nombre = rand(NOMBRES);
    const apellido = rand(APELLIDOS);
    const cargo = CARGOS[i % CARGOS.length];
    const sueldo = cargo === 'gerente' ? randInt(1200000,1500000) :
                   cargo === 'instructor' ? randInt(700000,1000000) :
                   randInt(500000,800000);
    
    colaboradores.push({
      nombre,
      apellido,
      rut: r,
      email: `${nombre.toLowerCase()}.${apellido.toLowerCase()}${i}@sharkfit.cl`,
      cargo,
      departamento: cargo === 'gerente' ? 'Administración' : 
                    cargo === 'instructor' ? 'Operaciones' : 'Comercial',
      fecha_ingreso: randDate(36),
      sueldo_base: sueldo,
      estado: 'activo',
      activo: true,
      sede_actual: rand(SEDES),
      source: 'seed_demo'
    });
  }
  
  const result = await Colaborador.insertMany(colaboradores, { ordered: false });
  console.log(`✅ Colaboradores: ${result.length} insertados`);
}

async function main() {
  console.log('\n🦈 SharkFit — Seed de datos demo');
  console.log(FORCE ? '⚠️  Modo FORCE: limpiando datos existentes...' : '');
  
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('❌ MONGODB_URI no definida'); process.exit(1); }
  
  await mongoose.connect(uri);
  console.log('✅ MongoDB conectado\n');
  
  const clientes = await seedClientes();
  await seedVentas(clientes);
  await seedColaboradores();
  
  const totalClientes = await Cliente.countDocuments();
  const totalVentas = await Venta.countDocuments();
  const totalColaboradores = await Colaborador.countDocuments();
  
  console.log('\n📊 Resumen final:');
  console.log(`   Clientes: ${totalClientes}`);
  console.log(`   Ventas: ${totalVentas}`);
  console.log(`   Colaboradores: ${totalColaboradores}`);
  console.log('\n✅ Seed completado\n');
  
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error en seed:', err.message);
  process.exit(1);
});
