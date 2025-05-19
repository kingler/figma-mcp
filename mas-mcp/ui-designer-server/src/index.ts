#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  Request
} from '@modelcontextprotocol/sdk/types.js';

interface CallToolRequest extends Request {
  params: {
    name: string;
    arguments?: Record<string, unknown>;
  };
}

type ComponentType = 'atom' | 'molecule' | 'organism' | 'template';
type StyleType = 'color' | 'typography' | 'spacing' | 'layout';
type StylingType = 'css' | 'scss' | 'styled-components';

interface CreateComponentArgs {
  name: string;
  type: ComponentType;
  props: {
    name: string;
    type: string;
    required: boolean;
  }[];
  styles?: Record<string, unknown>;
}

interface UpdateStyleSystemArgs {
  type: StyleType;
  tokens: {
    name: string;
    value: string;
    description?: string;
  }[];
  platform?: string;
}

interface GenerateComponentArgs {
  spec: {
    name: string;
    description: string;
    requirements: string[];
  };
  framework: string;
  styling: StylingType;
}

interface ValidateDesignSystemArgs {
  components: string[];
  styles: string[];
  guidelines: string[];
  platform?: string;
}

const COMPONENT_TYPES = ['atom', 'molecule', 'organism', 'template'] as const;
const STYLE_TYPES = ['color', 'typography', 'spacing', 'layout'] as const;
const STYLING_TYPES = ['css', 'scss', 'styled-components'] as const;

function validateCreateComponentArgs(args: unknown): args is CreateComponentArgs {
  const a = args as Partial<CreateComponentArgs>;
  return typeof a.name === 'string' &&
    typeof a.type === 'string' &&
    COMPONENT_TYPES.includes(a.type as ComponentType) &&
    Array.isArray(a.props) &&
    a.props.every(p => 
      typeof p.name === 'string' &&
      typeof p.type === 'string' &&
      typeof p.required === 'boolean'
    ) &&
    (a.styles === undefined || typeof a.styles === 'object');
}

function validateUpdateStyleSystemArgs(args: unknown): args is UpdateStyleSystemArgs {
  const a = args as Partial<UpdateStyleSystemArgs>;
  return typeof a.type === 'string' &&
    STYLE_TYPES.includes(a.type as StyleType) &&
    Array.isArray(a.tokens) &&
    a.tokens.every(t =>
      typeof t.name === 'string' &&
      typeof t.value === 'string' &&
      (t.description === undefined || typeof t.description === 'string')
    ) &&
    (a.platform === undefined || typeof a.platform === 'string');
}

function validateGenerateComponentArgs(args: unknown): args is GenerateComponentArgs {
  const a = args as Partial<GenerateComponentArgs>;
  return typeof a.spec === 'object' &&
    a.spec !== null &&
    typeof a.spec.name === 'string' &&
    typeof a.spec.description === 'string' &&
    Array.isArray(a.spec.requirements) &&
    a.spec.requirements.every(r => typeof r === 'string') &&
    typeof a.framework === 'string' &&
    typeof a.styling === 'string' &&
    STYLING_TYPES.includes(a.styling as StylingType);
}

function validateValidateDesignSystemArgs(args: unknown): args is ValidateDesignSystemArgs {
  const a = args as Partial<ValidateDesignSystemArgs>;
  return Array.isArray(a.components) &&
    a.components.every(c => typeof c === 'string') &&
    Array.isArray(a.styles) &&
    a.styles.every(s => typeof s === 'string') &&
    Array.isArray(a.guidelines) &&
    a.guidelines.every(g => typeof g === 'string') &&
    (a.platform === undefined || typeof a.platform === 'string');
}

class UIDesignerServer {
  private server: Server;
  private components: Map<string, object>;
  private styles: Map<string, object>;
  private designSystems: Map<string, object>;

