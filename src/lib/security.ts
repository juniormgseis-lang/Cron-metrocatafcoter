/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Secret build salt - changed on each production deployment
// In a real environment, this could be injected via Vite env variables
const BUILD_SALT = 'taf-coter-v1-secure-salt';

/**
 * Generates a SHA-256 hash of a string
 */
async function sha256(message: string) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a unique integrity signature for the current application instance.
 * It combines the origin (domain) with a build salt to prevent cloning.
 */
export async function generateAppSignature(): Promise<string> {
  const origin = window.location.origin;
  // We use the origin + our internal salt
  const signature = await sha256(`${origin}:${BUILD_SALT}`);
  return signature;
}

/**
 * Simple obfuscated signature for secondary checks or non-crypto environments
 */
export function getQuickSignature(): string {
  const origin = window.location.origin;
  const combined = `${origin}:${BUILD_SALT}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}
