// debug-env.js
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

const requiredKeys = [
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'DB_PORT',
  'PORT',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

const fallbackKeys = {
  DB_HOST: 'MYSQLHOST',
  DB_USER: 'MYSQLUSER',
  DB_PASSWORD: 'MYSQLPASSWORD',
  DB_NAME: 'MYSQLDATABASE',
  DB_PORT: 'MYSQLPORT'
};

const mask = (key, value) => {
  if (!value) return '(missing)';
  if (/(PASSWORD|SECRET|KEY|TOKEN|CLIENT_ID)/i.test(key)) {
    const visible = 4;
    return value.length <= visible
      ? '*'.repeat(value.length)
      : '*'.repeat(value.length - visible) + value.slice(-visible);
  }
  return value;
};

const findEnvFile = () => {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '.env'),
    path.resolve(process.cwd(), '..', '.env'),
    path.resolve(__dirname, '..', '.env')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
};

const printHeader = (title) => {
  console.log(`\n=== ${title} ===`);
};

const printSuggestion = (message) => {
  console.log(`> ${message}`);
};

const printVariables = () => {
  printHeader('Loaded Environment Variables');
  requiredKeys.forEach((key) => {
    const value = process.env[key];
    console.log(`${key.padEnd(25)}: ${mask(key, value)}`);
  });
};

const checkMismatches = () => {
  printHeader('Variable Name Check');
  const missingPrimary = requiredKeys.filter((key) => !process.env[key]);
  const fallbackUsed = [];

  Object.entries(fallbackKeys).forEach(([primary, fallback]) => {
    if (!process.env[primary] && process.env[fallback]) {
      fallbackUsed.push({ primary, fallback, value: process.env[fallback] });
    }
  });

  if (missingPrimary.length === 0 && fallbackUsed.length === 0) {
    console.log('All required variable names are present.');
  } else {
    if (missingPrimary.length > 0) {
      console.log(`Missing primary variables: ${missingPrimary.join(', ')}`);
    }
    fallbackUsed.forEach(({ primary, fallback }) => {
      console.log(`Using fallback ${fallback} for ${primary}`);
      printSuggestion(`Set ${primary} in .env instead of relying on ${fallback}.`);
    });
  }

  if (missingPrimary.length > 0 && fallbackUsed.length === 0) {
    printSuggestion('If you are using MYSQLHOST/MYSQLUSER/etc., add corresponding DB_* names to .env.');
  }
};

const testDbConnection = async () => {
  printHeader('MySQL Connectivity Test');

  const config = {
    host: process.env.DB_HOST || process.env.MYSQLHOST,
    user: process.env.DB_USER || process.env.MYSQLUSER,
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
    database: process.env.DB_NAME || process.env.MYSQLDATABASE,
    port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
    connectTimeout: 5000
  };

  const missing = ['host', 'user', 'database'].filter((key) => !config[key]);
  if (missing.length > 0) {
    console.log(`Cannot test DB connection because these values are missing: ${missing.join(', ')}`);
    printSuggestion('Add DB_HOST, DB_USER, and DB_NAME to .env before testing connectivity.');
    return;
  }

  console.log(`Connecting to MySQL at ${config.host}:${config.port} as ${config.user}...`);

  try {
    const conn = await mysql.createConnection(config);
    await conn.query('SELECT 1');
    await conn.end();
    console.log('✅ MySQL connectivity test passed.');
  } catch (err) {
    console.log('❌ MySQL connectivity test failed.');
    console.log('Error code :', err.code || '(none)');
    console.log('Message    :', err.message);
    if (err.sqlState) console.log('SQL state  :', err.sqlState);
    if (err.code === 'ENOTFOUND') {
      printSuggestion('DB_HOST appears incorrect or unreachable.');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      printSuggestion('DB_USER or DB_PASSWORD is wrong.');
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      printSuggestion('DB_NAME does not exist or is incorrect.');
    } else if (err.code === 'ECONNREFUSED') {
      printSuggestion('MySQL server is not accepting connections on the given host/port.');
    }
  }
};

const main = async () => {
  printHeader('Debug Script Starting');
  const envPath = findEnvFile();

  if (!envPath) {
    console.log('❌ Could not find a .env file.');
    printSuggestion('Place .env in the backend root (fof-backend/.env) and rerun this script.');
    return;
  }

  console.log('.env file:', envPath);
  dotenv.config({ path: envPath });

  printVariables();
  checkMismatches();
  await testDbConnection();
};

main().catch((err) => {
  console.error('Unexpected error:', err);
});