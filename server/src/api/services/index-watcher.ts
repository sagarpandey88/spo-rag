import { VectorStore } from '../../shared/vector-store';
import { logger } from '../../shared/logger';

export class IndexWatcher {
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
    logger.info('Starting index update listener');

    this.vectorStoreManager.on('indexUpdated', async (stats) => {
      logger.info('Index updated event received', { stats });

      try {
        await this.reloadCallback();
        logger.info('Index refreshed after update');
      } catch (error) {
        logger.error('Failed to refresh index after update', { error });
      }
    });
  }

  stop(): void {
    this.vectorStoreManager.removeAllListeners('indexUpdated');
    logger.info('Index update listener stopped');
  }
}
