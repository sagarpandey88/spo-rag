import { Router, Request, Response } from 'express';
import { AzureChatOpenAI } from '@langchain/openai';
import { RetrievalQAChain } from '@langchain/classic/chains';
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
      // ensure topK is a number and sane
      const k = Math.max(1, Math.min(50, Number(topK) || 4));

      if (!query || query.trim().length === 0) {
        throw new AppError('Query is required', 400);
      }

      logger.info('Processing query', { query, topK });

      try {
        const vectorStore = vectorStoreManager.getVectorStore();

        // Create LLM (Azure OpenAI deployment)
        const llm = new AzureChatOpenAI({
          apiKey: config.openai.apiKey,
          model: config.openai.model,// 'gpt-5-nano',
          deploymentName: config.openai.deploymentName,// 'gpt-5-nano',
          azureOpenAIApiVersion: config.openai.apiVersion,// '2025-01-01-preview',
          azureOpenAIEndpoint: config.openai.endpoint,// 'https://aoi-aitool.cognitiveservices.azure.com/',
          temperature: 1,
        });

        // Create retrieval chain
        const chain = RetrievalQAChain.fromLLM(llm, vectorStore.asRetriever(k), {
          returnSourceDocuments: true,
        });

        // Execute query
        const result = await chain.call({ query });

        // Format sources
        // Normalize scores and only include documents with score >= 60%
        const docs = (result.sourceDocuments || []);
        const withScores = docs.map((doc: any) => {
          let raw = Number(doc.metadata?.score ?? 0) || 0;
          // If Pinecone returned percentage-like scores (0-100), normalize to 0-1
          if (raw > 1 && raw <= 100) raw = raw / 100;
          if (raw > 100) raw = raw / 100; // defensive
          return { doc, score: raw };
        });

        const filtered = withScores.filter((d: any) => d.score >= 0.6).map((d: any) => d.doc);
        const returned = filtered.slice(0, k);

        const sources: SourceDocument[] = returned.map((doc: any) => ({
          filename: doc.metadata?.filename,
          url: doc.metadata?.url,
          content: doc.pageContent,
          score: Number(doc.metadata?.score) || 0,
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
        logger.error('Failed to process query', error);
        throw new AppError('Failed to process query', 500);
      }
    })
  );

  router.get(
    '/stats',
    asyncHandler(async (_req: Request, res: Response) => {
      const stats = await vectorStoreManager.getStats();

      if (!stats) {
        throw new AppError('Index stats not available', 404);
      }

      res.json(stats);
    })
  );

  return router;
}
