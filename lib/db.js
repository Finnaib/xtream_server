// File Location: lib/db.js
// Database connection with timeout handling

import mysql from 'mysql2/promise';

let connection = null;
let lastActivity = Date.now();
const MAX_IDLE_TIME = 60000; // 60 seconds

export async function getConnection() {
  const now = Date.now();
  
  // Close stale connection
  if (connection && (now - lastActivity) > MAX_IDLE_TIME) {
    try {
      await connection.end();
    } catch (e) {}
    connection = null;
  }
  
  // Create new connection if needed
  if (!connection || connection.connection._closing) {
    try {
      connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
        connectTimeout: 10000, // 10 second timeout
        waitForConnections: true,
      });
      console.log('✅ Database connected');
    } catch (error) {
      console.error('❌ Database connection error:', error.message);
      throw error;
    }
  }
  
  lastActivity = now;
  return connection;
}

// Get Live Streams
export async function getLiveStreams(userId, categoryId = null) {
  try {
    const conn = await getConnection();
    
    let query = 'SELECT * FROM streams WHERE type = ? AND active = ?';
    let params = ['live', 1];
    
    if (categoryId) {
      query += ' AND category_id = ?';
      params.push(categoryId);
    }
    
    const [rows] = await conn.execute(query, params);
    
    return rows.map(stream => ({
      num: stream.id,
      name: stream.name,
      stream_type: "live",
      stream_id: stream.id,
      stream_icon: stream.icon || "",
      epg_channel_id: stream.epg_channel_id || "",
      added: stream.created_at ? Math.floor(new Date(stream.created_at).getTime() / 1000) : "",
      category_id: stream.category_id?.toString() || "",
      custom_sid: stream.custom_sid || "",
      tv_archive: stream.tv_archive || 0,
      direct_source: stream.direct_source || stream.stream_source || "",
      tv_archive_duration: stream.tv_archive_duration || 0
    }));
  } catch (error) {
    console.error('Error fetching live streams:', error);
    return [];
  }
}

// Get VOD Streams
export async function getVODStreams(userId, categoryId = null) {
  try {
    const conn = await getConnection();
    
    let query = 'SELECT * FROM streams WHERE type = ? AND active = ?';
    let params = ['movie', 1];
    
    if (categoryId) {
      query += ' AND category_id = ?';
      params.push(categoryId);
    }
    
    const [rows] = await conn.execute(query, params);
    
    return rows.map(stream => ({
      num: stream.id,
      name: stream.name,
      stream_type: "movie",
      stream_id: stream.id,
      stream_icon: stream.icon || "",
      rating: stream.rating?.toString() || "0",
      rating_5based: parseFloat((stream.rating || 0) / 2).toFixed(1),
      added: stream.created_at ? Math.floor(new Date(stream.created_at).getTime() / 1000) : "",
      category_id: stream.category_id?.toString() || "",
      container_extension: stream.container_extension || "mp4",
      direct_source: stream.direct_source || stream.stream_source || "",
      tmdb_id: stream.tmdb_id || ""
    }));
  } catch (error) {
    console.error('Error fetching VOD streams:', error);
    return [];
  }
}

// Get Series
export async function getSeries(userId, categoryId = null) {
  try {
    const conn = await getConnection();
    
    let query = 'SELECT * FROM series WHERE active = ?';
    let params = [1];
    
    if (categoryId) {
      query += ' AND category_id = ?';
      params.push(categoryId);
    }
    
    const [rows] = await conn.execute(query, params);
    
    return rows.map(serie => ({
      num: serie.id,
      name: serie.name,
      series_id: serie.id,
      cover: serie.cover || "",
      plot: serie.plot || "",
      cast: serie.cast || "",
      director: serie.director || "",
      genre: serie.genre || "",
      releaseDate: serie.release_date || "",
      last_modified: serie.last_modified ? Math.floor(new Date(serie.last_modified).getTime() / 1000) : "",
      rating: serie.rating?.toString() || "0",
      rating_5based: parseFloat((serie.rating || 0) / 2).toFixed(1),
      backdrop_path: serie.backdrop_path || [],
      youtube_trailer: serie.youtube_trailer || "",
      episode_run_time: serie.episode_run_time || "45",
      category_id: serie.category_id?.toString() || ""
    }));
  } catch (error) {
    console.error('Error fetching series:', error);
    return [];
  }
}

// Get Live Categories
export async function getLiveCategories() {
  try {
    const conn = await getConnection();
    const [rows] = await conn.execute(
      'SELECT * FROM categories WHERE type = ?',
      ['live']
    );
    
    return rows.map(cat => ({
      category_id: cat.id.toString(),
      category_name: cat.name,
      parent_id: cat.parent_id || 0
    }));
  } catch (error) {
    console.error('Error fetching live categories:', error);
    return [];
  }
}

