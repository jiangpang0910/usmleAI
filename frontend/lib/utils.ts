import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS class names.
 * Combines clsx (conditional class joining) with tailwind-merge
 * (intelligent deduplication of conflicting Tailwind classes).
 *
 * Usage: cn("px-4 py-2", isActive && "bg-primary", className)
 *
 * @param inputs - Class values to merge (strings, arrays, objects, or falsy values)
 * @returns A single merged class string with conflicts resolved
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
