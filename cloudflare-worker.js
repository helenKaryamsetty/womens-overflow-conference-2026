const appsScriptUrl = 'https://script.google.com/macros/s/AKfycbyXD4xknOb2zsEKNHEhF0n2NfYNii5WZj2D5Gvc1n-PTb4zV543lzszOocmAEbWDhP3/exec';

export default {
  async fetch(request, env) {
    const requestUrl = new URL(request.url);

    if (requestUrl.pathname !== '/api/apps-script') {
      return env.ASSETS.fetch(request);
    }

    if (request.method !== 'GET' && request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    try {
      const targetUrl = new URL(appsScriptUrl);
      targetUrl.search = requestUrl.search;

      const response = await fetch(targetUrl, {
        method: request.method,
        headers: request.method === 'POST' ? { 'Content-Type': 'text/plain;charset=utf-8' } : undefined,
        body: request.method === 'POST' ? await request.text() : undefined,
        signal: AbortSignal.timeout(20_000),
      });

      return new Response(await response.text(), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      return new Response(JSON.stringify({
        success: false,
        message: 'Could not reach the Google Sheets service. Please retry.',
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};