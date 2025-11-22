declare module 'snarkjs' {
  export namespace groth16 {
    export function verify(
      vKey: any,
      publicSignals: string[],
      proof: any
    ): Promise<boolean>;
    
    export function fullProve(
      input: any,
      wasmFile: string,
      zkeyFile: string
    ): Promise<{ proof: any; publicSignals: string[] }>;
  }
  
  export namespace plonk {
    export function verify(
      vKey: any,
      publicSignals: string[],
      proof: any
    ): Promise<boolean>;
  }
}


