import { createServer } from '../src/server.js';
import { getComponentCategory, atomicComponentMap } from '../src/componentPreview.js';

describe('Shadcn MCP Server', () => {
  describe('Component Preview', () => {
    test('getComponentCategory should categorize components correctly', () => {
      // Test atoms
      expect(getComponentCategory('button')).toBe('atoms');
      expect(getComponentCategory('input')).toBe('atoms');
      
      // Test molecules
      expect(getComponentCategory('form')).toBe('molecules');
      expect(getComponentCategory('select')).toBe('molecules');
      
      // Test organisms
      expect(getComponentCategory('card')).toBe('organisms');
      expect(getComponentCategory('table')).toBe('organisms');
      
      // Test templates
      expect(getComponentCategory('collapsible')).toBe('templates');
      expect(getComponentCategory('popover')).toBe('templates');
      
      // Test unknown component
      expect(getComponentCategory('nonexistent')).toBe('unknown');
    });
    
    test('atomicComponentMap should have all required categories', () => {
      expect(atomicComponentMap).toHaveProperty('atoms');
      expect(atomicComponentMap).toHaveProperty('molecules');
      expect(atomicComponentMap).toHaveProperty('organisms');
      expect(atomicComponentMap).toHaveProperty('templates');
      expect(atomicComponentMap).toHaveProperty('pages');
      
      // Check some specific components exist
      expect(atomicComponentMap.atoms).toContain('button');
      expect(atomicComponentMap.molecules).toContain('form');
      expect(atomicComponentMap.organisms).toContain('card');
    });
  });
  
  describe('Server Creation', () => {
    test('createServer should return a valid server instance', () => {
      const server = createServer();
      expect(server).toBeDefined();
    });
  });
}); 