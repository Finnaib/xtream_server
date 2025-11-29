// File Location: app/api/stream/[username]/[password]/[streamId]/[extension]/route.js
// Simplified stream endpoint with proper error handling

import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Create a fresh connection for each request
async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    connectTimeout: 5000, // 5 second timeout
  });
}

export async function GET(request, { params }) {
  let conn;
  
  try {
    console.log('🎬 Stream request:', params);
    
    const { username, password, streamId, extension } = params;

    // Quick auth check
    conn = await getConnection();
    const [users] = await conn.execute(
      'SELECT id FROM users WHERE username = ? AND password = ? AND active = 1',
      [username, password]
    );
    
    if (users.length === 0) {
      console.log('❌ Auth failed');
      await conn.end();
      return new NextResponse('Unauthorized', { status: 401 });
    }

    console.log('✅ Auth OK');

    // Get stream
    const [streams] = await conn.execute(
      'SELECT stream_source, direct_source, name FROM streams WHERE id = ? AND active = 1 LIMIT 1',
      [streamId]
    );

    await conn.end();

    if (streams.length === 0) {
      console.log('❌ Stream not found:', streamId);
      return new NextResponse('Stream not found', { status: 404 });
    }

    const streamUrl = streams[0].stream_source || streams[0].direct_source;
    
    if (!streamUrl) {
      console.log('❌ No URL for stream:', streamId);
      return new NextResponse('Stream URL not available', { status: 404 });
    }

    console.log('✅ Redirecting to:', streamUrl.substring(0, 50) + '...');
    
    // Use 302 temporary redirect
    return Response.redirect(streamUrl, 302);

  } catch (error) {
    console.error('❌ Stream error:', error.message);
    if (conn) {
      try { await conn.end(); } catch (e) {}
    }
    return new NextResponse('Server error: ' + error.message, { status: 500 });
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    }
  });
}