import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env.js';

export async function connectDatabase(): Promise<void> {
  let mongoUri = env.mongoUri;

  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully');
    return;
  } catch (error) {
    if (env.nodeEnv !== 'development') {
      console.error('MongoDB connection failed:', error);
      throw error;
    }

    try {
      const memoryServer = await MongoMemoryServer.create();
      mongoUri = memoryServer.getUri();
      await mongoose.connect(mongoUri);
      console.log('MongoDB connected successfully using in-memory MongoDB server');
    } catch (memoryError) {
      console.error('MongoDB connection failed and in-memory fallback failed:', memoryError);
      throw memoryError;
    }
  }
}
