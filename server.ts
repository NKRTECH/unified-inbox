/**
 * Custom Next.js Server with WebSocket Support
 * 
 * This custom server enables WebSocket connections alongside Next.js
 * Run with: node server.ts (after building) or ts-node server.ts (dev)
 */

import { createServer, IncomingMessage } from 'http';
import { parse } from 'url';
import next from 'next';
import { wsManager } from './lib/websocket/server';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port, turbo: dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // Store the original upgrade listener from Next.js
  const originalUpgradeListeners = server
    .listeners('upgrade')
    .slice() as Array<
    (request: IncomingMessage, socket: any, head: Buffer) => void
  >;
  server.removeAllListeners('upgrade');

  // Initialize WebSocket server (this adds our upgrade listener)
  wsManager.initialize(server, originalUpgradeListeners);

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server ready on ws://${hostname}:${port}/api/ws`);
  });
});
