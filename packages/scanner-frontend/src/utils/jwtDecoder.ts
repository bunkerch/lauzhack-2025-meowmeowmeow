/**
 * JWT Decoder and Verifier Utility
 * Uses native Web Crypto API for RSA signature verification (browser-compatible)
 */

import { z } from 'zod';

/**
 * JWT Ticket Payload Schema (using Zod)
 * Uses standard JWT fields: nbf (not before), exp (expiry)
 */
export const JWTTicketPayloadSchema = z.object({
  tid: z.string(), // ticket ID
  dv: z.string(), // data version
  tp: z.string(), // ticket type (single, day, return)
  origin: z.string(),
  dest: z.string(),
  tripIds: z.array(z.string()),
  nbf: z.number(), // not before - Unix timestamp
  exp: z.number(), // expiry - Unix timestamp
  iat: z.number().optional(), // issued at timestamp (optional)
  productClass: z.string(), // "1" or "2" for first/second class
});

export type JWTTicketPayload = z.infer<typeof JWTTicketPayloadSchema>;

let cachedPublicKey: CryptoKey | null = null;

/**
 * Base64URL decode function
 */
function base64UrlDecode(str: string): string {
  // Replace URL-safe characters
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  
  // Add padding if needed
  const pad = base64.length % 4;
  if (pad) {
    if (pad === 1) {
      throw new Error('Invalid base64 string');
    }
    base64 += new Array(5 - pad).join('=');
  }
  
  return atob(base64);
}

/**
 * Base64URL decode to ArrayBuffer
 */
function base64UrlDecodeToBuffer(str: string): ArrayBuffer {
  const binaryString = base64UrlDecode(str);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert PEM public key to CryptoKey
 */
async function importPublicKey(pemKey: string): Promise<CryptoKey> {
  // Remove PEM header/footer and whitespace
  const pemContents = pemKey
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s/g, '');
  
  // Decode base64
  const binaryDer = atob(pemContents);
  const bytes = new Uint8Array(binaryDer.length);
  for (let i = 0; i < binaryDer.length; i++) {
    bytes[i] = binaryDer.charCodeAt(i);
  }
  
  // Import as CryptoKey
  return await crypto.subtle.importKey(
    'spki',
    bytes.buffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['verify']
  );
}

/**
 * Fetch and cache the public RSA key from the backend
 */
async function getPublicKey(): Promise<CryptoKey> {
  if (cachedPublicKey) {
    return cachedPublicKey;
  }

  try {
    const response = await fetch('/api/public-key');
    if (!response.ok) {
      throw new Error(`Failed to fetch public key: ${response.statusText}`);
    }
    const data = await response.json();
    const publicKeyPem = data.publicKey;
    if (typeof publicKeyPem !== 'string') {
      throw new Error('Invalid public key format received from server');
    }
    
    cachedPublicKey = await importPublicKey(publicKeyPem);
    return cachedPublicKey;
  } catch (error) {
    throw new Error(`Failed to fetch public key: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Verify JWT signature using Web Crypto API
 */
async function verifySignature(
  header: string,
  payload: string,
  signature: string,
  publicKey: CryptoKey
): Promise<boolean> {
  try {
    // Create the signing input (header.payload)
    const signatureInput = `${header}.${payload}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(signatureInput);
    
    // Decode the signature
    const signatureBuffer = base64UrlDecodeToBuffer(signature);
    
    // Verify signature
    return await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      signatureBuffer,
      data
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Decode JWT payload without verification (for inspection only)
 */
function decodePayload(payloadPart: string): any {
  try {
    const decoded = base64UrlDecode(payloadPart);
    return JSON.parse(decoded);
  } catch (error) {
    throw new Error('Failed to decode JWT payload');
  }
}

/**
 * Verify and decode a JWT token with RSA signature verification using Web Crypto API
 */
export async function verifyAndDecodeJWT(token: string): Promise<{
  valid: boolean;
  payload?: JWTTicketPayload;
  error?: string;
}> {
  try {
    // Split the JWT
    const parts = token.trim().split('.');
    if (parts.length !== 3) {
      return {
        valid: false,
        error: 'Invalid JWT format. Expected 3 parts separated by dots.',
      };
    }
    
    const [headerPart, payloadPart, signaturePart] = parts;
    
    // Get the public key
    const publicKey = await getPublicKey();
    
    // Verify the signature
    const isSignatureValid = await verifySignature(headerPart, payloadPart, signaturePart, publicKey);
    
    if (!isSignatureValid) {
      return {
        valid: false,
        error: 'Invalid signature - ticket may be forged',
      };
    }
    
    // Decode the payload
    const decodedPayload = decodePayload(payloadPart);
    
    // Validate the payload structure with Zod
    const validationResult = JWTTicketPayloadSchema.safeParse(decodedPayload);
    
    if (!validationResult.success) {
      return {
        valid: false,
        error: 'Invalid JWT payload structure: ' + validationResult.error.message,
      };
    }
    
    const payload = validationResult.data;
    
    // Check expiry and not-before
    const now = Math.floor(Date.now() / 1000);
    
    if (now < payload.nbf) {
      return {
        valid: false,
        error: `Token not yet valid. Valid from: ${new Date(payload.nbf * 1000).toLocaleString()}`,
      };
    }
    
    if (now > payload.exp) {
      return {
        valid: false,
        error: `Token has expired. Valid until: ${new Date(payload.exp * 1000).toLocaleString()}`,
      };
    }
    
    return {
      valid: true,
      payload,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'JWT verification failed',
    };
  }
}

/**
 * Decode JWT without verification (for inspection only - DO NOT USE FOR VALIDATION)
 */
export function decodeJWTUnsafe(token: string): JWTTicketPayload | null {
  try {
    const parts = token.trim().split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const decoded = decodePayload(parts[1]);
    const validationResult = JWTTicketPayloadSchema.safeParse(decoded);
    
    if (!validationResult.success) {
      return null;
    }
    
    return validationResult.data;
  } catch (error) {
    return null;
  }
}

/**
 * Check if a string looks like a JWT token
 */
export function isJWT(str: string): boolean {
  const parts = str.trim().split('.');
  return parts.length === 3 && parts.every(part => part.length > 0);
}

/**
 * Verify JWT ticket validity period (for manual checking)
 */
export function verifyJWTValidity(payload: JWTTicketPayload): {
  valid: boolean;
  message: string;
} {
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  
  if (now < payload.nbf) {
    const validFromDate = new Date(payload.nbf * 1000);
    return {
      valid: false,
      message: `Ticket not yet valid. Valid from: ${validFromDate.toLocaleString()}`,
    };
  }
  
  if (now > payload.exp) {
    const validUntilDate = new Date(payload.exp * 1000);
    return {
      valid: false,
      message: `Ticket has expired. Valid until: ${validUntilDate.toLocaleString()}`,
    };
  }
  
  return {
    valid: true,
    message: 'Ticket is within validity period',
  };
}
