import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import { logger } from '../../shared/logger';
import { AppError, asyncHandler } from '../middleware/error-handler';

export function createCrawlerRouter(): Router {
  const router = Router();

  let crawlInProgress = false;

  router.post(
    '/trigger',
    asyncHandler(async (_req: Request, res: Response) => {
      if (crawlInProgress) {
        throw new AppError('A crawl is already in progress', 409);
      }

      logger.info('Manual crawl triggered');

      crawlInProgress = true;

      // Start crawler as a child process
      const crawlerProcess = spawn('npm', ['run', 'crawler'], {
        stdio: 'pipe',
        shell: true,
      });

      let output = '';

      crawlerProcess.stdout.on('data', (data) => {
        output += data.toString();
        logger.debug('Crawler output', { output: data.toString() });
      });

      crawlerProcess.stderr.on('data', (data) => {
        logger.error('Crawler error output', { error: data.toString() });
      });

      crawlerProcess.on('close', (code) => {
        crawlInProgress = false;
        
        if (code === 0) {
          logger.info('Crawl completed successfully');
        } else {
          logger.error('Crawl failed', { exitCode: code });
        }
      });

      // Return immediately with accepted status
      res.status(202).json({
        status: 'accepted',
        message: 'Crawl started in background',
      });
    })
  );

  router.get(
    '/status',
    asyncHandler(async (_req: Request, res: Response) => {
      res.json({
        inProgress: crawlInProgress,
      });
    })
  );

  return router;
}
