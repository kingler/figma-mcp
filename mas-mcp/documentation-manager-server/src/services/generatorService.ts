import { DocumentGenerationRequest, DocumentTemplate, TemplateSection } from '../types.js';
import { TemplateService } from './templateService.js';
import { DocumentService } from './documentService.js';

export class GeneratorService {
  private templateService: TemplateService;
  private documentService: DocumentService;
  
  constructor(templateService: TemplateService, documentService: DocumentService) {
    this.templateService = templateService;
    this.documentService = documentService;
  }
  
  async generateDocument(request: DocumentGenerationRequest): Promise<string> {
    // Get template to use for generation
    let template: DocumentTemplate | null = null;
    
    if (request.templateId) {
      template = await this.templateService.getTemplate(request.templateId);
    } 
    
    if (!template) {
      // Get default template for document type
      const templates = await this.templateService.getTemplatesByType(request.type);
      if (templates.length > 0) {
        template = templates[0]; // Use first available template
      } else {
        throw new Error(`No template found for document type ${request.type}`);
      }
    }
    
    // Generate document content based on template and input data
    const content = await this.generateContentFromTemplate(template, request.inputData);
    
    // Save generated document
    const document = await this.documentService.createDocument(request, content);
    
    return document.id;
  }
  
  private async generateContentFromTemplate(template: DocumentTemplate, inputData: Record<string, any>): Promise<string> {
    // In a real implementation, this would use a language model to generate content
    // based on the template structure and input data
    
    // For now, we'll just create a simple markdown structure based on the template
    let content = `# ${inputData.title || 'Untitled Document'}\n\n`;
    
    // Add metadata
    content += `## Document Metadata\n\n`;
    content += `- Type: ${template.type}\n`;
    content += `- Template: ${template.name}\n`;
    content += `- Created: ${new Date().toISOString()}\n\n`;
    
    // Process each section in the template
    for (const section of template.sections) {
      content += this.generateSection(section, inputData, 2);
    }
    
    return content;
  }
  
  private generateSection(section: TemplateSection, inputData: Record<string, any>, headingLevel: number): string {
    const headingMarker = '#'.repeat(headingLevel);
    let content = `${headingMarker} ${section.title}\n\n`;
    
    // Check if we have specific content for this section in the input data
    const sectionKey = section.title.toLowerCase().replace(/\s+/g, '_');
    
    if (inputData[sectionKey]) {
      content += `${inputData[sectionKey]}\n\n`;
    } else {
      // Add placeholder based on section description
      content += `${section.description}\n\n`;
    }
    
    // Process subsections if any
    if (section.subsections && section.subsections.length > 0) {
      for (const subsection of section.subsections) {
        content += this.generateSection(subsection, inputData, headingLevel + 1);
      }
    }
    
    return content;
  }
  
  // This would be enhanced with an actual LLM-based generation in production
  async generateSummary(documentId: string, maxLength: number = 500): Promise<string> {
    const document = await this.documentService.getDocument(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }
    
    // Simple summary implementation - just extract the first few characters
    // In a real implementation, this would use an LLM to generate a proper summary
    const summary = document.content.substring(0, maxLength);
    
    return summary + (document.content.length > maxLength ? '...' : '');
  }
} 