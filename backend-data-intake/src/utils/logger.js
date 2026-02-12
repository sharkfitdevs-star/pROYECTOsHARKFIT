/**
 * UTILS: Logger
 * Sistema de logging con Winston
 */

const winston = require('winston');
const path = require('path');

// Definir niveles de logging
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Colores para consola
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

winston.addColors(colors);

// Formato personalizado
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Formato para consola
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message || ''} ${JSON.stringify(info.metadata || {})}`
  )
);

// Transports
const transports = [
  // Consola
  new winston.transports.Console({
    format: consoleFormat
  }),
  
  // Archivo de errores
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
    format: format
  }),
  
  // Archivo combinado
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/combined.log'),
    format: format
  })
];

// Crear logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  exitOnError: false
});

module.exports = { logger };
