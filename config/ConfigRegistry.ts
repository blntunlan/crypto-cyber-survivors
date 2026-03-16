import { type ConfigNamespace } from './namespaces';

/**
 * ConfigRegistry — central registry for debug/admin tooling.
 *
 * Services register their config objects with a namespace key.
 * The registry provides a uniform `get<T>(namespace)` accessor
 * and can freeze all configs at game start to prevent mutation.
 *
 * Direct imports of config modules are NOT replaced — the registry
 * is additive and exists for introspection (debug overlays, admin tools).
 */
class ConfigRegistryClass {
  private static instance: ConfigRegistryClass | null = null;

  private readonly configs = new Map<string, unknown>();
  private frozen = false;

  private constructor() {}

  static getInstance(): ConfigRegistryClass {
    return (ConfigRegistryClass.instance ??= new ConfigRegistryClass());
  }

  /**
   * Register a config object under a namespace.
   * @param namespace Unique namespace key
   * @param config The config object to register
   */
  register<T>(namespace: ConfigNamespace | string, config: T): void {
    if (this.frozen) {
      console.warn(
        `[ConfigRegistry] Cannot register '${namespace}' — registry is frozen`
      );
      return;
    }
    this.configs.set(namespace, config);
  }

  /**
   * Get a registered config by namespace.
   * Returns undefined if not registered.
   */
  get<T>(namespace: ConfigNamespace | string): T | undefined {
    return this.configs.get(namespace) as T | undefined;
  }

  /**
   * Check if a namespace is registered.
   */
  has(namespace: ConfigNamespace | string): boolean {
    return this.configs.has(namespace);
  }

  /**
   * Get all registered namespace keys.
   */
  getNamespaces(): string[] {
    return [...this.configs.keys()];
  }

  /**
   * Get all configs as a plain object (for debug/admin).
   */
  getAll(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    this.configs.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Freeze the registry — no further registrations allowed.
   * Call at game start to prevent accidental mutation.
   */
  freeze(): void {
    this.frozen = true;
    // Deep-freeze all registered configs
    this.configs.forEach((config, namespace) => {
      try {
        if (typeof config === 'object' && config !== null) {
          Object.freeze(config);
        }
      } catch {
        console.warn(`[ConfigRegistry] Could not freeze '${namespace}'`);
      }
    });
  }

  /**
   * Whether the registry is frozen.
   */
  isFrozen(): boolean {
    return this.frozen;
  }

  /**
   * Reset (for testing only).
   */
  reset(): void {
    this.configs.clear();
    this.frozen = false;
  }

  static resetForTesting(): void {
    if (this.instance) {
      this.instance.reset();
      this.instance = null;
    }
  }
}

export const ConfigRegistry = ConfigRegistryClass.getInstance();
