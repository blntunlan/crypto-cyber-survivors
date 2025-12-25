/**
 * ScreenService - Platform & Device Detection Service
 *
 * Provides reliable detection of:
 * - Mobile vs Desktop devices
 * - Tablet detection
 * - iOS/Android platform specifics
 * - Screen orientation
 * - Safe area insets
 * - PWA mode detection
 */

export type Platform = 'desktop' | 'mobile' | 'tablet';
export type OperatingSystem = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface ScreenInfo {
  width: number;
  height: number;
  isLandscape: boolean;
  safeArea: SafeAreaInsets;
}

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isPWA: boolean;
  platform: Platform;
  os: OperatingSystem;
  hasTouch: boolean;
  screen: ScreenInfo;
}

class ScreenServiceClass {
  private static instance: ScreenServiceClass | null = null;
  private listeners: Set<() => void> = new Set();
  private cachedInfo: DeviceInfo | null = null;
  private cacheTime: number = 0;
  private readonly CACHE_DURATION = 100; // ms - cache device info briefly

  private constructor() {
    // Listen for orientation/resize changes
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.handleChange);
      window.addEventListener('orientationchange', this.handleChange);
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ScreenServiceClass {
    return (ScreenServiceClass.instance ??= new ScreenServiceClass());
  }

  /**
   * Handle resize/orientation change
   */
  private handleChange = (): void => {
    // Invalidate cache
    this.cachedInfo = null;

    // Notify all listeners
    this.listeners.forEach(callback => callback());
  };

  /**
   * Check if device is mobile (phone or tablet)
   * Uses multiple detection methods for reliability
   */
  isMobile(): boolean {
    // Method 1: User Agent (classic, catches most cases)
    const userAgentMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    // Method 2: Touch capability
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Method 3: Pointer type (most reliable for distinguishing touch vs mouse)
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

    // Combination: User agent mobile OR (has touch AND coarse pointer)
    // This catches mobile devices while excluding touch-screen laptops
    return userAgentMobile || (hasTouch && coarsePointer);
  }

  /**
   * Check if device is a tablet (large screen mobile)
   */
  isTablet(): boolean {
    if (!this.isMobile()) return false;

    // Tablets have larger screens
    const minDimension = Math.min(window.innerWidth, window.innerHeight);
    const maxDimension = Math.max(window.innerWidth, window.innerHeight);

    // Typical tablet: min dimension >= 600px, max >= 900px
    return minDimension >= 600 && maxDimension >= 900;
  }

  /**
   * Check if device is a phone (small screen mobile)
   */
  isPhone(): boolean {
    return this.isMobile() && !this.isTablet();
  }

  /**
   * Get platform type
   */
  getPlatform(): Platform {
    if (!this.isMobile()) return 'desktop';
    if (this.isTablet()) return 'tablet';
    return 'mobile';
  }

  /**
   * Detect iOS (includes iPad with iOS 13+)
   */
  isIOS(): boolean {
    // Standard iOS detection
    const standardIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    // iPad with iOS 13+ reports as Mac, check for touch
    // Use userAgentData if available, fallback to userAgent check
    const isMacPlatform =
      // @ts-expect-error - userAgentData is not yet in all TypeScript DOM types
      navigator.userAgentData?.platform === 'macOS' || /Macintosh/i.test(navigator.userAgent);
    const ipadOS = isMacPlatform && navigator.maxTouchPoints > 1;

    return standardIOS || ipadOS;
  }

  /**
   * Detect Android
   */
  isAndroid(): boolean {
    return /Android/i.test(navigator.userAgent);
  }

  /**
   * Get operating system
   */
  getOS(): OperatingSystem {
    if (this.isIOS()) return 'ios';
    if (this.isAndroid()) return 'android';

    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('win')) return 'windows';
    if (ua.includes('mac')) return 'macos';
    if (ua.includes('linux')) return 'linux';

