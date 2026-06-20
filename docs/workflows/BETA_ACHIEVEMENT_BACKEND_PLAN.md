# Beta Achievement Backend Plan

> **Status** live
> Owner: Backend, Frontend, Product

Bu plan `AchievementService` içindeki Railway backend TODO'larını ayrı feature slice olarak kapatmak için gereken endpoint, DB, UI sync ve test kapsamını tanımlar.

## Mevcut Durum

| Alan | Mevcut Davranış | Risk |
|---|---|---|
| Frontend service | `services/gameplay/AchievementService.ts` boş liste döndürüyor | Profile achievement sekmesi beta sırasında boş kalır |
| Profile aggregation | `ProfileStatsService` achievement service'e bağlı | Backend geldiğinde UI endpoint contract'ına hazır olmalı |
| Local progress | `stores/slices/progressSlice.ts` sadece local unlock state tutuyor | Cloud sync ve anti-cheat doğrulaması yok |
| Backend DB | Railway schema içinde `achievements` / `player_achievements` aktif değil | Migration ve ownership netleşmeden yazma eklenmemeli |
| Legacy schema | `supabase/migrations/legacy/012_achievements_system.sql` tarihsel referans | Doğrudan prod kaynağı olarak kullanılmamalı |

## Railway Endpoint Sözleşmesi

| Endpoint | Auth | Amaç | Response |
|---|---|---|---|
| `GET /api/v1/achievements` | Public veya optional auth | Aktif achievement tanımlarını döndürür | `{ achievements: Achievement[] }` |
| `GET /api/v1/achievements/mine` | Required | Mevcut profile için unlock listesini döndürür | `{ unlocked: ProfileAchievement[] }` |
| `GET /api/v1/achievements/progress` | Required | Server-side aggregate progress snapshot döndürür | `{ progress: AchievementProgress[] }` |
| `POST /api/v1/achievements/evaluate-session` | Internal/session verify only | Verified session sonrası unlock hesaplar | `{ unlocked: ProfileAchievement[] }` |

## DB Slice

| Obje | Kolonlar | Not |
|---|---|---|
| `achievements` | `id`, `name`, `description`, `category`, `icon_key`, `condition_type`, `condition_value`, `reward_gold`, `is_active`, `created_at`, `updated_at` | Tanım tablosu; seed migration ile doldurulur |
| `player_achievements` | `id`, `profile_id`, `achievement_id`, `session_id`, `unlocked_at` | Unique `(profile_id, achievement_id)` zorunlu |
| `idx_player_achievements_profile` | `profile_id`, `unlocked_at` | Profile achievement tab performansı |
| `idx_player_achievements_session` | `session_id` | Verified session sonrası audit |
| `unlock_achievement(...)` | profile/session/achievement parametreleri | Idempotent insert ve reward credit için tek yazma noktası |

## Unlock Kaynağı

| Condition | Authoritative Source | Değerlendirme Zamanı |
|---|---|---|
| `total_kills` | Verified `sessions.kills` aggregate | Session verify transaction sonrası |
| `survival_seconds` | Verified `sessions.survival_seconds` aggregate | Session verify transaction sonrası |
| `max_level` | Verified `sessions.level` max aggregate | Session verify transaction sonrası |
| `pnl_percent` | Verification payload + persisted session exit data | Session verify transaction sonrası |

## UI Sync Akışı

| Adım | Sahip | Davranış |
|---|---|---|
| 1 | Backend | `GET /achievements` tanımları cache-friendly döndürür |
| 2 | Backend | `GET /achievements/mine` sadece current profile unlock'larını döndürür |
| 3 | Frontend | `AchievementService.getAchievements()` Railway endpoint'e bağlanır |
| 4 | Frontend | `AchievementService.getMyUnlocks()` anonymous profile için boş listeyi korur |
| 5 | Frontend | `ProfileStatsService` response'u `PlayerProfile` achievement tab'ına taşır |
| 6 | Frontend | Session verify response yeni unlock içerirse HUD `AchievementPopup` tetiklenir |

## Anti-Cheat ve Ekonomi Kuralı

- Client achievement unlock yazamaz; sadece verified session sonrası backend değerlendirmesi yapılır.
- Gold reward varsa `credit_coins(...)` veya yeni idempotent reward procedure dışında bakiye mutasyonu yapılmaz.
- `player_achievements` yazımı idempotent olmalı; aynı achievement tekrar reward veremez.
- Anonymous profile için unlock cloud'a yazılmaz; local progress sadece UX tahmini olarak kalır.

## Feature Slice Sırası

| Sıra | İş | Kabul Kriteri |
|---|---|---|
| 1 | Railway migration ekle | `achievements`, `player_achievements`, index ve idempotent procedure migration içinde |
| 2 | Backend route ekle | `/api/v1/achievements*` route cluster testleri geçer |
| 3 | Session verify entegrasyonu | Verified session sonrası unlock transaction içinde oluşur |
| 4 | Frontend service bağla | `AchievementService` boş stub yerine Railway API kullanır |
| 5 | UI refresh/popup bağla | Profile tab ve HUD unlock popup backend response ile sync olur |
| 6 | Seed ve balancing | İlk achievement seti product/balance onayıyla seed edilir |

## Test Planı

| Katman | Test |
|---|---|
| DB | Unique unlock, idempotent procedure, FK cascade, index existence |
| Backend | Public definitions, authenticated mine, anonymous reject, session evaluate idempotency |
| Frontend | `AchievementService` success/failure/anonymous paths |
| Integration | Verified session unlock response profile UI ve HUD popup'a yansır |
| Regression | Duplicate verify aynı achievement için ikinci reward üretmez |

## Kabul Kararı

- Beta checklist maddesi plan seviyesinde kapatıldı; implementation beta sonrası ayrı feature branch olmalı.
- Bu plan tamamlanana kadar frontend achievement service'in boş liste fallback'i beklenen davranıştır.
- Implementation sırasında `docs/architecture/BACKEND_DB_ARCHITECTURE.md` ve `docs/DATABASE_SCHEMA.md` aynı PR içinde güncellenmelidir.
