/**
 * True zero-knowledge encryption utilities
 * Keys are generated randomly in the browser and never derived from server secrets
 */

export interface ZeroKnowledgeEncryptionResult {
  encryptedData: ArrayBuffer;
  key: ArrayBuffer;
  iv: ArrayBuffer;
}

/**
 * Encrypt data with a randomly generated key (true zero-knowledge)
 */
export async function encryptWithRandomKey(
  data: ArrayBuffer
): Promise<ZeroKnowledgeEncryptionResult> {
  // Generate a truly random 256-bit key
  const key = crypto.getRandomValues(new Uint8Array(32));

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Import the key for encryption
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  // Encrypt the data
  const encryptedResult = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    data
  );

  // For AES-GCM, we need to append the authentication tag
  // The encrypted result contains both ciphertext and tag
  return {
    encryptedData: encryptedResult,
    key: key.buffer,
    iv: iv.buffer,
  };
}

/**
 * Convert ArrayBuffer to base64 string for transmission
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string back to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
