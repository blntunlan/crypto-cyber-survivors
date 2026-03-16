import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DebugService } from '../services/system/DebugService';
describe('DebugService', () => {
  beforeEach(() => {
    DebugService.clearLogs();
    vi.clearAllMocks();
  });

  it('should be a singleton', () => {
    expect(DebugService).toBeDefined();
  });

  it('should capture a snapshot', () => {
    const snapshot = DebugService.captureSnapshot();
    expect(snapshot).toHaveProperty('timestamp');
    expect(snapshot).toHaveProperty('gameState');
    expect(snapshot).toHaveProperty('combo');
    expect(snapshot.browser.screenWidth).toBeTypeOf('number');
  });

  it('should log messages', () => {
    const message = 'Test debug message';
    DebugService.log(message);

    const logs = DebugService.getLogs();
    expect(logs.length).toBe(1);
    expect(logs[0]).toContain(message);
  });

  it('should manage log size', () => {
    for (let i = 0; i < 250; i++) {
      DebugService.log(`Message ${i}`);
    }

    const logs = DebugService.getLogs();
    expect(logs.length).toBe(200);
    expect(logs[logs.length - 1]).toContain('Message 249');
  });

  it('should expose global access on window', () => {
    expect((window as any).gameDebug).toBeDefined();

    expect(typeof (window as any).gameDebug.snapshot).toBe('function');
  });

  it('should handle exportSnapshot', () => {
    // Mock Blob and URL
    const mockURL = 'blob:test';
    vi.stubGlobal('Blob', vi.fn());
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => mockURL),
      revokeObjectURL: vi.fn(),
    });

    // Mock document.createElement

    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    } as any;
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockReturnValue(mockAnchor);

    DebugService.exportSnapshot();

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockAnchor.href).toBe(mockURL);
    expect(mockAnchor.download).toContain('game-snapshot');
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockURL);
  });
});
