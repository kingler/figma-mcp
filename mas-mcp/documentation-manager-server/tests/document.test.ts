import { DocumentService } from '../src/services/documentService.js';
import { TemplateService } from '../src/services/templateService.js';
import { GeneratorService } from '../src/services/generatorService.js';
import { DocumentGenerationRequest, DocumentRetrievalRequest, DocumentUpdateRequest } from '../src/types.js';

describe('Document Management', () => {
  let documentService: DocumentService;
  let templateService: TemplateService;
  let generatorService: GeneratorService;
  let documentId: string;

  beforeAll(async () => {
    documentService = new DocumentService();
    templateService = new TemplateService();
    generatorService = new GeneratorService(templateService, documentService);
  });

  it('should generate a document', async () => {
    const request: DocumentGenerationRequest = {
      type: 'BRD',
      title: 'Test Business Requirements Document',
      projectId: 'test-project',
      inputData: {
        title: 'Test BRD',
        introduction: 'This is a test introduction.',
        business_overview: 'This is a test business overview.',
        requirements: 'These are test requirements.',
        stakeholders: 'These are test stakeholders.'
      },
      createdBy: 'test-user',
      tags: ['test', 'brd']
    };

    documentId = await generatorService.generateDocument(request);
    expect(documentId).toBeDefined();
  });

  it('should retrieve a document by ID', async () => {
    const document = await documentService.getDocument(documentId);
    expect(document).toBeDefined();
    expect(document?.title).toBe('Test Business Requirements Document');
    expect(document?.type).toBe('BRD');
    expect(document?.tags).toContain('test');
    expect(document?.tags).toContain('brd');
  });

  it('should search for documents', async () => {
    const request: DocumentRetrievalRequest = {
      type: 'BRD',
      projectId: 'test-project',
      fullText: true
    };

    const documents = await documentService.searchDocuments(request);
    expect(documents.length).toBeGreaterThan(0);
    expect(documents[0].type).toBe('BRD');
    expect(documents[0].projectId).toBe('test-project');
  });

  it('should update a document', async () => {
    const updateRequest: DocumentUpdateRequest = {
      id: documentId,
      title: 'Updated Test BRD',
      content: '# Updated Test BRD\n\nThis is updated content.',
      updatedBy: 'test-user'
    };

    const updated = await documentService.updateDocument(updateRequest);
    expect(updated).toBeDefined();
    expect(updated?.title).toBe('Updated Test BRD');
    expect(updated?.version).not.toBe('1.0.0');
  });

  it('should get document versions', async () => {
    const versions = await documentService.getDocumentVersions(documentId);
    expect(versions.length).toBe(2);
    expect(versions[0].version).toBe('1.0.0');
    expect(versions[1].version).toBe('1.1.0');
  });

  it('should generate a document summary', async () => {
    const summary = await generatorService.generateSummary(documentId, 100);
    expect(summary).toBeDefined();
    expect(summary.length).toBeLessThanOrEqual(100);
  });

  it('should delete a document', async () => {
    const result = await documentService.deleteDocument(documentId);
    expect(result).toBe(true);

    const deleted = await documentService.getDocument(documentId);
    expect(deleted).toBeNull();
  });
}); 