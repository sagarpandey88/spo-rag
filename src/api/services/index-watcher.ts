import { watch } from 'fs';
import { existsSync } from 'fs';
//import * as path from 'path';
import { config } from '../../shared/config';
import { logger } from '../../shared/logger';
import { VectorStore } from '../../shared/vector-store';

export class IndexWatcher {
  private watcher: any;
  private vectorStoreManager: VectorStore;
  private reloadCallback: () => Promise<void>;

  constructor(
    vectorStoreManager: VectorStore,
    reloadCallback: () => Promise<void>
  ) {
    this.vectorStoreManager = vectorStoreManager;
    this.reloadCallback = reloadCallback;
  }

  start(): void {
    const indexPath = config.faiss.indexPath;

    if (!existsSync(indexPath)) {
      logger.warn(`Index path does not exist: ${indexPath}. Watcher not started.`);
      return;
    }

    logger.info('Starting index file watcher');

    // Watch for changes in the index directory
    this.watcher = watch(indexPath, { recursive: false }, async (eventType, filename) => {
      if (filename === 'stats.json' && eventType === 'change') {
        logger.info('Index update detected, reloading...');
        
        try {
          await this.reloadCallback();
          logger.info('Index reloaded successfully');
        } catch (error) {
          logger.error('Failed to reload index', { error });
        }
      }
    });

    // Also listen to vector store events
    this.vectorStoreManager.on('indexUpdated', async (stats) => {
      logger.info('Index updated event received', { stats });
      
      try {
        await this.reloadCallback();
        logger.info('Index reloaded after update event');
      } catch (error) {
        logger.error('Failed to reload index after update event', { error });
      }
    });
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      logger.info('Index file watcher stopped');
    }

    this.vectorStoreManager.removeAllListeners('indexUpdated');
  }
}
