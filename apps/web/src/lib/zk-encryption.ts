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
 * Encrypts plaintext bytes using a freshly generated 256-bit AES-GCM key.
 *
 * @param data - The plaintext to encrypt as an ArrayBuffer
 * @returns An object containing:
 *  - `encryptedData`: ciphertext including the AES-GCM authentication tag,
 *  - `key`: the raw 32-byte (256-bit) encryption key as an ArrayBuffer,
 *  - `iv`: the 12-byte initialization vector as an ArrayBuffer
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
 * Encode an ArrayBuffer as a Base64 string.
 *
 * @param buffer - The binary data to encode
 * @returns The Base64-encoded representation of `buffer`
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
 * Decode a Base64-encoded string into an ArrayBuffer.
 *
 * @param base64 - The Base64-encoded input string
 * @returns The decoded bytes as an ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}