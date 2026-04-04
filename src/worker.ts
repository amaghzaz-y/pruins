/**
 * Integrated Cloudflare Worker for Pruins
 * Handles API proxying to bypass CORS and serves static assets.
 */

interface Env {
  ASSETS: { fetch: typeof fetch };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Route API requests through the proxy
    // We support both a '/proxy' prefix and a more generic interception if needed
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/proxy')) {
      return handleProxy(request);
    }

    // Fallback to serving static assets (the React app)
    return env.ASSETS.fetch(request);
  },
};

async function handleProxy(request: Request): Promise<Response> {
  const url = new URL(request.url);
  
  // Extract the target path after '/proxy' or use the full path if it's '/api'
  const targetPath = url.pathname.startsWith('/proxy') 
    ? url.pathname.replace('/proxy', '') 
    : url.pathname;
    
  const targetUrl = new URL(targetPath + url.search, 'https://api.pruna.ai');

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, apikey, Model, Try-Sync',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Prepare the proxied request
  const proxyRequest = new Request(targetUrl.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    redirect: 'follow',
  });

  try {
    const response = await fetch(proxyRequest);
    
    // Create a new response to modify headers
    const newResponse = new Response(response.body, response);
    
    // Add CORS headers to the response
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, apikey, Model, Try-Sync');

    return newResponse;
  } catch (error: any) {
    return new Response(JSON.stringify({ 
      error: 'Integrated Proxy Failed', 
      details: error.message 
    }), {
      status: 502,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    });
  }
}
