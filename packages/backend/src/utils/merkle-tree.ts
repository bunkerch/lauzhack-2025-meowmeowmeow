/**
 * Merkle Tree Implementation using Poseidon Hash
 * 
 * This implementation stores payment commitments in a Merkle tree
 * and allows generating Merkle proofs for ZK verification.
 */

import { buildPoseidon } from 'circomlibjs';

let poseidonInstance: any = null;

async function getPoseidon() {
    if (!poseidonInstance) {
        poseidonInstance = await buildPoseidon();
    }
    return poseidonInstance;
}

function poseidon2Sync(inputs: bigint[]): string {
    if (!poseidonInstance) {
        throw new Error('Poseidon not initialized. Call MerkleTree.initialize() first.');
    }
    const hash = poseidonInstance(inputs);
    return poseidonInstance.F.toString(hash);
}

export interface MerklePath {
    pathElements: string[];  // Sibling hashes along the path
    pathIndices: number[];   // 0 = left child, 1 = right child
}

export class MerkleTree {
    private depth: number;
    private leaves: Map<number, string>;  // leafIndex -> leaf value
    private zeros: string[];              // Zero values for each level
    private nodes: Map<string, string>;   // Cache of computed nodes
    private nextLeafIndex: number;

    /**
     * Initialize Poseidon hash function.
     * This MUST be called before creating any MerkleTree instances.
     */
    static async initialize(): Promise<void> {
        await getPoseidon();
    }

    /**
     * Create a new Merkle tree
     * @param depth - The depth of the tree (supports 2^depth leaves)
     */
    constructor(depth: number = 20) {
        if (!poseidonInstance) {
            throw new Error('MerkleTree not initialized. Call MerkleTree.initialize() first.');
        }

        this.depth = depth;
        this.leaves = new Map();
        this.nodes = new Map();
        this.nextLeafIndex = 0;

        // Compute zero values for each level
        // zeros[0] = hash of empty leaf
        // zeros[i] = hash(zeros[i-1], zeros[i-1])
        this.zeros = new Array(depth + 1);
        this.zeros[0] = '0';  // Empty leaf value
        
        for (let i = 1; i <= depth; i++) {
            const hash = poseidon2Sync([BigInt(this.zeros[i - 1]), BigInt(this.zeros[i - 1])]);
            this.zeros[i] = hash;
        }
    }

    /**
     * Insert a new leaf into the tree
     * @param leaf - The leaf value (as decimal string)
     * @returns The index where the leaf was inserted
     */
    insert(leaf: string): number {
        const index = this.nextLeafIndex;
        this.leaves.set(index, leaf);
        this.nextLeafIndex++;
        
        // Clear cached nodes that need to be recomputed
        this._clearCacheForPath(index);
        
        return index;
    }

    /**
     * Get a leaf value by index
     * @param index - The leaf index
     * @returns The leaf value, or the zero value if not set
     */
    getLeaf(index: number): string {
        return this.leaves.get(index) || this.zeros[0];
    }

    /**
     * Compute the Merkle root
     * @returns The root hash as a decimal string
     */
    getRoot(): string {
        return this._getNode(0, this.depth);
    }

    /**
     * Generate a Merkle proof for a leaf
     * @param leafIndex - The index of the leaf
     * @returns The Merkle path (siblings and directions)
     */
    getProof(leafIndex: number): MerklePath {
        const pathElements: string[] = [];
        const pathIndices: number[] = [];

        let currentIndex = leafIndex;

        for (let level = 0; level < this.depth; level++) {
            const isRightChild = currentIndex % 2;
            pathIndices.push(isRightChild);

            // Get sibling index
            const siblingIndex = isRightChild ? currentIndex - 1 : currentIndex + 1;
            
            // Get sibling node value
            const siblingValue = this._getNode(siblingIndex, level);
            pathElements.push(siblingValue);

            // Move to parent
            currentIndex = Math.floor(currentIndex / 2);
        }

        return { pathElements, pathIndices };
    }

    /**
     * Verify a Merkle proof
     * @param leaf - The leaf value
     * @param path - The Merkle path
     * @param root - The expected root
     * @returns True if the proof is valid
     */
    static verifyProof(leaf: string, path: MerklePath, root: string): boolean {
        if (!poseidonInstance) {
            throw new Error('MerkleTree not initialized. Call MerkleTree.initialize() first.');
        }

        let currentHash = leaf;

        for (let i = 0; i < path.pathElements.length; i++) {
            const sibling = path.pathElements[i];
            const isRightChild = path.pathIndices[i];

            const left = isRightChild ? sibling : currentHash;
            const right = isRightChild ? currentHash : sibling;

            currentHash = poseidon2Sync([BigInt(left), BigInt(right)]);
        }

        return currentHash === root;
    }

    /**
     * Get the number of leaves in the tree
     */
    get leafCount(): number {
        return this.nextLeafIndex;
    }

    /**
     * Get a node value at a specific position in the tree
     * @param index - The node index at the given level
     * @param level - The level (0 = leaves, depth = root)
     * @returns The node value
     */
    private _getNode(index: number, level: number): string {
        // Check if it's a leaf
        if (level === 0) {
            return this.getLeaf(index);
        }

        // Check cache
        const cacheKey = `${level}-${index}`;
        if (this.nodes.has(cacheKey)) {
            return this.nodes.get(cacheKey)!;
        }

        // Check if this subtree is entirely empty
        const maxLeafIndex = (index + 1) * Math.pow(2, level);
        if (this.nextLeafIndex <= index * Math.pow(2, level)) {
            return this.zeros[level];
        }

        // Compute from children
        const leftChild = this._getNode(index * 2, level - 1);
        const rightChild = this._getNode(index * 2 + 1, level - 1);

        const value = poseidon2Sync([BigInt(leftChild), BigInt(rightChild)]);

        // Cache the result
        this.nodes.set(cacheKey, value);

        return value;
    }

    /**
     * Clear cached nodes that are affected by a leaf insertion
     * @param leafIndex - The index of the inserted leaf
     */
    private _clearCacheForPath(leafIndex: number): void {
        let currentIndex = leafIndex;

        for (let level = 1; level <= this.depth; level++) {
            currentIndex = Math.floor(currentIndex / 2);
            const cacheKey = `${level}-${currentIndex}`;
            this.nodes.delete(cacheKey);
        }
    }

    /**
     * Export the tree state for persistence
     */
    exportState(): { depth: number; leaves: [number, string][]; nextLeafIndex: number } {
        return {
            depth: this.depth,
            leaves: Array.from(this.leaves.entries()),
            nextLeafIndex: this.nextLeafIndex
        };
    }

    /**
     * Import tree state from persisted data
     */
    static importState(state: { depth: number; leaves: [number, string][]; nextLeafIndex: number }): MerkleTree {
        const tree = new MerkleTree(state.depth);
        tree.leaves = new Map(state.leaves);
        tree.nextLeafIndex = state.nextLeafIndex;
        return tree;
    }
}

