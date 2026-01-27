# 🏛️ Crypto Survivors - Renaissance Database Schema

Bu doküman, projenin yenilenen (2026-01-26) Supabase veritabanı mimarisini tanımlar. Bu şema; ölçeklenebilirlik, güvenlik (RLS) ve finansal denetlenebilirlik (Ledger) prensiplerine göre tasarlanmıştır.

---

## 👤 1. Identity & Profiles (Kimlik)

### `profiles`
Merkezi oyuncu profili.
| Kolon | Tip | Açıklama |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Benzersiz profil ID |
| `display_name` | TEXT (Unique) | Ekran adı |
| `avatar_url` | TEXT | Profil resmi |
| `level` | INTEGER | Oyuncu seviyesi |
| `xp` | BIGINT | Toplam tecrübe puanı |
| `is_tester` | BOOLEAN | Beta/Tester flag |
| `metadata` | JSONB | Cihaz hash'i, tercihler vb. |

### `identities`
Multi-auth giriş yöntemleri (Twitter, Discord, Google).
| Kolon | Tip | Açıklama |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Identity ID |
| `profile_id` | UUID (FK) | `profiles.id` |
| `provider` | TEXT | 'twitter', 'discord', 'email' vb. |
| `provider_id` | TEXT | Harici sağlayıcı ID'si |

---

## 💰 2. Finance & Economy (Ekonomi)

### `virtual_accounts`
Oyuncunun sanal bakiye durumu.
| Kolon | Tip | Açıklama |
| :--- | :--- | :--- |
| `profile_id` | UUID (PK) | `profiles.id` |
| `gold_balance` | BIGINT | Mevcut Altın |
| `gems_balance` | BIGINT | Mevcut Mücevher |

### `ledger`
Tüm finansal hareketlerin silinemez kayıt defteri (Audit Trail).
| Kolon | Tip | Açıklama |
| :--- | :--- | :--- |
| `id` | UUID (PK) | İşlem ID |
| `profile_id` | UUID (FK) | `profiles.id` |
| `amount` | BIGINT | Değişim miktarı (+/-) |
| `transaction_type`| TEXT | 'game_reward', 'shop_purchase' vb. |
| `balance_after` | BIGINT | İşlem sonrası bakiye |

---

## 🎮 3. Gameplay (Oyun)

### `sessions`
Oyun oturumları ve sonuçları.
| Kolon | Tip | Açıklama |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Session ID |
| `profile_id` | UUID (FK) | `profiles.id` |
| `crypto_pair` | TEXT | BTC, ETH vb. |
| `is_verified` | BOOLEAN | Anti-cheat onayı |
| `reward_amount` | BIGINT | Kazanılan ödül |

### `price_history`
Railway'den gelen saniyelik piyasa verileri (BRIN Index'li).
| Kolon | Tip | Açıklama |
| :--- | :--- | :--- |
| `timestamp` | TIMESTAMPTZ | Veri zamanı |
| `pair` | TEXT | Parite |
| `price` | NUMERIC | Fiyat |

---

## 📊 4. Observability (Gözlem)

### `error_reports`
Uygulama hataları ve stack trace'ler.
### `performance_metrics`
Cihaz bazlı FPS, RAM ve GPU verileri (Mobil optimizasyon için).

---
*Son Güncelleme: 2026-01-26 - Database Renaissance v1.0.0*