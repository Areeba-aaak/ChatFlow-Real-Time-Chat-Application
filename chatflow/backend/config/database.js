const { Pool } = require('pg');
const logger = require('../utils/logger');

let pool = null;

const connectDB = async () => {
  try {
    const password = process.env.DB_PASSWORD || 'areeba90';
    
    console.log('📋 PostgreSQL Connection Config:');
    console.log(`  Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`  Port: ${parseInt(process.env.DB_PORT) || 5432}`);
    console.log(`  User: ${process.env.DB_USER || 'postgres'}`);
    console.log(`  Password: ${password ? '✅ Set' : '❌ Not Set'}`);
    console.log(`  Database: ${process.env.DB_NAME || 'chatflow'}`);
    console.log('');
    
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: password,
      database: process.env.DB_NAME || 'chatflow',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    // Test connection
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as time, current_database() as db, current_user as user');
    client.release();

    logger.info('PostgreSQL database connected successfully', {
      database: result.rows[0].db,
      user: result.rows[0].user,
      time: result.rows[0].time,
    });

    console.log('✅ PostgreSQL connection successful!\n');
    return pool;
  } catch (error) {
    console.error('\n❌ Database connection failed:');
    console.error(`  Error: ${error.message}`);
    console.error(`  Code: ${error.code}`);
    logger.error('Database connection failed:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    process.exit(1);
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error('Database not initialized. Please call connectDB() first.');
  }
  return pool;
};

const query = async (sql, params = []) => {
  const pool = getPool();
  try {
    // Log query in development (optional - remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 SQL:', sql);
      console.log('📊 Params:', params);
    }
    
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('❌ Query error:', {
      message: error.message,
      sql: sql,
      params: params
    });
    logger.error('Query error:', { 
      message: error.message, 
      sql, 
      params,
      stack: error.stack 
    });
    throw error;
  }
};

const queryOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

const transaction = async (callback) => {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    console.log('🔒 Transaction started');
    await client.query('BEGIN');
    
    const result = await callback(client);
    
    await client.query('COMMIT');
    console.log('✅ Transaction committed successfully');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Transaction rolled back:', error.message);
    logger.error('Transaction error:', {
      message: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    client.release();
    console.log('🔓 Transaction client released');
  }
};

// Helper function to check if a record exists
const exists = async (table, column, value) => {
  const result = await queryOne(
    `SELECT 1 FROM ${table} WHERE ${column} = $1 LIMIT 1`,
    [value]
  );
  return !!result;
};

// Helper function to get the count of records
const count = async (table, where = '', params = []) => {
  const sql = `SELECT COUNT(*) as count FROM ${table} ${where}`;
  const result = await queryOne(sql, params);
  return parseInt(result?.count || 0);
};

// Helper function to check if a table exists
const tableExists = async (tableName) => {
  const result = await queryOne(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    )`,
    [tableName]
  );
  return result?.exists || false;
};

module.exports = {
  connectDB,
  getPool,
  query,
  queryOne,
  transaction,
  exists,
  count,
  tableExists,
};