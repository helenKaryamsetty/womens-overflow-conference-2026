import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';

const appsScriptUrl = 'https://script.google.com/macros/s/AKfycbzvtEZxl_ti-WZzI8Gb-2gKznHwJOnzR3ZzutolAS7u3ulMx_U0IhXnSqe3nZNoxXE/exec';

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  server.get('/api/apps-script', async (_req, res) => {
    await forwardAppsScriptRequest('GET', undefined, res);
  });
  server.post('/api/apps-script', express.text({ type: 'text/plain', limit: '16kb' }), async (req, res) => {
    await forwardAppsScriptRequest('POST', req.body, res);
  });

  // Serve static files from /browser
  server.get('**', express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html',
  }));

  // All regular routes use the Angular engine
  server.get('**', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then((html) => res.send(html))
      .catch((err) => next(err));
  });

  return server;
}

async function forwardAppsScriptRequest(method: 'GET' | 'POST', body: string | undefined, res: express.Response): Promise<void> {
  try {
    const response = await fetch(appsScriptUrl, {
      method,
      headers: method === 'POST' ? { 'Content-Type': 'text/plain;charset=utf-8' } : undefined,
      body,
      signal: AbortSignal.timeout(20000),
    });
    res.status(response.status).type('application/json').send(await response.text());
  } catch {
    res.status(502).json({ success: false, message: 'Could not reach the Google Sheets service. Please retry.' });
  }
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

run();
