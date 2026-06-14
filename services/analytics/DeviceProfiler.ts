import { nanoid } from 'nanoid';
import { SecurityUtils } from '../auth/SecurityUtils';
import { railwayClient } from '../api/RailwayClient';

export interface DeviceProfile {
  fingerprint: string;
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  language: string;
  gpu?: string;
  cores?: number;
  memory?: number;
}

export class DeviceProfiler {
  private static FINGERPRINT_KEY = 'crypto_survivors_fingerprint';

  /**
   * Get or create a unique device fingerprint.
   */
  static getFingerprint(): string {
    let fingerprint = localStorage.getItem(this.FINGERPRINT_KEY);
    if (!fingerprint) {
      fingerprint = 'df-' + nanoid(16);
      localStorage.setItem(this.FINGERPRINT_KEY, fingerprint);
    }
    return fingerprint;
  }

  /**
   * Collect full device metadata.
   */
  static getProfile(): DeviceProfile {
    const gpuInfo = this.getGPUInfo();

    return {
      fingerprint: this.getFingerprint(),
      userAgent: navigator.userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      pixelRatio: window.devicePixelRatio,
      language: navigator.language,
      gpu: gpuInfo,
      cores: navigator.hardwareConcurrency,
      // @ts-expect-error - deviceMemory is non-standard API
      memory: navigator.deviceMemory,
    };
  }

  /**
   * Attempt to get GPU renderer info via WebGL.
   */
  private static getGPUInfo(): string | undefined {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl');
      if (!gl) return undefined;

      const debugInfo = (gl as WebGLRenderingContext).getExtension(
        'WEBGL_debug_renderer_info'
      );
      if (!debugInfo) return undefined;

      return (gl as WebGLRenderingContext).getParameter(
        debugInfo.UNMASKED_RENDERER_WEBGL
      );
    } catch (_e) {
      return undefined;
    }
  }

  /**
   * Sync profile to Railway.
   */
  static async syncToRailway(): Promise<void> {
    // Skip sync on local environments
    if (SecurityUtils.isLocalEnvironment()) {
      return;
    }

    const profile = this.getProfile();

    try {
      await railwayClient.post('/api/v1/telemetry/device-profiles', {
        fingerprint: profile.fingerprint,
        device_type: window.innerWidth < 768 ? 'mobile' : 'desktop',
        browser: profile.userAgent.substring(0, 64),
        screen_width: profile.screenWidth,
        screen_height: profile.screenHeight,
        hardware_concurrency: profile.cores,
        device_memory: profile.memory,
      });
    } catch (err) {
      console.warn('[DeviceProfiler] Sync failed', err);
    }
  }
}
