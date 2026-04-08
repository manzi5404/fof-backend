const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

const backendRoot = path.resolve(__dirname);
const paths = {
  server: path.resolve(backendRoot, 'server.js'),
  env: path.resolve(backendRoot, '.env'),
  connection: path.resolve(backendRoot, 'db', 'connection.js')
};

const monitoredEnvVars = [
  'PORT',
  'NODE_ENV',
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'DB_PORT',
  'MYSQLHOST',
  'MYSQLUSER',
  'MYSQLPASSWORD',
  'MYSQLDATABASE',
  'MYSQLPORT',
  'JWT_SECRET',
  'GOOGLE_CLIENT_ID',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'ADMIN_EMAIL'
];

const hidePatterns = ['PASSWORD', 'SECRET', 'KEY', 'TOKEN', 'CLIENT_ID', 'SMTP_PASS', 'SMTP_USER'];

function color(text, code) {
  return `${code}${text}${colors.reset}`;
}

function statusText(ok, message) {
  return ok ? color(`✔ ${message}`, colors.green) : color(`✖ ${message}`, colors.red);
}

function maskEnvValue(name, value) {
  if (value === undefined || value === null || value === '') {
    return color('(missing)', colors.yellow);
  }

  if (hidePatterns.some(pattern => name.toUpperCase().includes(pattern))) {
    const visible = 4;
    if (value.length <= visible) {
      return '*'.repeat(value.length);
    }
    return `${'*'.repeat(Math.max(0, value.length - visible))}${value.slice(-visible)}`;
  }

  return value;
}

function printHeader(title) {
  console.log(`\n${colors.bright}${colors.cyan}=== ${title} ===${colors.reset}`);
}

function printFilePath(label, filePath) {
  const exists = fs.existsSync(filePath);
  console.log(`${label}: ${filePath}`);
  console.log(`  ${statusText(exists, exists ? 'Found' : 'Not found')}`);
}

function printEnvVariables() {
  printHeader('Environment Variables Used by Backend');

  monitoredEnvVars.forEach(name => {
    const value = process.env[name];
    console.log(`${name.padEnd(22)}: ${maskEnvValue(name, value)}`);
  });
}

function printStartupContext() {
  printHeader('Startup Context');
  console.log(`Node version        : ${process.version}`);
  console.log(`Current working dir : ${process.cwd()}`);
  console.log(`Debug script dir    : ${backendRoot}`);
  console.log(`.env path           : ${paths.env}`);
  console.log(`server.js path      : ${paths.server}`);
  console.log(`db/connection.js    : ${paths.connection}`);

  const port = process.env.PORT || '5000';
  const host = '0.0.0.0';
  console.log(`Express port        : ${port}`);
  console.log(`Express host        : ${host} (server.js hardcodes host to 0.0.0.0)`);
  console.log(`Node environment    : ${process.env.NODE_ENV || '(not set)'}`);
}

async function testDatabaseConnectivity() {
  printHeader('Database Connectivity Test');

  const dbConfig = {
    host: process.env.MYSQLHOST || process.env.DB_HOST || null,
    user: process.env.MYSQLUSER || process.env.DB_USER || null,
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQLDATABASE || process.env.DB_NAME || null,
    port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
    connectTimeout: 5000
  };

  const missing = [];
  if (!dbConfig.host) missing.push('host');
  if (!dbConfig.user) missing.push('user');
  if (!dbConfig.database) missing.push('database');

  console.log(`DB host     : ${dbConfig.host || '(missing)'}`);
  console.log(`DB user     : ${dbConfig.user || '(missing)'}`);
  console.log(`DB database : ${dbConfig.database || '(missing)'}`);
  console.log(`DB port     : ${dbConfig.port}`);
  console.log(`DB password : ${maskEnvValue('DB_PASSWORD', dbConfig.password)}`);

  if (missing.length > 0) {
    console.log(statusText(false, `Skipping connectivity test: missing ${missing.join(', ')}`));
    return;
  }

  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.query('SELECT 1');
    await connection.end();
    console.log(statusText(true, 'MySQL connectivity verified successfully'));
  } catch (error) {
    console.error(color('MySQL connectivity failed:', colors.red));
    console.error(color(error.message, colors.yellow));
    if (error.code) {
      console.error(color(`Error code: ${error.code}`, colors.yellow));
    }
  }
}

function attachErrorHandlers() {
  process.on('unhandledRejection', (reason) => {
    console.error(`\n${color('Unhandled Promise Rejection:', colors.red)}`);
    console.error(reason instanceof Error ? reason.stack || reason.message : reason);
    process.exitCode = 1;
  });

  process.on('uncaughtException', (error) => {
    console.error(`\n${color('Uncaught Exception:', colors.red)}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

async function main() {
  attachErrorHandlers();
  printHeader('Node.js / Express Backend Debug Report');
  printStartupContext();
  printEnvVariables();
  await testDatabaseConnectivity();
  console.log(`\n${color('Debug script complete.', colors.green)}`);
}

main().catch((err) => {
  console.error(color('Debug script failed:', colors.red), err);
  process.exit(1);
});
