import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function estimateReadTime(text: string) {
  // Average reading speed: 130 words per minute
  const words = text.trim().split(/\s+/).length;
  const minutes = words / 130;
  const seconds = Math.round(minutes * 60);
  return seconds;
}
