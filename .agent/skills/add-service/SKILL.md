---
name: add-service
description: Create a new singleton service following project architecture
---

# Add Service Skill

Proje mimarisine uygun yeni singleton servis oluştur.

## Usage

```
/add-service [ServiceName]
```

## Service Template

```typescript
import { EventBus } from './EventBus';
import { Logger } from './Logger';

/**
 * ServiceName - Servis açıklaması
 * 
 * Singleton pattern kullanır.
 * EventBus ile diğer servislerle iletişim kurar.
 */
class ServiceNameClass {
  private static instance: ServiceNameClass | null = null;
  private initialized = false;

  private constructor() {
    // Private constructor for singleton
  }

  /** Singleton instance'ı al */
  public static getInstance(): ServiceNameClass {
    if (!ServiceNameClass.instance) {
      ServiceNameClass.instance = new ServiceNameClass();
    }
    return ServiceNameClass.instance;
  }

  /** Servisi başlat */
  public initialize(): void {
    if (this.initialized) {
      Logger.warn('ServiceName', 'Already initialized');
      return;
    }

    this.setupEventListeners();
    this.initialized = true;
    Logger.info('ServiceName', 'Initialized');
  }

  /** Event listener'ları kur */
  private setupEventListeners(): void {
    EventBus.on('gameReset', this.handleGameReset.bind(this));
  }

  /** Oyun sıfırlandığında state'i temizle */
  private handleGameReset(): void {
    Logger.info('ServiceName', 'Resetting state');
    // Reset logic here
  }

  /** Update loop - GameEngine tarafından çağrılır */
  public update(deltaTime: number): void {
    if (!this.initialized) return;
    // Update logic here
  }

  /** Servisi temizle */
  public dispose(): void {
    EventBus.off('gameReset', this.handleGameReset.bind(this));
    this.initialized = false;
    ServiceNameClass.instance = null;
  }
}

/** Singleton export */
export const ServiceName = ServiceNameClass.getInstance();
```

## Checklist

### Before Creating

- [ ] Servis adı açıklayıcı mı?
- [ ] Benzer bir servis var mı?
- [ ] Singleton pattern gerekli mi?

### Service Requirements

- [ ] Singleton pattern uygula
- [ ] EventBus entegrasyonu
- [ ] gameReset event'i dinle
- [ ] Logger kullan
- [ ] initialize() ve dispose() metodları
- [ ] JSDoc yorumları

### After Creating

- [ ] EventBus'a gerekli event'leri ekle
- [ ] GameEngine'e update hook'u ekle (gerekirse)
- [ ] Test dosyası oluştur
- [ ] GEMINI.md'ye ekle

## Event Integration

```typescript
// EventBus type tanımları (types.ts)
export interface GameEvents {
  gameReset: void;
  gameStart: void;
  gamePause: void;
  playerDamage: { damage: number; source: string };
  // Yeni event ekle
  serviceName_customEvent: { data: CustomData };
}
```

## Test Template

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ServiceName } from '../services/ServiceName';
import { EventBus } from '../services/EventBus';

describe('ServiceName', () => {
  beforeEach(() => {
    ServiceName.initialize();
  });

  afterEach(() => {
    ServiceName.dispose();
  });

  it('should initialize correctly', () => {
    expect(ServiceName).toBeDefined();
  });

  it('should handle gameReset event', () => {
    EventBus.emit('gameReset');
    // Assert reset occurred
  });

  it('should update correctly', () => {
    ServiceName.update(16); // ~60fps deltaTime
    // Assert update logic
  });
});
```

## Common Dependencies

```typescript
import { EventBus } from './EventBus';
import { Logger } from './Logger';
import { GameState } from '../types';
import { GAME_ENGINE } from '../constants';
import { useGameStore } from '../stores/gameStore';
```

## Integration Points

Servisi sisteme entegre et:

1. **GameEngine.tsx** - Update loop'a ekle
```typescript
ServiceName.update(deltaTime);
```

2. **App.tsx** - Initialize et
```typescript
useEffect(() => {
  ServiceName.initialize();
  return () => ServiceName.dispose();
}, []);
```

3. **stores/gameStore.ts** - State bağlantısı (gerekirse)
