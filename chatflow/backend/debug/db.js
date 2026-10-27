require('dotenv').config({ path: '../.env' });

console.log('🔍 Debugging Database Connection...');
console.log('====================================');
console.log('DB_PASSWORD from .env:', process.env.DB_PASSWORD ? '✅ ' + process.env.DB_PASSWORD : '❌ NOT SET');
console.log('DB_HOST:', process.env.DB_HOST || 'localhost');
console.log('DB_PORT:', process.env.DB_PORT || '5432');
console.log('DB_USER:', process.env.DB_USER || 'postgres');
console.log('DB_NAME:', process.env.DB_NAME || 'chatflow');
console.log('====================================');

const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'areeba90',
    database: process.env.DB_NAME || 'chatflow',
});

async function test() {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as time, current_database() as db, current_user as user');
        console.log('✅ Connected successfully!');
        console.log('📊 Database:', result.rows[0].db);
        console.log('👤 User:', result.rows[0].user);
        console.log('📅 Time:', result.rows[0].time);
        client.release();
        await pool.end();
        console.log('\n🎉 Database is working! Now run: npm run dev');
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
    }
}

test();