import { 
  Document, 
  DocumentMetadata, 
  DocumentGenerationRequest, 
  DocumentRetrievalRequest,
  DocumentUpdateRequest,
  DocumentVersionInfo
} from '../types.js';

// This will be replaced with actual database implementation
class DocumentDatabaseService {
  private documents: Map<string, Document> = new Map();
  private versions: Map<string, DocumentVersionInfo[]> = new Map();

  async createDocument(document: Document): Promise<Document> {
    this.documents.set(document.id, document);
    if (!this.versions.has(document.id)) {
      this.versions.set(document.id, []);
    }
    return document;
  }

  async getDocument(id: string): Promise<Document | null> {
    return this.documents.get(id) || null;
  }

  async updateDocument(document: Document): Promise<Document> {
    this.documents.set(document.id, document);
    return document;
  }

  async deleteDocument(id: string): Promise<boolean> {
    return this.documents.delete(id);
  }

  async searchDocuments(query: DocumentRetrievalRequest): Promise<Document[]> {
    const results: Document[] = [];
    for (const doc of this.documents.values()) {
      if (this.matchesQuery(doc, query)) {
        results.push(doc);
      }
    }
    return results.slice(query.offset || 0, (query.offset || 0) + (query.limit || results.length));
  }

  async addVersion(version: DocumentVersionInfo): Promise<void> {
    const versions = this.versions.get(version.documentId) || [];
    versions.push(version);
    this.versions.set(version.documentId, versions);
  }

  async getVersions(documentId: string): Promise<DocumentVersionInfo[]> {
    return this.versions.get(documentId) || [];
  }

  private matchesQuery(doc: Document, query: DocumentRetrievalRequest): boolean {
    if (query.id && doc.id !== query.id) return false;
    if (query.projectId && doc.projectId !== query.projectId) return false;
    if (query.type && doc.type !== query.type) return false;
    if (query.version && doc.version !== query.version) return false;
    if (query.tags && query.tags.length > 0) {
      if (!query.tags.some(tag => doc.tags.includes(tag))) {
        return false;
      }
    }
    return true;
  }
}

export class DocumentService {
  private db: DocumentDatabaseService;
  
  constructor(dbService?: DocumentDatabaseService) {
    this.db = dbService || new DocumentDatabaseService();
  }

  async createDocument(request: DocumentGenerationRequest, content: string): Promise<Document> {
    const now = new Date();
    const document: Document = {
      id: crypto.randomUUID(),
      type: request.type,
      title: request.title,
      description: '',
      projectId: request.projectId,
      version: '1.0.0',
      createdBy: request.createdBy,
      createdAt: now,
      updatedBy: request.createdBy,
      updatedAt: now,
      tags: request.tags || [],
      content
    };

    await this.db.createDocument(document);
    
    // Add initial version
    const versionInfo: DocumentVersionInfo = {
      id: crypto.randomUUID(),
      documentId: document.id,
      version: document.version,
      changes: 'Initial creation',
      createdBy: request.createdBy,
      createdAt: now,
      content
    };
    
    await this.db.addVersion(versionInfo);
    
    return document;
  }

  async getDocument(id: string, includeContent = true): Promise<Document | null> {
    const document = await this.db.getDocument(id);
    if (!document) return null;
    
    if (!includeContent) {
      const { content, ...metadata } = document;
      return { ...metadata, content: '' } as Document;
    }
    
    return document;
  }

  async updateDocument(request: DocumentUpdateRequest): Promise<Document | null> {
    const document = await this.db.getDocument(request.id);
    if (!document) return null;

    const now = new Date();
    const updatedDocument: Document = {
      ...document,
      title: request.title || document.title,
      description: request.description || document.description,
      tags: request.tags || document.tags,
      updatedBy: request.updatedBy,
      updatedAt: now,
      content: request.content !== undefined ? request.content : document.content
    };

    // Increment version if content changed
    if (request.content !== undefined && request.content !== document.content) {
      const versionParts = document.version.split('.');
      const minor = parseInt(versionParts[1] || '0') + 1;
      updatedDocument.version = `${versionParts[0]}.${minor}.0`;
      
      // Add version
      const versionInfo: DocumentVersionInfo = {
        id: crypto.randomUUID(),
        documentId: document.id,
        version: updatedDocument.version,
        changes: 'Content updated',
        createdBy: request.updatedBy,
        createdAt: now,
        content: updatedDocument.content
      };
      
      await this.db.addVersion(versionInfo);
    }

    return this.db.updateDocument(updatedDocument);
  }

  async deleteDocument(id: string): Promise<boolean> {
    return this.db.deleteDocument(id);
  }

  async searchDocuments(query: DocumentRetrievalRequest): Promise<Document[]> {
    const documents = await this.db.searchDocuments(query);
    
    if (!query.fullText) {
      return documents.map(doc => {
        const { content, ...metadata } = doc;
        return { ...metadata, content: '' } as Document;
      });
    }
    
    return documents;
  }

  async getDocumentVersions(documentId: string): Promise<DocumentVersionInfo[]> {
    return this.db.getVersions(documentId);
  }

  async getDocumentVersion(documentId: string, version: string): Promise<Document | null> {
    const document = await this.db.getDocument(documentId);
    if (!document) return null;
    
    const versions = await this.db.getVersions(documentId);
    const versionInfo = versions.find(v => v.version === version);
    if (!versionInfo) return null;
    
    return {
      ...document,
      version: versionInfo.version,
      content: versionInfo.content,
      updatedAt: versionInfo.createdAt,
      updatedBy: versionInfo.createdBy
    };
  }
} 