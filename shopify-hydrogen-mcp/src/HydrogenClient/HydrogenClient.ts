import { createStorefrontClient } from '@shopify/hydrogen-react';
import type { ComponentType, StylingOption } from '../types';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class HydrogenClient {
  private client;
  private templatesDir: string;

  constructor(storeDomain: string, storefrontToken: string) {
    this.client = createStorefrontClient({
      storeDomain,
      publicStorefrontToken: storefrontToken,
    });
    this.templatesDir = path.join(__dirname, 'templates');
  }

  async createComponent(config: {
    name: string;
    type: ComponentType;
    features: string[];
    styling: StylingOption;
    outputDir: string;
  }) {
    const { name, type, features, styling, outputDir } = config;
    const componentDir = path.join(outputDir, name);

    // Create component directory
    await fs.mkdir(componentDir, { recursive: true });

    // Read template files
    const templateName = this.getTemplateNameForType(type);
    const [componentTemplate, cssTemplate] = await Promise.all([
      fs.readFile(path.join(this.templatesDir, `${templateName}.tsx`), 'utf-8'),
      fs.readFile(path.join(this.templatesDir, `${templateName}.module.css`), 'utf-8'),
    ]);

    // Replace placeholders in templates
    const componentContent = this.processComponentTemplate(componentTemplate, name, features);
    const cssContent = cssTemplate;

    // Generate component files
    await Promise.all([
      fs.writeFile(path.join(componentDir, `${name}.tsx`), componentContent),
      fs.writeFile(path.join(componentDir, `${name}.module.css`), cssContent),
      this.createIndexFile(componentDir, name),
    ]);

    return {
      path: componentDir,
      files: [
        `${name}.tsx`,
        `${name}.module.css`,
        'index.ts',
      ],
    };
  }

  private getTemplateNameForType(type: ComponentType): string {
    switch (type) {
      case 'product':
        return 'ProductComponent';
      case 'collection':
        return 'CollectionComponent';
      case 'cart':
        return 'CartComponent';
      default:
        throw new Error(`Unknown component type: ${type}`);
    }
  }

  private processComponentTemplate(template: string, name: string, features: string[]): string {
    return template
      .replace(/COMPONENT_NAME/g, name)
      .replace(/FEATURES_LIST/g, JSON.stringify(features, null, 2));
  }

  private async createIndexFile(dir: string, name: string) {
    const indexContent = `export { default } from './${name}';\n`;
    await fs.writeFile(path.join(dir, 'index.ts'), indexContent);
  }

  async validateStorefrontAccess(): Promise<boolean> {
    try {
      const response = await fetch(this.client.getStorefrontApiUrl(), {
        method: 'POST',
        headers: this.client.getPublicTokenHeaders(),
        body: JSON.stringify({
          query: `
            query shopInfo {
              shop {
                name
              }
            }
          `
        }),
      });

      const data = await response.json();
      return !!data?.data?.shop?.name;
    } catch (error) {
      console.error('Failed to validate Storefront API access:', error);
      return false;
    }
  }

  async getShopInfo() {
    try {
      const response = await fetch(this.client.getStorefrontApiUrl(), {
        method: 'POST',
        headers: this.client.getPublicTokenHeaders(),
        body: JSON.stringify({
          query: `
            query shopInfo {
              shop {
                name
                primaryDomain {
                  url
                }
              }
            }
          `
        }),
      });

      const data = await response.json();
      return data?.data?.shop;
    } catch (error) {
      console.error('Failed to get shop info:', error);
      throw error;
    }
  }
}
