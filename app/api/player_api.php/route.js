// File Location: app/api/player_api.php/route.js
// Xtream API optimized for old MPEG4 boxes

import { NextResponse } from 'next/server';
import { authenticateUser } from '../../../lib/auth.js';
import { getConnection } from '../../../lib/db.js';

async function getStreamsForXtream(type, categoryId, username, password, serverUrl) {
  const conn = await getConnection();
  
  let query = 'SELECT * FROM streams WHERE type = ? AND active = ?';
  let params = [type, 1];
  
  if (categoryId) {
    query += ' AND category_id = ?';
    params.push(categoryId);
  }
  
  const [rows] = await conn.execute(query, params);
  
  return rows.map(stream => {
    const streamSource = stream.stream_source || stream.direct_source || '';
    
    // Determine extension
    let ext = 'ts';
    if (streamSource.includes('.m3u8')) ext = 'm3u8';
    else if (streamSource.includes('.mp4')) ext = 'mp4';
    
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
      direct_source: streamSource, // Direct URL
      tv_archive_duration: 0,
      rating: stream.rating?.toString() || "0",
      rating_5based: parseFloat((stream.rating || 0) / 2).toFixed(1),
      container_extension: ext
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
        const liveStreams = await getStreamsForXtream('live', categoryId, username, password, serverUrl);
        return NextResponse.json(liveStreams);

      case 'get_vod_streams':
        const vodCategoryId = searchParams.get('category_id');
        const vodStreams = await getStreamsForXtream('movie', vodCategoryId, username, password, serverUrl);
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
          return NextResponse.json({ info: {}, movie_data: {} });
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
        
        return NextResponse.json({
          info: {
            name: movie.name,
            cover_big: movie.icon || "",
            rating: movie.rating || 0
          },
          movie_data: {
            stream_id: movie.id,
            name: movie.name,
            container_extension: movie.container_extension || "mp4",
            direct_source: movie.stream_source || movie.direct_source || ""
          }
        });

      case 'get_short_epg':
        return NextResponse.json({ epg_listings: [] });

      default:
        // User info - simplified for old boxes
        return NextResponse.json({
          user_info: {
            username: user.username,
            password: user.password,
            message: "",
            auth: 1,
            status: "Active",
            exp_date: user.exp_date ? Math.floor(new Date(user.exp_date).getTime() / 1000) : "1924905600",
            is_trial: "0",
            active_cons: "0",
            created_at: user.created_at ? Math.floor(new Date(user.created_at).getTime() / 1000) : Math.floor(Date.now() / 1000),
            max_connections: user.max_connections?.toString() || "5",
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
    console.error('API Error:', error);
    return NextResponse.json({ 
      user_info: { auth: 0, message: 'Error' } 
    }, { status: 500 });
  }
}