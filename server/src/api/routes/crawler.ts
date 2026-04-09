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
      const crawlerProcess = spawn('npm', ['run', 'container:crawler'], {
        stdio: 'pipe',
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      crawlerProcess.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        logger.debug('Crawler output', { output: text });
      });

      crawlerProcess.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        // Log stderr as debug + error to capture full output and keep structured error
        logger.debug('Crawler stderr', { stderr: text });
        logger.error('Crawler error output', { error: text });
      });

      crawlerProcess.on('error', (err: Error) => {
        crawlInProgress = false;
        logger.error('Failed to start crawler process', {
          message: err?.message ?? 'Unknown error',
          stack: err instanceof Error ? err.stack : 'No stack trace available',
        });
      });

      crawlerProcess.on('close', (code) => {
        crawlInProgress = false;

        if (code === 0) {
          logger.info('Crawl completed successfully');
        } else {
          // Include captured stdout/stderr to aid troubleshooting
          logger.error('Crawl failed', {
            exitCode: code,
            stdout: stdout || 'No stdout captured',
            stderr: stderr || 'No stderr captured',
          });
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
