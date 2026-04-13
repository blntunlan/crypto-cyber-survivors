const fs = require('fs');
const path = require('path');

const docsDir = path.join('D:', 'crypto-cyber-survivors', 'docs');
const publicDocsDir = path.join('D:', 'crypto-cyber-survivors', 'public', 'docs');
const archivedDir = path.join(docsDir, 'archived');

// 1. Move deprecated/roadmap files to archived
const filesToArchive = [
  '2026_ROADMAP.md',
  'background_roadmap.md',
  'CODE_REVIEW_FEB_2026.md',
  'DEPRECATED_CLEANUP_TRACKER.md',
  'FEATURE_IMPLEMENTATION.md',
  'GAMEPLAY_BALANCING_ROADMAP.md',
  'hub-redesign-plan.md',
  'MARKET_DRIVEN_GAMELOOP_V3.md',
  'MARKET_TRADE_FEEL_SYSTEM.md',
  'NATIVE_APP_ROADMAP.md',
  'oyun-dusunce-notlari.md',
  'problems.md',
  'RAILWAY_SETUP.md',
  'railway-infrastructure-roadmap.md',
  'refactor-roadmap.md',
  'STARTUP_PITCH.md',
  'supabase-auth-roadmap.md',
  'TODO_COMPREHENSIVE.md',
  'TOKENOMICS_ROADMAP.md',
  path.join('architecture', 'AUTH_SYSTEM_ARCHITECTURE.md'),
  path.join('architecture', 'GAMEPLAY_SCREEN_MODULARIZATION_WORKFLOW.md'),
];

if (!fs.existsSync(archivedDir)) {
  fs.mkdirSync(archivedDir, { recursive: true });
}

for (const file of filesToArchive) {
  const sourcePath = path.join(docsDir, file);
  if (fs.existsSync(sourcePath)) {
    const destPath = path.join(archivedDir, path.basename(file));
    fs.renameSync(sourcePath, destPath);
    console.log(`Archived: ${file}`);
  }
}

// 2. Reformat Active Docs
const navPath = path.join(docsDir, 'navigation.json');
if (fs.existsSync(navPath)) {
  const nav = JSON.parse(fs.readFileSync(navPath, 'utf8'));
  const activeDocs = [];

  for (const section of nav.sidebar) {
    for (const item of section.items) {
      let relativePath = item.link.replace(/^\/docs\//, '');
      if (!relativePath.endsWith('.md')) {
        relativePath += '.md';
      }
      activeDocs.push(relativePath);
    }
  }

  for (const doc of activeDocs) {
    const docPath = path.join(docsDir, doc);
    if (fs.existsSync(docPath)) {
      let content = fs.readFileSync(docPath, 'utf8');
      let lines = content.split('\n');

      // Find H1
      let h1Index = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# ')) {
          h1Index = i;
          break;
        }
      }

      if (h1Index !== -1) {
        // Check if Status already exists
        let hasStatus = false;
        for (let i = h1Index + 1; i < Math.min(h1Index + 5, lines.length); i++) {
          if (lines[i].includes('> **Status**')) {
            hasStatus = true;
            break;
          }
        }

        if (!hasStatus) {
          lines.splice(h1Index + 1, 0, '', '> **Status** live', '');
          fs.writeFileSync(docPath, lines.join('\n'));
          console.log(`Formatted (Added Status): ${doc}`);
        }
      } else {
        console.log(`Warning: No H1 found in ${doc}`);
      }
    } else {
      console.log(`Warning: Active doc not found: ${doc}`);
    }
  }
}

// 3. Mirror docs to public/docs
function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Clean public/docs first
if (fs.existsSync(publicDocsDir)) {
  fs.rmSync(publicDocsDir, { recursive: true, force: true });
}
copyDirSync(docsDir, publicDocsDir);
console.log('Successfully mirrored docs/ to public/docs/');
