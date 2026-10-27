require('dotenv').config();

console.log('📋 .env variables:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '✅ SET' : '❌ NOT SET');
console.log('DB_NAME:', process.env.DB_NAME);