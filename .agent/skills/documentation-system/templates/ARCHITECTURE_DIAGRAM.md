# Architecture Diagrams (Mermaid)

Bu dosya, projedeki mimariyi görselleştirmek için kullanılacak Mermaid.js şablonlarını içerir.

## Servisler Arası İletişim (EventBus)
```mermaid
graph LR
    S1[Service A] -- "emit('event')" --> EB((Event Bus))
    EB -- "on('event')" --> S2[Service B]
    EB -- "on('event')" --> S3[Service C]
```

## Oyun Döngüsü (Game Loop)
```mermaid
sequenceDiagram
    participant E as Engine
    participant S as Systems
    participant R as Renderer
    
    E->>S: update(dt)
    S->>S: process logic
    E->>R: render()
    R->>R: draw to canvas
```

## State Flow (Zustand)
```mermaid
graph TD
    Action[User Action] --> Store[Zustand Store]
    Store --> UI[React Component]
    Store --> Logic[Game Logic]
```
