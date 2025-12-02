// File Location: app/api/player_api.php/route.js
// Returns DIRECT stream URLs for maximum compatibility

import { NextResponse } from 'next/server';
import { authenticateUser } from '../../../lib/auth.js';
import { getConnection } from '../../../lib/db.js';

async function getStreamsWithDirectURLs(type, categoryId = null) {
  const conn = await getConnection();
  
  let query = 'SELECT * FROM streams WHERE type = ? AND active = ?';
  let params = [type, 1];
  
  if (categoryId) {
    query += ' AND category_id = ?';
    params.push(categoryId);
  }
  
  const [rows] = await conn.execute(query, params);
  
  return rows.map(stream => {
    // Use the ACTUAL stream URL from M3U file
    const directUrl = stream.stream_source || stream.direct_source || '';
    
    return {
      num: stream.id,
      name: stream.name,
      stream_type: type,
      stream_id: stream.id,
      stream_icon: stream.icon || "",
      epg_channel_id: stream.epg_channel_id || "",
      added: stream.created_at ? Math.floor(new Date(stream.created_at).getTime() / 1000) : "",
      category_id: stream.category_id?.toString() || "",
      custom_sid: stream.custom_sid || "",
      tv_archive: stream.tv_archive || 0,
      direct_source: directUrl, // ACTUAL stream URL
      tv_archive_duration: stream.tv_archive_duration || 0,
      rating: stream.rating?.toString() || "0",
      rating_5based: parseFloat((stream.rating || 0) / 2).toFixed(1),
      container_extension: stream.container_extension || "m3u8",
      tmdb_id: stream.tmdb_id || ""
    };
  });
}

async function getCategories(type) {
  const conn = await getConnection();
  const [rows] = await conn.execute(
    'SELECT * FROM categories WHERE type = ?',
    [type]
  );
  
  return rows.map(cat => ({
    category_id: cat.id.toString(),
    category_name: cat.name,
    parent_id: cat.parent_id || 0
  }));
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const username = searchParams.get('username');
    const password = searchParams.get('password');
    const action = searchParams.get('action');

    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';

    // Authenticate
    if (!username || !password) {
      return NextResponse.json({ 
        user_info: { auth: 0, message: 'Invalid credentials' } 
      }, { status: 401 });
    }

    const user = await authenticateUser(username, password);
    if (!user) {
      return NextResponse.json({ 
        user_info: { auth: 0, message: 'Invalid credentials' } 
      }, { status: 401 });
    }

    // Handle actions
    switch (action) {
      case 'get_live_streams':
        const categoryId = searchParams.get('category_id');
        const liveStreams = await getStreamsWithDirectURLs('live', categoryId);
        return NextResponse.json(liveStreams);

      case 'get_vod_streams':
        const vodCategoryId = searchParams.get('category_id');
        const vodStreams = await getStreamsWithDirectURLs('movie', vodCategoryId);
        return NextResponse.json(vodStreams);

      case 'get_series':
        return NextResponse.json([]);

      case 'get_live_categories':
        const liveCategories = await getCategories('live');
        return NextResponse.json(liveCategories);

      case 'get_vod_categories':
        const vodCategories = await getCategories('movie');
        return NextResponse.json(vodCategories);

      case 'get_series_categories':
        const seriesCategories = await getCategories('series');
        return NextResponse.json(seriesCategories);

      case 'get_series_info':
        return NextResponse.json({ seasons: [], info: {}, episodes: {} });

      case 'get_vod_info':
        const vodId = searchParams.get('vod_id');
        if (!vodId) {
          return NextResponse.json({ error: 'vod_id required' }, { status: 400 });
        }
        
        const conn = await getConnection();
        const [movies] = await conn.execute(
          'SELECT * FROM streams WHERE id = ? AND type = ?',
          [vodId, 'movie']
        );
        
        if (movies.length === 0) {
          return NextResponse.json({ info: {}, movie_data: {} });
        }
        
        const movie = movies[0];
        const streamSource = movie.stream_source || movie.direct_source || '';
        
        return NextResponse.json({
          info: {
            tmdb_id: movie.tmdb_id || "",
            name: movie.name,
            cover_big: movie.icon || "",
            rating: movie.rating || 0
          },
          movie_data: {
            stream_id: movie.id,
            name: movie.name,
            added: movie.created_at ? Math.floor(new Date(movie.created_at).getTime() / 1000) : "",
            container_extension: movie.container_extension || "mp4",
            direct_source: streamSource
          }
        });

      case 'get_short_epg':
        return NextResponse.json({ epg_listings: [] });

      default:
        // User info
        return NextResponse.json({
          user_info: {
            username: user.username,
            password: user.password,
            message: user.message || "",
            auth: 1,
            status: user.status || "active",
            exp_date: user.exp_date ? Math.floor(new Date(user.exp_date).getTime() / 1000) : null,
            is_trial: user.is_trial ? "1" : "0",
            active_cons: "0",
            created_at: user.created_at ? Math.floor(new Date(user.created_at).getTime() / 1000) : null,
            max_connections: user.max_connections?.toString() || "1",
            allowed_output_formats: ["m3u8", "ts", "rtmp", "mp4"]
          },
          server_info: {
            url: serverUrl,
            port: "80",
            https_port: "443",
            server_protocol: serverUrl.includes('https') ? 'https' : 'http',
            rtmp_port: "1935",
            timezone: "UTC",
            timestamp_now: Math.floor(Date.now() / 1000),
            time_now: new Date().toISOString()
          }
        });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
}