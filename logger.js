// logger.js - Sistema unificado de logs para o extrator (CLI e GUI)
const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function getTimestamp() {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
}

function log(tag, color, message, ...args) {
  const time = `${colors.dim}[${getTimestamp()}]${colors.reset}`;
  const badge = `${color}[${tag}]${colors.reset}`;
  console.log(`${time} ${badge} ${message}`, ...args);
}

module.exports = {
  info: (tag, message, ...args) => log(tag || 'INFO', colors.cyan, message, ...args),
  success: (tag, message, ...args) => log(tag || 'OK', colors.green, message, ...args),
  warn: (tag, message, ...args) => log(tag || 'AVISO', colors.yellow, message, ...args),
  error: (tag, message, ...args) => log(tag || 'ERRO', colors.red, message, ...args),
  http: (method, urlPath, statusCode, ms) => {
    const color = statusCode >= 400 ? colors.red : statusCode >= 300 ? colors.yellow : colors.green;
    const time = `${colors.dim}[${getTimestamp()}]${colors.reset}`;
    const badge = `${colors.magenta}[HTTP]${colors.reset}`;
    console.log(`${time} ${badge} ${method} ${urlPath} -> ${color}${statusCode}${colors.reset} ${colors.dim}(${ms}ms)${colors.reset}`);
  },
  colors,
};
