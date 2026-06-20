# Beta Replay Storage Decision

> **Status** live
> Owner: Product, Backend, Security

Bu doküman beta için replay upload saklama maliyeti, retention policy ve anti-cheat değerine ilişkin ürün kararını kaydeder.

## Karar Özeti

| Başlık | Karar |
|---|---|
| Beta storage backend | Railway PostgreSQL `game_replays.replay_data` `BYTEA` olarak kalır |
| Object storage | Beta kapsamına alınmaz |
| Save precondition | Sadece caller'a ait ve `sessions.is_verified = true` olan session için replay kaydedilir |
| Payload limit | Backend decoded payload `<= 500000` byte; DB constraint `<= 512000` byte |
| Retention | `prune_old_replays()` her oyuncu için sadece en yüksek skorlu 5 replay'i tutar |
| Reward relation | Replay save reward, wallet, ledger veya verification sonucunu değiştirmez |
| Public playback | `GET /api/v1/replays/:replayId` base64 payload döndürür |

## Neden Postgres ile Kalıyoruz

| Seçenek | Beta Değerlendirmesi |
|---|---|
| PostgreSQL `BYTEA` | Mevcut route, test ve pruning hazır; beta için en düşük operasyon riski |
| Railway volume/object storage | Ek lifecycle, signed URL, orphan cleanup ve migration gerektirir |
| Supabase/Object storage | Railway-first backend ownership kararını böler |
| Replay kapatma | Anti-cheat inceleme ve share/playback değerini düşürür |

## Maliyet Sınırı

| Beta Ölçeği | Maksimum Teorik Replay Alanı |
|---|---:|
| 100 oyuncu | 250 MB |
| 500 oyuncu | 1.25 GB |
| 1,000 oyuncu | 2.5 GB |
| 5,000 oyuncu | 12.5 GB |

Hesap `oyuncu * 5 replay * 500 KB` üst sınırıdır. Gerçek replay payload'ları skor, süre ve kayıt yoğunluğuna göre daha düşük olabilir. Beta için bu sınır kabul edilebilir; 1,000 aktif beta oyuncusu üzerinde yeniden değerlendirme gerekir.

## Retention Policy

| Policy | Değer |
|---|---|
| Per-player cap | Top 5 replay |
| Ordering | `score DESC` |
| Trigger | `after_replay_insert` |
| Function | `prune_old_replays()` |
| Time-based deletion | Beta için yok |
| Manual deletion | Gerekirse DB operasyonu; ürün UI'sı beta dışı |

Time-based deletion eklenmiyor çünkü top-score replay'ler oyuncu prestij ve debug değeri taşıyor. Eğer storage büyümesi beklenenin üzerine çıkarsa ilk tercih object storage migration değil, `replay_size` ve per-player cap değerlerinin tekrar ayarlanması olmalı.

## Anti-Cheat Değeri

- Replay, reward settlement için authoritative kaynak değildir; settlement `POST /api/v1/sessions/verify` tarafından yapılır.
- Replay, verified session sonrası audit/playback artifact olarak değerlidir.
- Replay save failure wallet veya ledger state'i değiştirmediği için güvenli şekilde soft-fail kalır.
- Public replay download community sharing için açık kalır, fakat sadece backend tarafından kaydedilmiş replay'ler oynatılır.

## Genişleme Eşiği

| Sinyal | Aksiyon |
|---|---|
| Replay table 2.5 GB üstüne çıkar | Object storage migration RFC aç |
| Average replay size 300 KB üstüne çıkar | Recorder compression ve sampling oranını düşür |
| Public playback latency 500 ms p95 üstüne çıkar | Metadata/payload ayrımı ve CDN/object storage değerlendir |
| Abuse veya scraping görülür | Public replay endpoint rate limit ve signed access ekle |

## Kabul Kararı

- Beta için replay storage ürün kararı kapatıldı: Postgres `BYTEA`, 500 KB API limiti, top-5 pruning ve verified-session guard yeterli.
- Object storage, signed URL, explicit delete UI ve long-term replay archive beta sonrası ürün kararıdır.
