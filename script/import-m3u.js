// File Location: scripts/import-m3u.js
// Import M3U files into MySQL database (matches your schema)

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// M3U Parser
function parseM3U(content) {
  const lines = content.split('\n');
  const items = [];
  let currentItem = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('#EXTINF:')) {
      // Parse EXTINF line
      const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
      const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
      const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
      const groupTitleMatch = line.match(/group-title="([^"]*)"/);
      
      // Get title (after last comma)
      const titleMatch = line.split(',').pop();
      
      currentItem = {
        name: tvgNameMatch ? tvgNameMatch[1] : titleMatch,
        icon: tvgLogoMatch ? tvgLogoMatch[1] : '',
        epg_channel_id: tvgIdMatch ? tvgIdMatch[1] : '',
        category: groupTitleMatch ? groupTitleMatch[1] : 'Uncategorized'
      };
    } else if (line && !line.startsWith('#') && currentItem) {
      // This is the stream URL
      currentItem.stream_source = line;
      items.push(currentItem);
      currentItem = null;
    }
  }
  
  return items;
}

// Database connection
async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });
}

// Get or create category
async function getOrCreateCategory(conn, categoryName, type) {
  const [rows] = await conn.execute(
    'SELECT id FROM categories WHERE name = ? AND type = ?',
    [categoryName, type]
  );
  
  if (rows.length > 0) {
    return rows[0].id;
  }
  
  const [result] = await conn.execute(
    'INSERT INTO categories (name, type, parent_id) VALUES (?, ?, ?)',
    [categoryName, type, 0]
  );
  
  return result.insertId;
}

// Import M3U file
async function importM3UFile(conn, filePath) {
  console.log(`\n📁 Processing: ${filePath}`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath, path.extname(filePath));
  const items = parseM3U(content);
  
  // Determine type based on filename
  let type = 'live';
  if (fileName.toLowerCase().includes('movie') || fileName.toLowerCase().includes('vod')) {
    type = 'movie';
  } else if (fileName.toLowerCase().includes('series') || fileName.toLowerCase().includes('show')) {
    type = 'series';
  }
  
  console.log(`📺 Type: ${type}`);
  console.log(`📺 File Category: ${fileName}`);
  console.log(`🔢 Found ${items.length} streams`);
  
  let imported = 0;
  let skipped = 0;
  
  // Get or create main category from filename
  const mainCategoryId = await getOrCreateCategory(conn, fileName, type);
  
  for (const item of items) {
    try {
      // Use subcategory from M3U group-title, or use main category
      let categoryId = mainCategoryId;
      if (item.category !== 'Uncategorized') {
        categoryId = await getOrCreateCategory(conn, item.category, type);
      }
      
      // Check if stream already exists (by name and URL)
      const [existing] = await conn.execute(
        'SELECT id FROM streams WHERE name = ? AND stream_source = ?',
        [item.name, item.stream_source]
      );
      
      if (existing.length > 0) {
        skipped++;
        continue;
      }
      
      // Insert stream (matching your schema)
      await conn.execute(
        `INSERT INTO streams 
        (name, type, category_id, stream_source, icon, epg_channel_id, direct_source, active, created_at, container_extension) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
        [
          item.name,
          type,
          categoryId,
          item.stream_source,
          item.icon,
          item.epg_channel_id,
          item.stream_source, // direct_source same as stream_source
          1,
          type === 'movie' ? 'mp4' : 'm3u8'
        ]
      );
      
      imported++;
    } catch (error) {
      console.error(`Error importing ${item.name}:`, error.message);
    }
  }
  
  console.log(`✅ Imported: ${imported}`);
  console.log(`⏭️  Skipped (duplicates): ${skipped}`);
}

// Main import function
async function importAllM3U() {
  const conn = await getConnection();
  
  try {
    console.log('🚀 Starting M3U import...\n');
    
    const m3uFolder = './m3u';
    
    // Create m3u folder if it doesn't exist
    if (!fs.existsSync(m3uFolder)) {
      fs.mkdirSync(m3uFolder, { recursive: true });
      console.log(`✅ Created M3U folder: ${m3uFolder}`);
      console.log('📝 Please add your M3U files to this folder and run the script again.');
      process.exit(0);
    }
    
    // Get all M3U files
    const files = fs.readdirSync(m3uFolder).filter(f => 
      f.endsWith('.m3u') || f.endsWith('.m3u8')
    );
    
    if (files.length === 0) {
      console.log('⚠️  No M3U files found in ./m3u folder');
      console.log('📝 Please add your M3U files and run the script again.');
      process.exit(0);
    }
    
    console.log(`📚 Found ${files.length} M3U file(s)\n`);
    
    // Import each file
    for (const file of files) {
      const filePath = path.join(m3uFolder, file);
      await importM3UFile(conn, filePath);
    }
    
    // Show statistics
    const [stats] = await conn.execute(`
      SELECT 
        (SELECT COUNT(*) FROM categories) as total_categories,
        (SELECT COUNT(*) FROM categories WHERE type='live') as live_categories,
        (SELECT COUNT(*) FROM categories WHERE type='movie') as movie_categories,
        (SELECT COUNT(*) FROM streams) as total_streams,
        (SELECT COUNT(*) FROM streams WHERE type='live') as live_streams,
        (SELECT COUNT(*) FROM streams WHERE type='movie') as movie_streams
    `);
    
    console.log('\n📊 Database Statistics:');
    console.log(`   Total Categories: ${stats[0].total_categories}`);
    console.log(`   - Live TV: ${stats[0].live_categories}`);
    console.log(`   - Movies: ${stats[0].movie_categories}`);
    console.log(`   Total Streams: ${stats[0].total_streams}`);
    console.log(`   - Live TV: ${stats[0].live_streams}`);
    console.log(`   - Movies: ${stats[0].movie_streams}`);
    
    console.log('\n✨ Import completed successfully!');
    
  } catch (error) {
    console.error('❌ Import error:', error);
  } finally {
    await conn.end();
  }
}

// Run import
importAllM3U();