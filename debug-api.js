// File Location: debug-api.js
// Simple debug without external dependencies

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function debugAPI() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306
    });
    
    console.log('🔍 Checking API data...\n');
    
    // Get sample streams
    const [streams] = await conn.execute('SELECT * FROM streams LIMIT 5');
    
    if (streams.length === 0) {
      console.log('❌ No streams in database!');
      process.exit(1);
    }
    
    console.log(`📺 Found ${streams.length} sample streams:\n`);
    
    streams.forEach((stream, i) => {
      console.log(`${i + 1}. ${stream.name}`);
      console.log(`   ID: ${stream.id}`);
      console.log(`   Type: ${stream.type}`);
      
      const url = stream.stream_source || stream.direct_source;
      if (url) {
        console.log(`   ✅ URL: ${url.substring(0, 80)}...`);
        console.log(`   Format: ${url.includes('.m3u8') ? 'M3U8/HLS' : url.includes('.ts') ? 'MPEG-TS' : 'OTHER'}`);
      } else {
        console.log(`   ❌ NO URL!`);
      }
      console.log('');
    });
    
    // Check total counts
    const [counts] = await conn.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN stream_source IS NOT NULL AND stream_source != '' THEN 1 ELSE 0 END) as with_url
      FROM streams WHERE active = 1
    `);
    
    console.log('📊 Database Stats:');
    console.log(`   Total streams: ${counts[0].total}`);
    console.log(`   Streams with URLs: ${counts[0].with_url}`);
    console.log(`   Streams without URLs: ${counts[0].total - counts[0].with_url}`);
    
    if (counts[0].with_url === 0) {
      console.log('\n❌ PROBLEM: No streams have URLs!');
      console.log('   Your M3U import might have failed.');
    }
    
    console.log('\n💡 What to test:');
    console.log('   1. Copy one of the URLs above');
    console.log('   2. Test it in VLC (Media → Open Network Stream)');
    console.log('   3. If VLC plays it → URL is good');
    console.log('   4. If VLC fails → Your M3U stream sources are dead\n');
    
    console.log('🔗 Test URLs:');
    console.log(`   API Streams: http://localhost:3000/player_api.php?username=finn&password=finn123&action=get_live_streams`);
    console.log(`   M3U Direct: http://localhost:3000/get.php?username=finn&password=finn123&direct=yes`);
    console.log(`   Stream Test: http://localhost:3000/finn/finn123/${streams[0].id}.ts\n`);
    
    await conn.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugAPI();