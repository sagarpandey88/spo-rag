import { pipeline, FeatureExtractionPipeline } from '@xenova/transformers';
import { config } from './config';

let _embedder: FeatureExtractionPipeline | null = null;

async function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!_embedder) {
    _embedder = await pipeline('feature-extraction', config.sbert.modelName as any);
  }
  return _embedder;
}

const EMBED_BATCH = 32;
const EMBED_DIM = 384;

async function embedTexts(texts: string[]): Promise<number[][]> {
  const pipe = await getEmbedder();
  const allVectors: number[][] = [];

  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batch = texts.slice(i, i + EMBED_BATCH);
    const output = await (pipe as any)(batch, { pooling: 'mean', normalize: true });
    const vectors: number[][] = Array.from({ length: batch.length }, (_, idx) =>
      Array.from(output.data.slice(idx * EMBED_DIM, (idx + 1) * EMBED_DIM) as Float32Array)
    );
    allVectors.push(...vectors);
  }

  return allVectors;
}

export function createSbertEmbeddings() {
  return {
    embedDocuments: async (texts: string[]) => embedTexts(texts),
    embedQuery: async (text: string) => {
      const vectors = await embedTexts([text]);
      return vectors[0];
    },
  };
}