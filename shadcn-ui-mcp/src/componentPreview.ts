import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

// Atomic design categories
export const atomicCategories = {
  atoms: "Basic building blocks of matter",
  molecules: "Groups of atoms bonded together, smallest fundamental units",
  organisms: "Groups of molecules working together as a functional unit",
  templates: "Groups of organisms forming pages with placeholder content",
  pages: "Specific instances of templates with real content"
};

// Component mapping to atomic design categories
export const atomicComponentMap: Record<string, string[]> = {
  atoms: ["button", "input", "label", "badge", "avatar", "separator", "typography", "aspect-ratio", "scroll-area"],
  molecules: ["form", "select", "checkbox", "radio-group", "switch", "textarea", "tooltip", "dropdown-menu", "context-menu"],
  organisms: ["table", "card", "tabs", "accordion", "alert", "alert-dialog", "dialog", "toast", "navigation-menu", "command", "sheet"],
  templates: ["collapsible", "popover", "hover-card"],
  pages: []
};

// Get atomic category for a component
export function getComponentCategory(componentName: string): string {
  for (const [category, components] of Object.entries(atomicComponentMap)) {
    if (components.includes(componentName)) {
      return category;
    }
  }
  return "unknown";
}

// Generate preview HTML for component
export async function generateComponentPreview(componentName: string, projectRoot: string): Promise<string> {
  try {
    const componentDir = path.join(projectRoot, 'components/ui');
    const componentPath = path.join(componentDir, `${componentName}.tsx`);
    
    // Check if component exists
    try {
      await fs.access(componentPath);
    } catch (error) {
      return `Component ${componentName} not found at ${componentPath}`;
    }
    
    // Create a temporary Next.js page to render the component
    const previewDir = path.join(projectRoot, '.shadcn-preview');
    const pagesDir = path.join(previewDir, 'pages');
    
    await fs.mkdir(pagesDir, { recursive: true });
    
    // Create a simple preview page for the component
    const previewContent = `
import { ${componentName.charAt(0).toUpperCase() + componentName.slice(1)} } from '../../components/ui/${componentName}';

export default function Preview() {
  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold mb-6">${componentName.charAt(0).toUpperCase() + componentName.slice(1)} Component</h1>
      <div className="border p-4 rounded-md">
        <${componentName.charAt(0).toUpperCase() + componentName.slice(1)} />
      </div>
    </div>
  );
}
`;
    
    await fs.writeFile(path.join(pagesDir, `${componentName}.tsx`), previewContent);
    
    // Return the preview URL
    return `http://localhost:3000/${componentName}`;
  } catch (error) {
    return `Failed to generate preview: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// Start the preview server
export async function startPreviewServer(projectRoot: string): Promise<void> {
  const previewDir = path.join(projectRoot, '.shadcn-preview');
  
  // Create package.json for preview server
  const packageJson = {
    name: "shadcn-preview",
    version: "1.0.0",
    scripts: {
      "dev": "next dev",
      "build": "next build",
      "start": "next start"
    },
    dependencies: {
      "next": "latest",
      "react": "latest",
      "react-dom": "latest"
    }
  };
  
  await fs.writeFile(
    path.join(previewDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  // Start the preview server
  const nextProcess = spawn('npm', ['run', 'dev'], {
    cwd: previewDir,
    detached: true,
    stdio: 'ignore'
  });
  
  nextProcess.unref();
}

// Generate component category view
export async function generateAtomicDesignView(projectRoot: string): Promise<{ [category: string]: string[] }> {
  try {
    const componentDir = path.join(projectRoot, 'components/ui');
    const componentFiles = await fs.readdir(componentDir);
    
    // Group components by atomic design category
    const categoryMap: { [category: string]: string[] } = {
      atoms: [],
      molecules: [],
      organisms: [],
      templates: [],
      pages: [],
      unknown: []
    };
    
    for (const file of componentFiles) {
      if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
        const componentName = file.replace(/\.(tsx|jsx)$/, '');
        const category = getComponentCategory(componentName);
        
        if (category === 'unknown') {
          categoryMap.unknown.push(componentName);
        } else {
          categoryMap[category].push(componentName);
        }
      }
    }
    
    return categoryMap;
  } catch (error) {
    console.error('Error generating atomic design view:', error);
    return {};
  }
}

// Generate and launch a storybook-like interface
export async function generateStorybookSite(projectRoot: string): Promise<string> {
  try {
    const previewDir = path.join(projectRoot, '.shadcn-preview');
    const pagesDir = path.join(previewDir, 'pages');
    
    await fs.mkdir(pagesDir, { recursive: true });
    
    // Get components organized by category
    const categorizedComponents = await generateAtomicDesignView(projectRoot);
    
    // Create index page with links to all components, organized by atomic design category
    let indexContent = `
import Link from 'next/link';

export default function Home() {
  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold mb-6">Atomic Design Component Library</h1>
`;

    // Add sections for each category
    for (const [category, components] of Object.entries(categorizedComponents)) {
      if (components.length > 0) {
        indexContent += `
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-2 capitalize">${category}</h2>
        <p className="text-gray-500 mb-4">${atomicCategories[category as keyof typeof atomicCategories] || ''}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
`;

        for (const component of components) {
          indexContent += `
          <Link href="/${component}" className="block p-4 border rounded-md hover:bg-gray-50">
            <span className="text-lg font-medium">${component}</span>
          </Link>
`;
        }

        indexContent += `
        </div>
      </div>
`;
      }
    }

    indexContent += `
    </div>
  );
}
`;
    
    // Write index file
    await fs.writeFile(path.join(pagesDir, 'index.tsx'), indexContent);
    
    // Create _app.tsx to include global styles
    const appContent = `
import '../../../styles/globals.css';

export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
`;
    
    await fs.writeFile(path.join(pagesDir, '_app.tsx'), appContent);
    
    // Start the preview server if it's not already running
    try {
      const { stdout } = await execPromise('lsof -i:3000');
      if (!stdout.includes('node')) {
        await startPreviewServer(projectRoot);
      }
    } catch (error) {
      // Port is not in use, start server
      await startPreviewServer(projectRoot);
    }
    
    return 'http://localhost:3000';
  } catch (error) {
    return `Failed to generate storybook site: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// Take screenshot of component using headless browser
export async function takeComponentScreenshot(componentName: string, url: string): Promise<string> {
  try {
    // This is a placeholder. In a real implementation, you would use Puppeteer or Playwright
    // to take screenshots of the components using a headless browser
    return `Screenshot for ${componentName} would be taken from ${url}`;
  } catch (error) {
    return `Failed to take screenshot: ${error instanceof Error ? error.message : String(error)}`;
  }
} 