// Get VOD Categories
export async function getVODCategories() {
  try {
    const conn = await getConnection();
    const [rows] = await conn.execute(
      'SELECT * FROM categories WHERE type = ?',
      ['movie']
    );
    
    return rows.map(cat => ({
      category_id: cat.id.toString(),
      category_name: cat.name,
      parent_id: cat.parent_id || 0
    }));
  } catch (error) {
    console.error('Error fetching VOD categories:', error);
    return [];
  }
}

// Get Series Categories
export async function getSeriesCategories() {
  try {
    const conn = await getConnection();
    const [rows] = await conn.execute(
      'SELECT * FROM categories WHERE type = ?',
      ['series']
    );
    
    return rows.map(cat => ({
      category_id: cat.id.toString(),
      category_name: cat.name,
      parent_id: cat.parent_id || 0
    }));
  } catch (error) {
    console.error('Error fetching series categories:', error);
    return [];
  }
}

// Get Series Info
export async function getSeriesInfo(seriesId) {
  try {
    const conn = await getConnection();
    
    const [seriesRows] = await conn.execute(
      'SELECT * FROM series WHERE id = ?',
      [seriesId]
    );
    
    if (seriesRows.length === 0) {
      return { seasons: [], info: {}, episodes: {} };
    }
    
    const serie = seriesRows[0];
    
    const [episodeRows] = await conn.execute(
      'SELECT * FROM series_episodes WHERE series_id = ? ORDER BY season_num, episode_num',
      [seriesId]
    );
    
    const episodesBySeason = {};
    episodeRows.forEach(ep => {
      const seasonNum = ep.season_num?.toString() || "1";
      if (!episodesBySeason[seasonNum]) {
        episodesBySeason[seasonNum] = [];
      }
      episodesBySeason[seasonNum].push({
        id: ep.id.toString(),
        episode_num: ep.episode_num,
        title: ep.title || "",
        container_extension: ep.container_extension || "mp4",
        info: {
          tmdb_id: ep.tmdb_id || "",
          releasedate: ep.release_date || "",
          plot: ep.plot || "",
          duration_secs: ep.duration_secs || 0,
          duration: ep.duration || "",
          video: {},
          audio: {},
          bitrate: ep.bitrate || 0
        },
        custom_sid: ep.custom_sid || "",
        added: ep.added ? Math.floor(new Date(ep.added).getTime() / 1000) : "",
        season: ep.season_num,
        direct_source: ep.direct_source || ""
      });
    });
    
    return {
      seasons: Object.keys(episodesBySeason).map(s => ({
        air_date: "",
        episode_count: episodesBySeason[s].length,
        id: parseInt(s),
        name: `Season ${s}`,
        overview: "",
        season_number: parseInt(s),
        cover: serie.cover || "",
        cover_big: serie.cover || ""
      })),
      info: {
        name: serie.name,
        cover: serie.cover || "",
        plot: serie.plot || "",
        cast: serie.cast || "",
        director: serie.director || "",
        genre: serie.genre || "",
        releaseDate: serie.release_date || "",
        last_modified: serie.last_modified ? Math.floor(new Date(serie.last_modified).getTime() / 1000) : "",
        rating: serie.rating?.toString() || "0",
        rating_5based: parseFloat((serie.rating || 0) / 2).toFixed(1),
        backdrop_path: serie.backdrop_path || [],
        youtube_trailer: serie.youtube_trailer || "",
        episode_run_time: serie.episode_run_time || "45",
        category_id: serie.category_id?.toString() || ""
      },
      episodes: episodesBySeason
    };
  } catch (error) {
    console.error('Error fetching series info:', error);
    return { seasons: [], info: {}, episodes: {} };
  }
}

// Get VOD Info
export async function getVODInfo(vodId) {
  try {
    const conn = await getConnection();
    const [rows] = await conn.execute(
      'SELECT * FROM streams WHERE id = ? AND type = ?',
      [vodId, 'movie']
    );
    
    if (rows.length === 0) {
      return { info: {}, movie_data: {} };
    }
    
    const movie = rows[0];
    
    return {
      info: {
        tmdb_id: movie.tmdb_id || "",
        name: movie.name,
        o_name: movie.name,
        cover_big: movie.icon || "",
        movie_image: movie.icon || "",
        releasedate: "",
        youtube_trailer: "",
        director: "",
        actors: "",
        cast: "",
        description: "",
        plot: "",
        age: "",
        country: "",
        genre: "",
        duration_secs: 0,
        duration: "",
        video: {},
        audio: {},
        bitrate: 0,
        rating: movie.rating || 0
      },
      movie_data: {
        stream_id: movie.id,
        name: movie.name,
        added: movie.created_at ? Math.floor(new Date(movie.created_at).getTime() / 1000) : "",
        category_id: movie.category_id?.toString() || "",
        container_extension: movie.container_extension || "mp4",
        custom_sid: movie.custom_sid || "",
        direct_source: movie.direct_source || movie.stream_source || ""
      }
    };
  } catch (error) {
    console.error('Error fetching VOD info:', error);
    return { info: {}, movie_data: {} };
  }
}