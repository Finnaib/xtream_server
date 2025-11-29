// File Location: lib/stream.js
// Stream utility functions

export function getStreamUrl(streamId, username, password, extension = 'm3u8') {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';
  return `${baseUrl}/${username}/${password}/${streamId}.${extension}`;
}

export async function proxyStream(streamUrl, response) {
  try {
    const streamResponse = await fetch(streamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': '*/*'
      }
    });
    
    if (!streamResponse.ok) {
      throw new Error(`Failed to fetch stream: ${streamResponse.status}`);
    }
    
    // Get content type
    const contentType = streamResponse.headers.get('content-type') || 'video/mp2t';
    
    // Set response headers
    response.headers.set('Content-Type', contentType);
    response.headers.set('Access-Control-Allow-Origin', '*');
    
    // Stream the content
    return new Response(streamResponse.body, {
      headers: response.headers
    });
  } catch (error) {
    console.error('Stream proxy error:', error);
    throw error;
  }
}