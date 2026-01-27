/**
 * Touch Target Audit Utility
 *
 * Development utility to verify all interactive elements meet
 * Apple's recommended 44px minimum touch target size.
 *
 * Usage in browser console (development mode):
 *   window.auditTouchTargets()
 */

import { Logger } from '../services/system/Logger';

interface TouchTargetIssue {
  element: string;
  width: number;
  height: number;
  minDimension: number;
  recommendation: string;
}

/**
 * Audits all interactive elements on the page for touch target compliance.
 * Elements smaller than 44px in any dimension are flagged.
 */
export function auditTouchTargets(): TouchTargetIssue[] {
  const MIN_TOUCH_TARGET = 44;
  const issues: TouchTargetIssue[] = [];

  // Select all interactive elements
  const interactiveSelectors = [
    'button',
    'a[href]',
    'input',
    'select',
    'textarea',
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[onclick]',
    '[ontouchstart]',
    '[ontouchend]',
  ];

  const elements = document.querySelectorAll<HTMLElement>(
    interactiveSelectors.join(', ')
  );

  elements.forEach(el => {
    const rect = el.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(el);

    // Skip invisible elements
    if (
      rect.width === 0 ||
      rect.height === 0 ||
      computedStyle.visibility === 'hidden' ||
      computedStyle.display === 'none'
    ) {
      return;
    }

    const minDimension = Math.min(rect.width, rect.height);

    if (minDimension < MIN_TOUCH_TARGET) {
      // Generate a descriptive element identifier
      const id = el.id ? `#${el.id}` : '';
      const classes = el.className
        ? `.${el.className.toString().split(' ').slice(0, 2).join('.')}`
        : '';
      const tag = el.tagName.toLowerCase();
      const text = (el.textContent || '').trim().slice(0, 20);
      const ariaLabel = el.getAttribute('aria-label') ?? '';

      const identifier = id || ariaLabel || text || classes || `<${tag}>`;

      issues.push({
        element: identifier,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        minDimension: Math.round(minDimension),
        recommendation: `Increase ${
          rect.width < MIN_TOUCH_TARGET ? 'width' : 'height'
        } to at least ${MIN_TOUCH_TARGET}px`,
      });
    }
  });

  // Log results
  if (issues.length === 0) {
    Logger.info('✅ All touch targets meet 44px minimum requirement!');
  } else {
    Logger.warn(`⚠️ Found ${issues.length} touch targets below 44px:`, issues);
  }

  return issues;
}

/**
 * Visual overlay showing touch target issues
 */
export function highlightTouchTargetIssues(): void {
  const issues = auditTouchTargets();

  // Remove any existing highlights
  document.querySelectorAll('.touch-target-highlight').forEach(el => el.remove());

  const MIN_TOUCH_TARGET = 44;

  const interactiveSelectors = ['button', 'a[href]', 'input', '[role="button"]'];

  const elements = document.querySelectorAll<HTMLElement>(
    interactiveSelectors.join(', ')
  );

  elements.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const minDimension = Math.min(rect.width, rect.height);
    const isCompliant = minDimension >= MIN_TOUCH_TARGET;

    const overlay = document.createElement('div');
    overlay.className = 'touch-target-highlight';
    overlay.style.cssText = `
      position: fixed;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 2px solid ${isCompliant ? 'green' : 'red'};
      background: ${isCompliant ? 'rgba(0,255,0,0.1)' : 'rgba(255,0,0,0.2)'};
      pointer-events: none;
      z-index: 99999;
      font-size: 10px;
      color: ${isCompliant ? 'green' : 'red'};
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    overlay.textContent = `${Math.round(minDimension)}px`;
    document.body.appendChild(overlay);
  });

  Logger.info(
    `Highlighted ${elements.length} elements. ` +
      `${issues.length} issues found. Click anywhere to dismiss.`
  );

  // Click to dismiss
  const dismissHandler = () => {
    document.querySelectorAll('.touch-target-highlight').forEach(el => el.remove());
    document.removeEventListener('click', dismissHandler);
  };
  setTimeout(() => document.addEventListener('click', dismissHandler), 100);
}

// Expose to window for development use
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).auditTouchTargets = auditTouchTargets;
  (window as unknown as Record<string, unknown>).highlightTouchTargetIssues =
    highlightTouchTargetIssues;
}

export default auditTouchTargets;
