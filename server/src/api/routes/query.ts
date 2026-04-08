import { Router, Request, Response } from 'express';
import { AzureChatOpenAI } from '@langchain/openai';
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

        // Retrieve relevant documents directly
        const retriever = vectorStore.asRetriever(k);
        const relevantDocs = await retriever.getRelevantDocuments(query);

        // Normalize scores and only include documents with score >= 60%
        const withScores = relevantDocs.map((doc: any) => {
          let raw = Number(doc.metadata?.score ?? 0) || 0;
          if (raw > 1 && raw <= 100) raw = raw / 100;
          if (raw > 100) raw = raw / 100;
          return { doc, score: raw };
        });

        const returned = withScores
      //    .filter((d: any) => d.score >= 0.6)
          .slice(0, k)
          .map((d: any) => d.doc);

        // Build context string for the LLM
        const context = returned.map((d: any) => d.pageContent).join('\n\n');

        // Create LLM (Azure OpenAI deployment)
        const llm = new AzureChatOpenAI({
          apiKey: config.openai.apiKey,
          model: config.openai.model,
          deploymentName: config.openai.deploymentName,
          azureOpenAIApiVersion: config.openai.apiVersion,
          azureOpenAIEndpoint: config.openai.endpoint,
          temperature: 1,
        });

        // Call LLM with retrieved context
        const prompt = `You are a helpful, conversational assistant. Prefer to answer using the Context below when it contains the information needed. If the Context contains the answer, respond concisely and base your answer on that Context. If the Context does not contain the answer, you may answer using your general knowledge; do not present general-knowledge content as if it came from the Context. For short conversational queries (greetings, small talk), respond directly even if Context is empty.\n\nContext:\n${context}\n\nQuestion: ${query}\n\nAnswer:`;
        const aiResponse = await llm.invoke(prompt);
        const answerText = typeof aiResponse.content === 'string'
          ? aiResponse.content
          : JSON.stringify(aiResponse.content);

        const sources: SourceDocument[] = returned.map((doc: any) => ({
          filename: doc.metadata?.filename,
          url: doc.metadata?.url,
          content: doc.pageContent,
          score: Number(doc.metadata?.score) || 0,
        }));

        const response: QueryResponse = {
          answer: answerText,
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
