'use strict';

const { createServer } = require('http');
const mongoose = require('mongoose');
const app = require('./app');
const { env } = require('./config/env');
const { connectDB } = require('./config/db');
const { initSocket } = require('./config/socket');
const { logger } = require('./utils/logger');

async function start() {
  await connectDB();
  const server = createServer(app);
  initSocket(server);

  server.listen(env.PORT, () => {
    logger.info(`PMart API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  // Render Free Tier Keep-Alive Heartbeat: pings itself every 12 minutes to prevent spin-down
  const keepAliveUrl = process.env.RENDER_EXTERNAL_URL || (process.env.NODE_ENV === 'production' ? 'https://pmart-66mp.onrender.com' : null);
  if (keepAliveUrl) {
    const PING_INTERVAL_MS = 12 * 60 * 1000;
    const https = require('https');
    const http = require('http');
    const client = keepAliveUrl.startsWith('https') ? https : http;
    const pingEndpoint = `${keepAliveUrl.replace(/\/+$/, '')}/api/ping`;

    const timer = setInterval(() => {
      client.get(pingEndpoint, (res) => {
        logger.info(`[KeepAlive] Heartbeat ping sent to ${pingEndpoint} - status: ${res.statusCode}`);
      }).on('error', (err) => {
        logger.warn(`[KeepAlive] Ping failed: ${err.message}`);
      });
    }, PING_INTERVAL_MS);
    timer.unref();
  }

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
