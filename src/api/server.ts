import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { VectorStore } from '../shared/vector-store';
import { config } from '../shared/config';
import { logger } from '../shared/logger';
import { errorHandler } from './middleware/error-handler';
import { createQueryRouter } from './routes/query';
import { createCrawlerRouter } from './routes/crawler';
import { IndexWatcher } from './services/index-watcher';

class Server {
  private app: Application;
  private vectorStoreManager: VectorStore;
  private indexWatcher: IndexWatcher | null = null;

  constructor() {
    this.app = express();
    this.vectorStoreManager = new VectorStore();
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing server...');

      // Load FAISS index
      const indexExists = await this.vectorStoreManager.indexExists();
      
      if (!indexExists) {
        logger.warn('FAISS index not found. Please run the crawler first.');
        logger.warn('Server will start but queries will fail until index is created.');
      } else {
        await this.vectorStoreManager.load();
        logger.info('FAISS index loaded successfully');

        // Start index watcher
        this.indexWatcher = new IndexWatcher(
          this.vectorStoreManager,
          async () => {
            await this.vectorStoreManager.load();
          }
        );
        this.indexWatcher.start();
      }

      this.setupMiddleware();
      this.setupRoutes();
      this.setupErrorHandling();

      logger.info('Server initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize server', { error });
      throw error;
    }
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors());

    // Body parsing middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, _res, next) => {
      logger.info('Incoming request', {
        method: req.method,
        path: req.path,
        ip: req.ip,
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (_req, res) => {
      const stats = this.vectorStoreManager.getStats();
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        indexLoaded: stats !== null,
        stats,
      });
    });

    // API routes
    this.app.use('/api/query', createQueryRouter(this.vectorStoreManager));
    this.app.use('/api/crawler', createCrawlerRouter());

    // 404 handler
    this.app.use((_req, res) => {
      res.status(404).json({
        status: 'error',
        message: 'Route not found',
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  async start(): Promise<void> {
    const port = config.api.port;
    const host = config.api.host;

    this.app.listen(port, host, () => {
      logger.info(`Server running on http://${host}:${port}`);
      logger.info('API endpoints:');
      logger.info(`  POST http://${host}:${port}/api/query - Submit RAG queries`);
      logger.info(`  GET  http://${host}:${port}/api/query/stats - Get index statistics`);
      logger.info(`  POST http://${host}:${port}/api/crawler/trigger - Trigger manual crawl`);
      logger.info(`  GET  http://${host}:${port}/api/crawler/status - Check crawl status`);
      logger.info(`  GET  http://${host}:${port}/health - Health check`);
    });
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down server...');
    
    if (this.indexWatcher) {
      this.indexWatcher.stop();
    }

    logger.info('Server shutdown complete');
  }
}

// Main execution
async function main() {
  const server = new Server();

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received');
    await server.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received');
    await server.shutdown();
    process.exit(0);
  });

  try {
    await server.initialize();
    await server.start();
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('Unexpected error', { error });
  process.exit(1);
});
