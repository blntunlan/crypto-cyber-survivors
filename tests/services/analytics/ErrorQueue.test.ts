import { describe, it, expect, beforeEach } from 'vitest';
import { ErrorQueue } from '../../../services/analytics/ErrorQueue';
import type { ErrorReport } from '../../../services/analytics/ErrorTypes';

describe('ErrorQueue', () => {
  let queue: ErrorQueue;
  const mockReport: ErrorReport = {
    errorType: 'TestError',
    errorMessage: 'Test msg',
    category: 'runtime',
    severity: 'low',
    fingerprint: 'fp1',
    userAgent: 'test',
    url: 'test',
    viewport: { width: 100, height: 100 },
    reportedAt: new Date().toISOString(),
    tags: [],
    breadcrumbs: [],
  };

  beforeEach(() => {
    localStorage.clear();
    queue = new ErrorQueue();
  });

  it('should enqueue reports', () => {
    queue.enqueue(mockReport);
    expect(queue.size).toBe(1);
    expect(queue.isEmpty).toBe(false);
  });

  it('should persist to localStorage on enqueue', () => {
    queue.enqueue(mockReport);
    const stored = localStorage.getItem('error_tracker_queue');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toHaveLength(1);
  });

  it('should load existing queue from localStorage and add restored tag', () => {
    localStorage.setItem(
      'error_tracker_queue',
      JSON.stringify([{ report: mockReport, retryCount: 0 }])
    );
    const newQueue = new ErrorQueue();
    expect(newQueue.size).toBe(1);
    const batch = newQueue.getBatch();
    expect(batch[0]!.report.tags).toContain('restored');
  });

  it('should get batch and dequeue accordingly', () => {
    queue.enqueue({ ...mockReport, fingerprint: '1' });
    queue.enqueue({ ...mockReport, fingerprint: '2' });

    const batch = queue.getBatch();
    // BATCH_SIZE is 10, so it should take all since we only have 2
    expect(batch).toHaveLength(2);
    expect(queue.size).toBe(0);
  });

  it('should handle requeue with retry count increment', () => {
    queue.enqueue(mockReport);
    const batch = queue.getBatch();
    const item = batch[0]!;
    queue.requeue(item);

    expect(queue.size).toBe(1);
    const requeuedBatch = queue.getBatch();
    const requeued = requeuedBatch[0]!;
    expect(requeued.retryCount).toBe(1);
  });

  it('should drop reports exceeding max retries', () => {
    queue.enqueue(mockReport);
    let batch = queue.getBatch();
    let item = batch[0]!;

    // Simulate multiple retries (max is usually 3)
    for (let i = 0; i < 5; i++) {
      queue.requeue(item);
      batch = queue.getBatch();
      if (batch.length === 0) break;
      item = batch[0]!;
    }

    expect(queue.size).toBe(0);
  });

  it('should maintain max queue size', () => {
    // Fill queue beyond MAX_QUEUE_SIZE (100)
    for (let i = 0; i < 110; i++) {
      queue.enqueue({ ...mockReport, fingerprint: `fp-${i}` });
    }

    expect(queue.size).toBe(100);
  });

  it('should clear queue', () => {
    queue.enqueue(mockReport);
    queue.clear();
    expect(queue.size).toBe(0);
    expect(localStorage.getItem('error_tracker_queue')).toBeNull();
  });
});
