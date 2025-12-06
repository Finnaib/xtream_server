// File Location: next.config.js (root directory)

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Rewrite /player_api_resolved.php for apps that need resolved URLs
      {
        source: '/player_api_resolved.php',
        destination: '/api/player_api_resolved.php'
      },
      // Rewrite /player_api.php to /api/player_api.php for compatibility
      {
        source: '/player_api.php',
        destination: '/api/player_api.php'
      },
      // Rewrite /get.php for M3U playlist
      {
        source: '/get.php',
        destination: '/api/get.php'
      },
      // Rewrite /xmltv.php for EPG
      {
        source: '/xmltv.php',
        destination: '/api/xmltv.php'
      },
      // Stream URLs rewrite - Multiple patterns for IPTV app compatibility
      
      // Pattern 1: /live/username/password/streamId.ext
      {
        source: '/live/:username/:password/:streamId.:ext',
        destination: '/api/stream/:username/:password/:streamId/:ext'
      },
      // Pattern 2: /movie/username/password/streamId.ext
      {
        source: '/movie/:username/:password/:streamId.:ext',
        destination: '/api/stream/:username/:password/:streamId/:ext'
      },
      // Pattern 3: /series/username/password/streamId.ext
      {
        source: '/series/:username/:password/:streamId.:ext',
        destination: '/api/stream/:username/:password/:streamId/:ext'
      },
      // Pattern 4: Direct /username/password/streamId.ext (most common)
      {
        source: '/:username/:password/:streamId.:ext(ts|m3u8|mp4|mkv|avi)',
        destination: '/api/stream/:username/:password/:streamId/:ext'
      },
      // Pattern 5: /username/password/streamId (no extension)
      {
        source: '/:username/:password/:streamId(\\d+)',
        destination: '/api/stream/:username/:password/:streamId/m3u8'
      }
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    }
  }
};

module.exports = nextConfig;