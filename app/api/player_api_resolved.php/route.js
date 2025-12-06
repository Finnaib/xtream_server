// File Location: app/api/player_api_resolved.php/route.js
// Xtream API that ALWAYS resolves redirects

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { authenticateUser } from '../../../lib/auth.js';
import { getConnection } from '../../../lib/db.js';

async function resolveRedirect(url) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': '*/*'
      }
    });
    return response.url;
  } catch (error) {
    return url;
  }
}

async function getStreamsResolved(type, categoryId) {
  const conn = await getConnection();
  
  let query = 'SELECT * FROM streams WHERE type = ? AND active = ?';
  let params = [type, 1];
  
  if (categoryId) {
    query += ' AND category_id = ?';
    params.push(categoryId);
  }
  
  const [rows] = await conn.execute(query, params);
  
  const streams = await Promise.all(rows.map(async (stream) => {
    let streamUrl = stream.stream_source || stream.direct_source || '';
    
    // ALWAYS resolve redirects
    if (streamUrl) {
      streamUrl = await resolveRedirect(streamUrl);
    }
    
    return {
      num: stream.id,
      name: stream.name,
      stream_type: type,
      stream_id: stream.id,
      stream_icon: stream.icon || "",
      epg_channel_id: stream.epg_channel_id || "",
      added: stream.created_at ? Math.floor(new Date(stream.created_at).getTime() / 1000) : "",
      category_id: stream.category_id?.toString() || "",
      custom_sid: "",
      tv_archive: 0,
      direct_source: streamUrl,
      tv_archive_duration: 0
    };
  }));
  
  return streams;
}

async function getCategories(type) {
  const conn = await getConnection();
  const [rows] = await conn.execute('SELECT * FROM categories WHERE type = ?', [type]);
  return rows.map(cat => ({
    category_id: cat.id.toString(),
    category_name: cat.name,
    parent_id: 0
  }));
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const username = searchParams.get('username');
    const password = searchParams.get('password');
    const action = searchParams.get('action');
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';

    if (!username || !password) {
      return NextResponse.json({ user_info: { auth: 0 } }, { status: 401 });
    }

    const user = await authenticateUser(username, password);
    if (!user) {
      return NextResponse.json({ user_info: { auth: 0 } }, { status: 401 });
    }

    switch (action) {
      case 'get_live_streams':
        const categoryId = searchParams.get('category_id');
        const liveStreams = await getStreamsResolved('live', categoryId);
        return NextResponse.json(liveStreams);

      case 'get_vod_streams':
        const vodCategoryId = searchParams.get('category_id');
        const vodStreams = await getStreamsResolved('movie', vodCategoryId);
        return NextResponse.json(vodStreams);

      case 'get_series':
        return NextResponse.json([]);

      case 'get_live_categories':
        return NextResponse.json(await getCategories('live'));

      case 'get_vod_categories':
        return NextResponse.json(await getCategories('movie'));

      case 'get_series_categories':
        return NextResponse.json(await getCategories('series'));

      case 'get_series_info':
      case 'get_vod_info':
      case 'get_short_epg':
        return NextResponse.json({});

      default:
        return NextResponse.json({
          user_info: {
            username: user.username,
            password: user.password,
            auth: 1,
            status: "Active",
            exp_date: "1924905600",
            is_trial: "0",
            active_cons: "0",
            created_at: Math.floor(Date.now() / 1000),
            max_connections: "5",
            allowed_output_formats: ["ts", "m3u8"]
          },
          server_info: {
            url: serverUrl.replace('https://', '').replace('http://', ''),
            port: "80",
            https_port: "443",
            server_protocol: "http",
            rtmp_port: "1935",
            timestamp_now: Math.floor(Date.now() / 1000),
            time_now: new Date().toISOString()
          }
        });
    }
  } catch (error) {
    return NextResponse.json({ user_info: { auth: 0 } }, { status: 500 });
  }
}