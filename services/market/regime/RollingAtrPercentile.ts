const DEFAULT_CAPACITY = 60 * 60;

/**
 * Fixed-capacity rolling percentile for canonical ATR-percent samples.
 * Ranking scans the preallocated ring directly so simulation updates do not
 * sort, copy, or allocate collections.
 */
export class RollingAtrPercentile {
  private readonly values: Float64Array;
  private count = 0;
  private writeIndex = 0;
  private lastSourceSequence = -1;
  private percentile = 0.5;

  public constructor(capacity = DEFAULT_CAPACITY) {
    if (!Number.isSafeInteger(capacity) || capacity < 2) {
      throw new Error('RollingAtrPercentile capacity must be an integer >= 2');
    }
    this.values = new Float64Array(capacity);
  }

  public update(sourceSequence: number, atrPercent: number): number {
    if (
      !Number.isSafeInteger(sourceSequence) ||
      sourceSequence <= this.lastSourceSequence ||
      !Number.isFinite(atrPercent) ||
      atrPercent < 0
    ) {
      return this.percentile;
    }

    this.lastSourceSequence = sourceSequence;
    this.values[this.writeIndex] = atrPercent;
    this.writeIndex = (this.writeIndex + 1) % this.values.length;
    this.count = Math.min(this.count + 1, this.values.length);

    if (this.count === 1) {
      this.percentile = 0.5;
      return this.percentile;
    }

    let lowerCount = 0;
    let equalCount = 0;
    for (let index = 0; index < this.count; index += 1) {
      const sample = this.values[index] ?? 0;
      if (sample < atrPercent) {
        lowerCount += 1;
      } else if (sample === atrPercent) {
        equalCount += 1;
      }
    }

    this.percentile =
      (lowerCount + Math.max(0, equalCount - 1) * 0.5) / (this.count - 1);
    return this.percentile;
  }

  public getPercentile(): number {
    return this.percentile;
  }

  public getSampleCount(): number {
    return this.count;
  }

  public reset(): void {
    this.count = 0;
    this.writeIndex = 0;
    this.lastSourceSequence = -1;
    this.percentile = 0.5;
  }
}
