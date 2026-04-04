export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const targetUrl = new URL(url.pathname + url.search, 'https://api.pruna.ai');

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
      
      // Copy the response and add CORS headers
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, apikey, Model, Try-Sync');

      return newResponse;
    } catch (error: any) {
      return new Response(JSON.stringify({ error: 'Proxy failed', details: error.message }), {
        status: 502,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
      });
    }
  },
};
