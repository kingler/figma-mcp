export type DocumentType = 
  | 'BRD'           // Business Requirements Document
  | 'PRD'           // Product Requirements Document
  | 'TechnicalSpec' // Technical Specification
  | 'DesignDoc'     // Design Documentation
  | 'UserGuide'     // User Guide
  | 'APIDoc'        // API Documentation
  | 'SystemDoc'     // System Documentation
  | 'DeploymentDoc' // Deployment Documentation
  | 'TestPlan'      // Test Plan
  | 'Custom';       // Custom Documentation Type

export interface DocumentMetadata {
  id: string;
  type: DocumentType;
  title: string;
  description: string;
  projectId: string;
  version: string;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
  tags: string[];
}

export interface Document extends DocumentMetadata {
  content: string; // JSON or Markdown content
}

export interface DocumentTemplate {
  type: DocumentType;
  name: string;
  description: string;
  sections: TemplateSection[];
}

export interface TemplateSection {
  title: string;
  description: string;
  required: boolean;
  subsections?: TemplateSection[];
}

export interface DocumentGenerationRequest {
  type: DocumentType;
  title: string;
  projectId: string;
  templateId?: string;
  inputData: Record<string, any>;
  createdBy: string;
  tags?: string[];
}

export interface DocumentRetrievalRequest {
  id?: string;
  projectId?: string;
  type?: DocumentType;
  version?: string;
  tags?: string[];
  fullText?: boolean;
  limit?: number;
  offset?: number;
}

export interface DocumentUpdateRequest {
  id: string;
  content?: string;
  title?: string;
  description?: string;
  tags?: string[];
  updatedBy: string;
}

export interface DocumentVersionInfo {
  id: string;
  documentId: string;
  version: string;
  changes: string;
  createdBy: string;
  createdAt: Date;
  content: string;
}

export interface DocumentSummaryRequest {
  id: string;
  maxLength?: number;
  focusAreas?: string[];
} 