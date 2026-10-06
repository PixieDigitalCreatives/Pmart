import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    
    // Validate connection and database name
    const dbName = conn.connection.db?.databaseName;
    if (dbName !== 'pmart') {
      logger.error(`MongoDB connected to wrong database: ${dbName}. Expected 'pmart'.`);
      process.exit(1);
    }
    
    try {
      await conn.connection.db?.admin().ping();
      logger.info(`MongoDB Atlas connection established.`);
      logger.info(`Database: ${dbName}`);
      logger.info(`MongoDB host: ${conn.connection.host}`);
    } catch (pingError) {
      logger.error('Failed to ping MongoDB database.');
      process.exit(1);
    }
    
  } catch (error: any) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};
