export class VirtualInput {
  private keys: Set<string> = new Set();

  // Simulates pressing a key
  press(key: string) {
    this.keys.add(key);
  }

  // Simulates releasing a key
  release(key: string) {
    this.keys.delete(key);
  }

  // Compatible with existing Input Systems
  isKeyPressed(key: string): boolean {
    return this.keys.has(key);
  }

  // AI Helpers
  getVectorTo(currentX: number, currentY: number, targetX: number, targetY: number) {
    const dx = targetX - currentX;
    const dy = targetY - currentY;
    const mag = Math.hypot(dx, dy);
    return { x: dx / mag, y: dy / mag };
  }
}
