/**
 * Field Encoding Utilities (Frontend)
 * 
 * Provides functions to convert strings and values to field elements
 * that can be used in zero-knowledge circuits.
 */

import { poseidon1 } from 'poseidon-lite';

/**
 * Convert a string to a field element using Poseidon hash.
 * This is used to convert quoteId strings to field elements
 * that can be used in the circuit.
 * 
 * @param str - The string to convert
 * @returns The field element as a decimal string
 */
export async function stringToField(str: string): Promise<string> {
    // Convert string to bytes
    const bytes = new TextEncoder().encode(str);
    
    // Convert bytes to a BigInt
    let acc = 0n;
    for (const byte of bytes) {
        acc = acc * 256n + BigInt(byte);
    }
    
    // Hash with Poseidon to get a field element
    const field = poseidon1([acc]);
    
    return field.toString();
}

/**
 * Convert a quoteId string to a field element.
 * This is the canonical way to convert quoteIds for use in circuits.
 * 
 * @param quoteId - The quote ID string
 * @returns The field element as a decimal string
 */
export async function quoteIdToField(quoteId: string): Promise<string> {
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

