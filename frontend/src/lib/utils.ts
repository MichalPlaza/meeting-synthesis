import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const tagColorClasses = [
  "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
  "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
  "bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300",
  "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300",
];

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export function getTagColor(tagName: string): string {
  const hash = simpleHash(tagName);
  const index = hash % tagColorClasses.length;
  return tagColorClasses[index];
}
