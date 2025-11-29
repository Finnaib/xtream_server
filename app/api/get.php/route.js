// File Location: app/api/get.php/route.js
// Generate M3U playlist with BOTH direct URLs and server URLs

import { NextResponse } from 'next/server';
import { authenticateUser } from '../../../lib/auth.js';
import { getConnection } from '../../../lib/db.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const username = searchParams.get('username');
    const password = searchParams.get('password');
    const type = searchParams.get('type') || 'm3u';
    const output = searchParams.get('output') || 'ts';
    const direct = searchParams.get('direct') || 'no'; // Option to use direct URLs

    // Authenticate user
    if (!username || !password) {
      return new NextResponse('Missing credentials', { status: 401 });
    }

    const user = await authenticateUser(username, password);
    if (!user) {
      return new NextResponse('Invalid credentials', { status: 401 });
    }

    const conn = await getConnection();
    
    // Get all live streams with their categories
    const [streams] = await conn.execute(`
      SELECT s.*, c.name as category_name 
      FROM streams s 
      LEFT JOIN categories c ON s.category_id = c.id 
      WHERE s.type = 'live' AND s.active = 1
      ORDER BY c.name, s.name
    `);

    // Generate M3U content
    let m3uContent = '#EXTM3U\n';
    
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';
    
    streams.forEach(stream => {
      const category = stream.category_name || 'Uncategorized';
      const icon = stream.icon || '';
      const epgId = stream.epg_channel_id || '';
      const name = stream.name || 'Unknown';
      
      // Choose between direct URL or server redirect URL
      let streamUrl;
      if (direct === 'yes') {
        // Use direct stream URL from database (works in VLC)
        streamUrl = stream.stream_source || stream.direct_source || '';
      } else {
        // Use server redirect URL (for Xtream compatibility)
        streamUrl = `${serverUrl}/${username}/${password}/${stream.id}.${output}`;
      }
      
      if (streamUrl) {
        m3uContent += `#EXTINF:-1 tvg-id="${epgId}" tvg-name="${name}" tvg-logo="${icon}" group-title="${category}",${name}\n`;
        m3uContent += `${streamUrl}\n`;
      }
    });

    // Return M3U with proper headers
    return new NextResponse(m3uContent, {
      status: 200,
      headers: {
        'Content-Type': 'audio/x-mpegurl',
        'Content-Disposition': 'attachment; filename="playlist.m3u"',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (error) {
    console.error('M3U generation error:', error);
    return new NextResponse('Error generating playlist', { status: 500 });
  }
}