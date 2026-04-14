import './loadEnv';
import app from './app';
import pool from './db/pool';
import logger from './utils/logger';
import { createWsServer } from './ws/manager';

const PORT = parseInt(process.env.PORT || process.env.API_PORT || '4000', 10);

// HTTP server — shared with WebSocket (same port, path /ws)
const server = app.listen(PORT, () => {
  logger.info('TaskFlow API running', { port: PORT, env: process.env.NODE_ENV });
});

createWsServer(server);

async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    logger.info('HTTP + WS server closed');
    await pool.end();
    logger.info('Database pool closed');
    process.exit(0);
  });
  setTimeout(() => { logger.error('Forced shutdown'); process.exit(1); }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
