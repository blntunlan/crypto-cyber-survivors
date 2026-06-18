# Beta SSE Market Contract

> **Status** live
> Owner: Backend, Data Engineering, Gameplay Runtime

Bu belge beta için aktif market stream sözleşmesini tek yerde sabitler. Amaç `SSEMarketService`, market aggregator endpointleri ve `useMarketData` runtime handoff davranışının aynı contract üzerinden değerlendirilmesidir.

## Contract Kaynakları

| Alan | Aktif kaynak | Not |
|---|---|---|
| Server stream shape | `railway-market-server/src/routes/marketStream.ts` | Market aggregator tarafından host edilmesi gereken SSE contract kaynağı |
| Client stream adapter | `services/market/SSEMarketService.ts` | Browser `EventSource` ile bağlantı, reconnect ve fallback yönetimi |
| History warmup client | `services/api/MarketApiClient.ts` | `/api/v1/market/history` HTTP warmup contractı |
| Gameplay handoff | `hooks/useMarketData.ts` | SSE update → market runtime → `GameEngine` aktarımı |
| Resilience tests | `tests/services/market/SSEMarketService.test.ts` | Gap, fallback, fatal disconnect, reconnect ve visibility davranışları |

Market data path beta’da frontend’in Binance veya Coinbase’e direkt bağlanmasına dayanmaz. Oyun istemcisi `VITE_MARKET_AGGREGATOR_URL` varsa onu, yoksa `VITE_RAILWAY_API_URL` değerini market base URL olarak kullanır.

## Endpointler

| Endpoint | Method | Auth | DB | Amaç |
|---|---|---|---|---|
| `/api/v1/market/stream?pair=BTC` | GET | Public | Yok | Pair-scoped live SSE fiyat ve indikatör stream’i |
| `/api/v1/market/history?pair=BTC&limit=300` | GET | Public | `price_history` read | İndikatör ve grafik warmup için son fiyat/volume geçmişi |

`/stream` response header contractı `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive` ve `X-Accel-Buffering: no` kullanır. İlk mesaj `data: {"type":"connected","pair":"BTC"}` formatındadır ve client bunu gameplay data olarak işlemez.

## Stream Payload

Her market tick standart SSE data frame olarak gönderilir: `data: {json}\n\n`. Heartbeat frame’i comment formatındadır: `: heartbeat\n\n`; JSON değildir ve gameplay update sayılmaz.

| Alan | Tip | Zorunlu | Anlam |
|---|---|---|---|
| `pair` | string | Evet | `BTC`, `ETH`, `SOL` gibi client pair filtresi |
| `price` | number | Evet | Son normalize fiyat |
| `volume` | number | Evet | Tick volume veya aggregator volume değeri |
| `high` | number | Evet | ATR fallback hesapları için high |
| `low` | number | Evet | ATR fallback hesapları için low |
| `rsi` | number | Evet | Server-computed RSI |
| `rsiState` | string | Evet | `OVERSOLD`, `NEUTRAL`, `OVERBOUGHT` |
| `atrPercent` | number | Evet | Volatilite yüzdesi |
| `normalizedVolume` | number | Evet | Runtime volume normalizasyonu |
| `volumePercentile` | number | Evet | Volume percentile |
| `whaleTier` | number | Evet | 0-3 whale activity tier |
| `spawnRateMultiplier` | number | Evet | Difficulty spawn çarpanı |
| `enemyAggroMultiplierLong` | number | Evet | Long pozisyon aggro çarpanı |
| `enemyAggroMultiplierShort` | number | Evet | Short pozisyon aggro çarpanı |
| `trendStrength` | number | Evet | Trend gücü |
| `trendDirection` | string | Evet | `UP`, `DOWN`, `SIDEWAYS` |
| `timestamp` | number | Evet | Epoch ms tick zamanı |

Client yalnızca kendi `pair` değeriyle eşleşen payloadları işler. Yanlış pair, malformed JSON veya `type: connected` mesajları sessizce gameplay pipeline dışında bırakılır.

## Heartbeat ve Liveness

Server heartbeat default 5000 ms aralıkla `: heartbeat` comment frame’i yazar. Bu frame proxy ve load balancer idle timeout riskini azaltır; `lastDataTime` veya gameplay market state güncellemez.

