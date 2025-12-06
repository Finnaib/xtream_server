// File Location: app/api/stream/[username]/[password]/[streamId]/[extension]/route.js
// Stream redirect optimized for old MPEG4 boxes

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    connectTimeout: 5000,
  });
}

export async function GET(request, { params }) {
  let conn;
  
  try {
    const { username, password, streamId, extension } = params;

    // Quick auth
    conn = await getConnection();
    const [users] = await conn.execute(
      'SELECT id FROM users WHERE username = ? AND password = ? AND active = 1',
      [username, password]
    );
    
    if (users.length === 0) {
      await conn.end();
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get stream
    const [streams] = await conn.execute(
      'SELECT stream_source, direct_source FROM streams WHERE id = ? AND active = 1',
      [streamId]
    );

    await conn.end();

    if (streams.length === 0) {
      return new NextResponse('Not found', { status: 404 });
    }

    const streamUrl = streams[0].stream_source || streams[0].direct_source;
    
    if (!streamUrl) {
      return new NextResponse('No URL', { status: 404 });
    }

    // Use 302 redirect with minimal headers for old box compatibility
    return new Response(null, {
      status: 302,
      headers: {
        'Location': streamUrl,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Stream error:', error);
    if (conn) {
      try { await conn.end(); } catch (e) {}
    }
    return new NextResponse('Error', { status: 500 });
  }
}

// Handle HEAD requests (some boxes check this first)
export async function HEAD(request, { params }) {
  return GET(request, { params });
}