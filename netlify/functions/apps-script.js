const appsScriptUrl = 'https://script.google.com/macros/s/AKfycbyXD4xknOb2zsEKNHEhF0n2NfYNii5WZj2D5Gvc1n-PTb4zV543lzszOocmAEbWDhP3/exec';

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const query = new URLSearchParams(event.queryStringParameters ?? {}).toString();
    const requestUrl = query ? `${appsScriptUrl}?${query}` : appsScriptUrl;
    const response = await fetch(requestUrl, {
      method: event.httpMethod,
      headers: event.httpMethod === 'POST' ? { 'Content-Type': 'text/plain;charset=utf-8' } : undefined,
      body: event.httpMethod === 'POST' ? event.body : undefined,
      signal: AbortSignal.timeout(20000),
    });

    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json' },
      body: await response.text(),
    };
  } catch {
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, message: 'Could not reach the Google Sheets service. Please retry.' }),
    };
  }
};