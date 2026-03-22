'use strict';
const CONNECTORS = {
  mongodb:    require('./mongodb-external'),
  mongo:      require('./mongodb-external'),
  postgres:   require('./postgres'),
  postgresql: require('./postgres'),
  sqlite:     require('./sqlite'),
};
function getConnector(dbType) {
  const key = dbType.toLowerCase().trim();
  const connector = CONNECTORS[key];
  if (!connector) throw new Error(`Tipo no soportado: "${dbType}". Disponibles: ${Object.keys(CONNECTORS).join(', ')}`);
  return connector;
}
module.exports = { getConnector };
