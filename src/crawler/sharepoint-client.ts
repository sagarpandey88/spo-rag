import { spfi, SPFI } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/files';
import '@pnp/sp/folders';
import '@pnp/sp/items';
import { MSAL, SPDefault } from '@pnp/nodejs';
import { readFileSync } from 'fs';
import { config } from '../shared/config';
import { logger } from '../shared/logger';
import { DocumentMetadata } from '../shared/types';
import { Configuration } from '@azure/msal-node';
const { LogLevel, PnPLogging } = require("@pnp/logging");

export class SharePointClient {
  private initialized = false;
  private sp: SPFI | null = null;
  private formatError(error: any) {
    if (!error) return error;
    const details: any = {};
    if (error instanceof Error) {
      details.name = error.name;
      details.message = error.message;
      details.stack = error.stack;
    } else if (typeof error === 'object') {
      details.message = (error as any).message ?? JSON.stringify(error);
    } else {
      details.message = String(error);
    }

    // Axios / request-like response
    if ((error as any).response) {
      const resp = (error as any).response;
      details.response = {
        status: resp.status,
        statusText: resp.statusText,
        data: resp.data,
      };
    }

    if ((error as any).config) {
      const cfg = (error as any).config;
      details.request = {
        url: cfg.url,
        method: cfg.method,
        headers: cfg.headers,
      };
    }

    return details;
  }

  async initialize(): Promise<void> {
    try {
      const certificate = readFileSync(config.azure.certificatePath, 'utf-8');
      const msalConfig: Configuration = {
        auth: {
          clientId: config.azure.clientId,
          authority: `https://login.microsoftonline.com/${config.azure.tenantId}`,
          clientCertificate: {
            thumbprint: config.azure.thumbprint,
            privateKey: certificate,
          },
        },
      };

      const sharepointHost = new URL(config.sharepoint.siteUrl).origin;
      const scopes = [`${sharepointHost}/.default`];

    //  this.sp = spfi(config.sharepoint.siteUrl).using(NodeFetch()).using(MSAL(msalConfig, scopes));
        this.sp = spfi(config.sharepoint.siteUrl).using(
                SPDefault(),
                MSAL(msalConfig, scopes),
                PnPLogging(LogLevel.Info)
            );

      this.initialized = true;

      // add code to get web title and print it in console.
      const web = await this.sp.web();
      logger.info(`Connected to SharePoint site: ${web.Title}`);

      logger.info('SharePoint client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SharePoint client', { error: this.formatError(error) });
      throw error;
    }
  }

  async listDocuments(): Promise<DocumentMetadata[]> {
    if (!this.initialized || !this.sp) {
      throw new Error('SharePoint client not initialized');
    }

    try {
      logger.info(`Fetching documents from library: ${config.sharepoint.libraryName}`);
      const items = await this.sp.web.lists
        .getByTitle(config.sharepoint.libraryName)
        .items
        .select(
          '*',
          'File/Name',
          'File/UniqueId',
          'File/ServerRelativeUrl',
          'File/TimeLastModified',
          'File/Length',
          'File/MajorVersion',
          'File/MinorVersion',
          'FileLeafRef',
          'FileDirRef'
        )
        .expand('File')
        ();
        //.filter("FSObjType eq 0 and (endswith(File/Name, '.pdf') or endswith(File/Name, '.docx') or endswith(File/Name, '.doc'))")();

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
      logger.error('Failed to list documents', { error: this.formatError(error) });
      throw error;
    }
  }

  async downloadDocument(serverRelativeUrl: string): Promise<Buffer> {
    if (!this.initialized || !this.sp) {
      throw new Error('SharePoint client not initialized');
    }

    try {
      logger.debug(`Downloading document: ${serverRelativeUrl}`);

      const sp = this.sp!;
      const file = await sp.web.getFileByServerRelativePath(serverRelativeUrl).getBuffer();
      
      logger.debug(`Downloaded ${file.byteLength} bytes`);
      return Buffer.from(file);
    } catch (error) {
      logger.error(`Failed to download document: ${serverRelativeUrl}`, { error: this.formatError(error) });
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
