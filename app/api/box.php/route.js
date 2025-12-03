// File Location: app/api/box.php/route.js
// Ultra-simple M3U for old MPEG4 boxes

import { NextResponse } from 'next/server';
import { authenticateUser } from '../../../lib/auth.js';
import { getConnection } from '../../../lib/db.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const username = searchParams.get('username');
    const password = searchParams.get('password');

    // Authenticate
    if (!username || !password) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = await authenticateUser(username, password);
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const conn = await getConnection();
    
    // Get all streams
    const [streams] = await conn.execute(
      'SELECT s.*, c.name as category_name FROM streams s LEFT JOIN categories c ON s.category_id = c.id WHERE s.type = ? AND s.active = ?',
      ['live', 1]
    );

    // Generate ultra-simple M3U (no special attributes that might confuse old boxes)
    let m3u = '#EXTM3U\n';
    
    streams.forEach(stream => {
      const streamUrl = stream.stream_source || stream.direct_source || '';
      
      // Only include HTTP streams (no HTTPS - old boxes can't handle SSL)
      if (streamUrl && streamUrl.startsWith('http://')) {
        // Ultra-simple format
        m3u += `#EXTINF:-1,${stream.name}\n`;
        m3u += `${streamUrl}\n`;
      }
    });

    return new NextResponse(m3u, {
      status: 200,
      headers: {
        'Content-Type': 'audio/x-mpegurl; charset=utf-8',
        'Content-Disposition': 'inline; filename="playlist.m3u"',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Box M3U error:', error);
    return new NextResponse('Error', { status: 500 });
  }
}