Client bağlantı durumunu `disconnected`, `connecting`, `connected` olarak raporlar. `onopen` geldiğinde durum `connected` olur; `onerror` geldiğinde intentional close değilse `connecting` durumuna alınır ve browser-native EventSource auto-reconnect davranışına bırakılır.

## Reconnect ve Visibility

`SSEMarketService.reconnect()` önce mevcut `EventSource` bağlantısını kapatır, sonra 500 ms gecikmeyle yeni bağlantı açar. Tab görünürlüğü geri geldiğinde durum `disconnected` ve kapanış intentional değilse client tekrar `EventSource` oluşturur.

İlk bağlantı sırasında 30000 ms içinde data alınamazsa client bağlantıyı kapatır ve durumu `disconnected` yapar. Bu süre gameplay market data timeout contractıyla aynı fatal disconnect eşiğini kullanır.

## Data Gap ve Fallback

Client son gerçek data zamanını takip eder. 8000 ms üzerindeki data gap için `disconnectStartTime` başlar. Son bilinen fiyat varsa fallback modu açılır ve her 1000 ms sentetik update üretilir.

Sentetik update contractı `isSynthetic: true` taşır, fiyat olarak `lastKnownPrice` kullanır, indikatörleri neutral değerlere çeker ve `trendDirection: SIDEWAYS` gönderir. `useMarketData` sentetik update’i runtime pipeline’a aktarır fakat timeout recovery sayacı olarak gerçek data kabul etmez.

30000 ms üzerindeki kesintide client fatal disconnect durumunu işaretler ve status callback üzerinden `totalDisconnectDuration` bildirir. Gerçek data tekrar geldiğinde fallback kapanır, fatal flag sıfırlanır ve runtime recovery eventleri tekrar üretilebilir.

## History Warmup

`GET /api/v1/market/history?pair=BTC&limit=300` son `price_history` kayıtlarını döndürür. Server `limit` değerini maksimum 1000 ile sınırlar, kayıtları timestamp’e göre son kayıtlar arasından seçer ve client’a kronolojik sırada verir.

Client `MarketApiClient.getHistory(pair, limit)` içinde pair değerini `BTC`, `ETH`, `SOL` allowlist’iyle doğrular. `limit` finite değilse 300 kullanılır, 1 ile 1000 arasına çekilir ve HTTP timeout 10000 ms olur. Response satırları `price`, `volume`, `timestamp` olarak normalize edilir; finite olmayan satırlar atılır.

## Runtime Handoff

`useMarketData` her geçerli SSE payloadını `source: 'sse'` ile market update’e çevirir. Server-computed `rsi`, `rsiState`, `atrPercent`, `spawnRateMultiplier`, `normalizedVolume`, `volumePercentile`, `whaleTier` ve aggro alanları market pipeline’a sync edilir.

Runtime mode legacy değilse SSE status bilgisi `marketRuntimeFeedHealth` eventine çevrilir. Bu event `lastPriceTime`, `totalDisconnectDuration` ve `isUsingFallbackData` alanlarını içerir; observability ve runtime snapshot audit için kaynak kabul edilir.

## Deployment Guardrails

Beta ortamında `VITE_MARKET_AGGREGATOR_URL` tercih edilen base URL’dir. Bu değer yoksa `VITE_RAILWAY_API_URL` fallback olur; iki değer de yoksa client `disconnected` raporlar ve SSE bağlantısı açılmaz.

Game API server metadata’sı market data SSE/WebSocket yolunun dedicated market aggregator servisine taşındığını belirtir. Bu nedenle `/api/v1/market/stream` contractı deployment’da aggregator servisi üzerinde doğrulanmalı; REST API server mount varsayımıyla sign-off verilmemelidir.

## Beta Kabul Kriteri

- `/api/v1/market/stream?pair=BTC` gerçek beta aggregator üzerinde `text/event-stream` döndürür.
- İlk `type: connected` mesajı gameplay update olarak işlenmez.
- 5 saniyelik heartbeat proxy timeout oluşturmadan akar.
- Geçerli tick payloadı listedeki zorunlu alanların tamamını taşır.
- 8 saniye data gap sonrası fallback `isSynthetic: true` update üretir.
- 30 saniye data gap sonrası fatal disconnect status’u görünür olur.
- Real data recovery fallback flag’ini kapatır.
- `/api/v1/market/history` 1-1000 limit aralığında kronolojik `price`, `volume`, `timestamp` listesi döndürür.
