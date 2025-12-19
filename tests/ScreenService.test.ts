import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screenService } from '../services/ScreenService';

describe('ScreenService', () => {
    const originalUserAgent = navigator.userAgent;
    const originalMaxTouchPoints = navigator.maxTouchPoints;
    const originalPlatform = navigator.platform;
    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;

    beforeEach(() => {
        // Reset cache between tests
        // @ts-expect-error - reaching into private state for testing
        screenService.cachedInfo = null;
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.stubGlobal('navigator', {
            userAgent: originalUserAgent,
            maxTouchPoints: originalMaxTouchPoints,
            platform: originalPlatform,
        });
        vi.stubGlobal('window', {
            ...window,
            innerWidth: originalInnerWidth,
            innerHeight: originalInnerHeight,
        });
    });

    const mockDevice = (options: {
        ua: string;
        touchPoints?: number;
        platform?: string;
        width?: number;
        height?: number;
        coarsePointer?: boolean;
    }) => {
        vi.stubGlobal('navigator', {
            userAgent: options.ua,
            maxTouchPoints: options.touchPoints ?? 0,
            platform: options.platform ?? 'Win32',
        });

        // Mock matchMedia for pointer detection
        window.matchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: query.includes('coarse') ? (options.coarsePointer ?? false) : false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        if (options.width !== undefined) {
            window.innerWidth = options.width;
        }
        if (options.height !== undefined) {
            window.innerHeight = options.height;
        }
    };

    describe('isMobile', () => {
        it('should detect iPhone as mobile', () => {
            mockDevice({
                ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                touchPoints: 5,
                coarsePointer: true
            });
            expect(screenService.isMobile()).toBe(true);
        });

        it('should detect Android as mobile', () => {
            mockDevice({
                ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
                touchPoints: 5,
                coarsePointer: true
            });
            expect(screenService.isMobile()).toBe(true);
        });

        it('should detect Desktop as non-mobile', () => {
            mockDevice({
                ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
                touchPoints: 0,
                coarsePointer: false
            });
            expect(screenService.isMobile()).toBe(false);
        });

        it('should detect touch laptops as non-mobile (fine pointer)', () => {
            mockDevice({
                ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
                touchPoints: 10,
                coarsePointer: false // It has a mouse usually
            });
            expect(screenService.isMobile()).toBe(false);
        });
    });

    describe('isTablet', () => {
        it('should detect iPad as tablet', () => {
            mockDevice({
                ua: 'Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                touchPoints: 5,
                width: 1024,
                height: 768,
                coarsePointer: true
            });
            expect(screenService.isTablet()).toBe(true);
        });

        it('should not detect small phone as tablet', () => {
            mockDevice({
                ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                touchPoints: 5,
                width: 390,
                height: 844,
                coarsePointer: true
            });
            expect(screenService.isTablet()).toBe(false);
        });
    });

    describe('getOS', () => {
        it('should return ios for iPhone', () => {
            mockDevice({ ua: 'iPhone' });
            expect(screenService.getOS()).toBe('ios');
        });

        it('should return android for Android device', () => {
            mockDevice({ ua: 'Android' });
            expect(screenService.getOS()).toBe('android');
        });

        it('should detect modern iPadOS (MacIntel + Touch)', () => {
            mockDevice({
                ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
                platform: 'MacIntel',
                touchPoints: 5
            });
            expect(screenService.getOS()).toBe('ios');
        });
    });

    describe('Orientation', () => {
        it('should detect landscape', () => {
            mockDevice({ ua: 'Desktop', width: 1920, height: 1080 });
            expect(screenService.isLandscape()).toBe(true);
            expect(screenService.isPortrait()).toBe(false);
        });

        it('should detect portrait', () => {
            mockDevice({ ua: 'Desktop', width: 1080, height: 1920 });
            expect(screenService.isLandscape()).toBe(false);
            expect(screenService.isPortrait()).toBe(true);
        });
    });
});
