describe('Tool Modules Smoke Tests', () => {
  const toolModules = [
    'neoOrchestrator',
    'componentLayoutAgent',
    'designSystemAgent',
    'reasoningAgent',
    'testingAgent',
    'uiDesigner',
    'uxDesigner',
    'productOwner',
    'uxResearcher',
    'braveSearch',
    'sequentialThinking',
    'redis',
    'puppeteer',
    'postgres',
    'memory',
    'gdrive',
    'techStackManager',
    'rootFileGenerator',
    'svgComponentGenerator',
    'wireframeGenerator',
    'uxWorkflowManager',
    'designTokenGenerator',
    'codeQuality',
    'projectInit',
    'morpheusValidator',
    'auditProcessor',
    'vectorDb',
    'knowledgeGraph',
    'contextManager',
    'docGenerator',
    'everything'
  ];

  toolModules.forEach(moduleName => {
    test(`Module ${moduleName}.ts should load without throwing`, async () => {
      await expect(async () => {
        const mod = await import(`../${moduleName}`);
        if (!mod) {
          throw new Error(`Module ${moduleName} is undefined`);
        }
      }).not.toThrow();
    });
  });
}); 