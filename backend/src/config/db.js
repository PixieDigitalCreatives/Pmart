'use strict';

const mongoose = require('mongoose');
const { env } = require('./env');
const { logger } = require('../utils/logger');

mongoose.set('strictQuery', true);

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB connection error: ${err.message}`);
});
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected. Retrying...');
});
mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});

async function connectDB() {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB_NAME,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      minPoolSize: 2,
      maxPoolSize: 15
    });
    await conn.connection.db.admin().ping();
    logger.info(`MongoDB connected (database: ${conn.connection.db.databaseName}, host: ${conn.connection.host})`);
    return conn;
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { connectDB };
