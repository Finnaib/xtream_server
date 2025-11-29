// File Location: test-stream-url.js
// Test if stream URLs are working

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function testStreamURLs() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });
    
    const [streams] = await conn.execute('SELECT * FROM streams LIMIT 3');
    
    console.log('🧪 Test these URLs in your browser:\n');
    
    streams.forEach((stream, i) => {
      console.log(`Stream ${i + 1}: ${stream.name}`);
      console.log(`  Direct URL (should work):`);
      console.log(`  ${stream.stream_source || stream.direct_source}`);
      console.log(`\n  Via Server (test this):`);
      console.log(`  http://localhost:3000/finn/finn123/${stream.id}.ts`);
      console.log(`\n  Via API path (test this too):`);
      console.log(`  http://localhost:3000/api/stream/finn/finn123/${stream.id}/ts`);
      console.log('\n' + '─'.repeat(70) + '\n');
    });
    
    console.log('💡 Test instructions:');
    console.log('1. Copy a "Direct URL" and test in VLC - should play');
    console.log('2. Copy "Via Server" URL and test in browser - should redirect');
    console.log('3. If "Via Server" shows 404, the route is not working\n');
    
    await conn.end();
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testStreamURLs();