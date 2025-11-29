// File Location: next.config.js (root directory)

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Player API
      {
        source: '/player_api.php',
        destination: '/api/player_api.php'
      },
      // M3U Playlist
      {
        source: '/get.php',
        destination: '/api/get.php'
      },
      // EPG
      {
        source: '/xmltv.php',
        destination: '/api/xmltv.php'
      },
      
      // STREAM ROUTES - Multiple patterns for IPTV app compatibility
      
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