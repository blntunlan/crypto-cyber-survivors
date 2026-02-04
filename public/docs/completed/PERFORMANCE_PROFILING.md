# Performance Profiling Guide

This document explains the game's performance analysis and optimization processes.

## 🔧 Profiling Tools

### 1. Chrome DevTools Performance Tab

```bash
# Start dev server
npm run dev

# Open in Chrome: http://localhost:5173
# F12 -> Performance tab
# Click Record button, play the game, then stop
```

**What to Check:**
- Frame rate (Target 60 FPS)
- Main thread blocking
- Layout thrashing
- Scripting time

### 2. React DevTools Profiler

```bash
# Install React DevTools extension
# Components -> Profiler tab
# Enable Record option
```

**What to Check:**
- Unnecessary re-renders
- Component render times
- Commit phases

### 3. Memory Profiling

```bash
# Chrome DevTools -> Memory tab
# Take a heap snapshot
# Take several snapshots during gameplay
# Search for memory leaks with Comparison view
```

**What to Watch For:**
- Detached DOM nodes
- Event listener accumulation
- Closure references

## 📊 Existing Optimizations

### Implemented ✅

1. **Object Pooling** (`PoolManager.ts`)
   - Bullet pooling
   - Enemy pooling
   - Particle pooling
   - Gem pooling

2. **Lazy Loading** (`App.tsx`)
   - Component splitting with React.lazy()
   - Code splitting for heavy components

3. **Canvas Optimizations** (`GameCanvas.ts`)
   - RequestAnimationFrame
   - Off-screen rendering
   - Sprite batching

4. **Device Adaptive** (`DeviceBenchmarkService.ts`)
   - Auto quality adjustment
   - Mobile optimizations
   - Particle reduction on low-end devices

5. **Memo & Callbacks** (`hooks/`)
   - useMemo for expensive calculations
   - useCallback for event handlers

## 🎯 Hot Paths

Most frequently called functions that require optimization:

| Function | File | Calls/frame | Notes |
|-----------|-------|-------------|--------|
| `update()` | GameEngine | 1 | Main loop |
| `checkCollisions()` | CollisionSystem | 1 | O(n*m) complexity |
| `moveTowards()` | Enemy | n | For each enemy |
| `draw()` | GameCanvas | 1 | Render call |

## 🚨 Known Issues

### Potential Memory Leaks

1. **Event Listeners**
   - EventBus subscriptions must be cleaned up
   - Current: `eventUnsubscribers` array pattern ✅

2. **Timer Cleanup**
   - setTimeout/setInterval must be cleared
   - Current: Clear on component unmount ✅

3. **Canvas Context**
   - Canvas references should not be held
   - Current: Proper cleanup ✅

## 📈 Benchmark Results

### Target Metrics

| Metric | Target | Min Acceptable |
|--------|-------|-----------|
| FPS | 60 | 30 |
| Frame Time | 16ms | 33ms |
| Memory | < 100MB | < 200MB |
| Load Time | < 3s | < 5s |

### Device Profiles

| Profile | Max Enemies | Particles | Quality |
|--------|-------------|-----------|---------|
| High | 100 | 500 | Full |
| Medium | 50 | 200 | Reduced |
| Low | 30 | 100 | Minimal |
| Ultra Low | 15 | 50 | Basic |

## 🔍 Profiling Checklist

### Before Starting

- [ ] Use production build: `npm run build && npm run preview`
- [ ] Disable browser extensions
- [ ] Close other tabs
- [ ] Do not take profile while DevTools is already open (overhead)

### While Profiling

- [ ] 30-60 second recording
- [ ] Typical gameplay scenario
- [ ] Include level up, boss fight
- [ ] Include moments of high enemy count

### Analysis

- [ ] Mark long tasks (>50ms)
- [ ] Garbage collection spikes
- [ ] Layout/Paint frequency
- [ ] JavaScript heap size trend

## 💡 Optimization Recommendations

### Short Term

1. **Collision Grid System**
   - O(n) complexity with spatial hashing

2. **Web Workers**
   - Off-thread collision detection

3. **Canvas Layering**
   - Static background layer
   - Dynamic entity layer

### Long Term

1. **WebGL Renderer**
   - Pixi.js or custom WebGL

2. **WASM Physics**
   - Rust/C++ compiled physics engine

3. **Offscreen Canvas**
   - Worker-based rendering

## 📝 Notes

- Bundle size: ~881KB (gzipped: ~165KB)
- Critical path optimized for first load
- Initial load reduced with lazy loading

---

// END OF PROTOCOL
