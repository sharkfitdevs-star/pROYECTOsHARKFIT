const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SharkFit Dashboard API',
      version: '2.0.0',
      description: 'API del dashboard de gestión SharkFit',
    },
    servers: [{ url: '/api', description: 'API Server' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
