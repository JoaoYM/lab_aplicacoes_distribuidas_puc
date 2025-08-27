// config/logger.js
const winston = require('winston');
const path = require('path');

// Níveis de severidade do log
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.json()
);

// Definição dos "transports"
const transports = [

    new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
      )
    ),
  }),

  new winston.transports.File({
    filename: path.join(__dirname, '../logs/error.log'),
    level: 'error',
  }),

  new winston.transports.File({
    filename: path.join(__dirname, '../logs/all.log'),
  }),
];

// Cria a instância do logger
const logger = winston.createLogger({
  level: 'debug', 
  levels,
  format,
  transports,
  exitOnError: false,
});

module.exports = logger;