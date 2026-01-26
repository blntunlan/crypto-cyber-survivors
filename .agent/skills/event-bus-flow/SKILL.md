---
name: event-bus-flow
description: Debug cross-service communication and event flows using EventBus
---

# Event Bus & Communication Skill

Servisler arası iletişimi ve asenkron event flow'larını debug et.

## Usage

```
/event-bus-flow [event-name]
```

## Flow Visualization

Bu sistemde servisler birbirine doğrudan bağımlı olmak yerine `EventBus` üzerinden konuşur.

**Example: Player Death Flow**
1. `CollisionSystem` -> `EventBus.emit('playerDamage', ...)`
2. `PlayerService` (dinliyor) -> Health düşer.
3. `PlayerService` -> Health <= 0? `EventBus.emit('playerDeath')`
4. `GameStore` (dinliyor) -> Game Over ekranını açar.
5. `MarketService` (dinliyor) -> Son market durumunu dondurur.

## Debugging Event Issues

### Event Is Never Fired
- **Check**: Emit edilen yerdeki logic. (`if` condition'ları vb.)
- **Check**: `types.ts` içinde event adı doğru tanımlanmış mı?

### Event Is Never Received
- **Check**: `service.initialize()` çağrıldı mı? (Listener'lar initialize'da eklenir)
- **Check**: `this.handleEvent.bind(this)` doğru yapıldı mı? (Context lost sorunu)

### Infinite Event Loop
- **Symptom**: Browser donar, stack overflow hatası.
- **Check**: A event'i B'yi tetikliyor, B de tekrar A'yı tetikliyor olabilir.

## Common Events

| Event Name | Description | Source |
|------------|-------------|--------|
| `gameStart` | Yeni oyun başladı | GameStore |
| `gameReset` | State temizliği | UI / Store |
| `playerDamage` | Oyuncu hasar aldı | CollisionSystem |
| `enemySpawned` | Yeni düşman doğdu | SpawnManager |
| `marketUpdate` | Yeni fiyat verisi geldi | MarketService |

## Monitoring (Dev Mode)

`EventBus` içine debug logları ekle:
```typescript
// In EventBus.ts
public emit(event, payload) {
  Logger.debug('EventBus', `Emitting ${event}`, payload);
  // ... rest of logic
}
```

## Checklist

- [ ] `dispose()` metodunda `off()` ile listener'lar temizlendi mi? (Memory leak risk!)
- [ ] Payload tipi `types.ts` ile uyumlu mu?
- [ ] Event adı `camelCase` mi?
