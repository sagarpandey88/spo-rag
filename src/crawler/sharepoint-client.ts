import { sp } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/files';
import '@pnp/sp/folders';
import '@pnp/sp/items';
import { AdalFetchClient } from '@pnp/nodejs';
import { readFileSync } from 'fs';
import { config } from '../shared/config';
import { logger } from '../shared/logger';
import { DocumentMetadata } from '../shared/types';

export class SharePointClient {
  private initialized = false;

  async initialize(): Promise<void> {
    try {
      const certificate = readFileSync(config.azure.certificatePath, 'utf-8');

      sp.setup({
        sp: {
          fetchClientFactory: () => {
            return new AdalFetchClient(
              config.azure.tenantId,
              config.azure.clientId,
              certificate,
              config.azure.thumbprint
            );
          },
          baseUrl: config.sharepoint.siteUrl,
        },
      });

      this.initialized = true;
      logger.info('SharePoint client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SharePoint client', { error });
      throw error;
    }
  }

  async listDocuments(): Promise<DocumentMetadata[]> {
    if (!this.initialized) {
      throw new Error('SharePoint client not initialized');
    }

    try {
      logger.info(`Fetching documents from library: ${config.sharepoint.libraryName}`);

      const items = await sp.web.lists
        .getByTitle(config.sharepoint.libraryName)
        .items.select(
          'File/Name',
          'File/ServerRelativeUrl',
          'File/TimeLastModified',
          'File/Length',
          'File/MajorVersion',
          'File/MinorVersion',
          'FileLeafRef',
          'FileDirRef'
        )
        .expand('File')
        .filter("FSObjType eq 0 and (endswith(File/Name, '.pdf') or endswith(File/Name, '.docx') or endswith(File/Name, '.doc'))")();

      const documents: DocumentMetadata[] = items.map((item: any) => ({
        id: item.File.UniqueId || item.Id.toString(),
        filename: item.File.Name,
        url: `${config.sharepoint.siteUrl}${item.File.ServerRelativeUrl}`,
        path: item.File.ServerRelativeUrl,
        modified: new Date(item.File.TimeLastModified),
        size: item.File.Length,
        contentType: this.getContentType(item.File.Name),
        library: config.sharepoint.libraryName,
      }));

      logger.info(`Found ${documents.length} documents`);
      return documents;
    } catch (error) {
      logger.error('Failed to list documents', { error });
      throw error;
    }
  }

  async downloadDocument(serverRelativeUrl: string): Promise<Buffer> {
    if (!this.initialized) {
      throw new Error('SharePoint client not initialized');
    }

    try {
      logger.debug(`Downloading document: ${serverRelativeUrl}`);

      const file = await sp.web.getFileByServerRelativePath(serverRelativeUrl).getBuffer();
      
      logger.debug(`Downloaded ${file.byteLength} bytes`);
      return Buffer.from(file);
    } catch (error) {
      logger.error(`Failed to download document: ${serverRelativeUrl}`, { error });
      throw error;
    }
  }

  private getContentType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf':
        return 'application/pdf';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'doc':
        return 'application/msword';
      default:
        return 'application/octet-stream';
    }
  }
}
