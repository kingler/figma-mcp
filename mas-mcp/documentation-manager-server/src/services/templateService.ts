import { DocumentTemplate, DocumentType, TemplateSection } from '../types.js';

// This will be replaced with actual database implementation
class TemplateDatabase {
  private templates: Map<string, DocumentTemplate> = new Map();

  async getTemplate(id: string): Promise<DocumentTemplate | null> {
    return this.templates.get(id) || null;
  }

  async saveTemplate(template: DocumentTemplate): Promise<DocumentTemplate> {
    this.templates.set(template.name, template);
    return template;
  }

  async getAllTemplates(): Promise<DocumentTemplate[]> {
    return Array.from(this.templates.values());
  }

  async getTemplatesByType(type: DocumentType): Promise<DocumentTemplate[]> {
    return Array.from(this.templates.values()).filter(t => t.type === type);
  }
}

export class TemplateService {
  private db: TemplateDatabase;
  
  constructor(dbService?: TemplateDatabase) {
    this.db = dbService || new TemplateDatabase();
    this.initializeDefaultTemplates();
  }

  async getTemplate(id: string): Promise<DocumentTemplate | null> {
    return this.db.getTemplate(id);
  }

  async getTemplatesByType(type: DocumentType): Promise<DocumentTemplate[]> {
    return this.db.getTemplatesByType(type);
  }

  async createTemplate(template: DocumentTemplate): Promise<DocumentTemplate> {
    return this.db.saveTemplate(template);
  }

  async updateTemplate(template: DocumentTemplate): Promise<DocumentTemplate> {
    return this.db.saveTemplate(template);
  }

  async getAllTemplates(): Promise<DocumentTemplate[]> {
    return this.db.getAllTemplates();
  }

  private async initializeDefaultTemplates(): Promise<void> {
    // Create default templates for common document types
    const brdTemplate: DocumentTemplate = {
      type: 'BRD',
      name: 'standard-brd',
      description: 'Standard Business Requirements Document Template',
      sections: [
        {
          title: 'Introduction',
          description: 'Introduction to the business requirements',
          required: true,
          subsections: [
            {
              title: 'Purpose',
              description: 'Purpose of this document',
              required: true
            },
            {
              title: 'Scope',
              description: 'Scope of the requirements',
              required: true
            },
            {
              title: 'Definitions',
              description: 'Key terms and definitions',
              required: false
            }
          ]
        },
        {
          title: 'Business Overview',
          description: 'Overview of the business context',
          required: true,
          subsections: [
            {
              title: 'Business Objectives',
              description: 'Key business objectives',
              required: true
            },
            {
              title: 'Success Metrics',
              description: 'How success will be measured',
              required: true
            }
          ]
        },
        {
          title: 'Requirements',
          description: 'Detailed business requirements',
          required: true,
          subsections: [
            {
              title: 'Functional Requirements',
              description: 'Business functional requirements',
              required: true
            },
            {
              title: 'Non-Functional Requirements',
              description: 'Business non-functional requirements',
              required: false
            }
          ]
        },
        {
          title: 'Stakeholders',
          description: 'Key stakeholders',
          required: true
        },
        {
          title: 'Constraints',
          description: 'Business constraints',
          required: false
        },
        {
          title: 'Assumptions',
          description: 'Business assumptions',
          required: false
        }
      ]
    };

    const prdTemplate: DocumentTemplate = {
      type: 'PRD',
      name: 'standard-prd',
      description: 'Standard Product Requirements Document Template',
      sections: [
        {
          title: 'Introduction',
          description: 'Introduction to the product',
          required: true,
          subsections: [
            {
              title: 'Purpose',
              description: 'Purpose of this document',
              required: true
            },
            {
              title: 'Product Overview',
              description: 'Overview of the product',
              required: true
            }
          ]
        },
        {
          title: 'Target Audience',
          description: 'Description of target users',
          required: true
        },
        {
          title: 'User Stories',
          description: 'Key user stories',
          required: true
        },
        {
          title: 'Feature Requirements',
          description: 'Detailed feature requirements',
          required: true,
          subsections: [
            {
              title: 'Must-Have Features',
              description: 'Essential features',
              required: true
            },
            {
              title: 'Nice-to-Have Features',
              description: 'Optional features',
              required: false
            }
          ]
        },
        {
          title: 'Non-Functional Requirements',
          description: 'Performance, security, usability requirements',
          required: true
        },
        {
          title: 'User Interface',
          description: 'UI requirements and mockups',
          required: false
        },
        {
          title: 'Release Criteria',
          description: 'Criteria for release',
          required: true
        },
        {
          title: 'Future Considerations',
          description: 'Future roadmap items',
          required: false
        }
      ]
    };

    // Save default templates
    await this.db.saveTemplate(brdTemplate);
    await this.db.saveTemplate(prdTemplate);
  }
} 