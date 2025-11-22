declare module 'circomlibjs' {
  export interface Poseidon {
    F: {
      toObject(value: any): bigint;
    };
    (inputs: any[]): any;
  }

  export function buildPoseidon(): Promise<Poseidon>;
}

