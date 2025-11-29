// File Location: check-setup.js
// Run this to diagnose your setup: node check-setup.js

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function checkSetup() {
  console.log('🔍 Checking Xtream Server Setup...\n');
  
  let allGood = true;
  
  // Check 1: .env.local exists
  console.log('1️⃣ Checking .env.local file...');
  if (fs.existsSync('.env.local')) {
    console.log('   ✅ .env.local exists');
    console.log(`   - DB_HOST: ${process.env.DB_HOST || 'NOT SET'}`);
    console.log(`   - DB_USER: ${process.env.DB_USER || 'NOT SET'}`);
    console.log(`   - DB_NAME: ${process.env.DB_NAME || 'NOT SET'}`);
    console.log(`   - SERVER_URL: ${process.env.NEXT_PUBLIC_SERVER_URL || 'NOT SET'}`);
  } else {
    console.log('   ❌ .env.local not found!');
    console.log('   Create .env.local with your database credentials');
    allGood = false;
  }
  
  // Check 2: M3U folder and files
  console.log('\n2️⃣ Checking M3U folder...');
  if (fs.existsSync('./m3u')) {
    const files = fs.readdirSync('./m3u').filter(f => 
      f.endsWith('.m3u') || f.endsWith('.m3u8')
    );
    console.log(`   ✅ M3U folder exists with ${files.length} file(s):`);
    files.forEach(f => console.log(`      - ${f}`));
    
    if (files.length === 0) {
      console.log('   ⚠️ No M3U files found! Add your M3U files to the m3u folder.');
      allGood = false;
    }
  } else {
    console.log('   ❌ M3U folder not found!');
    console.log('   Create a "m3u" folder and add your M3U files');
    allGood = false;
  }
  
  // Check 3: Database connection
  console.log('\n3️⃣ Checking database connection...');
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });
    console.log('   ✅ Database connection successful!');
    
    // Check tables
    console.log('\n4️⃣ Checking database tables...');
    const [tables] = await conn.execute("SHOW TABLES");
    console.log(`   ✅ Found ${tables.length} tables:`);
    tables.forEach(t => console.log(`      - ${Object.values(t)[0]}`));
    
    if (tables.length === 0) {
      console.log('   ⚠️ No tables found! Import database-schema.sql');
      allGood = false;
    }
    
    // Check users
    console.log('\n5️⃣ Checking users...');
    try {
      const [users] = await conn.execute('SELECT username, active, exp_date FROM users');
      console.log(`   ✅ Found ${users.length} user(s):`);
      users.forEach(u => {
        const expDate = u.exp_date ? new Date(u.exp_date).toLocaleDateString() : 'Never';
        console.log(`      - ${u.username} (Active: ${u.active}, Expires: ${expDate})`);
      });
    } catch (e) {
      console.log('   ⚠️ Could not read users table:', e.message);
    }
    
    // Check categories
    console.log('\n6️⃣ Checking categories...');
    try {
      const [categories] = await conn.execute('SELECT type, COUNT(*) as count FROM categories GROUP BY type');
      if (categories.length > 0) {
        console.log('   ✅ Categories found:');
        categories.forEach(c => console.log(`      - ${c.type}: ${c.count} categories`));
      } else {
        console.log('   ⚠️ No categories found! Run: npm run import:m3u');
        allGood = false;
      }
    } catch (e) {
      console.log('   ⚠️ Could not read categories:', e.message);
    }
    
    // Check streams
    console.log('\n7️⃣ Checking streams...');
    try {
      const [streams] = await conn.execute('SELECT type, COUNT(*) as count FROM streams GROUP BY type');
      if (streams.length > 0) {
        console.log('   ✅ Streams found:');
        streams.forEach(s => console.log(`      - ${s.type}: ${s.count} streams`));
      } else {
        console.log('   ⚠️ No streams found! Run: npm run import:m3u');
        allGood = false;
      }
    } catch (e) {
      console.log('   ⚠️ Could not read streams:', e.message);
    }
    
    // Sample stream check
    console.log('\n8️⃣ Checking sample stream...');
    try {
      const [sample] = await conn.execute('SELECT id, name, stream_source FROM streams LIMIT 1');
      if (sample.length > 0) {
        console.log('   ✅ Sample stream:');
        console.log(`      ID: ${sample[0].id}`);
        console.log(`      Name: ${sample[0].name}`);
        console.log(`      URL: ${sample[0].stream_source ? 'Available' : 'Missing'}`);
        
        if (sample[0].stream_source) {
          console.log(`\n   Test this URL in VLC:`);
          console.log(`   http://localhost:3000/finn/finn123/${sample[0].id}.ts`);
        }
      }
    } catch (e) {
      console.log('   ⚠️ Could not read sample stream:', e.message);
    }
    
    await conn.end();
    
  } catch (error) {
    console.log('   ❌ Database connection failed!');
    console.log('   Error:', error.message);
    console.log('\n   Possible issues:');
    console.log('   - MySQL is not running (start XAMPP or MySQL service)');
    console.log('   - Wrong credentials in .env.local');
    console.log('   - Database does not exist (create xtream_db)');
    allGood = false;
  }
  
  // Final summary
  console.log('\n' + '='.repeat(50));
  if (allGood) {
    console.log('✅ Setup looks good!');
    console.log('\nNext steps:');
    console.log('1. Start server: npm run dev');
    console.log('2. Open browser: http://localhost:3000/player_api.php?username=finn&password=finn123');
    console.log('3. Test in IPTV player with Xtream Codes API');
  } else {
    console.log('⚠️ Some issues found. Please fix them and run this script again.');
    console.log('\nCommon fixes:');
    console.log('- Start MySQL (XAMPP Control Panel → Start MySQL)');
    console.log('- Import schema: mysql -u root -p xtream_db < database-schema.sql');
    console.log('- Import M3U: npm run import:m3u');
  }
  console.log('='.repeat(50) + '\n');
}

checkSetup().catch(console.error);