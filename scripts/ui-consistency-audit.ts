#!/usr/bin/env npx ts-node
/**
 * UI Consistency Audit Tool
 *
 * Scans all TSX files for visual consistency issues:
 * - Border radius patterns (rounded-xl vs rounded-none)
 * - Button height consistency (h-10, h-11, etc.)
 * - Color usage (design token compliance)
 * - Spacing patterns (gap, padding)
 * - Font usage (font-cyber, font-mono, etc.)
 *
 * Usage: npx ts-node scripts/ui-consistency-audit.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

// =============================================================================
// DESIGN SYSTEM STANDARDS
// =============================================================================

const DESIGN_STANDARDS = {
  // Approved button heights
  buttonHeights: [
    'h-10',
    'h-11',
    'h-12',
    'min-h-\\[44px\\]',
    'min-h-\\[48px\\]',
    'min-h-\\[52px\\]',
  ],

  // Approved border radius values.
  // Modern themed system: rounded-lg for buttons (BUTTON_VARIANTS),
  // rounded-[1.5rem] for overlay panels (OverlayChrome/MODERN_PANEL_FRAME).
  // Retro themed system: rounded-none (sharp).
  borderRadius: {
    approved: ['rounded-none', 'rounded-sm', 'rounded', 'rounded-lg'],
    flagged: ['rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full'],
  },

  // Design tokens — canonical themed palette (cyan cyberpunk modern, neon-green retro)
  // Legacy casino palette (gold/red) is scoped to landing/public surface only.
  colorTokens: {
    primaryCyan: '#22d3ee',
    electricBlue: '#00BFFF',
    neonGreen: '#39FF14',
    retroSilver: '#DCDCDC',
    darkBg: '#020617',
    white: '#ffffff',
  },

  // Approved fonts
  fonts: ['font-mono', 'font-cyber', 'font-retro-pixel'],

  // Standard spacing gaps
  gaps: ['gap-1', 'gap-1.5', 'gap-2', 'gap-3', 'gap-4', 'gap-6', 'gap-8'],
};

// =============================================================================
// AUDIT TYPES
// =============================================================================

interface AuditIssue {
  file: string;
  line: number;
  type: 'warning' | 'error';
  category: string;
  message: string;
  suggestion?: string;
}

interface AuditSummary {
  totalFiles: number;
  filesWithIssues: number;
  totalIssues: number;
  byCategory: Record<string, number>;
  byType: { warning: number; error: number };
}

// =============================================================================
// AUDIT FUNCTIONS
// =============================================================================

function auditBorderRadius(content: string, filePath: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    DESIGN_STANDARDS.borderRadius.flagged.forEach(pattern => {
      if (line.includes(pattern)) {
        // Check if it's in a comment
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;

        // Allow rounded-full for specific use cases
        if (pattern === 'rounded-full') {
          // Progress bars, toggles, avatars, dots, small UI elements
          const allowedContexts = [
            'progress',
            'toggle',
            'avatar',
            'dot',
            'indicator',
            'badge',
            'profile',
            'image',
            'img',
            'w-1',
            'w-1.5',
            'w-2',
            'w-3',
            'w-4',
            'w-5',
            'w-6',
            'w-7',
            'w-8',
            'w-9',
            'w-10',
            'h-1',
            'h-1.5',
            'h-2',
            'h-3',
            'h-4',
            'h-5',
            'h-6',
            'h-7',
            'h-8',
            'h-9',
            'h-10',
            'animate-pulse',
            'animate-ping',
            'slider',
            'thumb',
            'handle',
            'circle',
            'pip',
            'orb',
            'isRetro', // Theme conditional - acceptable
          ];

          if (allowedContexts.some(ctx => line.toLowerCase().includes(ctx))) {
            return; // Skip - valid use case
          }
        }

        issues.push({
          file: filePath,
          line: index + 1,
          type: 'warning',
          category: 'border-radius',
          message: `Found "${pattern}" - prefer approved radius values`,
          suggestion: `Consider using: ${DESIGN_STANDARDS.borderRadius.approved.join(', ')}`,
        });
      }
    });
  });

  return issues;
}

function auditButtonConsistency(content: string, filePath: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const lines = content.split('\n');

  // Skip settings sections - they use custom button heights for compact layouts
  const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();
  if (normalizedPath.includes('settings/') || normalizedPath.includes('settings\\')) {
    return issues;
  }

  // Find button elements
  const buttonRegex = /<button|<Button|<a.*href/gi;

  lines.forEach((line, index) => {
    if (buttonRegex.test(line)) {
      // Check if next few lines have consistent height
      const context = lines.slice(index, index + 5).join(' ');

      // Check for inconsistent padding
      const pxValues = context.match(/px-\d+/g);
      if (pxValues && new Set(pxValues).size > 1) {
        // Different px values in same button - might be intentional
      }

      // Skip small utility buttons (icon-only, toggles)
      if (
        context.includes('w-6') ||
        context.includes('w-7') ||
        context.includes('w-8') ||
        context.includes('p-1') ||
        context.includes('p-2') ||
        context.includes('rounded-full')
      ) {
        return; // Icon/toggle buttons have different standards
      }

      // Check for missing height standardization
      const hasStandardHeight = DESIGN_STANDARDS.buttonHeights.some(h =>
        new RegExp(h).test(context)
      );

      if (!hasStandardHeight && context.includes('className')) {
        // Only flag if it looks like a styled button
        if (
          context.includes('bg-') ||
          context.includes('border') ||
          context.includes('hover:')
        ) {
          issues.push({
            file: filePath,
            line: index + 1,
            type: 'warning',
            category: 'button-height',
            message: 'Button may be missing standard height class',
            suggestion: `Add one of: ${DESIGN_STANDARDS.buttonHeights.join(', ')}`,
          });
        }
      }
    }
  });

  return issues;
}

function auditColorUsage(content: string, filePath: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const lines = content.split('\n');

  // Look for hardcoded colors that should use tokens
  const hardcodedColorRegex = /#[0-9a-fA-F]{6}/gi;

  // Known acceptable colors (Tailwind palette, design tokens, theme palette, semantic colors)
  const acceptableColors = new Set(
    [
      // Themed palette (modern cyberpunk + retro 16-bit) — canonical
      '#22d3ee', // cyan-400 (modern primary accent)
      '#00bfff', // electric blue (COLORS.ELECTRIC_BLUE, retro primary)
      '#39ff14', // neon green (COLORS.NEON_GREEN, retro accent)
      '#dcdcdd', // retro silver (COLORS.SLOT_SILVER) — also #DCDCDC
      '#dcdcdc', // retro silver (COLORS.SLOT_SILVER)
      '#ffd600', // jackpot yellow (COLORS.JACKPOT_YELLOW, retro secondary)
      '#00ffff', // cyan neon (CSS --color-primary)
      '#ff00ff', // magenta (CSS --color-secondary)
      // Legacy casino palette (landing/public surface only)
      '#d6b85c', // casino gold (COLORS.CASINO_GOLD)
      '#b22222', // casino red (COLORS.CASINO_RED)
      '#020617', // slate-950 (COLORS.BG, dark bg)
      '#0a0a12', // retro bg (COLORS.BG_RETRO)
      // Semantic / status colors
      '#4ade80', // green-400 (positive/online/success)
      '#22c55e', // green-500 (COLORS.LONG)
      '#10b981', // emerald-500 (resume/positive action)
      '#05732c', // casino green (COLORS.CASINO_GREEN)
      '#ef4444', // red-500 (COLORS.SHORT)
      '#ff3d00', // dump orange (COLORS.DUMP_ORANGE)
      '#ff6600', // neon orange (COLORS.NEON_ORANGE)
      '#facc15', // yellow-400
      '#eab308', // yellow-500
      '#ffd700', // gold (COLORS.GEM/CRIT)
      '#c4b5fd', // violet-300 (replay accent)
      '#8b5cf6', // violet-500
      '#b026ff', // neon purple (COLORS.WHALE)
      '#ff10f0', // neon pink (COLORS.RARE_GEM)
      // Brand colors (third-party)
      '#4285f4', // Google blue
      '#5865f2', // Discord blurple
      '#9146ff', // Twitch purple
      '#24292e', // GitHub dark
      // Additional COLORS.* design tokens (config/Colors.ts)
      '#ff10f0', // RARE_GEM
      '#d20202', // SUPER_CRIT
      '#f4599d', // BRILLIANT_ROSE
      '#1a1a1a', // SLOT_BLACK
      '#00e676', // PUMP_GREEN
      '#dc143c', // RUGPULL_CRIMSON
      '#ffea00', // FLASH_LOAN_YELLOW
      '#ff1493', // SANDWICH_PINK
      '#8b0000', // ATTACK_51_RED
      '#c800ff', // PRIMARY_CYBER
      '#00ccff', // SECONDARY_CYBER
      '#7558a4', // ROYAL_PURPLE
      // Tailwind slate palette
      '#f8fafc',
      '#f1f5f9',
      '#e2e8f0',
      '#cbd5e1',
      '#94a3b8',
      '#64748b',
      '#475569',
      '#334155',
      '#1e293b',
      '#0f172a',
      // Tailwind gray palette
      '#f9fafb',
      '#f3f4f6',
      '#e5e7eb',
      '#d1d5db',
      '#9ca3af',
      '#6b7280',
      '#4b5563',
      '#374151',
      '#1f2937',
      '#111827',
      // Tailwind zinc palette
      '#fafafa',
      '#f4f4f5',
      '#e4e4e7',
      '#d4d4d8',
      '#a1a1aa',
      '#71717a',
      '#52525b',
      '#3f3f46',
      '#27272a',
      '#18181b',
      // Common UI colors
      '#0d0d0d',
      '#00ffff',
      '#ff0000',
      '#00ff00',
      '#ffff00',
      '#22c55e',
      '#ef4444',
      '#eab308',
      '#3b82f6',
      '#8b5cf6',
    ].map(c => c.toLowerCase())
  );

  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
    if (line.includes('DESIGN TOKENS') || line.includes('Primary')) return;

    const matches = line.match(hardcodedColorRegex);
    if (matches) {
      matches.forEach(color => {
        const lowerColor = color.toLowerCase();

        // Skip acceptable colors
        if (acceptableColors.has(lowerColor)) return;

        // Skip if it's a common pattern (likely intentional)
        if (lowerColor.startsWith('#0') || lowerColor.startsWith('#f')) return;

        issues.push({
          file: filePath,
          line: index + 1,
          type: 'warning',
          category: 'color-token',
          message: `Hardcoded color "${color}" found`,
          suggestion:
            'Consider using themed tokens: #22d3ee (cyan modern), #39FF14 (neon retro), or COLORS.* constants',
        });
      });
    }
  });

  return issues;
}

function auditIsRetroUsage(content: string, filePath: string): AuditIssue[] {
  // Theme system is intentionally designed with isRetro conditionals
  // Only flag excessive usage in a single file (>15 occurrences indicates potential simplification)
  const issues: AuditIssue[] = [];
  const lines = content.split('\n');

  // Count total isRetro usages
  let isRetroCount = 0;

  lines.forEach(line => {
    if (line.includes('isRetro ?') || line.includes('isRetro?')) {
      isRetroCount++;
    }
  });

  // Only report if excessive usage in single file (design smell)
  if (isRetroCount > 15) {
    issues.push({
      file: filePath,
      line: 1,
      type: 'warning',
      category: 'theme-conditional',
      message: `File has ${isRetroCount} isRetro conditionals - consider refactoring with theme variants`,
      suggestion: 'Consider using ThemedButton, ThemedPanel, or theme config objects',
    });
  }

  return issues;
}

function auditSpacingConsistency(content: string, filePath: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const lines = content.split('\n');

  // Look for non-standard gap values
  const gapRegex = /gap-(\d+\.?\d*)/g;

  lines.forEach((line, index) => {
    let match;
    while ((match = gapRegex.exec(line)) !== null) {
      const gapValue = `gap-${match[1]}`;
      if (!DESIGN_STANDARDS.gaps.includes(gapValue)) {
        issues.push({
          file: filePath,
          line: index + 1,
          type: 'warning',
          category: 'spacing',
          message: `Non-standard gap value "${gapValue}" found`,
          suggestion: `Use standard values: ${DESIGN_STANDARDS.gaps.join(', ')}`,
        });
      }
    }
  });

  return issues;
}

// =============================================================================
// MAIN AUDIT RUNNER
// =============================================================================

async function runAudit(): Promise<void> {
  const isCIMode = process.argv.includes('--ci');

  if (!isCIMode) {
    console.log('\n🎨 UI CONSISTENCY AUDIT');
    console.log('='.repeat(60));
  }

  const componentFiles = glob.sync('components/**/*.tsx', {
    cwd: process.cwd(),
    ignore: [
      '**/node_modules/**',
      '**/*.test.tsx',
      '**/*DebugPanel.tsx', // Debug panels are dev tools, exempt from UI standards
      '**/DebugPanel.tsx',
    ],
  });

  const allIssues: AuditIssue[] = [];

  for (const file of componentFiles) {
    const filePath = path.resolve(file);
    const content = fs.readFileSync(filePath, 'utf-8');

    const issues = [
      ...auditBorderRadius(content, file),
      ...auditButtonConsistency(content, file),
      ...auditColorUsage(content, file),
      ...auditIsRetroUsage(content, file),
      ...auditSpacingConsistency(content, file),
    ];

    allIssues.push(...issues);
  }

  // Generate summary
  const summary: AuditSummary = {
    totalFiles: componentFiles.length,
    filesWithIssues: new Set(allIssues.map(i => i.file)).size,
    totalIssues: allIssues.length,
    byCategory: {},
    byType: { warning: 0, error: 0 },
  };

  allIssues.forEach(issue => {
    summary.byCategory[issue.category] = (summary.byCategory[issue.category] || 0) + 1;
    summary.byType[issue.type]++;
  });

  // Calculate score early for CI mode
  const issuesPerFile = summary.totalIssues / summary.totalFiles;
  const score = Math.max(0, Math.round(100 - issuesPerFile * 10));

  // CI mode: compact output for pre-commit hooks
  if (isCIMode) {
    if (score < 70) {
      console.log(`⚠️  UI Consistency: ${score}/100 (${summary.totalIssues} issues)`);
    } else {
      console.log(`✅ UI Consistency: ${score}/100`);
    }
    return;
  }

  // Print results (full mode)
  console.log(`\n📁 Scanned: ${summary.totalFiles} files`);
  console.log(`⚠️  Files with issues: ${summary.filesWithIssues}`);
  console.log(`📊 Total issues: ${summary.totalIssues}`);

  if (summary.totalIssues > 0) {
    console.log('\n📋 ISSUES BY CATEGORY:');
    console.log('-'.repeat(40));
    Object.entries(summary.byCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count}`);
      });

    console.log('\n🔍 DETAILED ISSUES:');
    console.log('-'.repeat(60));

    // Group by file
    const byFile: Record<string, AuditIssue[]> = {};
    allIssues.forEach(issue => {
      if (!byFile[issue.file]) byFile[issue.file] = [];
      byFile[issue.file].push(issue);
    });

    // Print top 20 issues max
    let printed = 0;
    for (const [file, issues] of Object.entries(byFile)) {
      if (printed >= 20) {
        console.log(`\n... and ${allIssues.length - 20} more issues`);
        break;
      }

      console.log(`\n📄 ${file}`);
      for (const issue of issues.slice(0, 5)) {
        if (printed >= 20) break;
        const icon = issue.type === 'error' ? '❌' : '⚠️';
        console.log(`  ${icon} Line ${issue.line}: ${issue.message}`);
        if (issue.suggestion) {
          console.log(`     💡 ${issue.suggestion}`);
        }
        printed++;
      }
      if (issues.length > 5) {
        console.log(`     ... and ${issues.length - 5} more in this file`);
      }
    }
  }

  // Full mode - print score and summary
  console.log('\n' + '='.repeat(60));
  console.log(`🎯 CONSISTENCY SCORE: ${score}/100`);

  if (score >= 90) {
    console.log('✅ Excellent! UI is highly consistent.');
  } else if (score >= 70) {
    console.log('🟡 Good, but some cleanup recommended.');
  } else if (score >= 50) {
    console.log('🟠 Moderate consistency. Review flagged issues.');
  } else {
    console.log('🔴 Needs attention. Many inconsistencies found.');
  }

  console.log('\n📖 Design Standards Reference:');
  console.log(
    '  • Button heights: h-10, h-11, h-12, min-h-[44px], min-h-[48px], min-h-[52px]'
  );
  console.log(
    '  • Border radius: rounded-lg (buttons), rounded-[1.5rem] (overlay panels), rounded-none (retro)'
  );
  console.log(
    '  • Themed palette: #22d3ee (cyan modern), #39FF14 (neon-green retro), #00BFFF (electric blue)'
  );
  console.log(
    '  • Legacy casino palette (landing/public only): #d6b85c (gold), #b22222 (red)'
  );
  console.log(
    '  • Backdrop: MODERN_SCREEN_OVERLAY = bg-slate-950/60 backdrop-blur-sm (in-game overlays)'
  );
  console.log('  • Fonts: font-mono, font-cyber, font-retro-pixel');
  console.log('='.repeat(60) + '\n');

  // Exit with error if too many issues
  if (summary.byType.error > 0) {
    process.exit(1);
  }
}

// Run
runAudit().catch(console.error);
