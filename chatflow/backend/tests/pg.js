const { Pool } = require('pg');

// Hardcode the connection for testing
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'areeba90',
  database: 'chatflow',
});

async function testConnection() {
  console.log('🔌 Testing PostgreSQL connection...');
  try {
    const client = await pool.connect();
    console.log('✅ Connected successfully!');
    
    const result = await client.query('SELECT NOW() as time, current_database() as db');
    console.log('📊 Database:', result.rows[0].db);
    console.log('📅 Time:', result.rows[0].time);
    
    client.release();
    await pool.end();
    console.log('\n🎉 PostgreSQL is working!');
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('📝 Error details:', error);
    return false;
  }
}

testConnection();