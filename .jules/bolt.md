## 2024-05-22 - SpatialGrid Optimization Surprise
**Learning:** Replacing `x / size` with `x * invSize` (where `invSize = 1/size`) inside `Math.floor` resulted in slower or neutral performance in V8 benchmarks (~4.4ms vs ~5.6ms). V8 likely optimizes division by constant or small integer efficiently, while floating point multiplication might have overhead or break optimization paths.
**Action:** Prefer `x / constant` unless profiling proves multiplication is faster. Don't assume multiplication is always faster than division in modern JS engines.
