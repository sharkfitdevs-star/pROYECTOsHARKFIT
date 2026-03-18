const { fetchProspects, fetchEntries } = require('./abcEvo');
const { v4: uuidv4 } = require('uuid');

const Lead = require('../models/Lead');
const Agendamiento = require('../models/Agendamiento');

async function syncProspectos(config) {
  let sincronizados = 0;
  let errores = 0;

  try {
    const items = await fetchProspects(config);
    if (Array.isArray(items)) {
      for (const item of items) {
        try {
          const nombre = item.nombre || item.name || null;
          const email = item.email || null;
          const telefono = item.telefono || item.phone || item.cellphone || null;
          const fuente = 'evo';
          const estatus = item.estatus || item.status || null;

          const keyFilter = {};
          if (email) keyFilter.email = email;
          else if (nombre) keyFilter.nombre = nombre;
          else {
            errores++;
            continue;
          }

          const docData = { nombre, email, telefono, fuente, estatus, lastSyncAt: new Date() };

          const existing = await Lead.findOne(keyFilter).lean();
          if (existing) {
            await Lead.findByIdAndUpdate(existing._id, { $set: docData });
          } else {
            await Lead.create(docData);
          }

          sincronizados++;
        } catch (e) {
          errores++;
        }
      }
    }
  } catch (e) {
    // error fetching prospects counts as failure for all
    console.error('syncProspectos fetch error', e);
    errores++;
  }

  return { sincronizados, errores };
}

async function syncAgendamientos(config) {
  let sincronizados = 0;
  let errores = 0;

  try {
    const items = await fetchEntries(config);
    if (Array.isArray(items)) {
      for (const item of items) {
        try {
          const memberName = item.memberName || item.nombre || item.name || null;
          const idBranch = item.idBranch || item.sede || item.branch || null;
          const startDate = item.startDate || item.fecha || item.start || null;
          const status = item.status || item.estado || null;
          const checkedIn = !!item.checkedIn;

          const idAppointment = item.id || item.idAppointment || uuidv4();

          const docData = {
            idAppointment,
            memberName,
            idBranch,
            startDate,
            status,
            checkedIn,
            source: 'evo',
            lastSyncAt: new Date(),
          };

          const existing = await Agendamiento.findOne({ idAppointment }).lean();
          if (existing) {
            await Agendamiento.findByIdAndUpdate(existing._id, { $set: docData });
          } else {
            await Agendamiento.create(docData);
          }

          sincronizados++;
        } catch (e) {
          errores++;
        }
      }
    }
  } catch (e) {
    console.error('syncAgendamientos fetch error', e);
    errores++;
  }

  return { sincronizados, errores };
}

async function syncTodo(config) {
  const [pros, agendas] = await Promise.all([
    syncProspectos(config),
    syncAgendamientos(config),
  ]);

  return {
    prospectos: pros,
    agendamientos: agendas,
  };
}

module.exports = {
  syncProspectos,
  syncAgendamientos,
  syncTodo,
};
