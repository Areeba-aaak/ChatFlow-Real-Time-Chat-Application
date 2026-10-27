const { connectDB, query } = require('../config/database');
const { hashPassword } = require('../utils/password');

async function testRegister() {
  try {
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Connected!\n');
    
    // Delete test user if exists
    await query('DELETE FROM users WHERE username = $1', ['testuser']);
    console.log('🗑️  Cleaned up existing test user\n');
    
    const username = 'testuser';
    const email = 'test@example.com';
    const password = await hashPassword('Test@123');
    const fullName = 'Test User';
    
    console.log('📝 Registering user...');
    console.log(`  Username: ${username}`);
    console.log(`  Email: ${email}`);
    console.log(`  Full Name: ${fullName}\n`);
    
    const result = await query(
      `INSERT INTO users (username, email, password, full_name, status) 
       VALUES ($1, $2, $3, $4, 'offline') 
       RETURNING id, username, email, full_name`,
      [username, email, password, fullName]
    );
    
    console.log('✅ User registered successfully!');
    console.log('📊 Result:', result[0]);
    
    // Verify the user was created
    const user = await query('SELECT id, username, email, full_name FROM users WHERE username = $1', ['testuser']);
    console.log('\n👤 User in database:', user[0]);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('📝 Full error:', error);
  }
}

testRegister();