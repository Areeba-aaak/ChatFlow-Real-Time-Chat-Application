const { query, connectDB } = require('../config/database');

async function checkTables() {
  try {
    // First, connect to the database
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database\n');
    
    console.log('🔍 Checking database tables...\n');
    
    // Check if users table exists
    const tables = await query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    console.log('📋 Tables in database:');
    if (tables.length === 0) {
      console.log('  ❌ No tables found!');
    } else {
      tables.forEach(t => console.log(`  - ${t.table_name}`));
    }
    console.log('');
    
    // Check users table structure
    const columns = await query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'users' 
       ORDER BY ordinal_position`
    );
    
    if (columns.length === 0) {
      console.log('❌ Users table does not exist!');
      console.log('📝 Please run your migrations first.');
    } else {
      console.log('📋 Users table columns:');
      columns.forEach(c => console.log(`  - ${c.column_name} (${c.data_type})`));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('📝 Full error:', error);
  }
}

checkTables();