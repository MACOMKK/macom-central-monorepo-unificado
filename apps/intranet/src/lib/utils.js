import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

export function sanitizeUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return '#';
  try {
    const parsed = new URL(url, window.location.origin);
    return SAFE_URL_PROTOCOLS.has(parsed.protocol) ? url : '#';
  } catch {
    return '#';
  }
}
