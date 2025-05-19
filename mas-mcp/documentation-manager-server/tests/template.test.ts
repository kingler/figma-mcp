import { TemplateService } from '../src/services/templateService.js';
import { DocumentTemplate } from '../src/types.js';

describe('Template Management', () => {
  let templateService: TemplateService;

  beforeAll(async () => {
    templateService = new TemplateService();
  });

  it('should get all templates', async () => {
    const templates = await templateService.getAllTemplates();
    expect(templates.length).toBeGreaterThan(0);
    // Should have at least BRD and PRD templates from initialization
    expect(templates.some(t => t.type === 'BRD')).toBe(true);
    expect(templates.some(t => t.type === 'PRD')).toBe(true);
  });

  it('should get templates by type', async () => {
    const brdTemplates = await templateService.getTemplatesByType('BRD');
    expect(brdTemplates.length).toBeGreaterThan(0);
    expect(brdTemplates[0].type).toBe('BRD');

    const prdTemplates = await templateService.getTemplatesByType('PRD');
    expect(prdTemplates.length).toBeGreaterThan(0);
    expect(prdTemplates[0].type).toBe('PRD');
  });

  it('should get a template by name', async () => {
    const template = await templateService.getTemplate('standard-brd');
    expect(template).toBeDefined();
    expect(template?.type).toBe('BRD');
    expect(template?.sections.length).toBeGreaterThan(0);
  });

  it('should create a new template', async () => {
    const newTemplate: DocumentTemplate = {
      type: 'TechnicalSpec',
      name: 'standard-tech-spec',
      description: 'Standard Technical Specification Template',
      sections: [
        {
          title: 'Introduction',
          description: 'Introduction to the technical specification',
          required: true
        },
        {
          title: 'Architecture',
          description: 'Architecture overview',
          required: true
        },
        {
          title: 'Components',
          description: 'Component specifications',
          required: true
        },
        {
          title: 'APIs',
          description: 'API specifications',
          required: true
        },
        {
          title: 'Data Model',
          description: 'Data model specifications',
          required: true
        }
      ]
    };

    const savedTemplate = await templateService.createTemplate(newTemplate);
    expect(savedTemplate).toBeDefined();
    expect(savedTemplate.type).toBe('TechnicalSpec');
    expect(savedTemplate.name).toBe('standard-tech-spec');
  });

  it('should update an existing template', async () => {
    // First get the template
    const template = await templateService.getTemplate('standard-tech-spec');
    expect(template).toBeDefined();

    if (template) {
      // Add a new section
      template.sections.push({
        title: 'Security',
        description: 'Security considerations',
        required: false
      });

      // Update the template
      const updatedTemplate = await templateService.updateTemplate(template);
      expect(updatedTemplate).toBeDefined();
      expect(updatedTemplate.sections.length).toBe(6);
      expect(updatedTemplate.sections[5].title).toBe('Security');
    }
  });

  it('should get templates by type after adding new ones', async () => {
    const techTemplates = await templateService.getTemplatesByType('TechnicalSpec');
    expect(techTemplates.length).toBe(1);
    expect(techTemplates[0].name).toBe('standard-tech-spec');
  });
}); 