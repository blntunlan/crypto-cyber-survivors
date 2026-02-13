import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const componentName = process.argv[2];

if (!componentName) {
  console.error(
    'Please provide a component name. Usage: node scripts/scaffold-component.mjs YourComponentName'
  );
  process.exit(1);
}

// Convert to PascalCase for file name and component name
const pascalCaseName = componentName.charAt(0).toUpperCase() + componentName.slice(1);

const componentDir = path.resolve(__dirname, '../components');
const componentPath = path.join(componentDir, `${pascalCaseName}.tsx`);

// Check if file already exists
if (fs.existsSync(componentPath)) {
  console.error(`Component ${pascalCaseName} already exists at ${componentPath}`);
  process.exit(1);
}

const template = `import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/classnames';

interface ${pascalCaseName}Props {
  className?: string;
  children?: React.ReactNode;
}

export const ${pascalCaseName}: React.FC<${pascalCaseName}Props> = ({
  className,
  children,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "relative overflow-hidden rounded-xl border border-white/10 bg-black/40 p-6 backdrop-blur-md",
        "shadow-[0_0_15px_rgba(0,255,128,0.1)] transition-all duration-300 hover:border-white/20",
        className
      )}
    >
      <div className="relative z-10 flex flex-col gap-4">
        <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          ${pascalCaseName}
        </h2>
        {children}
      </div>
      
      {/* Background Glow Effect */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 opacity-50" />
    </motion.div>
  );
};
`;

try {
  fs.writeFileSync(componentPath, template);
  console.log(`✅ Component created at: components/${pascalCaseName}.tsx`);
  console.log(`✨ Includes Framer Motion & Glassmorphism styles.`);
} catch (error) {
  console.error('Error creating component:', error);
}
