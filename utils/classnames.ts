import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for merging tailwind classes with support for conditional classes.
 * Uses clsx for object/array handling and tailwind-merge for conflict resolution.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
