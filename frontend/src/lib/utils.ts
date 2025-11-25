import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const tagColorVariants = [
  "tag-blue",
  "tag-green",
  "tag-yellow",
  "tag-red",
  "tag-purple",
  "tag-pink",
  "tag-orange",
  "tag-cyan",
] as const;

type TagColorVariant = (typeof tagColorVariants)[number];

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export function getTagColor(tagName: string): TagColorVariant {
  const hash = simpleHash(tagName);
  const index = hash % tagColorVariants.length;
  return tagColorVariants[index];
}
