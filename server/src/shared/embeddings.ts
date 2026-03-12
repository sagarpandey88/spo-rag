import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers';
import { config } from './config';

export function createSbertEmbeddings(): HuggingFaceTransformersEmbeddings {
  return new HuggingFaceTransformersEmbeddings({
    model: config.sbert.modelName,
  });
}