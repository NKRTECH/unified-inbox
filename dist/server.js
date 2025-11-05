"use strict";
/**
 * Custom Next.js Server with WebSocket Support
 *
 * This custom server enables WebSocket connections alongside Next.js
 * Run with: node server.ts (after building) or ts-node server.ts (dev)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const url_1 = require("url");
const next_1 = __importDefault(require("next"));
const server_1 = require("./lib/websocket/server");
const yjs_server_1 = require("./lib/collaboration/yjs-server");
const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
const app = (0, next_1.default)({ dev, hostname, port, turbo: dev });
const handle = app.getRequestHandler();
app.prepare().then(() => {
    const server = (0, http_1.createServer)(async (req, res) => {
        try {
            const parsedUrl = (0, url_1.parse)(req.url, true);
            await handle(req, res, parsedUrl);
        }
        catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('Internal server error');
        }
    });
    // Store the original upgrade listener from Next.js
    const originalUpgradeListeners = server
        .listeners('upgrade')
        .slice();
    server.removeAllListeners('upgrade');
    // Initialize Yjs WebSocket server
    yjs_server_1.yjsServer.initialize(server);
    // Initialize WebSocket server (this adds our upgrade listener)
    server_1.wsManager.initialize(server, originalUpgradeListeners);
    // Custom upgrade handler to route between Yjs and regular WebSocket
    const handleUpgrade = (request, socket, head) => {
        const { pathname } = (0, url_1.parse)(request.url || '');
        // Route Yjs connections
        if (pathname?.startsWith('/api/yjs/')) {
            yjs_server_1.yjsServer.handleUpgrade(request, socket, head);
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
