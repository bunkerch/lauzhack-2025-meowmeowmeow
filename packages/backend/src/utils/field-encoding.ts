/**
 * Field Encoding Utilities
 * 
 * Provides functions to convert strings and values to field elements
 * that can be used in zero-knowledge circuits.
 */

import { buildPoseidon } from 'circomlibjs';

let poseidonInstance: any = null;

/**
 * Initialize Poseidon hash function.
 * This MUST be called before using any other functions in this module.
 */
export async function initializeFieldEncoding(): Promise<void> {
    if (!poseidonInstance) {
        poseidonInstance = await buildPoseidon();
    }
}

/**
 * Convert a string to a field element using Poseidon hash.
 * This is used to convert quoteId strings to field elements
 * that can be used in the circuit.
 * 
 * @param str - The string to convert
 * @returns The field element as a decimal string
 */
export function stringToField(str: string): string {
    if (!poseidonInstance) {
        throw new Error('Field encoding not initialized. Call initializeFieldEncoding() first.');
    }

    // Convert string to bytes
    const bytes = new TextEncoder().encode(str);
    
    // Convert bytes to a BigInt
    let acc = 0n;
    for (const byte of bytes) {
        acc = acc * 256n + BigInt(byte);
    }
    
    // Hash with Poseidon to get a field element
    const field = poseidonInstance([acc]);
    
    return poseidonInstance.F.toString(field);
}

/**
 * Convert a quoteId string to a field element.
 * This is the canonical way to convert quoteIds for use in circuits.
 * 
 * @param quoteId - The quote ID string
 * @returns The field element as a decimal string
 */
export function quoteIdToField(quoteId: string): string {
    return stringToField(quoteId);
}

/**
 * Verify that a value is a valid field element (within the bn128 curve order).
 * 
 * @param value - The value to check
 * @returns True if the value is a valid field element
 */
export function isValidFieldElement(value: string | bigint): boolean {
    try {
        const n = typeof value === 'string' ? BigInt(value) : value;
        // bn128 curve order (p)
        const p = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
        return n >= 0n && n < p;
    } catch {
        return false;
    }
}

