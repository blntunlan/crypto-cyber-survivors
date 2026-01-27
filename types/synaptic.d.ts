declare module 'synaptic' {
  export interface Network {
    toJSON(): unknown;
    activate(inputs: number[]): number[];
    propagate(rate: number, target: number[]): void;
    // Add other methods if needed
  }

  export interface StaticNetwork {
    fromJSON(json: unknown): Network;
  }

  export const Architect: {
    Perceptron: new (input: number, hidden: number, output: number) => Network;
    // Add other architectures if needed
  };

  export const Network: StaticNetwork;

  const synaptic: {
    Architect: typeof Architect;
    Network: StaticNetwork;
  };

  export default synaptic;
}
