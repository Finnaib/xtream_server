// File Location: app/api/player_api.php/route.js
// This is the main Xtream API endpoint

import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth';
import { 
  getLiveStreams, 
  getVODStreams, 
  getSeries, 
  getLiveCategories,
  getVODCategories,
  getSeriesCategories,
  getSeriesInfo
} from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const username = searchParams.get('username');
    const password = searchParams.get('password');
    const action = searchParams.get('action');

    // Authenticate user first
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

    // Handle different actions
    switch (action) {
      case 'get_live_streams':
        const categoryId = searchParams.get('category_id');
        const liveStreams = await getLiveStreams(user.id, categoryId);
        return NextResponse.json(liveStreams);

      case 'get_vod_streams':
        const vodCategoryId = searchParams.get('category_id');
        const vodStreams = await getVODStreams(user.id, vodCategoryId);
        return NextResponse.json(vodStreams);

      case 'get_series':
        const seriesCategoryId = searchParams.get('category_id');
        const series = await getSeries(user.id, seriesCategoryId);
        return NextResponse.json(series);

      case 'get_live_categories':
        const liveCategories = await getLiveCategories();
        return NextResponse.json(liveCategories);

      case 'get_vod_categories':
        const vodCategories = await getVODCategories();
        return NextResponse.json(vodCategories);

      case 'get_series_categories':
        const seriesCategories = await getSeriesCategories();
        return NextResponse.json(seriesCategories);

      case 'get_series_info':
        const seriesId = searchParams.get('series_id');
        if (!seriesId) {
          return NextResponse.json({ error: 'series_id required' }, { status: 400 });
        }
        const seriesInfo = await getSeriesInfo(seriesId);
        return NextResponse.json(seriesInfo);

      case 'get_vod_info':
        const vodId = searchParams.get('vod_id');
        if (!vodId) {
          return NextResponse.json({ error: 'vod_id required' }, { status: 400 });
        }
        // Implement VOD info retrieval
        return NextResponse.json({ info: {}, movie_data: {} });

      case 'get_short_epg':
        const streamId = searchParams.get('stream_id');
        const limit = searchParams.get('limit') || 10;
        // Implement EPG retrieval
        return NextResponse.json({ epg_listings: [] });

      default:
        // Default: return user info and server info
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
            max_connections: user.max_connections || "1",
            allowed_output_formats: ["m3u8", "ts", "rtmp"]
          },
          server_info: {
            url: process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000",
            port: "443",
            https_port: "443",
            server_protocol: "https",
            rtmp_port: "1935",
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