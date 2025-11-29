// File Location: test-stream.js
// Test if stream URLs are valid

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function testStreams() {
  try {
    console.log('🔍 Testing Stream URLs...\n');
    
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });
    
    // Get first 3 streams
    const [streams] = await conn.execute('SELECT * FROM streams LIMIT 3');
    
    if (streams.length === 0) {
      console.log('❌ No streams found in database!');
      process.exit(1);
    }
    
    console.log(`Found ${streams.length} sample stream(s):\n`);
    
    streams.forEach((stream, index) => {
      console.log(`Stream ${index + 1}:`);
      console.log(`  ID: ${stream.id}`);
      console.log(`  Name: ${stream.name}`);
      console.log(`  Source URL: ${stream.stream_source || 'NOT SET'}`);
      console.log(`  Direct Source: ${stream.direct_source || 'NOT SET'}`);
      console.log(`\n  Test in VLC:`);
      console.log(`  ${stream.stream_source || stream.direct_source || 'NO URL'}`);
      console.log(`\n  Test via server:`);
      console.log(`  http://localhost:3000/finn/finn123/${stream.id}.ts`);
      console.log('─'.repeat(60) + '\n');
    });
    
    console.log('💡 Next steps:');
    console.log('1. Copy one of the "Source URL" links above');
    console.log('2. Test it directly in VLC (Media → Open Network Stream)');
    console.log('3. If that works, the stream is valid');
    console.log('4. If that fails, your M3U file has dead/expired links\n');
    
    await conn.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testStreams();