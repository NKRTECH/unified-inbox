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
import { yjsServer } from './lib/collaboration/yjs-server';

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

  // Initialize Yjs WebSocket server
  yjsServer.initialize(server);

  // Initialize WebSocket server (this adds our upgrade listener)
  wsManager.initialize(server, originalUpgradeListeners);

  // Custom upgrade handler to route between Yjs and regular WebSocket
  const handleUpgrade = (
    request: IncomingMessage,
    socket: any,
    head: Buffer
  ) => {
    const { pathname } = parse(request.url || '');

    // Route Yjs connections
    if (pathname?.startsWith('/api/yjs/')) {
      yjsServer.handleUpgrade(request, socket, head);
      return;
    }

    // Route regular WebSocket connections
    if (pathname === '/api/ws') {
      // wsManager already handles this in its initialize method
      return;
    }

    // Let Next.js handle other upgrade requests
    originalUpgradeListeners.forEach((listener) => {
      listener.call(server, request, socket, head);
    });
  };

  server.on('upgrade', handleUpgrade);

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server ready on ws://${hostname}:${port}/api/ws`);
    console.log(`> Yjs WebSocket server ready on ws://${hostname}:${port}/api/yjs/`);
  });
});
