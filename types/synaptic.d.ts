declare module 'synaptic' {
  export class Network {
    activate(inputs: number[]): number[];
    propagate(learningRate: number, target: number[]): void;
    toJSON(): unknown;
    static fromJSON(json: unknown): Network;
  }

  export const Architect: {
    Perceptron: new (...layers: number[]) => Network;
    LSTM: new (...layers: number[]) => Network;
    Hopfield: new (size: number) => Network;
  };

  export class Layer {
    constructor(size: number);
  }

  // Support for legacy code that might use 'NetworkLib' as an alias
  export const NetworkLib: typeof Network;
}