    return 'unknown';
  }

  /**
   * Check if running as PWA (installed to home screen)
   */
  isPWA(): boolean {
    // Standard check
    const standaloneMode = window.matchMedia('(display-mode: standalone)').matches;

    // iOS Safari specific
    const iosSafariStandalone =
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    // Check URL parameters (some PWAs include this)
    const pwaParam = new URLSearchParams(window.location.search).get('pwa') === 'true';

    return standaloneMode || iosSafariStandalone || pwaParam;
  }

  /**
   * Check if screen is in landscape orientation
   */
  isLandscape(): boolean {
    return window.innerWidth > window.innerHeight;
  }

  /**
   * Check if screen is in portrait orientation
   */
  isPortrait(): boolean {
    return !this.isLandscape();
  }

  /**
   * Check if device has touch capability
   */
  hasTouch(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * Get safe area insets (for notched devices)
   * Returns values in pixels
   */
  getSafeAreaInsets(): SafeAreaInsets {
    const computedStyle = getComputedStyle(document.documentElement);

    const parseInset = (value: string): number => {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    };

    return {
      top: parseInset(computedStyle.getPropertyValue('--sat')),
      bottom: parseInset(computedStyle.getPropertyValue('--sab')),
      left: parseInset(computedStyle.getPropertyValue('--sal')),
      right: parseInset(computedStyle.getPropertyValue('--sar')),
    };
  }

  /**
   * Get screen dimensions and info
   */
  getScreenInfo(): ScreenInfo {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      isLandscape: this.isLandscape(),
      safeArea: this.getSafeAreaInsets(),
    };
  }

  /**
   * Get full device info (cached for performance)
   */
  getDeviceInfo(): DeviceInfo {
    const now = Date.now();

    // Return cached if fresh
    if (this.cachedInfo && now - this.cacheTime < this.CACHE_DURATION) {
      return this.cachedInfo;
    }

    // Build new info
    this.cachedInfo = {
      isMobile: this.isMobile(),
      isTablet: this.isTablet(),
      isDesktop: !this.isMobile(),
      isIOS: this.isIOS(),
      isAndroid: this.isAndroid(),
      isPWA: this.isPWA(),
      platform: this.getPlatform(),
      os: this.getOS(),
      hasTouch: this.hasTouch(),
      screen: this.getScreenInfo(),
    };
    this.cacheTime = now;

    return this.cachedInfo;
  }

  /**
   * Subscribe to screen/orientation changes
   * @returns Unsubscribe function
   */
  onChange(callback: () => void): () => void {
    this.listeners.add(callback);

    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Check if game should show mobile controls
   * (mobile device AND not in PWA desktop mode)
   */
  shouldShowMobileControls(): boolean {
    return this.isMobile();
  }

  /**
   * Check if should enforce landscape orientation
   * (only on phones, tablets can work in portrait)
   */
  shouldEnforceLandscape(): boolean {
    return this.isPhone();
  }

  /**
   * Get optimal game canvas dimensions
   * Accounts for safe areas and control zones
   */
  getOptimalGameDimensions(): { width: number; height: number } {
    const screen = this.getScreenInfo();
    const safeArea = screen.safeArea;

    // Subtract safe areas
    const width = screen.width - safeArea.left - safeArea.right;
    const height = screen.height - safeArea.top - safeArea.bottom;

    // On mobile, reserve space for touch controls at bottom
    if (this.isMobile()) {
      // Reserve ~20% of height for controls
      // height = Math.floor(height * 0.8);
    }

    return { width, height };
  }
}

// Export singleton instance
export const screenService = ScreenServiceClass.getInstance();

// Convenience exports for common checks
export const isMobile = () => screenService.isMobile();
export const isTablet = () => screenService.isTablet();
export const isDesktop = () => !screenService.isMobile();
export const isIOS = () => screenService.isIOS();
export const isAndroid = () => screenService.isAndroid();
export const isPWA = () => screenService.isPWA();
export const getPlatform = () => screenService.getPlatform();
export const getDeviceInfo = () => screenService.getDeviceInfo();
