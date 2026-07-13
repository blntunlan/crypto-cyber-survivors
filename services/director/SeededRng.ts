/** Deterministic xorshift32 RNG for replayable Director and spawn decisions. */
export class SeededRng {
  private state: number;

  public constructor(seed: number) {
    this.state = SeededRng.normalizeSeed(seed);
  }

  public reset(seed: number): void {
    this.state = SeededRng.normalizeSeed(seed);
  }

  public nextUint32(): number {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state;
  }

  public nextFloat(): number {
    return this.nextUint32() / 0x1_0000_0000;
  }

  public nextInt(exclusiveMaximum: number): number {
    if (!Number.isInteger(exclusiveMaximum) || exclusiveMaximum <= 0) {
      throw new Error('SeededRng exclusive maximum must be a positive integer');
    }
    return Math.floor(this.nextFloat() * exclusiveMaximum);
  }

  private static normalizeSeed(seed: number): number {
    const normalized = Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 0;
    return normalized === 0 ? 0x6d2b79f5 : normalized;
  }
}
