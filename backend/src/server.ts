import app from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { createServer } from 'http';
import { initializeSocket } from './realtime/socket.js';

async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    const httpServer = createServer(app);
    initializeSocket(httpServer, env.clientUrl);
    httpServer.listen(env.port, () => {
      console.log(`Backend server running on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
