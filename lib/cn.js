import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Joins class names, later Tailwind utilities winning over earlier ones. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
