import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { OpenAIEmbeddings } from '@langchain/openai';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import { config } from './config';
import { logger } from './logger';
import { IndexStats } from './types';

export class VectorStore extends EventEmitter {
  private embeddings: OpenAIEmbeddings;
  private vectorStore: FaissStore | null = null;
  private lockFilePath: string;
  private stats: IndexStats | null = null;

  constructor() {
    super();
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: config.openai.apiKey,
      modelName: config.openai.embeddingModel,
      ...(config.openai.baseURL && { baseURL: config.openai.baseURL }),
    });
    this.lockFilePath = path.join(config.faiss.indexPath, '.lock');
  }

  async load(): Promise<FaissStore> {
    try {
      await this.acquireLock();

      if (!existsSync(config.faiss.indexPath)) {
        throw new Error(`Index not found at ${config.faiss.indexPath}`);
      }

      logger.info('Loading FAISS index from disk');
      
      this.vectorStore = await FaissStore.load(
        config.faiss.indexPath,
        this.embeddings
      );

      await this.loadStats();
      await this.releaseLock();

      logger.info('FAISS index loaded successfully', { stats: this.stats });
      return this.vectorStore;
    } catch (error) {
      await this.releaseLock();
      logger.error('Failed to load FAISS index', { error });
      throw error;
    }
  }

  async save(vectorStore: FaissStore, stats: IndexStats): Promise<void> {
    try {
      await this.acquireLock();

      // Create temp directory for atomic swap
      const tempPath = `${config.faiss.indexPath}.tmp`;
      const backupPath = `${config.faiss.indexPath}.backup`;

      logger.info('Saving FAISS index to disk');

      // Ensure directory exists
      await fs.mkdir(path.dirname(config.faiss.indexPath), { recursive: true });

      // Save to temp location
      await vectorStore.save(tempPath);

      // Save stats
      const statsPath = path.join(tempPath, 'stats.json');
      await fs.writeFile(statsPath, JSON.stringify(stats, null, 2));

      // Atomic swap
      if (existsSync(config.faiss.indexPath)) {
        // Move current index to backup
        if (existsSync(backupPath)) {
          await fs.rm(backupPath, { recursive: true, force: true });
        }
        await fs.rename(config.faiss.indexPath, backupPath);
      }

      // Move temp to production
      await fs.rename(tempPath, config.faiss.indexPath);

      this.vectorStore = vectorStore;
      this.stats = stats;

      await this.releaseLock();

      logger.info('FAISS index saved successfully', { stats });

      // Emit event for index update
      this.emit('indexUpdated', stats);
    } catch (error) {
      await this.releaseLock();
      logger.error('Failed to save FAISS index', { error });
      throw error;
    }
  }

  getVectorStore(): FaissStore {
    if (!this.vectorStore) {
      throw new Error('Vector store not loaded');
    }
    return this.vectorStore;
  }

  getStats(): IndexStats | null {
    return this.stats;
  }

  async indexExists(): Promise<boolean> {
    try {
      return existsSync(config.faiss.indexPath) && 
             existsSync(path.join(config.faiss.indexPath, 'docstore.json'));
    } catch {
      return false;
    }
  }

  private async loadStats(): Promise<void> {
    try {
      const statsPath = path.join(config.faiss.indexPath, 'stats.json');
      if (existsSync(statsPath)) {
        const data = await fs.readFile(statsPath, 'utf-8');
        this.stats = JSON.parse(data);
      }
    } catch (error) {
      logger.warn('Failed to load index stats', { error });
      this.stats = null;
    }
  }

  private async acquireLock(maxRetries = 30, retryDelay = 1000): Promise<void> {
    let retries = 0;

    while (retries < maxRetries) {
      try {
        // Ensure lock directory exists
        await fs.mkdir(path.dirname(this.lockFilePath), { recursive: true });

        // Try to create lock file
        await fs.writeFile(this.lockFilePath, process.pid.toString(), { flag: 'wx' });
        logger.debug('Lock acquired');
        return;
      } catch (error: any) {
        if (error.code === 'EEXIST') {
          // Lock file exists, wait and retry
          retries++;
          logger.debug(`Lock file exists, retrying (${retries}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          throw error;
        }
      }
    }

    throw new Error('Failed to acquire lock after maximum retries');
  }

  private async releaseLock(): Promise<void> {
    try {
      if (existsSync(this.lockFilePath)) {
        await fs.unlink(this.lockFilePath);
        logger.debug('Lock released');
      }
    } catch (error) {
      logger.warn('Failed to release lock', { error });
    }
  }
}
