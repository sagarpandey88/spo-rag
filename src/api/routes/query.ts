import { Router, Request, Response } from 'express';
import { ChatOpenAI } from '@langchain/openai';
import { RetrievalQAChain } from 'langchain/chains';
import { VectorStore } from '../../shared/vector-store';
import { config } from '../../shared/config';
import { logger } from '../../shared/logger';
import { QueryRequest, QueryResponse, SourceDocument } from '../../shared/types';
import { AppError, asyncHandler } from '../middleware/error-handler';

export function createQueryRouter(vectorStoreManager: VectorStore): Router {
  const router = Router();

  router.post(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      const { query, topK = 4 } = req.body as QueryRequest;

      if (!query || query.trim().length === 0) {
        throw new AppError('Query is required', 400);
      }

      logger.info('Processing query', { query, topK });

      try {
        const vectorStore = vectorStoreManager.getVectorStore();

        // Create LLM
        const llm = new ChatOpenAI({
          openAIApiKey: config.openai.apiKey,
          modelName: config.openai.model,
          temperature: 0,
          ...(config.openai.baseURL && { baseURL: config.openai.baseURL }),
        });

        // Create retrieval chain
        const chain = RetrievalQAChain.fromLLM(llm, vectorStore.asRetriever(topK), {
          returnSourceDocuments: true,
        });

        // Execute query
        const result = await chain.call({ query });

        // Format sources
        const sources: SourceDocument[] = result.sourceDocuments.map((doc: any) => ({
          filename: doc.metadata.filename,
          url: doc.metadata.url,
          content: doc.pageContent,
          score: doc.metadata.score || 0,
        }));

        const response: QueryResponse = {
          answer: result.text,
          sources,
        };

        logger.info('Query processed successfully', {
          query,
          sourcesCount: sources.length,
        });

        res.json(response);
      } catch (error) {
        logger.error('Failed to process query', { error, query });
        throw new AppError('Failed to process query', 500);
      }
    })
  );

  router.get(
    '/stats',
    asyncHandler(async (_req: Request, res: Response) => {
      const stats = vectorStoreManager.getStats();

      if (!stats) {
        throw new AppError('Index stats not available', 404);
      }

      res.json(stats);
    })
  );

  return router;
}
