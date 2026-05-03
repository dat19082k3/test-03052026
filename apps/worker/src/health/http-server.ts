import http from 'http';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { runHealthChecks } from './run-checks';

export function createHealthHttpServer(): http.Server {
  return http.createServer((req, res) => {
    if (req.method === 'GET' && req.url?.split('?')[0] === '/health') {
      void (async () => {
        try {
          const result = await runHealthChecks();
          const body = JSON.stringify(result);
          res.statusCode = result.ok ? 200 : 503;
          res.setHeader('Content-Type', 'application/json');
          res.end(body);
        } catch (err) {
          logger.error({ err }, 'health HTTP handler error');
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, checks: {}, error: String(err) }));
        }
      })();
      return;
    }

    res.statusCode = 404;
    res.end();
  });
}

export function listenHealthServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.listen(config.healthPort, '0.0.0.0', () => resolve());
    server.on('error', reject);
  });
}