  constructor() {
    this.server = new Server(
      {
        name: 'ui-designer-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.components = new Map();
    this.styles = new Map();
    this.designSystems = new Map();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'create_component',
          description: 'Create a new UI component',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Component name' },
              type: {
                type: 'string',
                enum: ['atom', 'molecule', 'organism', 'template'],
                description: 'Component type'
              },
              props: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    required: { type: 'boolean' }
                  },
                  required: ['name', 'type', 'required']
                },
                description: 'Component props'
              },
              styles: {
                type: 'object',
                description: 'Component styles'
              }
            },
            required: ['name', 'type', 'props']
          }
        },
        {
          name: 'update_style_system',
          description: 'Update design system styles',
          inputSchema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['color', 'typography', 'spacing', 'layout'],
                description: 'Style type'
              },
              tokens: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    value: { type: 'string' },
                    description: { type: 'string' }
                  },
                  required: ['name', 'value']
                },
                description: 'Style tokens'
              },
              platform: { type: 'string', description: 'Target platform' }
            },
            required: ['type', 'tokens']
          }
        },
        {
          name: 'generate_component',
          description: 'Generate component from specification',
          inputSchema: {
            type: 'object',
            properties: {
              spec: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  requirements: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                },
                required: ['name', 'description', 'requirements']
              },
              framework: { type: 'string', description: 'Target framework' },
              styling: {
                type: 'string',
                enum: ['css', 'scss', 'styled-components'],
                description: 'Styling approach'
              }
            },
            required: ['spec', 'framework', 'styling']
          }
        },
        {
          name: 'validate_design_system',
          description: 'Validate design system consistency',
          inputSchema: {
            type: 'object',
            properties: {
              components: {
                type: 'array',
                items: { type: 'string' },
                description: 'Component list'
              },
              styles: {
                type: 'array',
                items: { type: 'string' },
                description: 'Style list'
              },
              guidelines: {
                type: 'array',
                items: { type: 'string' },
                description: 'Design guidelines'
              },
              platform: { type: 'string', description: 'Target platform' }
            },
            required: ['components', 'styles', 'guidelines']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      if (!request.params.arguments) {
        throw new McpError(ErrorCode.InvalidParams, 'Missing arguments');
      }

      try {
        switch (request.params.name) {
          case 'create_component': {
            if (!validateCreateComponentArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid create_component arguments');
            }
            
            const component = await this.createComponent(
              request.params.arguments.name,
              request.params.arguments.type,
              request.params.arguments.props,
              request.params.arguments.styles
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(component, null, 2)
                }
              ]
            };
          }

          case 'update_style_system': {
            if (!validateUpdateStyleSystemArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid update_style_system arguments');
            }

            const styles = await this.updateStyleSystem(
              request.params.arguments.type,
              request.params.arguments.tokens,
              request.params.arguments.platform
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(styles, null, 2)
                }
              ]
            };
          }

          case 'generate_component': {
            if (!validateGenerateComponentArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid generate_component arguments');
            }

            const generated = await this.generateComponent(
              request.params.arguments.spec,
              request.params.arguments.framework,
              request.params.arguments.styling
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(generated, null, 2)
                }
              ]
            };
          }

          case 'validate_design_system': {
            if (!validateValidateDesignSystemArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid validate_design_system arguments');
            }

            const validation = await this.validateDesignSystem(
              request.params.arguments.components,
              request.params.arguments.styles,
              request.params.arguments.guidelines,
              request.params.arguments.platform
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(validation, null, 2)
                }
              ]
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        console.error('[UI Design Error]', error);
        throw new McpError(
          ErrorCode.InternalError,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    });
  }

  private async createComponent(
    name: string,
    type: ComponentType,
    props: { name: string; type: string; required: boolean }[],
    styles?: Record<string, unknown>
  ): Promise<object> {
    const componentId = `component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate component creation
    const component = {
      id: componentId,
      name,
      type,
      props,
      styles: styles || {},
      template: this.generateTemplate(name, props),
      documentation: {
        description: `A ${type} component for ${name}`,
        usage: `<${name} ${props.map(p => p.required ? `${p.name}={${p.type}}` : '').join(' ')}>`,
        props: props.map(p => ({
          ...p,
          description: `${p.name} of type ${p.type}`
        }))
      },
      metadata: {
        creator: 'ui-designer-mcp',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }
    };

    this.components.set(componentId, component);
    return component;
  }

  private generateTemplate(name: string, props: { name: string; type: string }[]): string {
    // Simulate template generation
    const propsString = props.map(p => `${p.name}: ${p.type}`).join(', ');
    return `
interface ${name}Props {
  ${propsString}
}

export const ${name} = ({ ${props.map(p => p.name).join(', ')} }: ${name}Props) => {
  return (
    <div className="${name.toLowerCase()}">
      {/* Component content */}
    </div>
  );
};
    `.trim();
  }

  private async updateStyleSystem(
    type: StyleType,
    tokens: { name: string; value: string; description?: string }[],
    platform?: string
  ): Promise<object> {
    const styleId = `style-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Simulate style system update
    const styleSystem = {
      id: styleId,
      type,
      platform: platform || 'web',
      tokens: tokens.map(token => ({
        ...token,
        id: `${type}-${token.name}`,
        usage: this.generateStyleUsage(type, token)
      })),
      variables: {
        css: tokens.map(t => `--${t.name}: ${t.value};`).join('\n'),
        scss: tokens.map(t => `$${t.name}: ${t.value};`).join('\n'),
        js: `export const ${type} = ${JSON.stringify(
          tokens.reduce((acc, t) => ({ ...acc, [t.name]: t.value }), {}),
          null,
          2
        )}`
      },
      metadata: {
        updatedBy: 'ui-designer-mcp',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }
    };

    this.styles.set(styleId, styleSystem);
    return styleSystem;
  }

  private generateStyleUsage(type: StyleType, token: { name: string; value: string }): string {
    // Simulate style usage generation
    switch (type) {
      case 'color':
        return `background-color: var(--${token.name});`;
      case 'typography':
        return `font: var(--${token.name});`;
      case 'spacing':
        return `margin: var(--${token.name});`;
      case 'layout':
        return `display: var(--${token.name});`;
      default:
        return `var(--${token.name}): ${token.value};`;
    }
  }

  private async generateComponent(
    spec: {
      name: string;
      description: string;
      requirements: string[];
    },
    framework: string,
    styling: StylingType
  ): Promise<object> {
    // Simulate component generation
    return {
      name: spec.name,
      framework,
      styling,
      files: {
        component: this.generateComponentCode(spec, framework, styling),
        styles: this.generateStyleCode(spec, styling),
        tests: this.generateTestCode(spec, framework),
        documentation: this.generateDocumentation(spec)
      },
      metadata: {
        generator: 'ui-designer-mcp',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }
    };
  }

  private generateComponentCode(
    spec: { name: string; requirements: string[] },
    framework: string,
    styling: string
  ): string {
    // Simulate component code generation
    return `
import React from 'react';
${styling === 'styled-components' ? "import styled from 'styled-components';" : ''}
${styling === 'scss' ? `import './${spec.name}.scss';` : ''}

export const ${spec.name} = () => {
  return (
    <div className="${spec.name.toLowerCase()}">
      {/* Generated component for ${spec.requirements.join(', ')} */}
    </div>
  );
};
    `.trim();
  }

  private generateStyleCode(
    spec: { name: string },
    styling: string
  ): string {
    // Simulate style code generation
    switch (styling) {
      case 'css':
        return `.${spec.name.toLowerCase()} {\n  /* CSS styles */\n}`;
      case 'scss':
        return `@import 'variables';\n\n.${spec.name.toLowerCase()} {\n  /* SCSS styles */\n}`;
      case 'styled-components':
        return `export const Styled${spec.name} = styled.div\`\n  /* Styled components styles */\n\`;`;
      default:
        return '';
    }
  }

  private generateTestCode(
    spec: { name: string },
    framework: string
  ): string {
    // Simulate test code generation
    return `
import { render, screen } from '@testing-library/react';
import { ${spec.name} } from './${spec.name}';

describe('${spec.name}', () => {
  it('renders correctly', () => {
    render(<${spec.name} />);
    // Add test assertions
  });
});
    `.trim();
  }

  private generateDocumentation(
    spec: { name: string; description: string; requirements: string[] }
  ): string {
    // Simulate documentation generation
    return `
# ${spec.name}

${spec.description}

## Requirements

${spec.requirements.map(r => `- ${r}`).join('\n')}

## Usage

\`\`\`jsx
import { ${spec.name} } from './${spec.name}';

const Example = () => (
  <${spec.name} />
);
\`\`\`
    `.trim();
  }

  private async validateDesignSystem(
    components: string[],
    styles: string[],
    guidelines: string[],
    platform?: string
  ): Promise<object> {
    // Simulate design system validation
    const validationScore = Math.random();
    const consistencyScore = Math.random();
    
    return {
      platform: platform || 'web',
      scores: {
        overall: validationScore,
        consistency: consistencyScore,
        coverage: components.length / 100
      },
      components: {
        total: components.length,
        analyzed: components.length,
        issues: components.length > 10 ? [
          {
            component: components[0],
            type: 'consistency',
            description: 'Inconsistent naming pattern'
          },
          {
            component: components[1],
            type: 'documentation',
            description: 'Missing prop types'
          }
        ] : []
      },
      styles: {
        total: styles.length,
        analyzed: styles.length,
        issues: styles.length > 5 ? [
          {
            token: styles[0],
            type: 'unused',
            description: 'Style token not used in any component'
          }
        ] : []
      },
      guidelines: {
        total: guidelines.length,
        coverage: guidelines.map(g => ({
          guideline: g,
          adherence: Math.random()
        }))
      },
      recommendations: [
        'Standardize component naming',
        'Document all prop types',
        'Remove unused style tokens'
      ],
      metadata: {
        validator: 'ui-designer-mcp',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('UI Designer MCP Server running on stdio');
  }
}

const server = new UIDesignerServer();
server.run().catch(console.error);