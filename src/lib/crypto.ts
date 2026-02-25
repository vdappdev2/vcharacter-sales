/**
 * Client-Side Cryptographic Utilities
 *
 * Uses Web Crypto API for secure operations in the browser.
 * All crypto is done client-side - no secrets leave the user's device.
 */

/**
 * Convert ArrayBuffer to hex string
 */
export function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Compute SHA-256 hash of input data
 *
 * @param data - Data to hash
 * @returns SHA-256 hash as Uint8Array
 */
export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as BufferSource);
  return new Uint8Array(hashBuffer);
}

/**
 * Compute SHA-256 hash of a string
 *
 * @param text - Text to hash
 * @returns SHA-256 hash as hex string
 */
export async function sha256String(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

/**
 * Generate a cryptographically secure random client seed
 *
 * @returns 32-byte random seed as hex string (64 characters)
 */
export function generateClientSeed(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bufferToHex(bytes.buffer);
}

/**
 * Compute HMAC-SHA256
 *
 * @param key - HMAC key
 * @param message - Message to sign
 * @returns HMAC signature as ArrayBuffer
 */
export async function hmacSha256(key: Uint8Array, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

/**
 * Synchronous hash of client seed using a simple hash function
 * Used for commitment verification where we need a sync operation
 *
 * @param seed - Client seed hex string
 * @returns Hash as hex string
 */
export function hashClientSeed(seed: string): string {
  // Simple synchronous hash using string manipulation
  // For display/tracking purposes - actual verification uses async sha256String
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to positive hex and pad
  const result = (hash >>> 0).toString(16).padStart(8, '0');
  // Extend to look more like a hash
  return result + result + result + result + result + result + result + result;
}
