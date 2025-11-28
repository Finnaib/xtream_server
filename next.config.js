// File Location: next.config.js (root directory)

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Rewrite /player_api.php to /api/player_api.php for compatibility
      {
        source: '/player_api.php',
        destination: '/api/player_api.php'
      },
      // Rewrite /xmltv.php for EPG
      {
        source: '/xmltv.php',
        destination: '/api/xmltv.php'
      },
      // Stream URLs rewrite
      {
        source: '/:username/:password/:streamId.:extension',
        destination: '/api/stream/:username/:password/:streamId/:extension'
      }
    ];
  },
  // Important for streaming and large responses
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    }
  }
};

module.exports = nextConfig;