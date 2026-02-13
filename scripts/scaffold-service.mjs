import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceName = process.argv[2];
const subdir = process.argv[3] || 'gameplay'; // Default to gameplay if not specified

if (!serviceName) {
  console.error(
    'Please provide a service name. Usage: node scripts/scaffold-service.mjs YourService [subdir]'
  );
  process.exit(1);
}

const pascalCaseName = serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
const serviceDir = path.resolve(__dirname, `../services/${subdir}`);
const servicePath = path.join(serviceDir, `${pascalCaseName}.ts`);

// Ensure directory exists
if (!fs.existsSync(serviceDir)) {
  fs.mkdirSync(serviceDir, { recursive: true });
}

if (fs.existsSync(servicePath)) {
  console.error(`Service ${pascalCaseName} already exists at ${servicePath}`);
  process.exit(1);
}

const template = `/**
 * ${pascalCaseName}
 *
 * Description of what this service does.
 * Follows the Singleton pattern for global access.
 */

import { Logger } from '@/services/system/Logger';
import { EventBus } from '@/services/core/EventBus';

class ${pascalCaseName}Class {
  private static instance: ${pascalCaseName}Class | null = null;

  // Private constructor to enforce singleton
  private constructor() {
    Logger.info('[${pascalCaseName}] Initialized');
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): ${pascalCaseName}Class {
    return (${pascalCaseName}Class.instance ??= new ${pascalCaseName}Class());
  }

  /**
   * Example method
   */
  public doSomething(): void {
    Logger.debug('[${pascalCaseName}] Doing something...');
    // EventBus.emit('some_event', { ... });
  }

  /**
   * Cleanup method (if needed)
   */
  public destroy(): void {
    // Cleanup listeners, timers, etc.
  }
}

export const ${pascalCaseName} = ${pascalCaseName}Class.getInstance();
`;

try {
  fs.writeFileSync(servicePath, template);
  console.log(`✅ Service created at: services/${subdir}/${pascalCaseName}.ts`);
  console.log(`✨ Implements Singleton pattern & Logger.`);
} catch (error) {
  console.error('Error creating service:', error);
}
