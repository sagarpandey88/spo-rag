import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';
//import path from 'path';

dotenvConfig();

const configSchema = z.object({
  azure: z.object({
    tenantId: z.string().min(1, 'AZURE_TENANT_ID is required'),
    clientId: z.string().min(1, 'AZURE_CLIENT_ID is required'),
    certificatePath: z.string().min(1, 'AZURE_CERTIFICATE_PATH is required'),
    thumbprint: z.string().min(1, 'AZURE_THUMBPRINT is required'),
  }),
  sharepoint: z.object({
    siteUrl: z.string().url('SHAREPOINT_SITE_URL must be a valid URL'),
    libraryName: z.string().min(1, 'SHAREPOINT_LIBRARY_NAME is required'),
  }),
  openai: z.object({
    apiKey: z.string().min(1, 'OPENAI_API_KEY is required'),
    model: z.string().default('gpt-4-turbo-preview'),
    embeddingModel: z.string().default('text-embedding-3-small'),
    baseURL: z.string().optional(),
  }),
  faiss: z.object({
    indexPath: z.string().default('./data/faiss-index'),
    chunkSize: z.coerce.number().int().positive().default(1000),
    chunkOverlap: z.coerce.number().int().nonnegative().default(200),
  }),
  api: z.object({
    port: z.coerce.number().int().positive().default(3000),
    host: z.string().default('0.0.0.0'),
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  }),
});

function loadConfig() {
  const rawConfig = {
    azure: {
      tenantId: process.env.AZURE_TENANT_ID,
      clientId: process.env.AZURE_CLIENT_ID,
      certificatePath: process.env.AZURE_CERTIFICATE_PATH,
      thumbprint: process.env.AZURE_THUMBPRINT,
    },
    sharepoint: {
      siteUrl: process.env.SHAREPOINT_SITE_URL,
      libraryName: process.env.SHAREPOINT_LIBRARY_NAME,
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL,
      embeddingModel: process.env.OPENAI_EMBEDDING_MODEL,
      baseURL: process.env.AZURE_OPENAI_BASE_URL,
    },
    faiss: {
      indexPath: process.env.FAISS_INDEX_PATH,
      chunkSize: process.env.CHUNK_SIZE,
      chunkOverlap: process.env.CHUNK_OVERLAP,
    },
    api: {
      port: process.env.API_PORT,
      host: process.env.API_HOST,
    },
    logging: {
      level: process.env.LOG_LEVEL,
    },
  };

  try {
    return configSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw new Error(`Configuration validation failed:\n${messages.join('\n')}`);
    }
    throw error;
  }
}

export const config = loadConfig();
