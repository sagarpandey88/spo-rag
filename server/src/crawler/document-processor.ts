import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { DocumentMetadata, ProcessedDocument } from '../shared/types';
import { logger } from '../shared/logger';

export class DocumentProcessor {
  async processDocument(
    buffer: Buffer,
    metadata: DocumentMetadata
  ): Promise<ProcessedDocument> {
    try {
      logger.debug(`Processing document: ${metadata.filename}`);

      let content: string;

      switch (metadata.contentType) {
        case 'application/pdf':
          content = await this.processPDF(buffer);
          break;
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
          content = await this.processWord(buffer);
          break;
        default:
          throw new Error(`Unsupported content type: ${metadata.contentType}`);
      }

      // Clean and normalize content
      content = this.cleanText(content);

      if (!content || content.trim().length === 0) {
        throw new Error('No text content extracted from document');
      }

      logger.debug(`Extracted ${content.length} characters from ${metadata.filename}`);

      return {
        metadata,
        content,
        chunks: [], // Chunks will be created by the indexer
      };
    } catch (error) {
      logger.error(`Failed to process document: ${metadata.filename}`, { error });
      throw error;
    }
  }

  private async processPDF(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      logger.error('Failed to parse PDF', { error });
      throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processWord(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      
      if (result.messages.length > 0) {
        logger.warn('Word document extraction warnings', { messages: result.messages });
      }

      return result.value;
    } catch (error) {
      logger.error('Failed to parse Word document', { error });
      throw new Error(`Word document parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private cleanText(text: string): string {
    return text
      // Normalize whitespace
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove multiple consecutive newlines
      .replace(/\n{3,}/g, '\n\n')
      // Remove multiple consecutive spaces
      .replace(/ {2,}/g, ' ')
      // Trim whitespace from each line
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      // Trim the entire text
      .trim();
  }
}
