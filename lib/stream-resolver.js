// File Location: lib/stream-resolver.js
// Resolve stream redirects for old boxes

export async function resolveStreamUrl(url) {
  try {
    // Follow redirects to get final URL
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    // Return the final URL after all redirects
    return response.url;
  } catch (error) {
    console.error('Stream resolve error:', error);
    // If resolution fails, return original URL
    return url;
  }
}