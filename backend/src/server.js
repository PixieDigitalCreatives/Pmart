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
